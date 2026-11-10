"""Render three readable whiteboard diagrams for the allocation article.

Source: job-scheduler/docs/architecture.md and its SQLAlchemy models at
ba7dca7f7a82a89f8a34b252ff239a03e32dc1a5. Requires fonttools[woff].
Virgil lettering is outlined so SVGs and PNGs look the same on every machine.
"""
from html import escape
from math import atan2, cos, sin, pi
from pathlib import Path
import random

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/images/diagrams'
FONT = TTFont(ROOT / 'assets/fonts/Virgil.woff2')
GLYPHS = FONT.getGlyphSet()
CMAP = FONT.getBestCmap()
UPM = FONT['head'].unitsPerEm
INK = '#283238'
NOTE = '#365f82'
MUTED = '#56616a'
parts = []
used = set()
rng = random.Random(42)


def width(label, size):
    return sum(FONT['hmtx'][CMAP[ord(c)]][0] for c in label) * size / UPM


def text(x, y, label, size=22, color=INK, anchor='start', max_width=None):
    """Use the exact font outlines, retaining the label for accessibility/editing."""
    w = width(label, size)
    if max_width is not None and w > max_width:
        raise ValueError(f'Text exceeds its box ({w:.0f} > {max_width}): {label}')
    if anchor == 'middle':
        x -= w / 2
    elif anchor == 'end':
        x -= w
    parts.append(f'<g fill="{color}" aria-label="{escape(label, quote=True)}">')
    for c in label:
        code = ord(c)
        used.add(code)
        if c != ' ':
            parts.append(f'<use href="#g{code}" transform="translate({x:.3f} {y}) scale({size/UPM:.6f} {-size/UPM:.6f})"/>')
        x += FONT['hmtx'][CMAP[code]][0] * size / UPM
    parts.append('</g>')


def stroke(d, color=INK, dashed=False, weight=1.65, fill='none'):
    parts.append(f'<path d="{d}" fill="{fill}" stroke="{color}" stroke-width="{weight}" stroke-linecap="round" stroke-linejoin="round"'+(' stroke-dasharray="7 6"' if dashed else '')+'/>')


def line(points, color=INK, dashed=False, head=None):
    """Small deviations suggest a pen line without obscuring its direction."""
    d = f'M {points[0][0]} {points[0][1]}'
    for (ax, ay), (bx, by) in zip(points, points[1:]):
        mx, my = (ax+bx)/2, (ay+by)/2
        mx += rng.uniform(-.65, .65)
        my += rng.uniform(-.65, .65)
        d += f' Q {mx:.2f} {my:.2f} {bx} {by}'
    stroke(d, color, dashed)
    if head:
        ax, ay = points[-2]
        bx, by = points[-1]
        angle = atan2(by-ay, bx-ax)
        length = 12 if head == 'triangle' else 10
        left = (bx-length*cos(angle-pi/6), by-length*sin(angle-pi/6))
        right = (bx-length*cos(angle+pi/6), by-length*sin(angle+pi/6))
        d = f'M {left[0]:.2f} {left[1]:.2f} L {bx} {by} L {right[0]:.2f} {right[1]:.2f}'
        if head == 'triangle':
            d += ' Z'
        stroke(d, color, fill='white' if head == 'triangle' else 'none')


def box(x, y, w, h):
    # One restrained, imperfect pen outline; no fill panels or shadows.
    j = lambda: rng.uniform(-1.2, 1.2)
    stroke(f'M {x+j():.2f} {y+j():.2f} Q {x+w/2:.2f} {y+j():.2f} {x+w+j():.2f} {y+j():.2f} '
           f'Q {x+w+j():.2f} {y+h/2:.2f} {x+w+j():.2f} {y+h+j():.2f} '
           f'Q {x+w/2:.2f} {y+h+j():.2f} {x+j():.2f} {y+h+j():.2f} '
           f'Q {x+j():.2f} {y+h/2:.2f} {x+j():.2f} {y+j():.2f} Z', fill='white')


def component(x, y, w, h, title, lines, size=22, title_size=26):
    box(x, y, w, h)
    text(x+18, y+36, title, title_size, max_width=w-36)
    for i, label in enumerate(lines):
        text(x+18, y+73+i*28, label, size, MUTED, max_width=w-36)


def label(x, y, value, size=19):
    w = width(value, size)
    parts.append(f'<rect x="{x-w/2-7:.2f}" y="{y-size}" width="{w+14:.2f}" height="{size+7}" fill="white"/>')
    text(x, y, value, size, anchor='middle')


def underline(x, y, length):
    stroke(f'M {x} {y} Q {x+length*.45} {y+1.5} {x+length} {y-.5}', NOTE, weight=1.7)


def start(height, title, description, subtitle):
    global parts, used, rng
    used = set()
    rng = random.Random(42)
    parts = ['<rect width="1100" height="'+str(height)+'" fill="white"/>']
    text(40, 50, title, 30, max_width=1020)
    text(40, 84, subtitle, 20, MUTED, max_width=1020)
    return height, title, description


def save(name, meta):
    height, title, description = meta
    definitions = []
    for code in sorted(used):
        pen = SVGPathPen(GLYPHS)
        GLYPHS[CMAP[code]].draw(pen)
        definitions.append(f'<path id="g{code}" d="{pen.getCommands()}"/>')
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="{height}" viewBox="0 0 1100 {height}" role="img" aria-labelledby="title desc">',
           f'<title id="title">{escape(title)}</title>', f'<desc id="desc">{escape(description)}</desc>',
           '<metadata>Lettering: Virgil by Ellinor Rapp. SIL Open Font License 1.1. https://github.com/excalidraw/virgil</metadata>',
           '<defs>'] + definitions + ['</defs>'] + parts + ['</svg>']
    (OUT/name).write_text('\n'.join(svg)+'\n')


OUT.mkdir(parents=True, exist_ok=True)

# 1. Overall responsibilities. Policy implementations get their own view below.
m = start(910, '1. How the components work together',
          'API routes delegate to a request-scoped Server, which coordinates the process-local Scheduler and transaction-local Placer. The Server queries and records state; API routes commit or roll back. The Placer builds a topology view from eligible inventory.',
          'The implemented allocation path, with each component doing one kind of work.')
line([(165,160),(165,120),(955,120),(955,160)], dashed=True, head='arrow')
label(560,120,'commit / rollback')
line([(290,225),(420,225)], head='arrow')
label(355,210,'delegate')
line([(720,225),(850,225)], head='arrow')
label(785,210,'read / flush')
line([(490,290),(490,350),(248,350),(248,440)], head='arrow')
label(310,338,'enqueue / dequeue')
line([(650,290),(650,350),(853,350),(853,440)], head='arrow')
label(850,338,'build with eligible inventory',18)
line([(455,510),(645,510)], head='arrow')
label(550,494,'attempt(Job)',18)
line([(852,585),(852,720)], head='arrow')
label(852,658,'build_view(nodes)',19)
component(40,160,250,130,'API routes',['Request session','Commit / rollback'],20)
component(420,160,300,130,'Server',['Admission + lifecycle','Records allocations'],20)
component(850,160,210,130,'PostgreSQL',['Jobs + allocations','Inventory + events'],18,title_size=24)
text(420,146,'Request-scoped',19,NOTE)
text(40,418,'Process-local',20,NOTE)
text(645,418,'Transaction-local',20,NOTE)
component(40,440,415,145,'Scheduler',['Choose the next job to attempt','PendingJob: job_id + priority','FIFO or priority ordering'],20)
component(645,440,415,145,'Placer',['Choose exact resource units','Eligible, row-locked inventory','Returns units, or no fit'],20)
component(645,720,415,130,'Topology + TopologyView',['Cluster grid -> eligible-node view','Neighbors + distances for policies'],20,title_size=24)
text(40,741,'What crosses a request boundary?',22,NOTE)
underline(40,751,360)
text(40,790,'The queue retains IDs and priority.',20)
text(40,819,'Job objects and locks belong to the',20)
text(40,848,'current database session.',20)
text(40,886,'This models allocations; workload execution belongs to a separate layer.',17,MUTED)
save('job-allocation-flow.svg', m)

# 2. Parallel policy interfaces make the independent variation points explicit.
m = start(1040, '2. Two decisions, two policy interfaces',
          'Scheduler uses the abstract SortStrategy, implemented by FifoSort and PrioritySort. Placer uses the abstract PlaceAlgorithm, implemented by PackAlgorithm and SpreadAlgorithm. Topology builds a TopologyView; the placement algorithm reads its distance information.',
          'Queue ordering can change independently of the physical resource choice.')
text(80,150,'Which job next?',25,NOTE)
underline(80,161,193)
text(630,150,'Which resources?',25,NOTE)
underline(630,161,222)
line([(275,290),(275,380)], head='arrow')
label(275,339,'uses',20)
line([(825,290),(825,380)], head='arrow')
label(825,339,'uses',20)
line([(145,650),(145,590),(255,590),(255,515)], head='triangle')
line([(400,650),(400,590),(295,590),(295,515)], head='triangle')
line([(700,650),(700,590),(805,590),(805,515)], head='triangle')
line([(955,650),(955,590),(845,590),(845,515)], head='triangle')
label(275,563,'implements',19)
label(825,563,'implements',19)
line([(470,900),(630,900)], head='arrow')
label(550,885,'creates',19)
line([(1020,460),(1080,460),(1080,900),(1020,900)], dashed=True, head='arrow')
text(1068,791,'reads',18,anchor='end')
text(1068,816,'view',18,anchor='end')
component(80,190,390,100,'Scheduler',['Owns queue order'],21)
component(630,190,390,100,'Placer',['Owns resource selection'],21)
text(80,363,'abstract policy',19,NOTE)
text(630,363,'abstract policy',19,NOTE)
component(80,380,390,135,'SortStrategy',['key(job)','sort(queue)'],21)
component(630,380,390,135,'PlaceAlgorithm',['select(candidates, job, view)','rank(candidates, job, view)'],20)
component(40,650,210,90,'FifoSort',['Arrival order'],19,title_size=23)
component(290,650,220,90,'PrioritySort',['Priority, then FIFO'],18,title_size=23)
component(590,650,220,90,'PackAlgorithm',['Prefer nearby'],19,title_size=22)
component(850,650,210,90,'SpreadAlgorithm',['Prefer further away'],17,title_size=22)
component(80,835,390,125,'Topology',['Cluster grid configuration','build_view(eligible_nodes)'],20)
component(630,835,390,125,'TopologyView',['neighbors(node), distance(a, b)','Eligible nodes + occupancy'],19,title_size=25)
text(40,1014,'Solid arrow: uses / creates.  Hollow arrow: implements.  Dashed arrow: reads the view.',18,MUTED)
save('policy-abstractions.svg', m)

# 3. A concrete example of the real request-versus-fulfillment model.
m = start(910, '3. From a quantity to the exact GPU units',
          'Illustrative job 42 requests two GPUs through ResourceRequirement. An Allocation records its assignment. Two separate AllocationNode records identify GPU ResourceNode 87 on physical Node 12 and ResourceNode 91 on Node 13. The same unit links support precise release.',
          'One request for two GPUs; two allocation links remember which GPUs it received.')
line([(340,235),(430,235)], head='arrow')
label(385,218,'job_id',18)
line([(190,295),(190,445)], head='arrow')
label(190,378,'asks for',20)
line([(585,295),(585,350),(390,350),(390,742),(430,742)], head='arrow')
line([(390,502),(430,502)], head='arrow')
text(602,333,'records unit links',18)
component(40,175,300,120,'Job',['job_id: 42','Owner + priority + state'],20)
component(430,175,310,120,'Allocation',['job_id: 42','Assignment status + interval'],19)
component(40,445,300,150,'ResourceRequirement',['resource_type: GPU','amount: 2'],21,title_size=24)
component(430,445,310,115,'AllocationNode',['resource_node_id: 87'],20,title_size=25)
component(430,685,310,115,'AllocationNode',['resource_node_id: 91'],20,title_size=25)
for y,node,unit in [(400,12,87),(640,13,91)]:
    box(820,y,240,160)
    text(836,y+36,f'Node {node}',25)
    box(836,y+60,208,80)
    text(848,y+90,f'ResourceNode {unit}',20,max_width=184)
    text(848,y+117,'GPU: ALLOCATED',18,max_width=184)
line([(740,502),(836,502)], head='arrow')
line([(740,742),(836,742)], head='arrow')
text(40,673,'The request stays a quantity.',22,NOTE)
underline(40,684,306)
text(40,723,'AllocationNode links remember',20)
text(40,752,'which units were assigned.',20)
text(40,858,'Completion follows the same links to release GPUs 87 and 91.',21)
text(1060,891,'Example IDs; relationships follow the actual models.',16,MUTED,anchor='end')
save('resource-ownership.svg', m)
print('Rendered three whiteboard diagrams with outlined, readable lettering.')

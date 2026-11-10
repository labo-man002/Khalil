"""Render five readable whiteboard diagrams for the allocation article.

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


def graph_node(x, y, color=INK, radius=6):
    r = radius
    stroke(f'M {x-r} {y} C {x-r-.4} {y-r*.6} {x-r*.5} {y-r-.3} {x} {y-r} '
           f'C {x+r*.6} {y-r+.3} {x+r+.3} {y-r*.5} {x+r} {y} '
           f'C {x+r-.2} {y+r*.6} {x+r*.5} {y+r+.3} {x} {y+r} '
           f'C {x-r*.6} {y+r-.2} {x-r-.3} {y+r*.5} {x-r} {y} Z',
           color, weight=1.8, fill='white')


def grid(x, y, dx, dy, highlighted=(), radius=6, draw_nodes=True):
    for row in range(3):
        for col in range(2):
            line([(x+col*dx,y+row*dy),(x+(col+1)*dx,y+row*dy)])
    for col in range(3):
        for row in range(2):
            line([(x+col*dx,y+row*dy),(x+col*dx,y+(row+1)*dy)])
    if draw_nodes:
        for row in range(3):
            for col in range(3):
                graph_node(x+col*dx,y+row*dy,NOTE if (col,row) in highlighted else INK,radius)


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
m = start(910, 'How the components work together',
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
m = start(1040, 'Two decisions, two policy interfaces',
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

# 3. Supported grid geometries and the common view consumed during placement.
m = start(1220, 'Coordinate layouts, one topology interface',
          'Illustrative supported layouts: a four-position wrapping ring; a 3 by 3 non-wrapping mesh; a 3 by 3 wrapping torus; and three layers of a 3 by 3 by 3 torus. In the mesh, coordinates [0,0] and [2,0] are two steps apart; with wrapping they are one step apart. Selected wrap and cross-layer links illustrate the repeating pattern. Placer builds a TopologyView from the cluster configuration and eligible nodes; Pack and Spread read its distances.',
          'Node coordinates and cluster settings define neighbours and distance.')

text(40,145,'Ring / 1D',25,NOTE)
underline(40,156,147)
text(40,188,'Dimensions [4], wrap on',20,MUTED,max_width=480)
for a,b in zip([85,205,325],[205,325,445]):
    line([(a,300),(b,300)])
stroke('M 85 300 C 85 205 445 205 445 300',NOTE,dashed=True)
text(265,215,'wrap-around',19,NOTE,anchor='middle')
for index,x in enumerate([85,205,325,445]):
    graph_node(x,300,NOTE if index in (0,3) else INK)
    text(x,345,f'[{index}]',20,anchor='middle')
text(40,445,'[0] to [3]: 1 step.',21,NOTE)

text(600,145,'Mesh / 2D',25,NOTE)
underline(600,156,154)
text(600,188,'Dimensions [3,3], wrap off',20,MUTED,max_width=460)
grid(660,260,140,60,draw_nodes=False)
line([(660,260),(800,260),(940,260)],NOTE)
for row in range(3):
    for col in range(3):
        graph_node(660+col*140,260+row*60,NOTE if row==0 else INK)
text(660,237,'[0,0]',19,NOTE,anchor='middle')
text(940,237,'[2,0]',19,NOTE,anchor='middle')
text(600,445,'[0,0] to [2,0]: 2 steps.',21,NOTE)

text(40,535,'Torus / 2D',25,NOTE)
underline(40,546,164)
text(40,578,'Dimensions [3,3], wrap on',20,MUTED,max_width=480)
grid(110,670,150,75,draw_nodes=False)
stroke('M 110 670 C 110 600 410 600 410 670',NOTE,dashed=True)
for row in range(3):
    for col in range(3):
        graph_node(110+col*150,670+row*75,NOTE if (col,row) in [(0,0),(2,0)] else INK)
text(85,660,'[0,0]',18,NOTE,anchor='end')
text(435,660,'[2,0]',18,NOTE)
text(40,888,'[0,0] to [2,0]: 1 step.',21,NOTE)
text(40,921,'Wrapping repeats along both axes.',18,MUTED,max_width=480)

text(600,535,'Torus / 3D',25,NOTE)
underline(600,546,166)
text(600,578,'Dimensions [3,3,3], wrap on',19,MUTED,max_width=460)
for z,x in enumerate([630,790,950]):
    grid(x,710,32,45,draw_nodes=False)
    text(x+32,850,f'z = {z}',22,anchor='middle')
stroke('M 630 710 C 630 665 790 665 790 710')
stroke('M 790 710 C 790 665 950 665 950 710')
stroke('M 950 710 C 950 600 630 600 630 710',NOTE,dashed=True)
text(790,618,'wrap in z',18,NOTE,anchor='middle')
for x in [630,790,950]:
    for row in range(3):
        for col in range(3):
            graph_node(x+col*32,710+row*45,NOTE if (col,row)==(0,0) else INK,4.5)
text(600,888,'Same (x,y), different z.',21,NOTE)
text(600,921,'Each layer wraps along x and y too.',18,MUTED,max_width=460)

text(40,976,'Dashed blue links show wrap-around; selected links illustrate the repeating pattern.',17,MUTED,max_width=1020)
text(40,1020,'The four grid layouts feed the same placement view.',23,NOTE)
line([(340,1108),(430,1108)],head='arrow')
label(385,1092,'Placer',18)
line([(730,1108),(830,1108)],head='arrow')
label(780,1092,'read',18)
component(40,1050,300,115,'Cluster + nodes',['Layout + valid coordinates'],18,title_size=24)
component(430,1050,300,115,'TopologyView',['Neighbours + distances'],19,title_size=24)
component(830,1050,230,115,'Pack / Spread',['Rank candidates'],18,title_size=23)
text(40,1198,'Illustrative layouts; eligible nodes determine each placement view.',17,MUTED,max_width=1020)
save('cluster-topologies.svg', m)

# 4. Leaf-spine wiring and discovery using the merged Node/NIC/GPU model.
m = start(1070, 'Leaf-spine topology',
          'Two spine switches connect two leaves. Leaf 1 attaches existing compute Nodes 12 and 13; Leaf 2 attaches Node 14. They own free GPU units 87, 91, and 95 respectively. Node 14 has a down NIC, so GPU 95 is absent from the query result even though its resource unit remains free. Blue highlights one usable route from spine-1 through Leaf 1 to Node 12. GpuCandidateFinder returns the reachable nodes, their free GPU IDs, and their paths.',
          'Switches, ports and physical links connect the existing compute nodes.')

# Physical links: leaf-spine and node-leaf. A crossing is not a switch.
line([(300,250),(300,410)],NOTE)
line([(410,250),(730,410)])
line([(730,250),(410,410)])
line([(840,250),(840,410)])
line([(300,500),(300,555),(190,555),(190,640)],NOTE)
line([(410,500),(410,585),(550,585),(550,640)])
line([(730,500),(730,555),(910,555),(910,640)])

text(240,144,'Query root',20,NOTE)
component(240,160,230,90,'Spine 1',['Switch + ports'],18,title_size=25)
component(670,160,230,90,'Spine 2',['Switch + ports'],18,title_size=25)
component(240,410,230,90,'Leaf 1',['Switch + ports'],18,title_size=25)
component(670,410,230,90,'Leaf 2',['Switch + ports'],18,title_size=25)

text(40,294,'Link attributes',21,NOTE)
underline(40,305,172)
text(40,338,'Capacity',20)
text(40,366,'Latency',20)
text(40,394,'Operational state',18)
text(930,296,'Ports follow',17,MUTED,max_width=130)
text(930,322,'the hardware',17,MUTED,max_width=130)
text(930,348,'configuration.',17,MUTED,max_width=130)

for x,y,name,tx,ty in [
    (300,250,'p1',312,273),(410,250,'p2',370,273),
    (730,250,'p1',742,273),(840,250,'p2',852,273),
    (300,410,'p1',312,394),(410,410,'p2',370,394),
    (730,410,'p1',742,394),(840,410,'p2',852,394),
    (300,500,'p3',312,524),(410,500,'p4',422,524),
    (730,500,'p3',742,524),
]:
    parts.append(f'<rect x="{x-4}" y="{y-4}" width="8" height="8" fill="white" stroke="{INK}" stroke-width="1.5"/>')
    text(tx,ty,name,16)

for x,node,gpu in [(40,12,87),(400,13,91),(760,14,95)]:
    box(x,640,300,165)
    text(x+18,677,f'Node {node}',25)
    graph_node(x+150,640,NOTE if node==12 else INK,4)
    text(x+162,622,'nic0 down' if node==14 else 'nic0',17)
    if node==14:
        line([(x+143,633),(x+157,647)])
        line([(x+143,647),(x+157,633)])
    box(x+18,701,145,37)
    text(x+90.5,726,f'GPU {gpu} / free',18,anchor='middle')
    text(x+18,782,'1 free GPU unit',20,NOTE)

text(40,849,'GPU inventory stays on Node.resources.',19,MUTED,max_width=1020)
text(40,890,'GPU 95 is free, but Node 14 is unreachable while its NIC is down.',20,NOTE,max_width=1020)

line([(490,977),(650,977)],head='arrow')
label(570,960,'returns',19)
component(40,915,450,120,'GpuCandidateFinder',
          ['Free GPU units + usable paths','Capacity + latency constraints'],19,title_size=25)
component(650,915,410,120,'GpuCandidate',
          ['node_id, free_gpu_ids, path','Here: Node 12 / 87 and Node 13 / 91'],18,title_size=25)
text(40,1061,'Blue marks one usable route. The cable to Node 14 remains in the physical model.',16,MUTED,max_width=1020)
save('leaf-spine.svg', m)

# 5. A concrete example of the real request-versus-fulfillment model.
m = start(910, 'From a quantity to the exact GPU units',
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
print('Rendered five whiteboard diagrams with outlined, readable lettering.')

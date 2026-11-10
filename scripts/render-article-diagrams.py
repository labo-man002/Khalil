"""Draw the article's architecture and ownership diagrams as deterministic SVG.

Responsibilities and relationships follow job-scheduler/docs/architecture.md
and backend/app/models at ba7dca7f7a82a89f8a34b252ff239a03e32dc1a5.
"""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/images/diagrams'
OUT.mkdir(parents=True, exist_ok=True)
INK = '#213547'
MUTED = '#617386'
BLUE = '#386c94'
TEAL = '#22776b'
GOLD = '#9c7331'
PURPLE = '#735a96'
parts = []

def text(x, y, lines, size=22, color=INK, weight=400, mono=False, anchor='start'):
    if isinstance(lines, str):
        lines = [lines]
    family = 'Courier New, monospace' if mono else 'Arial, Helvetica, sans-serif'
    for i, line in enumerate(lines):
        parts.append(f'<text x="{x}" y="{y+i*(size+9)}" fill="{color}" font-family="{family}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">{escape(line)}</text>')

def rect(x, y, w, h, fill='white', stroke='#d8e1e9', radius=14, shadow=False, dash=False):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"'+(' filter="url(#shadow)"' if shadow else '')+(' stroke-dasharray="7 6"' if dash else '')+'/>')

def path(d, color='#8193a4', dashed=False, marker='arrow'):
    parts.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'+(' stroke-dasharray="7 6"' if dashed else '')+(f' marker-end="url(#{marker})"' if marker else '')+'/>')

def badge(x, y, label, color, width):
    rect(x,y,width,30,fill=color,stroke=color,radius=6)
    text(x+12,y+21,label,14,'white',700)

def card(x, y, w, h, title, eyebrow, lines, color=INK, fill='white', tag=None, title_size=30):
    rect(x,y,w,h,fill=fill,shadow=True)
    parts.append(f'<path d="M{x+1} {y+18} V{y+h-18}" stroke="{color}" stroke-width="4" stroke-linecap="round"/>')
    text(x+22,y+29,eyebrow.upper(),14,color,700)
    text(x+22,y+65,title,title_size,color,700)
    text(x+22,y+101,lines,19,MUTED)
    if tag:
        badge(x+w-154,y+17,tag,color,134)

def start(w,h,title,description):
    global parts
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc">',f'<title id="title">{escape(title)}</title><desc id="desc">{escape(description)}</desc>',
    '<defs><filter id="shadow" x="-10%" y="-10%" width="120%" height="135%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#213547" flood-opacity=".045"/></filter><marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M1 1L11 6L1 11Z" fill="#8193a4"/></marker><marker id="inherit" viewBox="0 0 14 14" refX="12" refY="7" markerWidth="11" markerHeight="11" orient="auto"><path d="M1 1L13 7L1 13Z" fill="white" stroke="#9c7331" stroke-width="1.5"/></marker></defs>',f'<rect width="{w}" height="{h}" fill="#f6f8fb"/>']

def save(name):
    (OUT/name).write_text('\n'.join(parts+['</svg>'])+'\n')

start(1640,1260,'Workload management: architecture and abstractions','Application coordination, process-local scheduling, transaction-local placement, independently replaceable policy interfaces, topology snapshots, and persistent state.')
text(60,55,'ARCHITECTURE / IMPLEMENTED ALLOCATION PATH',16,MUTED,700)
text(60,105,'Separate decisions. Explicit ownership.',38,INK,700)
text(60,142,'Orchestration, queue policy, placement policy, topology, and the record of an allocation.',21,MUTED)

# Request boundary and application coordination.
card(60,225,400,160,'FastAPI routes','Request boundary',['Translate requests and domain errors','Own transaction commit / rollback'],BLUE)
card(560,225,500,160,'Server','Application coordination',['Admission · quotas · cluster routing','Reservations · lifecycle · persistence'],TEAL,tag='request-scoped')
card(1160,225,420,160,'PostgreSQL','Authoritative persisted state',['Jobs · resource units · allocations','Requirements · reservations · events'],'#4b6076')
path('M 460 303 H 560')
text(510,286,'delegate',16,MUTED,anchor='middle')
path('M 1060 303 H 1160')
text(1110,286,'read / flush',16,MUTED,anchor='middle')
path('M 260 225 V 187 H 1370 V 225',dashed=True)
rect(692,169,246,31,fill='#f6f8fb',stroke='#f6f8fb',radius=0)
text(815,191,'commit / rollback',17,MUTED,anchor='middle')

# Responsibility boundaries, followed by their interfaces and implementations.
rect(40,465,610,565,fill='#eef4f9',stroke='#cddde9',radius=18)
rect(730,465,870,565,fill='#eef6f2',stroke='#c9e0d7',radius=18)
text(65,498,'01 / QUEUE ORDER',15,BLUE,700)
text(755,498,'02 / RESOURCE SELECTION',15,TEAL,700)
card(75,535,540,138,'Scheduler','Which job gets the next attempt?',['enqueue() · dequeue() · attempt_placement()'],BLUE,tag='process-local')
card(765,535,800,138,'Placer','Which exact units fulfill the request?',['place(job) → resource units or no fit','Uses eligible, locked inventory; no database queries or commits.'],TEAL,tag='transaction-local')
path('M 715 385 V 425 H 345 V 535')
text(370,415,'cache per cluster / enqueue job reference',17,BLUE)
path('M 905 385 V 425 H 1165 V 535')
text(1165,415,'construct from current transaction inventory',17,TEAL,anchor='middle')
path('M 615 603 H 765')
text(690,586,'attempt',17,MUTED,anchor='middle')

card(75,730,255,150,'SortStrategy','Abstract interface',['key(job)','sort(queue)'],GOLD)
card(370,730,245,150,'PendingJob','Queued reference',['job_id','priority'],BLUE)
path('M 202 673 V 730')
text(215,710,'orders with',16,BLUE)
path('M 493 673 V 730')
text(506,710,'stores refs',16,BLUE)
rect(75,920,125,57,stroke='#d8c6a7',fill='#fffdf8',radius=9)
rect(220,920,175,57,stroke='#d8c6a7',fill='#fffdf8',radius=9)
text(137,955,'FifoSort',18,GOLD,700,anchor='middle')
text(307,955,'PrioritySort',18,GOLD,700,anchor='middle')
path('M 137 920 V 901 H 190 V 880',GOLD,marker='inherit')
path('M 307 920 V 901 H 215 V 880',GOLD,marker='inherit')

card(765,730,360,150,'PlaceAlgorithm','Abstract interface',['select(candidates, job, view)','rank(candidates, job, view)'],GOLD)
card(1205,730,360,150,'Topology','Cluster configuration',['build_view(eligible_nodes)','Ring · Mesh · 2D / 3D Torus'],PURPLE)
path('M 945 673 V 730')
text(958,710,'select / rank',16,TEAL)
path('M 1385 673 V 730')
text(1398,710,'build view',16,PURPLE)
rect(765,920,165,57,stroke='#d8c6a7',fill='#fffdf8',radius=9)
rect(950,920,175,57,stroke='#d8c6a7',fill='#fffdf8',radius=9)
text(847,955,'PackAlgorithm',17,GOLD,700,anchor='middle')
text(1037,955,'SpreadAlgorithm',17,GOLD,700,anchor='middle')
path('M 847 920 V 901 H 930 V 880',GOLD,marker='inherit')
path('M 1037 920 V 901 H 960 V 880',GOLD,marker='inherit')
rect(1205,920,360,96,fill='#f9f7fc',stroke='#d4cce1',radius=10)
text(1225,951,'TopologyView',25,PURPLE,700)
text(1225,978,'neighbors(node) · distance(a, b)',17,MUTED)
text(1225,1002,'Eligible nodes · current occupancy',16,MUTED)
path('M 1385 880 V 920',PURPLE)
text(1400,906,'creates',15,PURPLE)
path('M 1125 797 H 1165 V 962 H 1205',PURPLE,dashed=True)
rect(1135,840,60,48,fill='#eef6f2',stroke='#eef6f2',radius=0)
text(1165,857,'reads',15,PURPLE,anchor='middle')
text(1165,878,'view',15,PURPLE,anchor='middle')

# Explanatory callouts emphasize design consequences rather than extra classes.
rect(60,1070,475,103,fill='white',radius=12)
rect(552,1070,505,103,fill='white',radius=12)
rect(1074,1070,506,103,fill='white',radius=12)
text(80,1098,'REFERENCE LIFETIME',13,BLUE,700)
text(80,1130,['The queue keeps IDs and priority.','The ORM Job is loaded for the current session.'],17,MUTED)
text(572,1098,'REPLACEABLE POLICIES',13,GOLD,700)
text(572,1130,['Queue order and resource ranking can change','independently through their policy interfaces.'],17,MUTED)
text(1094,1098,'ONE ALLOCATION BOUNDARY',13,TEAL,700)
text(1094,1130,['The Server records the assignment.','The API commits or rolls back the changes.'],17,MUTED)
path('M 65 1210 H 103',marker='arrow')
text(115,1216,'delegation / use',15,MUTED)
path('M 320 1210 H 358',dashed=True)
text(370,1216,'secondary dependency / view',15,MUTED)
path('M 670 1210 H 708',GOLD,marker='inherit')
text(720,1216,'implementation of an abstract policy',15,MUTED)
text(1580,1216,'labo-man002/job-scheduler',15,MUTED,mono=True,anchor='end')
save('job-allocation-flow.svg')

# A complementary, focused view of demand, fulfillment, and hardware ownership.
start(1500,910,'A request and its assignment are separate facts','Illustrative job 42 requests two GPUs. An allocation identifies GPU units 87 and 91 on separate nodes, preserving the distinction between requested quantities and actual ownership.')
text(55,52,'DATA ABSTRACTIONS / AN ILLUSTRATIVE TWO-GPU ASSIGNMENT',16,MUTED,700)
text(55,101,'Demand → assignment → exact hardware units',34,INK,700)

for x,w,heading,color in [(40,390,'01 / REQUEST',BLUE),(475,470,'02 / FULFILLMENT',TEAL),(990,470,'03 / INVENTORY',PURPLE)]:
    rect(x,150,w,580,fill={'01 / REQUEST':'#eef4f9','02 / FULFILLMENT':'#eef6f2','03 / INVENTORY':'#f4f1f9'}[heading],stroke='#d7e0e8',radius=18)
    text(x+25,187,heading,15,color,700)

card(65,225,340,160,'Job','Submitted work',['job_id: 42','Owner · priority · lifecycle state'],BLUE)
card(65,485,340,160,'ResourceRequirement','Demand',['resource_type: GPU','amount: 2'],BLUE,title_size=26)
path('M 235 385 V 485')
text(250,442,'requests',18,BLUE)

card(500,225,420,160,'Allocation','Assignment record',['job_id: 42','Begin / end · allocation status'],TEAL)
card(500,485,420,160,'AllocationNode × 2','One link per assigned unit',['link A · resource_node_id: 87','link B · resource_node_id: 91'],TEAL)
path('M 405 305 H 500')
text(452,287,'job_id',16,MUTED,mono=True,anchor='middle')
path('M 710 385 V 485')
text(725,442,'contains links',18,TEAL)

rect(1015,225,420,175,fill='white',shadow=True)
text(1040,259,'Node 12',27,PURPLE,700)
text(1040,292,'Physical compute host',17,MUTED)
rect(1040,313,370,60,fill='#f4f1f9',stroke='#d4cce1',radius=8)
text(1058,339,'ResourceNode 87',21,PURPLE,700)
text(1058,361,'GPU · resource_status: ALLOCATED',16,MUTED)
rect(1015,470,420,175,fill='white',shadow=True)
text(1040,504,'Node 13',27,PURPLE,700)
text(1040,537,'Physical compute host',17,MUTED)
rect(1040,558,370,60,fill='#f4f1f9',stroke='#d4cce1',radius=8)
text(1058,584,'ResourceNode 91',21,PURPLE,700)
text(1058,606,'GPU · resource_status: ALLOCATED',16,MUTED)
path('M 920 582 H 963 V 345 H 1040',PURPLE)
path('M 920 610 H 1000 V 588 H 1040',PURPLE)
text(971,432,'unit IDs',15,PURPLE,anchor='middle')

rect(60,770,1380,81,fill='white',radius=12)
text(85,801,'The request remains “2 GPUs”. The allocation records which two.',25,INK,700)
text(85,831,'Those same resource links support inspection, completion, cancellation, and precise release.',19,MUTED)
text(1440,884,'Illustrative IDs · relationships follow the actual models',15,MUTED,anchor='end')
save('resource-ownership.svg')
print('Rendered architecture abstractions and resource ownership SVGs.')

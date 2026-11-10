"""Render source-backed SVG diagrams. Requires Graphviz (`dot`), not a browser.

The ERD snapshot is extracted from the public project's SQLAlchemy models.
Class responsibilities and relationships follow its docs/architecture.md.
"""
from pathlib import Path
from html import escape
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/images/diagrams'
SOURCE = ROOT / 'docs/diagrams'
OUT.mkdir(parents=True, exist_ok=True)

def render(name, body):
    graph = '''digraph diagram {
      graph [bgcolor="#f7faf9", pad="0.6", nodesep="0.5", ranksep="0.85", splines=polyline, outputorder=edgesfirst, fontname="Helvetica", fontsize=20, fontcolor="#213c45", labelloc=t, labeljust=l];
      node [shape=plain, fontname="Helvetica", margin=0];
      edge [fontname="Helvetica", fontsize=10, color="#91a4a6", fontcolor="#587075", penwidth=1.1, arrowsize=0.75];
    ''' + body + '\n}'
    (SOURCE / (name + '.dot')).write_text(graph)
    subprocess.run(['dot', '-Tsvg', '-o', str(OUT / (name + '.svg'))], input=graph, text=True, check=True)

def class_card(name, stereotype, rows, color):
    contents = ''.join(f'<TR><TD ALIGN="LEFT" CELLPADDING="8"><FONT FACE="Courier" POINT-SIZE="11" COLOR="#465b60">{escape(row)}</FONT></TD></TR>' for row in rows)
    return f'''{name} [label=<<TABLE BORDER="1" COLOR="#d2dfe0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0" BGCOLOR="#ffffff">
      <TR><TD ALIGN="LEFT" BGCOLOR="{color}" CELLPADDING="12"><FONT POINT-SIZE="10" COLOR="#cfe0df">{escape(stereotype.upper())}</FONT><BR ALIGN="LEFT"/><FONT POINT-SIZE="18" COLOR="white"><B>{name}</B></FONT></TD></TR>{contents}</TABLE>>];'''

cards = [
 ('Server', 'application service', ['db: Session', '_schedulers: dict', 'submit_job() / complete_job()', '_build_placer() / _drain_queue()'], '#284e43'),
 ('Scheduler', 'process-local queue', ['enqueue() / dequeue()', 'attempt_placement(job)', 'set_sort_strategy()'], '#315769'),
 ('PendingJob', 'queued reference', ['job_id: int', 'priority: Priority'], '#315769'),
 ('Placer', 'transaction-local selection', ['nodes / algorithm / topology', 'place(job)', 'has_enough_capacity()', 'release_resource()'], '#284e43'),
 ('SortStrategy', 'abstract policy', ['key(job)', 'sort(queue)'], '#78623c'),
 ('FifoSort', 'queue policy', ['preserve enqueue order'], '#78623c'),
 ('PrioritySort', 'queue policy', ['priority + FIFO tie-break'], '#78623c'),
 ('PlaceAlgorithm', 'abstract policy', ['select(candidates, job, view)', 'rank(candidates, job, view)'], '#78623c'),
 ('PackAlgorithm', 'placement policy', ['nearest occupied node'], '#78623c'),
 ('SpreadAlgorithm', 'placement policy', ['farthest from nearest occupied'], '#78623c'),
 ('Topology', 'cluster configuration', ['cluster: Cluster', 'build_view(nodes)'], '#4c6275'),
 ('TopologyView', 'eligible-node snapshot', ['nodes: list[Node]', 'neighbors(node)', 'distance(a, b)'], '#4c6275'),
]
body = ['rankdir=TB;', 'label="CLASS ARCHITECTURE\nImplemented scheduling and placement classes · condensed from the project documentation";']
body += [class_card(*c) for c in cards]
body += ['''
  {rank=same; Scheduler; Placer;}
  {rank=same; PendingJob; SortStrategy; PlaceAlgorithm; Topology;}
  {rank=same; FifoSort; PrioritySort; PackAlgorithm; SpreadAlgorithm; TopologyView;}
  Server -> Scheduler [label="caches per cluster"];
  Server -> Placer [label="constructs from locked ORM inventory"];
  Scheduler -> Placer [label="placement attempt", constraint=false];
  Scheduler -> PendingJob [label="queues", arrowtail=odiamond, dir=both];
  Scheduler -> SortStrategy [label="orders with"];
  Placer -> PlaceAlgorithm [label="selects / ranks with"];
  Placer -> Topology [label="builds a view"];
  Topology -> TopologyView [label="creates"];
  PlaceAlgorithm -> TopologyView [style=dashed, label="reads distances", constraint=false];
  FifoSort -> SortStrategy [arrowhead=empty, color="#a98d59", constraint=false];
  PrioritySort -> SortStrategy [arrowhead=empty, color="#a98d59", constraint=false];
  PackAlgorithm -> PlaceAlgorithm [arrowhead=empty, color="#a98d59", constraint=false];
  SpreadAlgorithm -> PlaceAlgorithm [arrowhead=empty, color="#a98d59", constraint=false];
  SortStrategy -> FifoSort [style=invis];
  SortStrategy -> PrioritySort [style=invis];
  PlaceAlgorithm -> PackAlgorithm [style=invis];
  PlaceAlgorithm -> SpreadAlgorithm [style=invis];
''']
render('class-architecture', '\n'.join(body))

snapshot = json.loads((SOURCE / 'schema-snapshot.json').read_text())
models = {m['table']: m for m in snapshot['models']}
groups = [
 ('ownership', '01 / OWNERSHIP', '#315769', ['institute', 'client']),
 ('requests', '02 / REQUESTS & HISTORY', '#284e43', ['job', 'resource_requirement', 'job_event']),
 ('allocations', '03 / FULFILLMENT', '#78623c', ['allocation', 'allocation_node']),
 ('hardware', '04 / COMPUTE INVENTORY', '#4c6275', ['cluster', 'node', 'node_resource']),
 ('limits', '05 / INSTITUTE POLICY', '#6d5775', ['quota', 'reservation', 'node_reservation', 'resource_usage']),
]
colors = {table: color for _, _, color, tables in groups for table in tables}

def table_card(table):
    model = models[table]
    rows = []
    for c in model['columns']:
        marker = 'PK' if c['pk'] else 'FK' if c['fk'] else ''
        ty = c['type'] + (' ?' if c['nullable'] else '')
        field = escape(c['name'])
        if c['pk']: field = '<B>' + field + '</B>'
        rows.append(f'<TR><TD PORT="{c["name"]}" ALIGN="LEFT" CELLPADDING="6"><FONT POINT-SIZE="9" COLOR="#8b9b9c">{marker:2}</FONT> <FONT FACE="Courier" POINT-SIZE="11" COLOR="#304d55">{field}</FONT></TD><TD ALIGN="LEFT" CELLPADDING="6"><FONT POINT-SIZE="9" COLOR="#819398">{escape(ty)}</FONT></TD></TR>')
    return f'''"{table}" [label=<<TABLE BORDER="1" COLOR="#cfdddf" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0" BGCOLOR="white"><TR><TD COLSPAN="2" ALIGN="LEFT" CELLPADDING="12" BGCOLOR="{colors[table]}"><FONT COLOR="#d3e2e2" POINT-SIZE="9">{model['class']}</FONT><BR ALIGN="LEFT"/><FONT COLOR="white" POINT-SIZE="17"><B>{table}</B></FONT></TD></TR>{''.join(rows)}</TABLE>>];'''

erd = ['rankdir=LR;', 'label="ENTITY RELATIONSHIPS\nActual SQLAlchemy tables and foreign keys · ? = nullable · enum values are stored in columns";']
for key, title, color, tables in groups:
    erd.append(f'subgraph cluster_{key} {{ label="{title}"; color="#e0e8e8"; fontcolor="{color}"; fontsize=13; style=rounded; margin=20;')
    erd += [table_card(t) for t in tables]
    erd.append('}')
for table, model in models.items():
    for c in model['columns']:
        if c['fk']:
            parent, field = c['fk'].split('.')
            erd.append(f'"{parent}":"{field}":e -> "{table}":"{c["name"]}":w [arrowhead=crow, arrowtail=tee, dir=both, color="{colors[table]}", penwidth=1.2];')
render('entity-relationships-full', '\n'.join(erd))
core_tables = {'institute', 'client', 'job', 'resource_requirement', 'job_event', 'allocation', 'allocation_node', 'cluster', 'node', 'node_resource'}
core = ['rankdir=LR;', 'label="CORE ALLOCATION ERD\nOwnership, requests, fulfillment, and compute inventory · actual SQLAlchemy fields and foreign keys";']
for key, title, color, tables in groups:
    selected = [t for t in tables if t in core_tables]
    if not selected:
        continue
    core.append(f'subgraph cluster_{key} {{ label="{title}"; color="#e0e8e8"; fontcolor="{color}"; fontsize=13; style=rounded; margin=20;')
    core += [table_card(t) for t in selected]
    core.append('}')
for table in sorted(core_tables):
    for c in models[table]['columns']:
        if c['fk']:
            parent, field = c['fk'].split('.')
            if parent in core_tables:
                core.append(f'"{parent}":"{field}":e -> "{table}":"{c["name"]}":w [arrowhead=crow, arrowtail=tee, dir=both, color="{colors[table]}", penwidth=1.2];')
render('entity-relationships', '\n'.join(core))
print('Rendered class architecture and ERD from', len(models), 'current ORM tables.')

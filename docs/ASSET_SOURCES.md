# Image and diagram sources

## Sparxity system photograph

- Official company website: https://sparxity.ai/
- Original image: https://cdn.sanity.io/images/hhr1numx/production/8573080279ab133c86f586fc008ad750f993b84c-2000x1333.jpg
- Local copy: `public/images/sparxity-system.jpg`.
- Credit shown on the homepage and case study: Sparxity.
- This is an official company system photograph. The portfolio's professional contribution and scale statements come from the supplied CV; the photograph is not presented as a photograph taken by Khalil or as evidence of a particular deployment he personally delivered.

The name change from SpiNNcloud to Sparxity is also reported at https://www.supercomputing.news/emerging/sparxity-spinncloud-julich-jubis-spinnaker2 (28 October 2026). The employment period remains April 2025–August 2026 as in the CV. The newer Jülich deployment is not attributed to the portfolio owner.

## Public project screenshots and historical ERDs

- Repository: https://github.com/labo-man002/job-scheduler
- Source commit: `ba7dca7f7a82a89f8a34b252ff239a03e32dc1a5`.
- Screenshots: `docs/screenshots/cluster-detail.png`, `clusters.png`, `job-detail.png`, and `jobs.png`.
- Original diagrams: `docs/diagrams/erd-full-whiteboard.png`, `erd-topology.svg`, `erd-jobs.svg`, `erd-allocation.svg`, and `erd-clients.svg`.
- Local copies: `public/images/project/`.

The original diagrams are explicitly identified as historical, consistent with the repository's architecture documentation and ERD audit issue #92.

## Current class architecture and ERD

- Class responsibilities and edges: `docs/architecture.md` in the public project.
- Actual table fields, types, nullable columns, and foreign keys: `backend/app/models/*.py` at the source commit above.
- Reproducible model snapshot: `docs/diagrams/schema-snapshot.json`.
- Renderer: `scripts/render-diagrams.py` (Graphviz).
- Output: `public/images/diagrams/class-architecture.svg` , `entity-relationships.svg`, and the complete `entity-relationships-full.svg`.

The ERD does not turn native enum columns into fictitious lookup tables, and it does not claim a database-enforced unique Job–Allocation relationship that the schema does not declare. `resource_usage` is represented as an existing table, not as an implemented metering service.

## Article architecture and ownership diagrams

- Source: `docs/architecture.md` and the actual SQLAlchemy models in the public project, pinned to the source commit above.
- Renderer: `scripts/render-article-diagrams.py`, a deterministic, hand-positioned SVG layout. Run `python3 scripts/render-article-diagrams.py` to regenerate both figures.
- Architecture output: `public/images/diagrams/job-allocation-flow.svg`. This shows request, process, and transaction lifetimes; separate queue and placement policy interfaces; concrete policy implementations; topology configuration versus its eligible-node view; and API transaction ownership.
- Ownership output: `public/images/diagrams/resource-ownership.svg`. This is a focused example of the persisted request/fulfillment/inventory model, not a complete ERD. Two `AllocationNode` records point to two individual `ResourceNode` units. IDs are illustrative, and the figure adds no uniqueness constraints.
- Matching PNG files are 2400-pixel-wide raster exports of the SVGs, made with Sharp. They support downloads and the article's social preview.

The article figures replace the earlier simplified Graphviz flowchart. The complete class architecture and current-model ERDs remain available in the Work case study.

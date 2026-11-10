# Website and blog decisions

Last updated: 10 November 2026.

This is the durable record of Khalil Ben Maaoui's choices for the portfolio and blog. Read it before future changes. Later explicit user direction takes precedence; revise the relevant decision when it changes. Implementation notes describe the current site and should be checked against source as the projects evolve.

## Purpose and voice

- Present Khalil's skills, experience, expertise, professional work, public projects, and engineering writing in one personal website.
- Explain actual work and the reasoning behind it. Use concrete examples, architecture decisions, and insights supported by the projects.
- Write in a clear, personal, direct voice. Avoid clichés, generic promotional copy, and inflated claims about complexity or impact.
- Ask focused questions when they would improve the result. Khalil explicitly welcomes questions about design and presentation preferences.

## Profile and professional work

- Use the latest supplied `Khalil_Ben_Maaoui_Distributed_Systems_CV.pdf` as the profile and experience reference. The downloadable copy is `public/resume.pdf`.
- Give the Sparxity / former SpiNNcloud contribution substantial treatment in its Work case study: SpiNNaker2 supercomputer infrastructure, hardware allocation, Slurm integration, topology, discovery, and machine state. Keep claims within the supplied experience.
- Retain Sparxity employment and the relevant professional background in About. Keep the detailed case study and company system imagery under Work; keep the homepage focused on Khalil's personal profile and public projects. `showOnHomepage: false` controls the Sparxity timeline entry.
- Keep professional implementation distinct from the public workload-management project.
- Keep GPU-workload-inspector out of the portfolio; the removed entry did not represent built work. This is a portfolio content decision, not an instruction to delete a GitHub repository.

## Project accuracy and imagery

- Read the actual project before proposing work or writing about it. Describe implemented behavior precisely and identify exploratory extensions as such.
- The public workload-management project is [labo-man002/job-scheduler](https://github.com/labo-man002/job-scheduler). It models requests, queue order, resource placement, allocation records, lifecycle, and release. Workload execution belongs to a separate layer.
- Its current queue is process-local. The Scheduler chooses the next placement attempt; the transaction-local Placer chooses exact resource units. The Server coordinates admission and persistence; API routes own transaction commit and rollback.
- Explain the topology connection in allocation writing: each cluster defines its layout, node coordinates are checked against it, and placement builds a fresh view of eligible nodes. That view derives neighbours and distances for the placement policy to use across supported grid layouts.
- The merged leaf–spine model uses switches, ports, links, and the existing Node/NIC/GPU identities. Describe its path discovery and GPU candidate results by what the code implements; verify source before extending claims about allocation or bandwidth reservation.
- Use real project screenshots for project covers and interface examples. Use the project's actual model and code to derive architecture and ERD illustrations.
- Credit the official Sparxity system photograph and retain image provenance in [ASSET_SOURCES.md](ASSET_SOURCES.md).
- Keep historical ERDs labeled as historical. Derive current schema relationships from the actual ORM models; do not add constraints or features that the source does not implement.

## Blog writing

- An architecture article should explain a story and make the design decisions understandable. A concrete request or lifecycle transition is a useful thread through the explanation.
- Signal architecture through responsibilities, abstractions, and consequences. Keep technology inventories, API reference detail, and long method descriptions out of the main narrative unless needed to explain a decision.
- Put deeper algorithms and system design analysis in focused articles, with links from the broader story.
- Following the editorial review, Khalil approved a clearer request-to-release narrative with a medium-complexity example, a practical introduction to reachability, and a closing insight about ownership and availability. Preserve the current prose during illustration-only work; later requested editorial revisions can change it.
- The current article uses four one-GPU Nodes in a single mesh row. Node 11 stays occupied; an earlier job releases units on Nodes 13 and 14. Pack selects GPUs 87 and 91; Spread selects 95 and 91. Keep the occupied reference node so these policies have a meaningful spatial preference, and verify worked choices against the project code. Example IDs and states remain illustrative.
- Keep the main reading path moving through request, wait, choice, assignment, and release. Architecture, policy-interface, and grid-layout diagrams remain available in expandable technical notes. Leaf–spine reachability and the ownership diagram remain visible in the main article.
- Retain useful class names at the decisions they explain. Session lifetimes and method-level detail can live in the expandable notes; do not remove technical terminology indiscriminately.
- Introduce leaf–spine through the practical difference between a free GPU and a reachable candidate. Its query uses the same Node/GPU identities; a down NIC can exclude a free unit. Keep geometry, reachability, and allocation ownership clearly described by their roles.
- End the article with the machine-state consequence: releasing a job's ownership does not make a GPU on a DOWN node available again.

## Diagram style and detail

The selected style is **a whiteboard sketch with slightly hand-drawn boxes and arrows, and neat lettering**.

- Prioritize readable labels, precise relationships, and generous spacing. Simple diagrams are welcome when they communicate the design well.
- Use a white background, thin pen-like outlines, dark lettering, and restrained blue annotations. Give detail through meaningful connections and explanations rather than decorative panels, badges, shadows, or stock artwork.
- Retain real class and entity names where they explain an abstraction. Add short plain-language roles so readers can follow the diagram without knowing the code.
- Separate distinct questions into focused views. The allocation article has **overall architecture**, **policy abstractions**, **coordinate topologies**, **leaf–spine topology**, and **resource ownership** sketches.
- Include leaf–spine when illustrating the project's topologies. Khalil confirmed that its final merge is complete and requested the normal **Leaf–spine** label without prototype or maturity badges. Use the merged Node/NIC/ResourceNode representation and the project's existing fabric-diagram layout as references.
- Illustrate the supported ring, mesh, and 2D/3D torus layouts with clear coordinate examples. Label selected wrap and cross-layer links as representative, and connect the layouts to the shared placement view.
- Make policy interfaces, their implementations, and their dependencies clear. Show the request-versus-assignment distinction and exact resource-unit ownership accurately.
- For the two-GPU example, show two separate AllocationNode links, each identifying its own ResourceNode on a physical Node.
- Keep figures wider than prose when needed, retain explanatory captions, and offer full-size SVG and PNG downloads. On small screens, keep labels large enough to read through horizontal scrolling.
- Diagram titles and captions use descriptive names without ordinal numbering, so they work in both inline and expandable placements.

The article sketches are generated by [render-article-diagrams.py](../scripts/render-article-diagrams.py). Virgil lettering and its license are in `assets/fonts/`; glyph outlines keep exported lettering consistent. The complete class diagram and schema ERDs remain in the Work case study. See [ASSET_SOURCES.md](ASSET_SOURCES.md) for source commits and regeneration details.

## Repository and hosting

- Maintain the website source in [labo-man002/Khalil](https://github.com/labo-man002/Khalil), renamed from `personal-site`.
- Khalil selected a shorter GitHub Pages address and named the repository `Khalil`. The public address is `https://labo-man002.github.io/Khalil/`; preserve the capital K in the path. Keep the visible site name **Khalil Ben Maaoui**. This uses GitHub's domain; no separately owned domain was selected.
- The existing managed website is https://khalil-ben-maaoui-engineering.khalil-benmaaoui.chatgpt.site. Preserve its existing audience when updating it; the current managed deployment is owner-private.
- The site uses Astro static output, Markdown articles, and `dist/` for deployment. Keep root hosting and the selected Pages project prefix working. The Pages workflow reads its origin and base path from GitHub; CI derives its prefix from the repository name.
- GitHub Pages is enabled with GitHub Actions as the source. The Pages workflow supports automatic publication on source pushes to `main` and manual dispatch; documentation-only pushes are excluded. The account owner completed the repository rename and Pages settings on 10 November 2026. The first deployment succeeded in [workflow run 42839739004](https://github.com/labo-man002/Khalil/actions/runs/42839739004); the public pages, compiled CSS, diagrams, résumé, and feeds were verified over HTTPS.
- Keep this decision record in GitHub so future work does not depend on remembering the chat. Documentation-only updates do not require a new website deployment.

## Files to consult

| Concern | Source |
| --- | --- |
| Profile, experience, expertise, case studies | [src/lib/site.ts](../src/lib/site.ts) |
| About and employment history | [src/pages/about.astro](../src/pages/about.astro) |
| Blog articles | `src/pages/writing/` |
| Article layout and wide figures | [src/layouts/Post.astro](../src/layouts/Post.astro) |
| Visual and responsive rules | [src/styles/global.css](../src/styles/global.css) |
| Image provenance and diagram generation | [ASSET_SOURCES.md](ASSET_SOURCES.md) |
| Setup, checks, and deployment commands | [README.md](../README.md) |

Recorded from the website and blog decisions agreed in this conversation on 10 November 2026.

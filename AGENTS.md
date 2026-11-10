# Working on this website

Read [docs/WEBSITE_DECISIONS.md](docs/WEBSITE_DECISIONS.md) before changing the profile, blog, illustrations, or layout. It records Khalil's decisions for this project. Later explicit user instructions take precedence; update the document when a decision changes.

- Preserve the approved article narrative during illustration-only changes.
- Follow the selected whiteboard sketch style for new article diagrams: neat lettering, readable labels, simple boxes, clear relationships, and focused views.
- Keep professional claims grounded in the supplied CV and project claims grounded in implementation. Check current source before extending a claim.
- Keep the Sparxity professional case study under Work and its employment history in About. The homepage uses the separate `homepageExperience` selection.
- Use `README.md` for development commands and `docs/ASSET_SOURCES.md` for image provenance and diagram regeneration.

For website source changes, run the appropriate tests, `npm run build`, and `npm run check:links`. CI also checks a project base path derived from the GitHub repository name. The public Pages address is `https://labo-man002.github.io/Khalil/`; preserve the capital K. For documentation-only changes, check references and `git diff --check`; a website deployment is unnecessary.

Ask focused questions when a missing preference would materially change the result. Continue routine work within the requested scope using the decisions already recorded here.

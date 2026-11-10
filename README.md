# Khalil Ben Maaoui — personal website

A static portfolio and engineering notebook built with Astro. Includes an introduction, professional experience, education, skills, a Sparxity / SpiNNaker2 professional case study and two public project case studies, four illustrated engineering notes, a searchable writing archive, RSS, sitemap, accessible navigation, and the provided CV download.

## Local development

Requires Node.js 22.12+ (Node 24 is used in CI).

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run check:links
```

The initial managed build was verified with static output and internal-link checks. Browser QA depends on the preview/browser capabilities of the execution environment.

## Update your profile

- `src/lib/site.ts`: profile links, experience, education, expertise, and project case studies.
- `src/pages/about.astro`: the personal introduction.
- `public/resume.pdf`: replace this with a newer CV using the same filename.
- `src/styles/global.css`: the visual system and responsive layouts.

Profile content is based on the latest user-supplied `Khalil_Ben_Maaoui_Distributed_Systems_CV.pdf`. The site intentionally uses the professional email rather than the different GitHub account email. Private GitHub projects are not included. Source material and intermediate extracts are not committed.

## Add an article

Create a Markdown file in `src/pages/writing/`. The filename and `slug` must match. Example:

```yaml
---
layout: ../../layouts/Post.astro
title: "A concrete engineering question"
description: "What the article explains."
slug: a-concrete-engineering-question
date: "2026-11-10"
category: Architecture notes
tags: [Architecture, Placement]
readTime: 5
---
```

The homepage, writing archive, RSS, and sitemap pick it up at build time. For images in `public/images`, use an HTML image tag such as `<img src="../../images/example.png" alt="A useful description" />`; this preserves both root and project-prefix hosting without treating the public file as a source import. Use topic tags from the archive filters (`Architecture`, `Placement`, `Simulation`, `Networking`) when appropriate. These are authored posts, not claims of peer-reviewed publication or measured performance beyond the cited source.

## Deployment

The tracked `.openai/hosting.json` identifies the managed Site and declares `dist` as its static output. `npm run build` generates that output. The source is also maintained on GitHub.

For a custom domain, set `SITE_URL` when building. For a GitHub Pages project site:

```sh
SITE_URL=https://labo-man002.github.io BASE_PATH=/personal-site/ npm run build
BASE_PATH=/personal-site/ npm run check:links
```

The CI workflow validates both root hosting and the Pages project prefix. The separate **Publish to GitHub Pages** workflow is manually triggered. Before using it, enable GitHub Pages with GitHub Actions as the source in repository settings. A private repository requires a GitHub plan that supports Pages for private repositories; otherwise change the repository visibility deliberately or use the managed Site. Do not treat the expected Pages URL as deployed until the workflow succeeds.

## Content and illustrations

Professional claims follow the provided CV. Public-project descriptions follow their public READMEs and implementation boundaries. The standalone leaf–spine prototype remains separate from actual allocations. Application screenshots and historical ERD artwork are copied from the public job-scheduler repository. Current class and ERD diagrams are rendered with Graphviz from documented class responsibilities and a pinned ORM schema snapshot. The official Sparxity system photograph is sourced from sparxity.ai and credited in the interface.

There are no analytics, cookies, accounts, contact-form storage, or runtime secrets. Contact links use email, LinkedIn, and GitHub directly. No license for redistribution of personal content or the CV is granted by this repository.

## Technical diagrams

Run `python3 scripts/render-diagrams.py` with Graphviz installed to regenerate the class architecture and current-model ERD SVGs. The checked-in `docs/diagrams/schema-snapshot.json` records the source commit and exact ORM columns and foreign keys. Original project ERDs are labeled as historical because their enum lookup-table design differs from the current models. See `docs/ASSET_SOURCES.md` for image sources.

Run `python3 scripts/render-article-diagrams.py` for the article's hand-positioned architecture and ownership SVGs. Its illustrated article uses `wideDiagrams: true` in frontmatter to give figures the page width while keeping prose at a readable measure. Full-size SVG and PNG links accompany each figure.

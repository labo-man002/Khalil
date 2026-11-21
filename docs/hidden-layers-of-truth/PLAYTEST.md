# Chapter 1 · اللي ما تقالش

## Run the game

Use Node 24, as the portfolio does in CI.

```sh
npm ci
npm run dev:game
```

To test the production layout under the GitHub Pages project prefix:

```sh
BASE_PATH=/Khalil/ SITE_URL=https://labo-man002.github.io npm run build
BASE_PATH=/Khalil/ npm run check:links
BASE_PATH=/Khalil/ npm run preview
```

Open the preview at `/Khalil/hidden-layers-of-truth/`. `npm run build` rebuilds the game into its own generated folder before Astro copies public files. The game uses relative asset URLs. `npm run dev:game` runs Vite directly with hot reload. `npm run dev` builds the game once before launching the portfolio dev server.

## Verification

```sh
npm test
npx playwright install chromium --only-shell
npm run test:game:browser
```

Run the browser test after building with the Pages prefix. To use an installed browser, set `CHROMIUM_BIN` to a compatible Chromium executable. Set `GAME_SCREENSHOTS_DIR` to capture PNGs from the scripted desktop run. Coverage includes the production URL shape, all three endings at 1366px, 390px and 320px, keyboard and touch input, reduced motion, audio preferences, journal, confidence, reload and resume, and restart confirmation. The Node tests exercise the fourth investigative lead, evidence snapshots, reachability, save rejection and all required facts.

## Implementation

The game uses modern JavaScript modules and Vite for its static build. Canvas draws the environments and portraits. The dialogue, hotspots, journal and settings use native HTML controls. One chapter does not require a physics engine, and the project uses the same Vite version as the portfolio. The authored narrative lives in `content/`; transitions and storage live in `engine/`.

Progress uses a versioned, ordered local event log. The engine replays it to recover the current dialogue line, evidence, actions and judgment history. Choices take effect on confirmation. Pending selections and slider changes become part of the run when submitted. A save from the old prototype starts a fresh run with an explanation. Game settings use a separate local key. The game makes no analytics requests.

The reflection applies deterministic rules to the interpretations chosen before and after opening the bank records, their original confidence, newly available evidence and the decision about sharing a rumor. Keeping a hypothesis can make sense when new evidence supports it. The screen shows earlier choices alongside their sources. It assigns no personality type or faith score.

## Assets and writing

All environment art and portraits are original Canvas drawings from `render/art.mjs`. Music and the journal chime are original Web Audio compositions from `render/audio.mjs`. The game uses system fonts and no external runtime artwork or music. The attributed Qur’an excerpt is from [Al-Hujurat 49:12](https://quran.com/ar/49/12).

Dialogue uses written Tunisian Darja. Its phrasing, pacing, visual direction and the endings are ready for creative review. The 20–35 minute target needs a timed human playtest. Audio is synthesized and the dialogue is text-only. Chromium coverage uses emulated touch and viewport sizes. Physical phones, Safari and Firefox have yet to be checked.

# Hidden Layers of Truth — Codex Implementation Specification

**Status:** approved direction for engineering work; creative narrative and player feedback remain subject to review.
**Version:** 1.0 (first polished playable chapter)
**Repository:** `labo-man002/Khalil`
**Current playable prototype:** `public/hidden-layers-of-truth/index.html`
**Production route to preserve:** `https://labo-man002.github.io/Khalil/hidden-layers-of-truth/`
**Languages:** player-facing content in natural Tunisian Darja, Arabic script and RTL. Technical docs/code can be English.

## 1. Product vision

Make a polished, atmospheric browser-based 2D psychological mystery—not a multiple-choice quiz with pictures.

The player is Sami, a young volunteer at a community organization. He interprets ambiguous social signals surrounding a fundraising report. The investigation forces him to separate **what he observed, what he inferred, what is established by evidence, and what he cannot know about another person's intention**. The theme is حُسن الظنّ وسوء الظنّ in contemporary Tunisian life. Gameplay should provoke reflection without forcing one religious response or turning the profile into a religious score.

**Design pillars**
1. Story first: characters have credible motives and decisions change conversations and relationships.
2. Playable investigation: inspect locations/objects, collect and compare evidence, choose dialogue and actions.
3. Epistemic ambiguity: trust can be naive; suspicion can be justified; caution can be appropriate; silence can harm.
4. Darja authenticity: colloquial, intelligible Tunisian voice; no generic MSA-sounding conversation.
5. Reflection without diagnosis: the game shows patterns in this fictional run, not scientific personality types or the player's faith.

## 2. Delivery scope and acceptance

Build **one complete, polished Chapter 1** with a target duration of ~20–35 minutes, replayable with branching outcomes. Build a maintainable platform for future episodes, but **do not** spend time on a backend, multiplayer, online accounts, AI dialogue, procedural world generation, payments or a full multi-chapter game.

### Player experience
- Landing/title screen with **Start**, **Continue**, **Settings**, **Chapter / About**, and keyboard controls hint.
- Intro cinematic, atmospheric music and sound effects enabled by default and started on player interaction. Remember an explicit mute preference. Include subtitles or text.
- At least three visually distinct navigable 2D locations: Sami's room, The Bridge's community office, neighborhood café or street. A player can move or select hotspots with mouse/touch and keyboard; interactive objects visibly respond.
- Conversations with Sami, Adam, Lina, Youssef, Maryam; portraits/expressions, speaker names, readable dialogue, skip/typewriter toggle.
- A minimum of seven substantive judgment/decision moments, each with confidence (0–100%) where relevant; an alternative "I don't know" when epistemically appropriate.
- Evidence board/journal that distinguishes **verified observation**, **testimony**, **unverified inference**, and **disputed information**; shows sources and what is still unknown.
- At least one **belief revision** moment: show an earlier judgment and its confidence, reveal genuinely new evidence, then let player update or retain judgment with confidence. Preserve event history.
- At least three meaningful endings with shared canonical facts but different relationships / public correction / available information—not only differently worded epilogues. Allow replay.
- Save/continue, restart with confirmation, completion state, basic game settings including sound level and reduced motion.
- Final reflection displays specific earlier choices and uncertainty, not a rigid "INFJ" diagnosis or faith score.

### The canonical plot (preserve these facts)
- Sami is preparing fundraising figures for local group "الجسر".
- Adam reads a message but doesn't reply and is seen in an outing with Youssef; Lina warns Sami not to submit the report yet.
- Youssef publicly suggests that Sami's figures were inaccurate; Adam stays silent; Lina objects.
- A mismatch of **€2,400** appears between two versions of a report. A note references "Y".
- A volunteer repeats a claim supposedly made by Youssef; the exact wording/context remains uncertain.
- Adam admits he knew about the alteration, kept quiet fearing his younger brother's aid might be jeopardized, and acknowledges his silence hurt Sami. Motive explains but does not excuse impact.
- Maryam, Sami's sister, mirrors the unread-message situation. Similar behavior may have different contexts and consequences.
- Lina's investigation reveals an **inadequately documented reclassification**, not available evidence of theft. Youssef is accountable for the communication/documentation without the game claiming to know his private heart.
- Do **not** add a revelation proving theft or a wholly innocent "everyone misunderstood" twist just to manufacture surprise.
- Religious reference: Qur'an Al-Hujurat 49:12, clearly attributed and accurately quoted. Do not invent quotations, fatwas, doctrinal assertions, or present dramatic dialogue as religious authority. Include an optional source/context panel. Respectful portrayal of religious characters, including Youssef.

### Narrative branching expectations
- Initial interpretations affect tone/next investigative affordances but are not silently treated as facts.
- Investigative choice (records / talk to Adam / speak with Youssef / ask witnesses) unlocks different evidence, social flags and future dialogue.
- Some routes should yield incomplete information; do not give every player identical journal content immediately.
- Relationships and evidence flags have mechanically meaningful effects at ending. Prevent unreachable scenes or soft locks.
- The story must work even if psychological metrics are hidden. Avoid revealing "correct answers" or showing score deltas during play.
- Keep the narrative data-driven (chapter files rather than huge inline strings in one HTML file).

## 3. Visual and interaction direction

**Style:** cinematic, moody 2D pixel art / illustrated pixel aesthetic, North African modern urban environment, rainfall, dusk, café warmth, muted navy/teal with amber highlights. Avoid generic programmer demo graphics. Character silhouettes should be distinguishable and have at least three expressions if practical.

Use original or properly licensed assets, document attribution/licenses in `docs/ASSET_SOURCES.md` or a game-specific equivalent. If no suitable art assets are available, create original CSS/canvas/vector art and polished visual composition—not unlicensed web images. Use reliable fallback backgrounds. Audio must be original or licensed, no borrowed copyrighted music.

**UI requirements:** RTL-first; comfortable Arabic type and line-height; correct LTR isolation of dates, currency, numbers and URLs; responsive desktop/mobile; 44px touch targets; high contrast; visible focus; pause/settings controls; no inaccessible color-only evidence states; small animations with reduced-motion support.

## 4. Architecture and implementation

**Current repo is an Astro 7 static portfolio**, using `npm ci`, `npm test`, `npm run build`, and GitHub Pages with repo base path `/Khalil/`. Read `AGENTS.md`, `docs/WEBSITE_DECISIONS.md`, `package.json`, and existing CI *before* changing anything.

The game currently lives in a single standalone file under `public/hidden-layers-of-truth/index.html`. Treat it as source material, not as the target architecture.

**Recommended implementation:** a small isolated game package under `games/hidden-layers-of-truth/` with TypeScript, Vite and Phaser for 2D scenes, plus React (or lightweight UI components) for dialogue/journal/settings. A lighter equivalent is acceptable if it meets quality and maintainability. Separate:
- `engine/`: deterministic scene/decision transitions, conditions, evidence flags, versioned persistence;
- `content/`: narrative scenes, localized dialogue, evidence definitions, branching predicates;
- `render/`: 2D scene, hotspots, character animations, input/audio;
- `ui/`: dialogue choices, journal, confidence, menu, settings;
- `reflection/`: transparent rule-based in-story analysis;
- `tests/`: unit, narrative reachability, integration/E2E.

**Deployment integration:** Ensure the game's built static output is copied to `public/hidden-layers-of-truth/` **before Astro builds**, without clobbering other portfolio files. Prefer relative asset URLs or an environment-aware base path so the GitHub Pages URL above works. Update package scripts/lockfile and CI as necessary. Keep the existing site and its URL, styles, posts and work case studies intact.

No external API key or backend necessary. Offline-friendly after load is a bonus, not a blocker.

### Illustrative event model

```ts
type JudgmentEvent = {
  id: string;
  sceneId: string;
  propositionId: string;
  selectedInterpretation: string;
  confidence: number;        // 0–1
  evidenceVisible: string[]; // snapshot at judgment time
  revisedFrom?: string;
  createdAt: number;
};

type StoryState = {
  schemaVersion: number;
  sceneId: string;
  visitedSceneIds: string[];
  evidenceIds: string[];
  choices: Record<string, string>;
  relationshipFlags: Record<string, number>;
  judgments: JudgmentEvent[];
  settings: { music: boolean; volume: number; reducedMotion: boolean };
};
```

Do **not** conflate (1) belief, (2) chosen action, and (3) underlying narrative fact. A suspicious hypothesis followed by an empathetic action should remain representable.

## 5. Reflection and personality scoring

The game initially profiles **in-story reasoning patterns**, not MBTI, psychiatric traits, intelligence, moral worth or religious sincerity. Example dimensions:
- evidence discipline (observation vs unsupported inference)
- uncertainty tolerance (appropriate confidence when information is incomplete)
- belief updating (direction and magnitude of revision when stronger evidence appears)
- interpersonal interpretive stance (do not assume charitable = always correct)
- action under uncertainty (can set boundaries while withholding motive claims)

For v1, keep scoring deterministic, documented, and traceable to actual events. Show qualitative patterns with examples and a disclaimer; do not invent a scientific percentage if unsupported. If numerical UI is used, call it **gameplay reflection indicators**, not validated personality measurement. Do not reward religious agreement. Do not treat every revision as good or every stable opinion as bad.

Privacy: local-only saves by default; no analytics or collection of religious belief information.

## 6. Engineering quality gates

A task is not finished until:
1. `npm ci`, existing site tests, game unit tests, Astro production build and link checks pass; any command change is documented.
2. E2E (e.g. Playwright) verifies: loading the **built production path**, starting new game, moving/interacting, advancing dialogue, choosing a judgment, entering confidence, journal visibility, refresh+resume, replay, reaching each ending and restarting.
3. Automated tests enumerate/validate narrative transitions: no missing scene IDs, no infinite loop, reachable ending conditions, all required evidence IDs exist, save recovery from corrupt/outdated state.
4. No uncaught browser console errors, missing images/fonts/audio, broken route or blank app shell; test desktop and narrow viewport.
5. Checks for Arabic text direction, keyboard operability, touch affordances and reduced-motion preference.
6. Avoid changing unrelated portfolio content; provide screenshots or a short screen recording of intro, investigation, journal and end screen in PR where supported.
7. Deliver a PR from a feature branch; include deployed route, instructions for preview, tests actually run, remaining limitations and any deliberately deferred features. Do not merge without review.

## 7. Execution plan for Codex

Work in **small coherent commits**. Prioritize actual playability over creating a large architecture.

**Milestone A — Audit & foundation:** inspect prototype/repo/CI; define narrative nodes and game-state model; isolate code in modules; ensure Astro deployment path and smoke test work. Keep old live page functional until replacement passes.

**Milestone B — Moment-to-moment game:** implement atmospheric 2D scenes, one explorable location and reusable hotspots, dialogue UI, sound controls, accessible input, responsive Darja typography.

**Milestone C — Rich vertical slice:** port/improve full chapter beats; character reactions, investigating evidence, genuine branching and belief revision; journal and event history.

**Milestone D — Reflection, QA & delivery:** robust save/continue, three endings, deterministic reflection, test suite, screenshots, documentation, PR.

If scope is too large for a single task, finish **Milestones A and B as a fully playable 8–12-minute vertical slice with working build/QA**, then provide a concrete checklist for C/D. Do not pretend the full chapter is complete. Never publish an untested blank page.

## 8. Definition of success

A new player opens `https://labo-man002.github.io/Khalil/hidden-layers-of-truth/`, starts a moody interactive mystery in natural Tunisian Darja, explores locations and evidence, makes judgments with genuine consequences, revises at least one belief, finishes an emotionally coherent chapter, and reads an evidence-grounded reflection. The experience should feel like a small, complete game—not a website form.

---
**Human creative approval checkpoints:** review the scene writing/art direction after Milestone B and the ending/reflection wording after Milestone C. Engineering checks can continue without waiting for creative decisions that do not block implementation.

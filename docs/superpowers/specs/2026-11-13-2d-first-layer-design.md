# The 2D first layer: framework, demo game, editors, site and deployment

Written 2026-11-13, from the Owner's brainstorm in the AF V2 project. Stage 1 (Spec) of the project workflow.

## Principles served

| Principle | How this spec serves it |
|---|---|
| 1. Agent-first | Every piece of content is a documented JSON file with a published schema; editors read and write only those files, in the game's own GitHub repo, so an agent and a person edit the same thing. `automata check` is the one command that says whether a game is sound. |
| 2. iPad-first editors | All editors are designed and tested at iPad size first, with touch; the paid editor app ships on iPad before anything else mobile. |
| 3. Layers in order | This is the 2D layer, built in full: runtime, editors, publishing. No 3D code. The 3D layer (a later spec) is the first to deploy multiplayer. |
| 4. Separate repos | Four repos, each with its own release: framework, examples, editors, site. |
| 5. Builders carry over | The figure builder and environment builder come over as editors, cut down to 2D art. |
| 6. Stack carries over | The stack below is the old one, with a written reason beside each thing left out. Rapier and Colyseus move from opt-in extensions into the core. |
| 7. Port in layer order | The old repo is a reference, not a template. Nothing is built before the milestone that uses it; networking is built and proven but not deployed, because its first real user is the 3D game. |

## Why

The first attempt (AutomataFrameworkFailed) grew large pieces that never met: 3D and a showcase game started before 2D
shipped, and most claims on its site were true only on branches. This layer proves the whole offering end to end, in
the smallest form that is still true: one game, made with the framework, changed in the editors on an iPad, checked in
CI in four engines, and live at a link.

The offer, as the old site put it, and every claim must be true when this layer is done:

1. **The part after the demo is already done.** Every game starts with saves; title, pause and settings screens;
   keyboard, touch and gamepad with keys players can change; music and sound with volume; layouts for phone, tablet and
   computer, upright or sideways; menus in several languages; and it is built for multiplayer from the start.
2. **Built for agents.** A game is small files with plain names; agent skills say where things live; `automata check`
   runs the rules, the types and the tests.
3. **Your agent can't quietly break your game.** A recorded play replays to the same hash in Node, Chrome, Safari and
   Firefox, physics included, and CI fails when it doesn't.
4. **Change it yourself, without another prompt.** Free browser editors for every kind of content, usable on an iPad;
   what you save is what the game plays.
5. **Get it in front of players.** One command publishes to the web, itch.io, or a desktop app.

And one more, the way the project is paid for: **the editors as a paid app** for iPad and desktop. The browser editors
stay free.

## Goals

- `@automata/framework`: a deterministic 2D runtime with ECS, physics and networking in the core.
- A small original physics platformer in AutomataFrameworkExamples that carries everything in claim 1 and enough content
  for every editor to have real work.
- The editor suite: nine editors and two builders, browser and Tauri app.
- A site modelled on pixijs.com: the claims, the game playable on the home page, guides, an examples gallery, the API
  reference, and the free browser editors.
- Deployment: the site and web game live, `automata ship` to web, itch.io and desktop, the editor app built for iPad
  and desktop.

## Non-goals

- Anything 3D, including Pixi 3D, `@pixi/3d`, 3D figures and 3D scenes. The builders paint 2D art only.
- Ruken as a target (the vision leaves it out).
- Multiplayer in the demo game. It ships single-player, built as if it were multiplayer.
- Deploying the room server. It is built and proven in CI; Fly.io hosts it once the 3D game uses it.
- Android. iPad is the mobile platform that the principles name; Android waits for the Owner's word.
- A port of the old packages. Old code may be read and lifted where it is the best answer, but each piece is judged
  fresh.

## Anti-goals (failure even if it technically works)

- A claim on the site that is true only on a branch, or only in one engine.
- An editor action an agent can't do by editing files, or a file an editor writes that its schema doesn't document.
- A game that needs the framework's internals: the demo game uses only the published package, like any outside game.
- Four repos that each work but don't meet. The thin thread in milestone 1 exists to stop this.
- An iPad editor that only works when a computer is on.

## Decided with the Owner

| Question | Decision |
|---|---|
| What "deterministic" means | Physics: a real physics engine, deterministic across engines. |
| Physics engine | Rapier's deterministic 2D build (`@dimforge/rapier2d-deterministic-compat`), the only engine already seen to hash the same in Node, Chromium, WebKit and Firefox. |
| Physics and networking | In the core, like the ECS. Not extensions. |
| Multiplayer | Every game is built multiplayer-ready; turning it on is a per-game choice. |
| The demo game | A small original physics platformer, single-player. |
| How much networking now | Built and proven (CI test: a room server and two headless players end on the same hash), not deployed. |
| Room server host, when deployed | Fly.io. |
| Editors | All the old 2D editors return, plus the figure and environment builders. |
| Builders | 2D art only. |
| Repos | AutomataFramework, AutomataFrameworkExamples (this game, later the 3D game, and the site's examples), editors, site. |
| Biggest inspiration | PixiJS: a small core, examples that are one short runnable file each, a site with guides, live examples and the API. |
| Where an iPad edit lives | In the game's GitHub repo. Sign in with GitHub; Save makes a commit. |
| Order of work | A thin thread through all four repos first, then widen. |
| Paid product | The editors as Tauri apps for iPad and desktop. |
| Plans | Written in separate sessions (Fable 5.2, medium), one per plan, after this spec is committed. |

## Approaches considered

1. **A thin thread first, then widen (chosen).** Milestone 1 joins all four repos at their smallest; later milestones
   fill each in. The hard joins (an iPad save becoming a commit, CI in four engines, a deploy) are proven in the first
   milestone, not the last. Chosen because the first attempt failed at exactly those joins.
2. **One repo at a time, in layer order.** Framework in full, then game, editors, site. Simpler to plan, but the first
   time an iPad edit reaches a live game is at the very end.
3. **Port the old packages and trim them.** Fastest start, but the Owner asked not to be chained by the old repo, and
   it carries its sizes and its shape with it.

## The stack

Carried over, at the old repo's pinned versions unless a plan moves one (one upgrade per pull request):

| Library | Version (old pin) | Role here |
|---|---|---|
| TypeScript, strict | 7.0.2 (6.0.3 where a tool needs the JS API) | Everything |
| Koota | 0.6.6 | ECS inside the sim, behind a facade with stable ids |
| Rapier 2D deterministic | 0.21.0 | Physics inside the sim (now core) |
| Colyseus (`core`, `schema`, `sdk`, `ws-transport`, `testing`) | 0.18.x line | The room server and client (now core) |
| PixiJS | 8.22.0 | All rendering; every game imports the no-eval entry first |
| Svelte 5 | 5.57.1 | Screens, HUD and the editors' UI |
| Zod | 4.6.6 | The only schema language: content, commands, saves |
| Paraglide | 2.25.4 | Typed messages per language |
| Effect | 3.22.2 | Node tooling only (the `automata` command, the room server's host process). Never in the sim or browser code. |
| Tauri 2 | 2.12.x line | Desktop game builds; the editor app on iPad and desktop |
| Vite, Vitest, Playwright | 8.3.3, 5.0.3, 1.63.0 | Build, unit and parity tests, journeys |
| Biome, knip, changesets | 2.5.15, 6.39.0, 3.0.3 | Lint and format, unused code, releases |
| API reports | the old `api-report` approach | Each published package's public surface is reviewed in a committed report |

Left out, with the reason:

| Left out | Why |
|---|---|
| Ruken SDK | The vision leaves Ruken out as a target. |
| Pixi 3D (`@pixi/3d`) | 3D is a later layer; it arrives with that layer's spec. |
| Rapier 3D | Same. |
| smol-toml, TOML content | Content is JSON (see Content files). JSON needs no parser, an editor writes it back exactly, and the project's structure rule already keeps library data as JSON. *My call; the Owner can overrule.* |
| turbo, pnpm workspaces across packages | No monorepo: one package per repo. pnpm stays as the package manager. |
| Self-hosted runners | CI is GitHub-hosted, which also installs WebKit and Firefox, so parity runs in CI for the first time. |

No other new dependency is added without the Owner's yes; a plan that needs one stops and asks.

## The four repos

Each repo has one package, its own release, and the project's structure rule: `src/index.ts` (the public surface),
`src/lib/` (shared helpers, no feature logic), `src/features/<feature>/` (`<feature>.ts` entry, one job per file,
`library/` for JSON data), `scripts/` (thin CLI wrappers), and `tests/` mirroring `src/` with
`tests/architecture.test.ts` (imports go down, no cycles, no tests in `src`) and `tests/golden/`. A feature imports only
from features below it.

### AutomataFramework: `@automata/framework`

Published to npm. Feature layers, lowest first (a plan may split or rename one, but not reorder the dependency
direction):

1. **sim**: the deterministic core. Koota behind a facade with monotonic stable ids and id-ordered iteration; fixed tick
   (60 Hz); seeded RNG; deterministic math; canonical hashing (xxhash64); snapshot and restore; systems in named
   phases; the sim has no I/O, no wall clock and no `Math.random`.
2. **physics**: Rapier's world created and stepped inside the sim's physics phase; bodies and colliders as components;
   collision events as sim events; the Rapier world included in snapshot and restore, and in the hash.
3. **commands**: every input reaches the sim as a command from a numbered player, recorded with its tick. One player is
   the single-player case of many: nothing in the sim may assume a single player. Replays are recorded command logs.
4. **net**: the room server (a Node entry, `@automata/framework/server`, on Colyseus) and the client. Model: the server
   relays each tick's commands and runs the same sim authoritatively; clients predict their own commands and roll back
   and replay when the server's tick differs; periodic hashes detect a desync. *My call on the model; the plan details
   it.*
5. **content**: the Zod schemas of every content file, loading, validation with `file: path` diagnostics, and the JSON
   Schema exported for agents and editors.
6. **render**: Pixi start-up (WebGL2 default), the scene drawn from sim state through render deltas with interpolation.
   Presentation observes; it never decides.
7. **input**: keyboard, touch (on-screen controls) and gamepad mapped to commands; bindings players can change.
8. **audio**: music and sound effects, with volume per channel.
9. **saves**: save slots through the host; never a silent fallback to device storage.
10. **locale**: Paraglide messages and the language choice (the player's saved choice, then the host, the browser,
    the default).
11. **story**: what the Writer, Schematic and Sequence editors author: dialogue, character behaviour rules and
    cutscenes, run by the sim.
12. **ui**: the Svelte kit, mobile first: touch targets of at least 44 px, layout from container size, focus kept
    through rotation.
13. **screens**: title, pause, settings (controls, volume, language), and the saves screen.
14. **host**: the port a game talks to (saves, links, quit, locale). Targets are adapters: `web`, `itch`, `tauri`.
    Only the Tauri adapter imports `@tauri-apps/*`.
15. **cli**: the `automata` command (Node, Effect): `create` (a new game from a template), `check` (lint, types, schema
    validation, the game's tests), `ship` (web, itch, desktop).

Agent skills ship with the package (a `skills/` folder or a plugin, as the plan decides): where gameplay lives and the
rules a game must keep.

### AutomataFrameworkExamples

Uses `@automata/framework` only as published (pinned to a released version), like an outside game. It holds:

- **The demo game** (a working name until the Owner names it): see The demo game.
- **The site's examples**: one short runnable file per feature, PixiJS-style, each the source of an examples-gallery
  entry. Milestone 4 decides the first set; every one runs in CI.
- Later, the 3D game (its own spec).

### The editors

One repo, one suite: nine editors and two builders, a free browser build hosted on the site and a paid Tauri app. Each
editor knows only the framework's content schemas, so it works on any game made with the framework.

- **Opening a game.** Sign in with GitHub, pick a repo, and the suite reads the game's project file (which lists its
  content files and the editor that opens each). The Tauri app signs in with GitHub's device flow from its native side.
- **Saving.** Save commits the changed files to the repo's default branch through GitHub's API, with the file's last
  known version. If the file changed since it was opened (an agent, another device), the editor says so in plain words
  and offers to reload or to save to a new branch. *My call; the plan details the words and the flow.*
- **Problems** are listed as you edit, from the same validation `automata check` runs.
- **Playing.** The suite plays the game from the repo's current files, so a change shows in play.

| Editor | What it edits |
|---|---|
| Levels | Placing tiles, bodies, items, characters and start points in a level |
| Tiles | Tilesets and their auto-tiling rules |
| Characters | A character's animation clips and what each kind of entity is |
| Tuner | Controls and the movement numbers (run speed, jump height, gravity) |
| Feel | Effects when something happens: dust, screen shake, a freeze |
| Audio | Sounds made of tones and noise, music, and what plays when |
| Writer | Branching conversations |
| Schematic | How a character decides: its behaviour rules |
| Sequence | Cutscenes: camera and actor keys on a timeline |
| Figure builder | Characters painted as pixel art from a figure file, as sprite sheets |
| Environment builder | Backdrops (parallax layers) and props painted as 2D art |

The builders are free to run (no paid service, no model call) and write PNGs and atlases into the game repo beside the
figure or scene file that made them, so an agent can change a figure file and rebuild the same art.

### The site

Its own repo, a static site in the style of pixijs.com:

- **Home**: the five claims, each true today, with the demo game playable on the page.
- **Guides**: start a game, make it with an agent, edit it, publish it.
- **Examples gallery**: the examples from AutomataFrameworkExamples, each live and with its source.
- **API reference**: generated from the framework's API report.
- **The free editors**, and where to buy the app.

Hosted as static files. *My call: GitHub Pages on the Owner's domain; see Open for the Owner.*

## The demo game

A small original physics platformer. You run and jump, push crates, ride a seesaw and a swinging platform, collect
sparks, and reach the door. Single-player, but every input is a numbered player's command and the sim is ready for 2 to
4 players sharing a level.

Content, so that every editor has real work:

| Editor | Content in the game |
|---|---|
| Levels | Two short levels, each with tiles, crates, the seesaw, the swinging platform, sparks, the door and start points for 4 players |
| Tiles | One tileset with its auto-tiling rules |
| Characters | The hero's clips (idle, run, jump, fall, land, push), and the crate, spark, door, keeper and critter kinds |
| Tuner | The controls and movement numbers |
| Feel | Dust on landing, a shake when a crate drops, a short freeze on a spark |
| Audio | Jump, land, spark, crate thud and door sounds, and one music track |
| Writer | A keeper at the start of level one, with a short conversation and one choice (a hint about the seesaw) |
| Schematic | A critter that wanders and runs away when the hero comes near |
| Sequence | A camera pan across the level at its start, and the door opening at the end |
| Figure builder | The hero, the keeper and the critter |
| Environment builder | The backdrops and props of both levels |

And every built-in from claim 1: saves (progress and settings), title, pause and settings screens, keyboard, touch and
gamepad with remapping, music and sound with volume, phone, tablet and desktop layouts upright and sideways, and three
languages: English, Spanish and Japanese (Japanese proves a non-Latin font). *The languages are my call.*

Its golden: a recorded play through level one that ends on the same hash in Node, Chromium, WebKit and Firefox.

## Milestones

Built in order. Each milestone is planned per repo; every plan goes through the project's stages (plan, plan audit,
execution, implementation audit, fixes, Owner review) and lands by pull request. A milestone is done when its "done
means" holds on each repo's `main`, proven by CI.

### M1: the thin thread

- Framework: sim, physics, commands and replay, content (level and character only), render, keyboard and touch input,
  the web host. Published to npm.
- Examples: one level with the hero and one crate, from the published package.
- Editors: the suite shell, GitHub sign-in and save, and the Levels editor moving the crate, in the browser, at iPad size.
- Site: one page with the game playing, deployed.
- CI: the replay hash the same in Node, Chromium, WebKit and Firefox.

Done means: on an iPad, open the game in the browser editor, move the crate, save; the commit lands in the examples repo,
CI checks it in four engines, and the site's game shows the crate where it was moved.

### M2: the framework in full

- Everything in claim 1: gamepad and remapping, audio and volume, saves, screens, layouts, languages.
- Networking built and proven: the room server and two headless clients end on the same hash in CI, prediction and
  rollback included.
- Story features (dialogue, behaviour rules, cutscenes) in the sim.
- `automata create` and `automata check`, and the agent skills.
- The demo game's full content (written by hand or by agent, before its editors exist).

Done means: the demo game plays end to end with every built-in, in the four engines' parity and in journeys at phone,
tablet and desktop sizes; `automata create` makes a new game that passes `automata check`.

### M3: the editors in full

- The other eight editors and both builders, each editing the demo game's real content.
- Problems listed as you edit; conflict handling on save.

Done means: each editor changes the demo game on an iPad, the change commits and shows in play, and an agent can make
the same change by editing the files.

### M4: the site and publishing

- The site in full: home with the claims, guides, the examples gallery, the API reference, the free editors.
- `automata ship` to web, itch.io and a desktop app (macOS, Windows, Linux via Tauri).
- The editor app built for iPad and desktop, signed and submitted for sale.

Done means: every claim on the site is backed by something on `main`; the demo game is on itch.io and as a desktop
download; the editor app passes App Store review for iPad and is on sale for desktop.

## CI and testing

- GitHub-hosted runners only. Ubuntu for lint, types, unit tests, parity in Chromium, WebKit and Firefox, and journeys;
  macOS for the iPad and macOS app builds; Windows for the Windows build.
- Tests are never run locally (project rule); a change is verified by its pull request's CI.
- A hash that moves is investigated, never re-recorded per engine. A golden moves only with the Owner seeing before and
  after.
- Behaviour is proven with DOM tests, layout with real-browser tests, and composition with journeys.

## Constraints

- The sim has no I/O, no wall clock and no `Math.random`; only the sim changes gameplay state.
- Effect is for Node tooling only.
- PixiJS is the only renderer.
- Zod is the only schema language.
- A source file has at most 600 lines.
- Touch targets are at least 44 px; primary actions 48 px.
- Five branches at most across the project; one pull request per piece of work.
- `main` is protected in every repo from the day the repo is created (the Owner, 2026-11-13): changes land only by pull
  request; no direct pushes, no force pushes, no deletion; once a repo has CI, its checks must pass before a merge. No
  human approving review is required, because the merge session merges passing pull requests. Setting the rule is the
  Owner's (repo admin); a stage that finds a repo without it stops and says so.

## Open for the Owner

Things only the Owner can decide or provide; each plan that needs one stops and asks:

1. **GitHub sign-in in the browser editor.** GitHub's token exchange can't be called from a browser page, so the
   browser editors need a small server-side step. The Tauri app doesn't. Options: a free serverless function
   (Cloudflare Pages Functions, which would also host the site), or a tiny service on Fly.io. *Needed by M1.*
2. **The domain and the site's host.** The old site used automataframework.com. *Needed by M1.*
3. **npm publishing** under the `@automata` scope (the Owner's `NPM_TOKEN`). *Needed by M1.*
4. **The demo game's name.** *Needed by M4, for the site; a working name until then.*
5. **Stores and signing for the editor app:** an Apple Developer account for iPad and macOS, Windows signing, and where
   the desktop app is sold (itch.io paid page is the simplest; the Mac App Store is an option). The App Store may
   question an editor that plays a game's JavaScript; the plan checks the current guideline before M4 starts.
   *Needed by M4.*
6. **itch.io** account and API key for `automata ship`. *Needed by M4.*

## Left to the builder (the plans)

- The file layout of the game repo and its project file, and every content schema's fields.
- The exact feature boundaries inside each layer, within the order above.
- The networking protocol details, the snapshot format, and the replay file format.
- Which old code is lifted, with the source commit noted, and which is written fresh.
- The examples gallery's first set.
- The editors' screens, within the iPad-first rules.

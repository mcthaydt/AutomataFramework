# The 2D first layer: framework, demo game, editors, site and deployment

Written 2026-11-13, from the Owner's brainstorm in the AF V2 project. Stage 1 (Spec) of the project workflow.

## Principles served

| Principle | How this spec serves it |
|---|---|
| 1. Agent-first | Every piece of content is a documented JSON file with a published schema; editors read and write only those files, in the game's own GitHub repo, so an agent and a person edit the same thing. `automata check` is the one command that says whether a game is sound. |
| 2. iPad-first editors | All editors are designed and tested at iPad size first, with touch; the editor app ships on iPad before anything else mobile. |
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

## The offer

Every claim must be true when this layer is done:

1. **The part after the demo is already done.** Every game starts with saves; title, pause and settings screens;
   keyboard, touch and gamepad with keys players can change; music and sound with volume; layouts for phone, tablet and
   computer, upright or sideways; menus in several languages; and it is built for multiplayer from the start.
2. **Built for agents.** A game is small files with plain names; agent skills say where things live; an MCP server lets
   an agent run and inspect the game; `automata check` runs the rules, the types and the tests.
3. **Your agent can't quietly break your game.** A recorded play replays to the same hash in Node, Chrome, Safari and
   Firefox, physics included, and CI fails when it doesn't.
4. **Change it yourself, without another prompt.** Free browser editors for every kind of content, usable on an iPad;
   what you save is what the game plays.
5. **Get it in front of players.** One command publishes to the web, itch.io, Wavedash (a web game portal), or a
   desktop app.

The editors also ship as an app for iPad, Android and desktop.

## Goals

- `@automataframework/framework`: a deterministic 2D runtime with ECS, physics and networking in the core.
- A small original physics platformer in AutomataFrameworkExamples that carries everything in claim 1 and enough content
  for every editor to have real work.
- The editor suite: nine editors and two builders, browser and Tauri app.
- A site modelled on pixijs.com: the claims, the game playable on the home page, guides, an examples gallery, the API
  reference, and the free browser editors.
- Deployment: the site and web game live, `automata ship` to web, itch.io, Wavedash and desktop, the editor app built for iPad
  and desktop.

## Non-goals

- Anything 3D, including Pixi 3D, `@pixi/3d`, 3D figures and 3D scenes. The builders paint 2D art only.
- Ruken as a target (the vision leaves it out).
- Multiplayer in the demo game. It ships single-player, built as if it were multiplayer.
- Deploying the room server. It is built and proven in CI; Fly.io hosts it once the 3D game uses it.
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
| What the editors change | Authorable content only: the JSON files the coding agents produce (the Owner, 2026-11-13). Agents working on the code are the primary way a game is made; an editor never opens or changes code. |
| Where an iPad edit lives | In the game's GitHub repo. Sign in with GitHub; Save makes a commit, straight into the game or as a suggestion someone approves, by the person's level. |
| Using the editors without signing in | Anyone can try the editors freely on the demo game and keep a copy of what they made, as the JSON to paste back into their agent or their game's files (the Owner, 2026-11-13). Every other game is open only to its team, through sign-in and its sharing file. The site's "Change this game" link opens the demo game in the editor straight away. |
| Who the editors are for | Teams working together on their own games, technical people and not (the Owner, 2026-11-13). People get levels of what they may do, like Google Docs, and need GitHub only to sign in. |
| Access levels | Look, Suggest, Approve, Edit and Owner, kept in `automata.access.toml` in the game's repo and set from a Share screen. All five are in M1. |
| Order of work | A thin thread through all four repos first, then widen. |
| Editor app | The editors as Tauri apps for iPad, Android and desktop. Android stays because it is the Owner's phone, so phone layouts are tested too. |
| File formats | Game content files are JSON; everything else (the project file, configs, manifests) is TOML. |
| Languages | Games ship English, Spanish, Korean, Japanese, Chinese and Portuguese. The editors ship those six plus French, Russian and German. The list follows the most popular languages for Godot. |
| Edits that collide | Handled the way GitHub does: a three-way merge, with conflicts shown and resolved before the save commits. |
| Sign-in step and site host | Sign-in is a GitHub App. Cloudflare Pages Functions do its token exchange and, as the App, all the editor's GitHub work; the site is on Cloudflare Pages. |
| New repo names | AutomataFrameworkEditors and AutomataFrameworkSite. |
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
| Tauri 2 | 2.12.x line | Desktop game builds; the editor app on iPad, Android and desktop |
| smol-toml | 1.9.0 | Parses the TOML files (project file, configs, manifests) |
| Vite, Vitest, Playwright | 8.3.3, 5.0.3, 1.63.0 | Build, unit and parity tests, journeys |
| Biome, knip, changesets | 2.5.15, 6.39.0, 3.0.3 | Lint and format, unused code, releases |
| API reports | the old `api-report` approach | Each published package's public surface is reviewed in a committed report |

Left out, with the reason:

| Left out | Why |
|---|---|
| Ruken SDK | The vision leaves Ruken out as a target. |
| Pixi 3D (`@pixi/3d`) | 3D is a later layer; it arrives with that layer's spec. |
| Rapier 3D | Same. |
| turbo, pnpm workspaces across packages | No monorepo: one package per repo. pnpm stays as the package manager. |
| Self-hosted runners | CI is GitHub-hosted, which also installs WebKit and Firefox, so parity runs in CI for the first time. |

No other new dependency is added without the Owner's yes; a plan that needs one stops and asks.

## File formats

Game content is JSON; everything else is TOML (the Owner's preference, 2026-11-13, with the reverse left open). This
way round is the better one:

- **Content is written by editors.** An editor must write a file back exactly, field for field, and a three-way merge
  must line up; JSON round-trips with no parser library and Zod schemas export to JSON Schema, which agents read.
  TOML written back by a program loses its comments and layout unless a careful editing library keeps them.
- **Config is written by people and agents.** The project file, the ship config and the tools' settings are short,
  hand-edited and worth commenting, which TOML allows and JSON does not.

## The four repos

Each repo has one package, its own release, and the project's structure rule: `src/index.ts` (the public surface),
`src/lib/` (shared helpers, no feature logic), `src/features/<feature>/` (`<feature>.ts` entry, one job per file,
`library/` for JSON data), `scripts/` (thin CLI wrappers), and `tests/` mirroring `src/` with
`tests/architecture.test.ts` (imports go down, no cycles, no tests in `src`) and `tests/golden/`. A feature imports only
from features below it.

### AutomataFramework: `@automataframework/framework`

Published to npm. Feature layers, lowest first (a plan may split or rename one, but not reorder the dependency
direction):

1. **sim**: the deterministic core. Koota behind a facade with monotonic stable ids and id-ordered iteration; fixed tick
   (60 Hz); seeded RNG; deterministic math; canonical hashing (xxhash64); snapshot and restore; systems in named
   phases; the sim has no I/O, no wall clock and no `Math.random`.
2. **physics**: Rapier's world created and stepped inside the sim's physics phase; bodies and colliders as components;
   collision events as sim events; the Rapier world included in snapshot and restore, and in the hash.
3. **commands**: every input reaches the sim as a command from a numbered player, recorded with its tick. One player is
   the single-player case of many: nothing in the sim may assume a single player. Replays are recorded command logs.
4. **net**: the room server (a Node entry, `@automataframework/framework/server`, on Colyseus) and the client. Model: the server
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
14. **host**: the port a game talks to (saves, links, quit, locale). Targets are adapters: `web`, `itch`, `wavedash`, `tauri`.
    Only the Tauri adapter imports `@tauri-apps/*`.
15. **cli**: the `automata` command (Node, Effect): `create` (a new game from a template), `check` (lint, types, schema
    validation, the game's tests), `ship` (web, itch, Wavedash, desktop), and `mcp`, an MCP server through which an agent
    creates, checks, runs and replays a game and reads its content schemas. *The MCP tool list is left to the plan.*

Agent skills ship with the package (a `skills/` folder or a plugin, as the plan decides): where gameplay lives and the
rules a game must keep.

### AutomataFrameworkExamples

Uses `@automataframework/framework` only as published (pinned to a released version), like an outside game; until
Release 1 that means a git dependency pinned to a commit on the framework's `main` (see Releases). It holds:

- **The demo game** (a working name until the Owner names it): see The demo game.
- **The site's examples**: one short runnable file per feature, PixiJS-style, each the source of an examples-gallery
  entry. Milestone 4 decides the first set; every one runs in CI.
- Later, the 3D game (its own spec).

### The editors

One repo, one suite: nine editors and two builders, a browser build hosted on the site and a Tauri app. Each
editor knows only the framework's content schemas, so it works on any game made with the framework.

- **What it changes.** A game's authorable content and nothing else: the JSON content files the coding agents
  produce, which the project file lists (the Owner, 2026-11-13). Agents working on the code are the primary way a
  game is made; an editor never opens or changes code.
- **Without signing in.** Anyone can open the demo game, and only the demo game (the Owner, 2026-11-13): every other
  game is open only to its team, through sign-in and its sharing file, whatever that file says about everyone. They
  can change it freely on the screen and keep a copy of what they made: the level's JSON, exactly as the framework
  writes it, to paste back into their agent or their game's files, or saved as a file. The API reads the demo game
  for them and writes nothing. Signing in is asked for only when it is needed: to save into the game, to see
  or approve waiting changes, to share, and to list your own games. What a person made before signing in is still
  there when they come back from it.

- **Who it is for.** A team working together on its own game, in its own repo (the Owner, 2026-11-13). To save and
  to work together, people sign in with a GitHub account, so they know who each other are, and need GitHub for
  nothing else: the editors' own
  GitHub App does the GitHub work, through an API on Cloudflare Pages Functions, and the page talks only to that API.
  The App asks for as little as it can: contents, pull requests, checks (read) and metadata.
- **Access levels.** What a person may do is their level, as in Google Docs: **Look** (see the game), **Suggest**
  (change things; someone has to approve), **Approve** (suggest, and approve other people's changes), **Edit**
  (changes go straight in) and **Owner** (everything, and choosing who helps). Levels live in a documented file in
  the game's repo, `automata.access.toml`, on the default branch: what anyone who signs in may do, and a list of
  GitHub names with a level each. The account that owns the repo is always an Owner. The Owner sets it from a Share
  screen; an agent can edit the same file. The API reads it afresh on every call and enforces it; GitHub's own
  roles are not used, so a personal account or an organization makes no difference.
- **Opening a game.** Open a link someone shared (a site's "Change this game" link is one), press "Try it now"
  for the demo game, or sign in and pick one of your own; the suite reads the game's
  project file (which lists its content files and the editor that opens each). An Owner adds the editor to a game
  once, on GitHub. The Tauri app signs in with GitHub's device flow from its native side.
- **Saving.** Save sends the change to the API, which writes it as the framework writes it, with the file's last
  known version. For an Edit or Owner level, the App commits it to the default branch. For Suggest and Approve
  levels, the App commits it to that person's branch (`automata/<login>`) and opens a pull request: a suggestion.
  Someone who may approve sees it in the editor and approves it (the App merges it, once the game's checks pass) or
  turns it down; nobody approves their own. If the file changed since it was opened (an agent, another device), the
  editor does what GitHub does: a three-way merge against the version it opened. Changes that don't overlap merge on
  their own; overlapping ones are shown side by side as conflicts, and the person keeps theirs, the other, or both,
  per conflict, before the merge commits. Conflict markers are never committed, and the merged file must pass its
  schema before the save goes through. (M1 does not merge: it never overwrites, says the file changed elsewhere, and
  offers the other version. Merging arrives with M3.)
- **The first run.** Each kind of person (a visitor who has not signed in, an Owner starting out, someone sent a
  link) is walked from the first screen to their first change, and to saving it.
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

- **Home**: the five claims, each true today; the demo game playable on the page; and the replay
  check catching a change that breaks it.
- **Guides**: start a game, make it with an agent, edit it, publish it.
- **Examples gallery**: the examples from AutomataFrameworkExamples, each live and with its source.
- **API reference**: generated from the framework's API report.
- **The browser editors**, and where to get the app.

Hosted as static files on Cloudflare Pages. (The editors' sign-in step and API are Pages Functions in the editors' own
Pages project in M1.)

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
languages: English, Spanish, Korean, Japanese, Chinese and Portuguese, the set every game ships with. The editors
ship those six plus French, Russian and German (the list follows the most popular languages for Godot).

Its golden: a recorded play through level one that ends on the same hash in Node, Chromium, WebKit and Firefox.

## Releases

Releases are big and few (the Owner, 2026-11-13). Milestones are steps of work, not releases: nothing is published
when a milestone is done.

| Release | What ships | Milestones it waits on |
|---|---|---|
| 1 | 2D finished: the framework in full, with the demo game | M1 and M2 |
| 2 | The 2D editors | M3 |
| 3 | The website | M4's site |
| 4 | Distribution: `automata ship` and the editor app in the stores | M4's publishing |
| 5 | 3D | The 3D layer's own spec |

After Release 5 the loop repeats for 3D (its editors, site and distribution). Small releases come back only once the
product is officially feature complete. The framework's `release.yml` never runs by itself; the Owner starts it by
hand from `main` when a release is due, and it refuses a commit whose `ci` run on `main` did not pass.

**Before Release 1** (the Owner, 2026-11-13): the Examples repo depends on the framework through a git dependency
pinned to a commit on the framework's `main` (`github:mcthaydt/AutomataFramework#<commit>`), never a branch. Moving the
pin is a pull request in Examples, which its CI checks. At Release 1 it switches to the npm version.

## Milestones

Built in order. Each milestone is planned per repo; every plan goes through the project's stages (plan, plan audit,
execution, implementation audit, fixes, Owner review) and lands by pull request. A milestone is done when its "done
means" holds on each repo's `main`, proven by CI.

### M1: the thin thread

- Framework: sim, physics, commands and replay, content (level and character only), render, keyboard and touch input,
  the web host. Ready to publish, but published only at Release 1 (the Owner, 2026-11-13; see Releases).
- Examples: one level with the hero and one crate, from the framework pinned to a commit on its `main` (see Releases).
- Editors: the suite shell, using it without signing in and keeping a copy, GitHub sign-in and save, the five access
  levels with the Share screen and approving in the editor, the first run, and the Levels editor moving the crate, in the browser, at iPad size.
- Site: one page with the game playing, deployed.
- CI: the replay hash the same in Node, Chromium, WebKit and Firefox.

Done means: on an iPad, open the game in the browser editor, move the crate, save; the commit lands in the examples repo,
CI checks it in four engines, and the site's game shows the crate where it was moved. And a second person with no
rights on GitHub, given the Suggest level, does the same from a link: their change waits, and is approved in the editor.

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

- **First, Feel and Tuner** (the Owner, 2026-11-13): with Levels from M1 they make the first editor slice, because game
  feel is the most common reason agent-made games fail. This slice is planned and lands before the rest.
- **Then the rest:** Tiles, Characters, Audio, Writer, Schematic, Sequence, and both builders. Every 2D editor is in
  scope; only the order changes.
- Each edits the demo game's real content. Problems listed as you edit; conflict handling on save.

Done means: each editor changes the demo game on an iPad, the change commits and shows in play, and an agent can make
the same change by editing the files.

### M4: the site and publishing

- The site in full: home with the claims, guides, the examples gallery, the API reference, the free editors.
- `automata ship` to web, itch.io, Wavedash and a desktop app (macOS, Windows, Linux via Tauri).
- **Wavedash** (the Owner, 2026-11-13: "add Wavedash as portal if possible"). What was found on 2026-11-13, from its
  docs' page list only, since the container's network refused the pages themselves: it has a CLI (commands, a
  configuration file and environment variables, which suggests an upload from CI with a token), a JavaScript engine
  guide, and an SDK. Not yet known: what its SDK must be called for (start-up, loading, saves, ads), its size and
  format rules, and how developers are paid. The M4 plan starts by reading [docs.wavedash.com](https://docs.wavedash.com/getting-started/introduction)
  in full; if its rules can be met through the host port (a `wavedash` adapter, the SDK imported by that adapter
  only), it becomes a target; if not, the plan stops and reports why.
- The editor app built for iPad, Android and desktop, signed and submitted to the stores.

Done means: every claim on the site is backed by something on `main`; the demo game is on itch.io and Wavedash (or the
plan's report says why Wavedash can't be), and is a desktop download; the editor app passes App Store review for iPad and Play review for Android, and is on sale for desktop.

## CI and testing

- GitHub-hosted runners only. Ubuntu for lint, types, unit tests, parity in Chromium, WebKit and Firefox, and journeys;
  macOS for the iPad and macOS app builds; Ubuntu for the Android and Linux builds; Windows for the Windows build.
- Games and editors are tested at phone size (the Owner's Android phone) as well as iPad and desktop sizes.
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
- **The drunk-grandma test** (the Owner, 2026-11-13): every piece of copy and UX, in every editor, on the site and on
  the game's screens, must let a drunk grandma tell what is happening and what to press. Each plan names how its
  screens are checked against it, and an audit that finds one failing treats it as a defect.
- Every repo has a root `CLAUDE.md` from the day it is created (the Owner, 2026-11-13), carrying the project's
  principles, workflow, session and reporting rules, the CI-only test rule, the folder structure and the Owner's
  decisions, so any agent working in it picks them up. AutomataFramework's is the model; the others copy it and add
  what is particular to them.

## Open for the Owner

Things only the Owner can decide or provide; each plan that needs one stops and asks:

1. **A Cloudflare account** for Pages and the sign-in function, and a GitHub App for the editors (the Editors' `docs/deploy.md` has the steps). *Needed by M1.*
2. **The domain.** Not bought yet; the Owner will control its DNS. M1 deploys to the Cloudflare Pages address until
   then. *Needed by M4.*
3. **npm publishing** under the `@automataframework` scope (the Owner's `NPM_TOKEN`). *Needed by Release 1* (it was
   M1, before releases became big and few). Until then Examples pins a framework commit on `main`
   (the Owner, 2026-11-13; see Releases).
4. **Creating the new repos** (AutomataFrameworkExamples, AutomataFrameworkEditors, AutomataFrameworkSite), with `main`
   protected; the first pull request in each adds its `CLAUDE.md`. *Needed by M1.*
5. **The demo game's name.** *Needed by M4, for the site; a working name until then.*
6. **Stores and signing for the editor app:** an Apple Developer account for iPad and macOS, a Google Play developer
   account and signing key for Android, Windows signing, and where the desktop app is distributed (an itch.io page is
   the simplest; the Mac App Store is an option). The App Store may question an editor that plays a game's
   JavaScript; the plan checks the current guideline before M4 starts. *Needed by M4.*
7. **itch.io** account and API key for `automata ship`. *Needed by M4.*
8. **A Wavedash developer account** and its upload token. *Needed by M4.*

## Left to the builder (the plans)

- The file layout of the game repo and its project file, and every content schema's fields.
- The exact feature boundaries inside each layer, within the order above.
- The networking protocol details, the snapshot format, and the replay file format.
- Which old code is lifted, with the source commit noted, and which is written fresh.
- The examples gallery's first set.
- The editors' screens, within the iPad-first rules.

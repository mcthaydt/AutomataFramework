# M1 Thin Thread: `@automataframework/framework` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `@automataframework/framework` 0.1.0: a deterministic 2D runtime (sim, physics, commands and replay, level and
character content, rendering, keyboard and touch input, the web host) that a game in another repo can install, and
whose recorded play ends on the same hash in Node, Chromium, WebKit and Firefox.

**Architecture:** One package, feature folders in a fixed dependency order (`sim`, `physics`, `commands`, `content`,
`level`, `render`, `input`, `host`, `game`). The sim core and the Rapier integration are lifted from
AutomataFrameworkFailed, where they already hashed the same in four engines; content, level, replay, render, input,
host and the game loop are written fresh and small. Two entry points: `@automataframework/framework` (browser, everything) and
`@automataframework/framework/headless` (no DOM and no Pixi, for Node replays and for editors that only validate).

**Tech Stack:** TypeScript 7.0.2 strict, Koota 0.6.6, `@dimforge/rapier2d-deterministic-compat` 0.21.0, PixiJS 8.22.0,
Zod 4.6.6, smol-toml 1.9.0, Vite 8.3.3, Vitest 5.0.3 (browser mode on Playwright 1.63.0), Biome 2.5.15, knip 6.39.0,
changesets 3.0.3, pnpm 10.34.6, Node 24.21.0.

**Spec:** [`docs/superpowers/specs/2026-11-13-2d-first-layer-design.md`](../specs/2026-11-13-2d-first-layer-design.md),
milestone M1, the Framework line. Principles served: 1 (every content file has a published schema and one writer), 3
(2D only), 4 (one package, one repo), 6 (the old stack), 7 (lifted in layer order, nothing ahead of its user).

## What this plan covers, and what it does not

The spec plans each milestone per repo. This is the framework's share of M1. The other three shares (Examples, Editors,
Site) get their own plans in their own repos once the Owner has created them (spec, open item 4). They build on what
this plan publishes, so the section "What the other repos rely on" below is a contract: change it only with a note to
the coordinator.

Not in this plan, because M1 does not use it: gamepad, remapping, audio, saves, locale, story, the Svelte UI kit,
screens, net, the `automata` command, the itch, Wavedash and Tauri hosts, tilesets and animation clips.

## Before starting: the Owner's part

Stop and report to the coordinator if any of these is not true. Do not work around one.

1. `main` is protected in this repo (pull requests only).
2. GitHub-hosted runners accept jobs for this repo. The old repo's hosted jobs were refused because it was private
   (the Owner, 2026-11-13); this repo is public. Task 1's first push shows it: a run that is refused or never starts
   is a stop.
3. `NPM_TOKEN` is a secret of this repo and may publish to the `@automataframework` scope on npm. Needed only by
   Task 15; Tasks 1 to 14 do not wait for it.

Decided by the Owner on 2026-11-13, while this plan was written:

- **The npm scope is `@automataframework`**, so the package is `@automataframework/framework`. The spec and
  `CLAUDE.md` said `@automata/framework` when this plan was written; the plan audit corrected both.
- **Two development dependencies outside the spec's stack table are approved:** `@types/node` 24.19.1 and
  `@vitest/browser-playwright` 5.0.3 (Vitest's own provider for browser mode).

## Global Constraints

- The sim has no I/O, no wall clock and no `Math.random`; only the sim changes gameplay state. This holds for
  `src/lib/` and the `sim`, `physics`, `commands` and `level` features.
- Effect is for Node tooling only: nothing under `src/` imports it in this plan.
- PixiJS is the only renderer, and only `src/features/render/` imports it. `render.ts` imports
  `pixi.js/unsafe-eval` before anything else from Pixi.
- Zod is the only schema language. Game content is JSON; the project file is TOML.
- A source file has at most 600 lines.
- Touch targets are at least 44 px; primary actions 48 px.
- No dependency beyond the Tech Stack line and the two approved above. A task that needs one stops and asks.
- **Tests run only in GitHub-hosted CI, never locally.** `pnpm lint`, `pnpm typecheck`, `pnpm knip`, `pnpm build` and
  the scripts in `scripts/` are not tests and are run locally before every push.
- Structure: `src/index.ts`, `src/headless.ts` (entries, re-exports only), `src/lib/` (helpers, no feature logic),
  `src/features/<feature>/<feature>.ts` (the feature's entry) with one job per file beside it, `scripts/`,
  `tests/architecture.test.ts`, `tests/features/<feature>/`, `tests/lib/`, `tests/fixtures/`, `tests/golden/`.
  A feature imports only itself, `src/lib/` and features below it, and imports another feature only through that
  feature's entry file.
- Tick rate is 60 Hz. World units are tiles: one tile is one metre, the origin is the level's top-left corner, and
  **y points down**. A thing's `x, y` is its centre.
- Player numbers are 1 to 4 and are the `source` of that player's commands. Nothing may assume one player.
- A hash that differs between engines is investigated, never re-recorded per engine. A golden that already holds a
  hash moves only with the Owner seeing before and after.
- The drunk-grandma test: every word a player or author can read (touch buttons, content problems) must say what is
  happening and what to do. Task 8 and Task 12 pin the copy; the implementation audit reads the phone-size screenshot
  Task 13 uploads and treats a failure as a defect.
- Comments say why. Conventional Commits. Every commit ends with the session's attribution lines.

## How every task is verified

There is no local test run, so each task proves itself in the pull request's CI (Task 1 creates it). Read runs with
`gh run list --branch <branch>` and `gh run view <id> --log-failed`, or the session's GitHub tools.

- **A fresh task** (Tasks 1, 6 to 13) pushes twice. First the tests alone: the `check` job must fail, and the log must
  show the reason the step names. Then the implementation: every job must pass. Do not write the implementation
  before reading the red run.
- **A lifted task** (Tasks 2 to 5) pushes once: the old code and its old tests arrive together and CI must pass. They
  are an existing pair, so a red run first would prove nothing.
- **A golden** is recorded from CI, never typed. A new golden file is committed with `"finalHash": ""`. The golden
  helper (Task 4) then fails in Node with `GOLDEN NOT RECORDED` followed by the JSON to commit. Copy that JSON from the
  Node job's log into the file, push, and all four engines must match it. If a browser differs from Node, stop and
  report: that is a determinism defect.
- After each task: tick its boxes here, update `docs/superpowers/progress.md` (the stage row and the overall
  percentage: each finished task is 6% of this stage, and the publish confirmed in Task 15 Step 5 is the last 10%), and send the coordinator one line: commit, test count, surprises.
- Stop rules (project): a failing check you cannot explain, a third fix for the same failure, an access refusal or a
  missing tool. Stop that task and report at once. Hand off at 90 minutes.

## Lifting from the old repo

Source: `mcthaydt/AutomataFrameworkFailed` at commit `ed8592e8f81db71f114275e2d625a6d7a4a4f22c`. "Lift" means: copy
the file, change import paths to the new layout, rename what the task's table says, and change nothing else. Put
`// Lifted from AutomataFrameworkFailed@ed8592e8: <old path>` as the first line of each lifted file. A lifted test
keeps every assertion; if one cannot pass without a change this plan does not name, stop and report.

## What the other repos rely on

**Package entries.** `@automataframework/framework` (browser) and `@automataframework/framework/headless` (everything from `sim`,
`physics`, `commands`, `content` and `level`; safe in Node and in an editor). `schemas/level.schema.json` and
`schemas/character.schema.json` ship in the package for agents.

**The project file**, `automata.toml` at the game repo's root:

```toml
format = 1
name = "Crate Game"
start = "level-1"   # the level a new game opens
hero = "hero"       # the character each player controls

[[content]]
type = "level"
path = "content/levels/level-1.json"

[[content]]
type = "character"
path = "content/characters/hero.json"

[[content]]
type = "character"
path = "content/characters/crate.json"
```

The editor that opens each file follows from its `type`: `CONTENT_TYPES.level.editor === 'levels'`,
`CONTENT_TYPES.character.editor === 'characters'`.

**A level**, `content/levels/<id>.json`. One string per row of tiles (`#` solid, `.` empty) so a merge lines up row by
row:

```json
{
  "format": 1,
  "id": "level-1",
  "tiles": [
    "................",
    "................",
    "################"
  ],
  "things": [{ "id": "crate-1", "character": "crate", "x": 8.5, "y": 1.5 }],
  "starts": [{ "player": 1, "x": 2.5, "y": 1.5 }]
}
```

**A character**, `content/characters/<id>.json` (what one kind of thing is; art arrives with the builders in M3, so M1
draws a coloured box):

```json
{ "format": 1, "id": "hero", "body": "dynamic", "size": { "w": 0.8, "h": 1 }, "color": "#e4572e", "upright": true }
```

**Writing content.** An editor or agent writes a file with `writeContent(type, value)` and nothing else, so two
writers of the same value produce the same bytes and three-way merges stay small.

**A replay** is JSON: the seed, the tick rate and the commands, with the hashes seen when it was recorded. It holds no
snapshot, so it can be played against content that has changed since. `verifyReplay` is the strict check ("nothing
changed"); `playReplay` only runs it and returns the hashes. The Examples repo's four-engine check on an editor's
commit uses `playReplay` in each engine and compares the engines with each other, because moving the crate rightly
changes the hash.

**The game's own code** (the hero's run and jump) is a sim plugin in the game repo, built with `definePlugin`,
`defineSystem`, `Player`, `isHeld`, `wasPressed`, `Body` and `Transform`.

## File structure

```
package.json  tsconfig.json  tsconfig.build.json  vite.config.ts  vitest.config.ts  biome.json  knip.json
.github/workflows/ci.yml  .github/workflows/release.yml  .changeset/config.json
src/index.ts                      browser entry: re-exports headless.ts, render, input, host, game
src/headless.ts                   re-exports sim, physics, commands, content, level
src/lib/                          canonical.ts  xxhash64.ts  sorted.ts  deep-freeze.ts
src/features/sim/                 sim.ts (entry)  definitions.ts  fields.ts  context.ts  schedule.ts  rng.ts
                                  dmath.ts  entity-store.ts  snapshot.ts  create-sim.ts  version.ts
src/features/physics/             physics.ts (entry, the plugin)  components.ts  events.ts  kinds.ts  checks.ts
                                  physics-world.ts  systems.ts  rapier.ts  spawn.ts
src/features/commands/            commands.ts (entry, the plugin)  players.ts  replay.ts  recorder.ts  play.ts
src/features/content/             content.ts (entry)  ids.ts  level.ts  character.ts  project.ts  content-types.ts
                                  diagnostics.ts  parse.ts  write.ts  load.ts  json-schema.ts
src/features/level/               level.ts (entry, the plugin)  components.ts  tile-runs.ts  spawn-level.ts
                                  game-sim.ts
src/features/render/              render.ts (entry)  scene.ts  fit.ts  stage.ts
src/features/input/               input.ts (entry)  controls.ts  keyboard.ts  touch.ts
src/features/host/                host.ts (entry, the port)  web.ts
src/features/game/                game.ts (entry, startGame)  loop.ts
scripts/                          write-schemas.ts  api-report.ts  api-report/extract.ts  api-report/report.ts
schemas/                          level.schema.json  character.schema.json   (written by write-schemas.ts)
docs/api/framework.api.md         the API report                              (written by api-report.ts)
tests/architecture.test.ts  tests/architecture/rules.ts
tests/lib/  tests/features/<feature>/    mirror src/
tests/fixtures/                   golden.ts  bounce/  physics/scene.ts  game/ (automata.toml, content/, hero.ts,
                                  script.ts, read.ts)
tests/golden/                     bounce.json  physics-scene.json  push-crate.json
tests/install/smoke.mjs
```

Test file suffixes decide where a test runs: `*.test.ts` in Node; `*.parity.test.ts` in Node and in all three
browsers; `*.browser.test.ts` in the three browsers only.

## Review Focus

Inputs the spec does not name but a person will meet. Each has a test in the task that owns the code.

1. **A content file that is broken** (not JSON, a missing field, an unknown key, a thing pointing at a character that
   does not exist): the author expects a plain message naming the file and the place, never a thrown stack. Tasks 8, 9.
2. **A key or finger that never "lets go"** (the window loses focus while a key is down, a touch is cancelled by the
   system): the hero must not run forever. Task 12.
3. **Coming back to a tab after a minute, or a slow frame**: the game must not fast-forward through a minute of play
   or freeze trying. Task 13.
4. **Turning the device, or a container with no size yet**: the picture refits and nothing divides by zero. Task 11.
5. **A recorded play run against a game that has since changed**: the answer must be "the game's content changed",
   not a mystery mismatch; and a command for a player who is not in the level is dropped, not a crash. Tasks 6, 7.

---

### Task 1: The repo's skeleton, CI and the architecture test

**Files:**
- Create: `package.json`, `tsconfig.json`, `biome.json`, `knip.json`, `vitest.config.ts`, `.gitignore`,
  `.github/workflows/ci.yml`, `src/index.ts`, `src/headless.ts`, `tests/architecture.test.ts`,
  `tests/architecture/rules.ts`, `tests/architecture/rules.test.ts`

**Interfaces:**
- Produces: `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm knip`, `pnpm test:node`, `pnpm test:engine <engine>`;
  CI jobs `check` and `engines (chromium|webkit|firefox)`; and in `tests/architecture/rules.ts`:

```ts
export const LAYERS = ['sim', 'physics', 'commands', 'content', 'level', 'render', 'input', 'host', 'game'] as const
export type SourceFiles = Readonly<Record<string, string>> // path from the repo root -> file text
export interface Violation { readonly file: string; readonly rule: string; readonly detail: string }
export function checkArchitecture(files: SourceFiles): Violation[]
```

- [x] **Step 1: Write the config.** `package.json`: name `@automataframework/framework`, version `0.0.0`, `"type": "module"`,
  `"sideEffects": false`, `packageManager` `pnpm@10.34.6`, `engines.node` `>=24.21.0`, imports `"#src/*": "./src/*"`,
  the dependencies of the Tech Stack line at those exact versions (runtime: `koota`, `zod`,
  `@dimforge/rapier2d-deterministic-compat`, `pixi.js`, `smol-toml`; the rest dev). Scripts: `lint` (`biome check .`),
  `format` (`biome check --write .`), `typecheck` (`tsc -p .`), `knip`, `test:node` (`vitest run --project node`),
  `test:engine` (`vitest run --project`). `tsconfig.json`: strict, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `allowImportingTsExtensions`, `noEmit`, `lib` ES2023 + DOM. `biome.json`: copy the old
  repo's formatter and linter settings (line width 120, single quotes, no semicolons).
- [x] **Step 2: Write `vitest.config.ts`** with four projects. `node`: `tests/**/*.test.ts` except
  `*.browser.test.ts`. `chromium`, `webkit`, `firefox`: `tests/**/*.parity.test.ts` and `tests/**/*.browser.test.ts`,
  browser mode, headless, the Playwright provider, one instance of that engine.
- [x] **Step 3: Write `.github/workflows/ci.yml`.** On `pull_request` and on `push` to `main`;
  `permissions: contents: read`; `concurrency` per ref with `cancel-in-progress: true`; all jobs on `ubuntu-latest`.
  Job `check`: checkout, pnpm, Node 24.21.0, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`,
  `pnpm knip`, `pnpm test:node`. Job `engines`: matrix `engine: [chromium, webkit, firefox]`, `fail-fast: false`,
  `pnpm exec playwright install --with-deps ${{ matrix.engine }}`, `pnpm test:engine ${{ matrix.engine }}`, and
  upload `tests/**/__screenshots__/**` as an artifact named `screens-${{ matrix.engine }}` (`if: always()`). Pin
  `actions/checkout`, `pnpm/action-setup`, `actions/setup-node` and `actions/upload-artifact` to the commit SHAs the
  old repo's `.github/workflows/ci.yml` uses.
- [x] **Step 4: Write the failing tests.** `tests/architecture/rules.test.ts` feeds `checkArchitecture` made-up file
  maps and expects one violation each, by `rule`:

```ts
const one = (files: SourceFiles) => checkArchitecture(files).map((v) => v.rule)
test('a feature may not import a feature above it', () =>
  expect(one({ 'src/features/sim/a.ts': "import '../render/render.ts'" })).toEqual(['imports-go-down']))
test('another feature is imported through its entry file', () =>
  expect(one({ 'src/features/physics/a.ts': "import '../sim/rng.ts'" })).toEqual(['through-the-entry']))
test('lib imports no feature', () =>
  expect(one({ 'src/lib/a.ts': "import '../features/sim/sim.ts'" })).toEqual(['lib-is-below-features']))
test('no cycles', () =>
  expect(one({ 'src/lib/a.ts': "import './b.ts'", 'src/lib/b.ts': "import './a.ts'" })).toEqual(['no-cycles']))
test('no tests in src', () => expect(one({ 'src/lib/a.test.ts': '' })).toEqual(['no-tests-in-src']))
test('the sim side has no clock, randomness or I/O', () =>
  expect(one({ 'src/features/sim/a.ts': 'const t = Date.now()' })).toEqual(['sim-is-pure']))
test('a package stays in its feature', () =>
  expect(one({ 'src/features/input/a.ts': "import { Application } from 'pixi.js'" })).toEqual(['package-confined']))
test('a file has at most 600 lines', () =>
  expect(one({ 'src/lib/a.ts': 'x\n'.repeat(601) })).toEqual(['at-most-600-lines']))
test('a feature folder has its entry file', () =>
  expect(one({ 'src/features/sim/rng.ts': '' })).toEqual(['feature-has-entry']))
test('headless reaches nothing that needs a page', () =>
  expect(one({ 'src/headless.ts': "export * from './features/render/render.ts'" })).toEqual(['headless-is-headless']))
```

  `tests/architecture.test.ts` reads every file under `src/` and expects `checkArchitecture(files)` to equal `[]`.
- [x] **Step 5: Push; the `check` job fails** because `checkArchitecture` is not defined. This run also answers
  "Before starting" item 2: if it is refused or never starts, stop and report.
- [x] **Step 6: Implement `checkArchitecture`.** Imports are found with a regular expression over `import`/`export …
  from` and `import(...)` specifiers. `sim-is-pure` covers `src/lib/` and the `sim`, `physics`, `commands` and `level`
  features and forbids `Math.random`, `Date.now`, `new Date`, `performance.now`, `setTimeout`, `setInterval` and
  `fetch(`. `package-confined`: `koota` only in `features/sim/`; `@dimforge/` only in `features/physics/rapier.ts`;
  `pixi.js` only in `features/render/`; `smol-toml` only in `features/content/`; `effect` nowhere under `src/`.
  `headless-is-headless`: nothing reachable from `src/headless.ts` is in `render`, `input`, `host` or `game`.
- [x] **Step 7: Push; all jobs pass** (the engine jobs have no tests yet and must say so, not fail: set
  `passWithNoTests` for the three browser projects).
- [x] **Step 8: Commit** (`chore: repo skeleton, CI and the architecture test`), then open the stage's pull request
  as a draft with a few lines saying what M1 builds.

### Task 2: `src/lib`, lifted

**Files:**
- Create: `src/lib/canonical.ts`, `src/lib/xxhash64.ts`, `src/lib/sorted.ts`, `src/lib/deep-freeze.ts`
- Test: `tests/lib/canonical.test.ts`, `tests/lib/xxhash64.parity.test.ts`,
  `tests/lib/xxhash64-equivalence.test.ts`, `tests/lib/sorted.test.ts`, `tests/fixtures/xxhash64-reference.ts`

| New | Old (under `packages/sim/`) |
|---|---|
| `src/lib/canonical.ts` | `src/shared/hash/canonical.ts` |
| `src/lib/xxhash64.ts` | `src/shared/hash/xxhash64.ts` |
| `src/lib/sorted.ts` | `src/shared/util/sorted.ts` |
| `src/lib/deep-freeze.ts` | `src/shared/util/deep-freeze.ts` |
| `tests/lib/canonical.test.ts` | `tests/unit/shared/hash/canonical.test.ts` |
| `tests/lib/xxhash64.parity.test.ts` | `tests/browser/hash/xxhash64.test.ts` |
| `tests/lib/xxhash64-equivalence.test.ts` | `tests/unit/shared/hash/xxhash64-equivalence.test.ts` |
| `tests/lib/sorted.test.ts` | `tests/unit/shared/util/sorted.test.ts` |
| `tests/fixtures/xxhash64-reference.ts` | `src/testing/xxhash64-reference.ts` |

**Interfaces:**
- Produces: `canonicalJson(value): string`, `CanonicalJsonError`, `utf8(text): Uint8Array`,
  `decodeUtf8Strict(bytes): string`, `xxhash64(bytes): bigint`, `hex64(hash): string`, `sortedKeys`, `sortedEntries`,
  `deepFreeze`, with the old signatures unchanged.

- [x] **Step 1: Lift the files in the table.**
- [x] **Step 2: Push; all jobs pass**, and the three engine jobs each report the xxhash64 parity test as run.
- [x] **Step 3: Commit** (`feat(lib): canonical JSON and xxhash64, lifted`).

### Task 3: The sim's definitions, schedule, RNG and math, lifted

**Files:**
- Create: `src/features/sim/definitions.ts`, `fields.ts`, `context.ts`, `schedule.ts`, `rng.ts`, `dmath.ts`,
  `version.ts`, and `sim.ts` (the entry; it re-exports what exists so far)
- Test: under `tests/features/sim/`

| New (under `src/features/sim/`) | Old (under `packages/sim/src/shared/`) |
|---|---|
| `definitions.ts`, `fields.ts`, `context.ts` | `define/definitions.ts`, `define/fields.ts`, `define/context.ts` |
| `schedule.ts` | `schedule/schedule.ts` |
| `rng.ts` | `rng/rng.ts` |
| `dmath.ts` | `math/dmath.ts` |
| `version.ts` | `version.ts` (rename `SIM_VERSION` to `FRAMEWORK_VERSION`, value `'0.1.0'`) |

Tests, old path under `packages/sim/tests/` to new path under `tests/features/sim/`:
`unit/shared/define/{definitions,fields}.test.ts`, `unit/shared/schedule/schedule.test.ts`,
`unit/shared/rng/rng.test.ts`, `unit/shared/math/dmath.test.ts` keep their file names;
`browser/rng/rng.test.ts` becomes `rng.parity.test.ts` and `browser/shared/math/dmath.test.ts` becomes
`dmath.parity.test.ts`; `unit/shared/version.test.ts` becomes `version.test.ts` and checks `FRAMEWORK_VERSION`
against `package.json`'s version once that is `0.1.0` (Task 15), so until then it expects `'0.1.0'` literally.

**Interfaces:**
- Produces (old signatures unchanged): `defineComponent`, `defineCommand`, `defineEvent`, `defineResource`,
  `defineSystem`, `definePlugin`, `PHASES` (`input`, `prePhysics`, `physics`, `postPhysics`, `gameplay`, `cleanup`),
  the `ComponentDef`, `CommandDef`, `EventDef`, `ResourceDef`, `SystemDef`, `PluginDef`, `PluginState` types,
  `SimContext`, `EntityRef`, `SpawnPart`, `CommandRecord`, `createRng`, `deriveSeed`, `Rng`, and the deterministic math
  in `dmath.ts`. Field types are `f32`, `f64`, `i32`, `u32`, `bool`, `entity`, `string`.

- [x] **Step 1: Lift the files and tests.** In comments, drop mentions of Ruken (the reason "no `new Function`" still
  holds: a strict content security policy).
- [x] **Step 2: Push; all jobs pass.**
- [x] **Step 3: Commit** (`feat(sim): definitions, schedule, RNG and deterministic math, lifted`).

### Task 4: The sim's world, snapshot and `createSim`, lifted, with the first golden

**Files:**
- Create: `src/features/sim/entity-store.ts`, `snapshot.ts`, `create-sim.ts`; modify `sim.ts`
- Create: `tests/fixtures/golden.ts`, `tests/fixtures/bounce/` , `tests/golden/bounce.json`
- Test: `tests/features/sim/*.test.ts`, `tests/features/sim/bounce.parity.test.ts`,
  `tests/features/sim/snapshot.parity.test.ts`

| New | Old (under `packages/sim/`) |
|---|---|
| `src/features/sim/entity-store.ts`, `snapshot.ts` | `src/shared/world/entity-store.ts`, `snapshot.ts` |
| `src/features/sim/create-sim.ts` | `src/shared/world/sim.ts` |
| `tests/features/sim/<name>.test.ts` | `tests/unit/shared/world/<name>.test.ts`, all eleven files |
| `tests/features/sim/snapshot.parity.test.ts` | `tests/browser/world/snapshot.test.ts` |
| `tests/fixtures/bounce/*` | `src/testing/fixtures/bounce.*` and `bounce-script.ts` (not `bounce-diverged`) |

Not lifted: `src/features/replay/*` and `src/testing/*` other than the bounce fixtures. Replays are rewritten as JSON
in Task 7 (an agent can read them, and M1's plays are short), and the old golden harness was built around the binary
replay.

**Interfaces:**
- Produces (old signatures unchanged): `createSim(options: SimOptions): Promise<Sim>`, `Sim` (`seed`, `tickHz`,
  `tick`, `contentHash`, `step`, `spawn`, `entity`, `query`, `resource`, `snapshot`, `restore`, `describeSnapshot`,
  `hash`, `dispose`), `Command` (`tick`, `source`, `seq`, `type`, `payload`), `StepResult`, `RejectedCommand`,
  `RejectReason`, `SimEvent`, `RenderDelta`, `RenderRow`, `FieldRecord`, the error classes.
- Produces in `tests/fixtures/golden.ts`:

```ts
export interface Golden { readonly ticks: number; readonly finalHash: string; readonly checks: readonly { tick: number; hash: string }[] }
/** Steps `ticks` times, taking a hash every 60 ticks and at the end. */
export function runGolden(sim: Sim, ticks: number, commandsAt: (tick: number) => readonly Command[]): Golden
/** Fails with `GOLDEN NOT RECORDED` and the JSON to commit when `golden.finalHash` is ''; otherwise expects equality. */
export function expectGolden(actual: Golden, golden: Golden): void
```

- [x] **Step 1: Lift the files and tests.** If `create-sim.ts` would pass 600 lines, move the error classes to
  `errors.ts`.
- [x] **Step 2: Write `bounce.parity.test.ts`:** create the bounce sim with `BOUNCE_SEED`, run `bounceSetup`, then
  `expectGolden(runGolden(sim, BOUNCE_TICKS, script), golden)` with `tests/golden/bounce.json` imported as JSON. A
  second test snapshots at tick 150, restores into a new sim, runs both to the end and expects equal hashes.
- [x] **Step 3: Commit `tests/golden/bounce.json`** as `{ "ticks": 300, "finalHash": "", "checks": [] }`. Push; Node
  fails with `GOLDEN NOT RECORDED`. Copy the JSON from the Node log into the file.
- [x] **Step 4: Push; all jobs pass**, the three browsers matching Node's hash.
- [x] **Step 5: Commit** (`feat(sim): world, snapshot and createSim, lifted, with the bounce golden`).

### Task 5: Physics, lifted, with one new field

**Files:**
- Create: `src/features/physics/physics.ts`, `components.ts`, `events.ts`, `kinds.ts`, `checks.ts`,
  `physics-world.ts`, `systems.ts`, `rapier.ts`, `spawn.ts`
- Create: `tests/fixtures/physics/scene.ts`, `tests/golden/physics-scene.json`
- Test: under `tests/features/physics/`

| New (under `src/features/physics/`) | Old (under `extensions/physics/src/`) |
|---|---|
| `physics.ts` | `features/2d/physics-2d.ts` |
| `components.ts`, `events.ts` | `features/2d/physics-2d.component.ts`, `physics-2d.event.ts` |
| `rapier.ts`, `spawn.ts` | `features/2d/rapier-2d.ts`, `spawn-2d.ts` |
| `kinds.ts`, `checks.ts`, `physics-world.ts` | `shared/kinds.ts`, `shared/checks.ts`, `shared/physics-world.ts` |
| `systems.ts` | `shared/physics.system.ts` (the 2D systems only) |
| `tests/fixtures/physics/scene.ts` | `testing/scene-2d.ts` and what it needs of `testing/run-scene.ts` |

Tests, from `extensions/physics/tests/`: `unit/2d/physics-2d.test.ts`, `unit/2d/physics-2d-snapshot.test.ts`,
`unit/shared/{physics-world,init-retry,lazy-load,gravity-config,snapshot-property}.test.ts` keep their names under
`tests/features/physics/`; `browser/2d/physics-2d.test.ts` becomes `physics.parity.test.ts`. Drop every 3D case.

Renames: `physics2d` to `physics`; `Transform2D`, `RigidBody2D`, `Collider2D` to `Transform`, `Body`, `Collider` with
ids `transform`, `physics.body`, `physics.collider`; `CollisionStarted2D`, `CollisionEnded2D` to `CollisionStarted`,
`CollisionEnded` with ids `physics.collision-started`, `physics.collision-ended`; `transform2d`, `body2d`,
`collider2d` to `transform`, `body`, `collider`; the plugin's name to `physics`. Keep the `PhysicsAdapter` seam: it is
what keeps Rapier inside `rapier.ts`. Keep the default gravity (`{ x: 0, y: -9.81 }`) so the lifted tests hold; games
pass their own (Task 10).

**Interfaces:**
- Produces: `physics(options?: { gravity?: { x: number; y: number } }): PluginDef`, `Transform` (`x`, `y`,
  `rotation`, all `f32`), `Body` (`kind`, `linearDamping`, `angularDamping`, `vx`, `vy`, `angvel`, and new
  `fixedRotation: 'bool'`), `Collider` (`shape`, `hx`, `hy`, `sensor`, `groups`, `friction`, `restitution`),
  `BodyKind`, `ShapeKind`, `transform(at)`, `body(kind, opts)`, `collider.ball|cuboid|capsule(...)`,
  `CollisionStarted`, `CollisionEnded`.

- [x] **Step 1: Lift the files and tests** with the renames.
- [x] **Step 2: Add `physics-scene.parity.test.ts`:** the lifted scene run for 300 ticks through `runGolden`,
  against `tests/golden/physics-scene.json` (committed empty, recorded from Node's log as in Task 4).
- [x] **Step 3: Push; all jobs pass** once the golden is recorded.
- [x] **Step 4: Write the failing test** for the new field, in `tests/features/physics/fixed-rotation.test.ts`:

```ts
test('a body with fixedRotation never turns', async () => {
  // A 1 x 2 box dropped so one corner lands on the edge of a fixed ledge.
  const sim = await createSim({ seed: 1, plugins: [physics({ gravity: { x: 0, y: 30 } })] })
  sim.spawn([transform({ x: 0, y: 5 }), body(BodyKind.fixed), collider.cuboid(1, 0.5)])
  const tipping = sim.spawn([transform({ x: 1.4, y: 0 }), body(BodyKind.dynamic), collider.cuboid(0.5, 1)])
  const upright = sim.spawn([transform({ x: -1.4, y: 0 }), body(BodyKind.dynamic, { fixedRotation: true }), collider.cuboid(0.5, 1)])
  for (let i = 0; i < 120; i++) sim.step([])
  expect(sim.entity(tipping)?.get(Transform).rotation).not.toBe(0)
  expect(sim.entity(upright)?.get(Transform).rotation).toBe(0)
})
```

- [x] **Step 5: Push; `check` fails** because `fixedRotation` is not a field of `Body`.
- [x] **Step 6: Add `fixedRotation`** to `Body`, to `body()`'s options (default `false`), and to `rapier.ts`
  (`lockRotations` in `createBody`; applied in `updateBody` when it differs).
- [x] **Step 7: Push.** The new field changes `physics-scene.json`'s hashes (the component's schema is hashed). This
  is the one planned golden move in this plan: the scene is days old and nothing depends on it. Re-record it from
  Node's log, say so in the commit message, and tell the coordinator in the task's line. All jobs pass.
- [x] **Step 8: Commit** (`feat(physics): Rapier 2D in the sim, lifted; bodies can be kept upright`).

### Task 6: Players and the `controls` command

**Files:**
- Create: `src/features/commands/commands.ts`, `src/features/commands/players.ts`
- Test: `tests/features/commands/players.test.ts`

**Interfaces:**
- Consumes: `defineComponent`, `defineCommand`, `defineSystem`, `definePlugin`, `EntityRef`.
- Produces:

```ts
export const MAX_PLAYERS = 4
/** On each entity a player controls. `held` and `pressed` are action names, sorted, joined with ','. */
export const Player: ComponentDef<{ number: 'u32'; held: 'string'; pressed: 'string' }>  // id 'player', render: false
/** Everything the player is holding down this tick. Sent only when it changes. */
export const ControlsCommand: CommandDef  // id 'controls', payload z.strictObject({ held: z.array(ActionName).max(16) })
export function isHeld(player: EntityRef, action: string): boolean
/** True only on the tick the action went from up to down. */
export function wasPressed(player: EntityRef, action: string): boolean
export function controlsCommand(tick: number, player: number, seq: number, held: readonly string[]): Command
export const commandsPlugin: PluginDef  // name 'commands'; one system 'commands.controls' in phase 'input'
```

  `ActionName` is `/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/`.

- [ ] **Step 1: Write the failing tests** (a sim with `commandsPlugin`, two entities spawned with `Player` numbers
  1 and 2):

```ts
test('a controls command reaches only the player who sent it', ...)
  // step [controlsCommand(0, 2, 0, ['right', 'jump'])]
  // -> isHeld(p2, 'right'), isHeld(p2, 'jump'), wasPressed(p2, 'jump'); !isHeld(p1, 'right')
test('pressed lasts one tick, held lasts until it changes', ...)
  // next step with no commands -> isHeld(p2, 'jump') still true, wasPressed(p2, 'jump') false
test('held is stored sorted and without repeats', ...)
  // held ['right', 'jump', 'right'] -> p2.get(Player).held === 'jump,right'
test('a command for a player who is not in the level changes nothing and does not throw', ...)
  // controlsCommand(tick, 4, 0, ['jump']) -> step returns, both players unchanged
test('a command with a bad action name is rejected, not thrown', ...)
  // held ['Jump!'] -> StepResult.rejected[0].reason === 'invalid-payload'
test('a player number above MAX_PLAYERS or below 1 is rejected', ...)
  // source 0 and source 5 -> players unchanged
```

- [ ] **Step 2: Push; `check` fails** because `commands.ts` does not exist.
- [ ] **Step 3: Implement.** The system clears `pressed` on every `Player`, then applies each tick's `controls`
  records in the order the sim gives them; when one player sent two in a tick, the later one wins.
- [ ] **Step 4: Push; all jobs pass.**
- [ ] **Step 5: Commit** (`feat(commands): numbered players and the controls command`).

### Task 7: Replays

**Files:**
- Create: `src/features/commands/replay.ts`, `recorder.ts`, `play.ts`; modify `commands.ts`
- Test: `tests/features/commands/replay.test.ts`, `tests/features/commands/replay.parity.test.ts`

**Interfaces:**
- Consumes: `Sim`, `Command`, `canonicalJson`, the bounce fixture.
- Produces:

```ts
export interface Replay {
  readonly format: 1
  readonly framework: string                    // FRAMEWORK_VERSION, for information
  readonly tickHz: number
  readonly seed: number
  readonly contentHash: string                  // 16 hex digits
  readonly ticks: number
  readonly commands: readonly Command[]         // ascending tick
  readonly checks: readonly { readonly tick: number; readonly hash: string }[]
  readonly finalHash: string
  readonly meta: Readonly<Record<string, string>>
}
export const ReplaySchema: z.ZodType<Replay>    // strict
export class ReplayFormatError extends Error {}
export function parseReplay(text: string): Replay          // throws ReplayFormatError
export function writeReplay(replay: Replay): string        // 2-space JSON, keys in the order above, '\n' at the end
export interface Recorder { step(commands: readonly Command[]): StepResult; replay(): Replay }
/** `sim` must be at tick 0. A check hash every `checkEvery` ticks (default 60). `replay()` may be called at any time. */
export function createRecorder(sim: Sim, options?: { checkEvery?: number; meta?: Readonly<Record<string, string>> }): Recorder
export interface Played { readonly finalHash: string; readonly checks: readonly { tick: number; hash: string }[] }
/** Runs the replay's commands on `sim` (at tick 0) and reports the hashes. Does not compare anything. */
export function playReplay(sim: Sim, replay: Replay): Played
export type Verdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'wrong-setup'; readonly detail: string }   // seed, tickHz or sim not at tick 0
  | { readonly ok: false; readonly reason: 'content-changed'; readonly expected: string; readonly actual: string }
  | { readonly ok: false; readonly reason: 'diverged'; readonly tick: number; readonly expected: string; readonly actual: string }
export function verifyReplay(sim: Sim, replay: Replay): Verdict
```

- [ ] **Step 1: Write the failing tests** with the bounce fixture:

```ts
test('a recorded run verifies on a fresh sim', ...)                    // verifyReplay -> { ok: true }
test('writeReplay then parseReplay gives the same replay', ...)        // toEqual, and writeReplay twice is identical text
test('replay() can be taken mid-run and again at the end', ...)        // ticks 100 then 300; the first is a prefix
test('changed content is named as changed content', ...)               // sim created with other `content` -> reason 'content-changed'
test('another seed is a wrong setup', ...)                             // reason 'wrong-setup', detail mentions 'seed'
test('a changed command diverges at the first check after it', ...)    // edit one payload -> reason 'diverged', tick === that check's tick
test('playReplay ignores the recorded hashes', ...)                    // finalHash '0'.repeat(16) in the replay -> returns the real hash
test('parseReplay refuses text that is not a replay', ...)             // '{', '{}', an unknown key, commands out of tick order -> ReplayFormatError
```

  `replay.parity.test.ts`: record the bounce run, `writeReplay` it, and expect the text's xxhash64 to equal the one
  in `tests/golden/bounce.json` under a new key `replayTextHash` (recorded from Node's log like any golden; adding a
  key to a golden is not moving it).
- [ ] **Step 2: Push; `check` fails** because `replay.ts` does not exist.
- [ ] **Step 3: Implement.** `verifyReplay` checks setup, then content, then each check hash in order, then the final
  hash.
- [ ] **Step 4: Push; all jobs pass** once `replayTextHash` is recorded.
- [ ] **Step 5: Commit** (`feat(commands): JSON replays: record, play and verify`).

### Task 8: Content files: schemas, problems, reading and writing

**Files:**
- Create: `src/features/content/content.ts`, `ids.ts`, `level.ts`, `character.ts`, `content-types.ts`,
  `diagnostics.ts`, `parse.ts`, `write.ts`, `json-schema.ts`
- Test: `tests/features/content/level.test.ts`, `character.test.ts`, `parse.test.ts`, `write.test.ts`,
  `json-schema.test.ts`

**Interfaces:**
- Produces:

```ts
export const Id: z.ZodString            // /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, at most 64 characters
export const LevelSchema                // strict: format 1, id, tiles, things, starts (see "A level" above)
export const CharacterSchema            // strict: format 1, id, body 'dynamic' | 'fixed', size { w, h }, color, upright
export type Level = z.output<typeof LevelSchema>
export type Character = z.output<typeof CharacterSchema>
export const CONTENT_TYPES: {
  readonly level: { readonly schema: typeof LevelSchema; readonly editor: 'levels' }
  readonly character: { readonly schema: typeof CharacterSchema; readonly editor: 'characters' }
}
export type ContentType = keyof typeof CONTENT_TYPES
export interface Diagnostic { readonly file: string; readonly path: string; readonly message: string }
export function formatDiagnostic(d: Diagnostic): string   // 'file: path: message', or 'file: message' when path is ''
export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] }
export function parseContent<T extends ContentType>(type: T, text: string, file: string): Parsed<z.output<(typeof CONTENT_TYPES)[T]['schema']>>
export function writeContent<T extends ContentType>(type: T, value: z.input<(typeof CONTENT_TYPES)[T]['schema']>): string
export function jsonSchemaFor(type: ContentType): object   // z.toJSONSchema, with a title and a description per field
```

  Limits: `tiles` has 1 to 256 rows of one shared length of 1 to 256, of `#` and `.` only. `things` has at most 1024
  entries with ids unique in the level; `x` and `y` are finite and inside the level. `starts` has 1 to 4 entries with
  distinct `player` numbers 1 to 4, inside the level. `size.w` and `size.h` are above 0 and at most 16. `color` is
  `#rrggbb`. `upright` defaults to `false`.

- [ ] **Step 1: Write the failing tests.** The valid level and characters are the ones under "What the other repos
  rely on". Problems are asserted through `formatDiagnostic`, word for word:

```ts
test('the example level and characters parse', ...)
test('text that is not JSON', () => expect(problems('level', '{ "format": 1,', 'content/levels/a.json')).toEqual([
  'content/levels/a.json: This file is not valid JSON. Check for a missing comma, quote or bracket.']))
test('a missing field', ...)       // no "starts" -> 'content/levels/a.json: starts: This is missing. A level needs at least one start point.'
test('an unknown key', ...)        // "colour": 1 -> 'content/levels/a.json: colour: This is not something a level has. Remove it or check the spelling.'
test('rows of different lengths', ...)  // -> 'content/levels/a.json: tiles[1]: This row has 15 tiles but the first row has 16. Every row must be the same length.'
test('a tile that is not # or .', ...)  // -> 'content/levels/a.json: tiles[0]: Use only # (solid) and . (empty). Found "x".'
test('two things with one id', ...)     // -> 'content/levels/a.json: things[1].id: "crate-1" is used twice. Each thing needs its own id.'
test('a thing outside the level', ...)  // -> 'content/levels/a.json: things[0].x: 40 is outside the level, which is 16 tiles wide.'
test('a bad colour', ...)               // -> 'content/characters/hero.json: color: Write a colour as # and six digits, like #e4572e.'
test('every problem in a file is reported, not only the first', ...)   // two faults -> two diagnostics
test('parseContent never throws', ...)  // '', 'null', '[]', '"x"', 5 MB of 'a' -> ok: false each time
test('writeContent is stable', ...)     // keys in schema order whatever order they came in; 2 spaces; one tile row per line; ends '\n';
                                        // parseContent(writeContent(v)).value toEqual v; writing the parsed value again gives identical text
test('writeContent refuses a value that does not pass its schema', ...)  // throws with the formatted problems in the message
test('the JSON Schema names every field', ...)  // jsonSchemaFor('level').properties has format, id, tiles, things, starts, each with a description
```

- [ ] **Step 2: Push; `check` fails** because `content.ts` does not exist.
- [ ] **Step 3: Implement.** Problems come from one function that turns a Zod issue into the sentences above (by
  issue code and path); the cross-field ones (row lengths, duplicate ids, bounds) are `superRefine` checks with those
  messages. Every schema field carries `.describe(...)` in plain words, which is what the JSON Schema shows an agent.
- [ ] **Step 4: Push; all jobs pass.**
- [ ] **Step 5: Commit** (`feat(content): level and character files: schemas, plain problems, one writer`).

### Task 9: The project file and loading a whole game

**Files:**
- Create: `src/features/content/project.ts`, `src/features/content/load.ts`; modify `content.ts`
- Create: `tests/fixtures/game/automata.toml`, `tests/fixtures/game/content/levels/level-1.json`,
  `tests/fixtures/game/content/characters/hero.json`, `crate.json`, `tests/fixtures/game/read.ts`
- Test: `tests/features/content/project.test.ts`, `tests/features/content/load.test.ts`

**Interfaces:**
- Consumes: `parseContent`, `Diagnostic`, `CONTENT_TYPES`.
- Produces:

```ts
export const PROJECT_FILE = 'automata.toml'
export const ProjectSchema   // strict: format 1, name (1 to 80 chars), start: Id, hero: Id, content: { type: ContentType, path }[]
export type Project = z.output<typeof ProjectSchema>
export function parseProject(text: string): Parsed<Project>           // diagnostics name PROJECT_FILE
export interface GameContent {
  readonly project: Project
  readonly levels: Readonly<Record<string, Level>>
  readonly characters: Readonly<Record<string, Character>>
}
/** Reads the project file and every file it lists through `read` (fetch, the file system, GitHub). Never throws. */
export function loadGame(read: (path: string) => Promise<string>): Promise<Parsed<GameContent>>
```

  A `path` is relative, uses `/`, has no `..` segment and ends in `.json`. `tests/fixtures/game/read.ts` exports
  `fixtureFiles: Record<string, string>` (the fixture's files, imported with Vite's `?raw` so it also works in a
  browser) and `readFixture(overrides?: Record<string, string | undefined>)`, a `read` over them where an override
  replaces a file and `undefined` makes it missing.

  The fixture game is the example under "What the other repos rely on", with a 16 by 9 level: the bottom row solid,
  the hero's start at `(2.5, 7.5)`, `crate-1` at `(6.5, 7.5)`, the crate 1 by 1 and not upright.

- [ ] **Step 1: Write the failing tests:**

```ts
test('the fixture game loads', ...)   // ok; levels has 'level-1'; characters has 'crate' and 'hero'; the value is frozen
test('a missing project file', ...)   // -> ['automata.toml: This file is missing. Every game needs it at the top of its repository.']
test('TOML that does not parse', ...) // -> ['automata.toml: This file is not valid TOML. <smol-toml's message, first line>']
test('a listed file that is missing', ...)   // -> ['content/characters/crate.json: This file is listed in automata.toml but is missing.']
test('a file name that does not match its id', ...)  // id 'box' in crate.json -> 'content/characters/crate.json: id: This must be "crate", the same as the file name.'
test('a thing that points at no character', ...)     // -> 'content/levels/level-1.json: things[0].character: There is no character called "crat". This game has: crate, hero.'
test('a start level that does not exist', ...)       // -> 'automata.toml: start: There is no level called "level-9". This game has: level-1.'
test('a hero that does not exist', ...)              // -> 'automata.toml: hero: There is no character called "heroo". This game has: crate, hero.'
test('a path that leaves the repository', ...)       // '../x.json' -> 'automata.toml: content[0].path: Use a path inside the game, like content/levels/level-1.json.'
test('the same file listed twice', ...)              // -> 'automata.toml: content[3].path: This file is already listed.'
test('problems in several files all come back, in the order of the project file', ...)
test('a read that rejects with a non-Error is still a problem, not a throw', ...)
```

- [ ] **Step 2: Push; `check` fails** because `project.ts` does not exist.
- [ ] **Step 3: Implement.** `parseProject` uses smol-toml, then `ProjectSchema`. `loadGame` reads files in project
  order, collects every problem, runs the cross-file checks only on files that parsed, and deep-freezes the result.
- [ ] **Step 4: Push; all jobs pass.**
- [ ] **Step 5: Commit** (`feat(content): the project file and loading a game`).

### Task 10: A level in the sim, and the thin thread's golden

**Files:**
- Create: `src/features/level/level.ts`, `components.ts`, `tile-runs.ts`, `spawn-level.ts`, `game-sim.ts`
- Create: `tests/fixtures/game/hero.ts`, `tests/fixtures/game/script.ts`, `tests/golden/push-crate.json`
- Test: `tests/features/level/tile-runs.test.ts`, `spawn-level.test.ts`, `push-crate.parity.test.ts`

**Interfaces:**
- Consumes: `physics`, `Transform`, `Body`, `Collider`, `BodyKind`, `transform`, `body`, `collider`,
  `commandsPlugin`, `Player`, `isHeld`, `wasPressed`, `controlsCommand`, `GameContent`, `Level`, `createSim`,
  `createRecorder`, `verifyReplay`, `runGolden`, `expectGolden`.
- Produces:

```ts
export const TILE_COLOR = 0x3b4a5a
export const SKY_COLOR = 0x9fd3f0
/** What is drawn for an entity: a box of this size in tiles and this colour (0xrrggbb). */
export const Look: ComponentDef<{ w: 'f32'; h: 'f32'; color: 'u32' }>            // id 'look'
/** Which thing of the level file this entity is. Heroes have id 'player-<number>'; tiles have no Thing. */
export const Thing: ComponentDef<{ id: 'string'; character: 'string' }>          // id 'thing', render: false
export const levelPlugin: PluginDef   // name 'level', dependsOn ['physics', 'commands']
export interface TileRun { readonly row: number; readonly col: number; readonly length: number }
/** Each unbroken horizontal run of '#', rows top to bottom, runs left to right. */
export function tileRuns(tiles: readonly string[]): TileRun[]
export function levelSize(level: Level): { readonly w: number; readonly h: number }
export class LevelError extends Error {}
/** Spawns, in this order: tile runs, things in file order, one hero per player in ascending number. */
export function spawnLevel(sim: Sim, content: GameContent, levelId: string, players: readonly number[]): void
export interface GameSimOptions {
  readonly content: GameContent
  readonly plugins?: readonly PluginDef[]        // the game's own
  readonly seed?: number                         // default 1
  readonly level?: string                        // default content.project.start
  readonly players?: readonly number[]           // default [1]
  readonly gravity?: { readonly x: number; readonly y: number }   // default { x: 0, y: 30 }
}
/** The sim a game runs: physics, commands, level and the game's plugins, with the level spawned, at tick 0. */
export function createGameSim(options: GameSimOptions): Promise<Sim>
```

  A tile run is one fixed cuboid with a `Look` of `TILE_COLOR`. A thing or hero gets `Transform` at its `x, y`, a
  `Body` of its character's kind with `fixedRotation` from `upright`, a cuboid `Collider` of half its `size`, a `Look`
  of its size and colour, and a `Thing`; a hero also gets `Player` with its number. `createGameSim` passes `content`
  to `createSim`, so the content is in `contentHash`.

  `tests/fixtures/game/hero.ts` exports `heroPlugin`: in `gameplay`, for each `Player` with a `Body`, `vx` is `-6`,
  `0` or `6` from `left`/`right`, and `wasPressed('jump')` sets `vy` to `-12` when `|vy| < 0.01`. It is the smallest
  game code and stands in for the Examples repo's hero. `script.ts` exports `PUSH_TICKS = 300` and
  `pushScript(tick): Command[]`: hold `right` from tick 10, add `jump` at tick 200, release everything at tick 260.

- [ ] **Step 1: Write the failing tests:**

```ts
test('tileRuns joins neighbours in a row and keeps rows apart', () =>
  expect(tileRuns(['##.#', '....', '####'])).toEqual([
    { row: 0, col: 0, length: 2 }, { row: 0, col: 3, length: 1 }, { row: 2, col: 0, length: 4 }]))
test('the fixture level spawns one floor, the crate and the hero, in that order', ...)
  // sids 1, 2, 3; sid 1 has Collider hx 8, hy 0.5 and Transform (8, 8.5); sid 2 has Thing.id 'crate-1';
  // sid 3 has Player.number 1, Thing.id 'player-1' and Body.fixedRotation true
test('asking for more players than the level has starts is a LevelError that says so', ...)
  // players [1, 2] -> message 'Level "level-1" has a start point for player 1 only. Add one for player 2.'
test('an unknown level is a LevelError', ...)
test('two sims from the same content hash the same at tick 0', ...)
```

  `push-crate.parity.test.ts`: `createGameSim` over the fixture game with `heroPlugin`, recorded through
  `createRecorder` while `pushScript` drives it for `PUSH_TICKS`:

```ts
test('the hero pushes the crate, and the run matches its golden', ...)
  // crate's Transform.x at the end > 6.5 + 1; expectGolden({ ticks, finalHash, checks } of recorder.replay(), golden)
  // against tests/golden/push-crate.json
test('the recorded replay verifies on a fresh game sim', ...)          // verifyReplay -> { ok: true }
test('with the crate moved in the level file, the replay says the content changed', ...)
  // loadGame with crate-1 at x 9.5 -> verifyReplay reason 'content-changed'; playReplay still runs to PUSH_TICKS
```

- [ ] **Step 2: Push; `check` fails** because `level.ts` does not exist.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Record `tests/golden/push-crate.json`** from Node's log; push; all jobs pass, the three browsers
  matching Node. This run is M1's framework proof: content, physics, commands and replay end on one hash in four
  engines.
- [ ] **Step 5: Commit** (`feat(level): a level's tiles, things and heroes in the sim`).

### Task 11: Rendering

**Files:**
- Create: `src/features/render/render.ts`, `scene.ts`, `fit.ts`, `stage.ts`
- Test: `tests/features/render/scene.test.ts`, `fit.test.ts`, `render.browser.test.ts`

**Interfaces:**
- Consumes: `RenderDelta`, `Transform`, `Look`, `SKY_COLOR`.
- Produces:

```ts
export interface View { readonly sid: number; readonly x: number; readonly y: number; readonly rotation: number;
                        readonly w: number; readonly h: number; readonly color: number }
export interface Scene {
  apply(delta: RenderDelta): void            // call once per sim step
  views(alpha: number): View[]               // ascending sid; pose blended from the last step to this one, alpha in [0, 1]
}
export function createScene(): Scene
export interface Fit { readonly scale: number; readonly left: number; readonly top: number }
/** The largest scale at which the whole world fits the box, centred. `{ scale: 0, left: 0, top: 0 }` for an empty box. */
export function fitWorld(box: { w: number; h: number }, world: { w: number; h: number }): Fit
export interface Renderer {
  readonly canvas: HTMLCanvasElement
  apply(delta: RenderDelta): void
  draw(alpha: number): void
  destroy(): void
}
/** Fills `mount` with a canvas and refits whenever `mount` changes size. `world` is the level's size in tiles. */
export function createRenderer(options: { mount: HTMLElement; world: { w: number; h: number } }): Promise<Renderer>
```

  Only entities with both `transform` and `look` rows are views. An entity is drawn at its new pose on the step it
  appears (no slide in from elsewhere), a `resync` delta drops everything first, and rotation blends the short way
  round.

- [ ] **Step 1: Write the failing tests:**

```ts
test('an added entity is a view at its pose, whatever alpha is', ...)
test('a moved entity is halfway at alpha 0.5', ...)             // x 1 -> 3 gives 2
test('rotation takes the short way', ...)                       // 3.0 -> -3.0 rad at alpha 0.5 is within 0.2 of ±π, not 0
test('an entity that stopped changing rests at its last pose', ...)   // apply an empty delta -> views(0) equals views(1)
test('a removed entity is gone; a resync replaces everything', ...)
test('an entity with no look is not drawn', ...)
test('alpha outside 0..1 is clamped', ...)
test('fitWorld letterboxes', () => {
  expect(fitWorld({ w: 800, h: 450 }, { w: 16, h: 9 })).toEqual({ scale: 50, left: 0, top: 0 })
  expect(fitWorld({ w: 390, h: 844 }, { w: 16, h: 9 })).toEqual({ scale: 24.375, left: 0, top: 312.3125 })
})
test('fitWorld of an empty box or an empty world is scale 0, never NaN or Infinity', ...)  // {0,0}, {0,100}, world {0,9}
```

  `render.browser.test.ts` (each of the three engines): a 390 by 844 mount; `createRenderer` over a 16 by 9 world;
  apply a delta adding one entity; `draw(1)`:

```ts
test('the canvas fills its mount', ...)                 // canvas client size 390 x 844
test('turning the mount refits the picture', ...)       // resize mount to 844 x 390, wait for the ResizeObserver -> canvas 844 x 390, no error
test('a mount with no size yet does not throw, and draws once it has one', ...)
test('destroy removes the canvas and stops watching', ...)
```

- [ ] **Step 2: Push; `check` fails** because `render.ts` does not exist.
- [ ] **Step 3: Implement.** `stage.ts` owns the Pixi `Application` (WebGL preferred, `SKY_COLOR` background,
  `resolution` from `devicePixelRatio`) and one `Graphics` per view inside a world container scaled and placed by
  `fitWorld`. If an engine in CI cannot create a WebGL context, stop and report: do not skip the engine.
- [ ] **Step 4: Push; all jobs pass.**
- [ ] **Step 5: Commit** (`feat(render): the scene drawn from sim deltas with Pixi`).

### Task 12: Keyboard and touch input

**Files:**
- Create: `src/features/input/input.ts`, `controls.ts`, `keyboard.ts`, `touch.ts`
- Test: `tests/features/input/controls.test.ts`, `input.browser.test.ts`

**Interfaces:**
- Consumes: `controlsCommand`, `Command`.
- Produces:

```ts
/** One action a player can take. `label` is the words on its touch button and its accessible name. */
export interface Control {
  readonly label: string                        // 1 to 12 characters, e.g. 'Jump'
  readonly keys: readonly string[]              // KeyboardEvent.code values, e.g. ['ArrowLeft', 'KeyA']
  readonly side: 'left' | 'right'               // which thumb's corner the touch button sits in
}
export type Controls = Readonly<Record<string, Control>>   // by action name, in the order the buttons are shown
export function checkControls(controls: Controls): void    // throws with a plain message: bad action name, empty label, a key bound twice
export interface Input {
  /** The commands to send this tick: one `controls` command when what is held has changed, otherwise none. */
  poll(tick: number): Command[]
  destroy(): void
}
export function createInput(options: { mount: HTMLElement; controls: Controls; player?: number }): Input
```

  Keys are read from `window`; a key event whose target is an `input`, `textarea`, `select` or editable element is
  ignored. Touch buttons are real `<button>` elements inside `mount`, at least 64 by 64 CSS pixels, showing `label`,
  with `touch-action: none`, placed in the bottom corners inside the safe-area insets. They are hidden until the
  first `pointerdown` with `pointerType === 'touch'` or when `(pointer: coarse)` matches at creation.

- [ ] **Step 1: Write the failing tests.** `controls.test.ts`: `checkControls` accepts the fixture controls
  (`left`: 'Left', ArrowLeft and KeyA, left side; `right`: 'Right', ArrowRight and KeyD, left side; `jump`: 'Jump',
  Space and ArrowUp, right side) and throws for `'Jump!'` as an action name, an empty label, and `Space` bound to two
  actions (message `The key Space is used for both "jump" and "fire". Give each action its own key.`).
  `input.browser.test.ts`, driving real DOM events:

```ts
test('holding a key sends one command, and nothing more until it changes', ...)
  // keydown ArrowRight -> poll(0) is [controlsCommand(0, 1, 0, ['right'])]; poll(1) is []; keyup -> poll(2) held []
test('two keys for one action count once', ...)                 // ArrowLeft and KeyA down, KeyA up -> still held
test('seq goes up by one per command sent', ...)
test('key repeat sends nothing new', ...)                       // keydown with repeat: true
test('the window losing focus lets go of every key', ...)       // keydown, window blur -> next poll held []
test('typing in a text field does not move the hero', ...)      // keydown targeted at an <input>
test('bound keys do not scroll the page; other keys are left alone', ...)   // defaultPrevented true for Space, false for KeyQ
test('touch buttons appear on first touch and say what they do', ...)
  // hidden at first on a fine pointer; after a touch pointerdown: three buttons with text Left, Right, Jump
test('every touch button is at least 48 px in both directions at 390 x 844 and at 320 x 568', ...)
test('two fingers hold two buttons', ...)                       // pointerdown on Right (id 1) and Jump (id 2) -> held ['jump', 'right']
test('a finger sliding off a button, or a cancelled touch, lets go', ...)   // pointerleave, pointercancel
test('destroy removes the buttons and the listeners', ...)
test('player 2 input sends commands from source 2', ...)
```

- [ ] **Step 2: Push; `check` fails** because `input.ts` does not exist.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Push; all jobs pass.**
- [ ] **Step 5: Commit** (`feat(input): keyboard and on-screen touch controls as commands`).

### Task 13: The web host, the loop and `startGame`

**Files:**
- Create: `src/features/host/host.ts`, `web.ts`, `src/features/game/game.ts`, `loop.ts`
- Test: `tests/features/host/web.browser.test.ts`, `tests/features/game/loop.test.ts`,
  `tests/features/game/game.browser.test.ts`

**Interfaces:**
- Consumes: `createGameSim`, `GameSimOptions`, `createRecorder`, `Replay`, `createRenderer`, `levelSize`,
  `createInput`, `Controls`, `checkControls`.
- Produces:

```ts
/** The port a game talks to its surroundings through. M1 needs only "is the game on screen". */
export interface Host {
  readonly target: 'web'
  visible(): boolean
  /** Returns a function that stops listening. */
  onVisibility(listener: (visible: boolean) => void): () => void
}
export function webHost(doc?: Document): Host            // document.visibilityState
export interface Frames { request(callback: (ms: number) => void): number; cancel(id: number): void }
export const MAX_STEPS_PER_FRAME = 5
export interface Loop { start(): void; stop(): void; readonly running: boolean }
/** Calls `step` at `tickHz` on average and `draw(alpha)` once per frame. Time comes only from `frames`. */
export function createLoop(options: { tickHz: number; step: () => void; draw: (alpha: number) => void; frames: Frames }): Loop
export interface GameOptions extends GameSimOptions {
  readonly mount: HTMLElement
  readonly controls: Controls
  readonly host: Host
  readonly frames?: Frames                               // default: requestAnimationFrame
}
export interface Game {
  readonly sim: Sim
  pause(): void
  resume(): void
  /** The play so far, from tick 0. */
  replay(): Replay
  stop(): void                                           // stops the loop, removes the canvas and controls, disposes the sim
}
export function startGame(options: GameOptions): Promise<Game>
```

  The loop keeps an accumulator. A frame runs at most `MAX_STEPS_PER_FRAME` steps and throws away any time beyond
  that; the first frame after `start()` only sets the clock. The game is paused while the host is not visible or
  `pause()` was called, and resuming starts the clock fresh. `startGame` plays local player 1.

- [ ] **Step 1: Write the failing tests.** `loop.test.ts` with a hand-driven `Frames`:

```ts
test('one 60 Hz frame is one step', ...)                         // frames at 0, 16.667 -> 1 step
test('a 30 Hz display takes two steps a frame', ...)
test('a 120 Hz display steps every other frame, and alpha is the part of a tick left over', ...)   // alpha ≈ 0.5 between
test('a frame a minute late runs MAX_STEPS_PER_FRAME steps and drops the rest', ...)   // then the next 16.667 ms frame is 1 step
test('time going backwards runs no steps and does not throw', ...)
test('stop cancels the pending frame; start after stop does not count the gap', ...)
```

  `web.browser.test.ts`: `webHost(fakeDocument)` reports `visible()` from `visibilityState` and calls listeners on
  `visibilitychange`, and not after the returned function is called.
  `game.browser.test.ts` (fixture game, `heroPlugin`, fixture controls, hand-driven `Frames`, a 390 by 844 mount):

```ts
test('the game starts: a canvas in the mount and the sim at tick 0', ...)
test('holding Right for 120 frames moves the hero right', ...)   // keydown ArrowRight, 120 frames -> sim.tick 120, hero x > 2.5
test('what was played replays to the same hash in a headless sim', ...)
  // verifyReplay(await createGameSim({ content, plugins: [heroPlugin] }), game.replay()) -> { ok: true }
test('a hidden page pauses the game and coming back does not fast-forward', ...)
  // host says hidden, frames advance 60 s -> tick unchanged; visible again, one frame -> at most 1 step
test('pause and resume', ...)
test('stop leaves the mount empty and the sim disposed', ...)
test('bad controls stop the game from starting, with the plain message', ...)
test('how it looks on a phone', async () => { /* after a touch: page.screenshot() to __screenshots__/phone-390x844.png */ })
test('how it looks on a tablet', ...)                            // mount 820 x 1180 -> __screenshots__/tablet-820x1180.png
```

  The two screenshots are not compared with anything: they are what the implementation audit and the Owner look at for
  the drunk-grandma test, from the `screens-*` artifacts.
- [ ] **Step 2: Push; `check` fails** because `loop.ts` does not exist.
- [ ] **Step 3: Implement.** Each step: `input.poll(sim.tick)`, `recorder.step(commands)`, `renderer.apply(result.render)`.
- [ ] **Step 4: Push; all jobs pass**, and each `screens-*` artifact holds both pictures.
- [ ] **Step 5: Commit** (`feat(game): the web host, the fixed-step loop and startGame`).

### Task 14: The public surface, the build, the API report and the install smoke

**Files:**
- Modify: `src/index.ts`, `src/headless.ts`, `package.json`, `.github/workflows/ci.yml`, `README.md`
- Create: `vite.config.ts`, `tsconfig.build.json`, `scripts/write-schemas.ts`, `scripts/api-report.ts`,
  `scripts/api-report/extract.ts`, `scripts/api-report/report.ts`, `schemas/level.schema.json`,
  `schemas/character.schema.json`, `docs/api/framework.api.md`, `tests/install/smoke.mjs`,
  `tests/public-surface.test.ts`

**Interfaces:**
- Produces: `pnpm build` (Vite library mode, ES modules, entries `index` and `headless`, every dependency external,
  then `tsc -p tsconfig.build.json` for declarations into `dist/`); `pnpm schemas` and `pnpm schemas --check`;
  `pnpm api-report --update` and `pnpm api-report` (check); CI job `package`. `package.json` gains `files`
  (`dist`, `schemas`), and `exports`: `.` and `./headless` (each `types` + `import`), `./schemas/*`.

  `scripts/api-report/extract.ts` and `report.ts` are lifted from the old `tooling/api-report/src/extract.ts` and
  `report.ts` and use TypeScript 6.0.3's JS API, which the spec's table allows "where a tool needs the JS API": add the dev
  dependency `"typescript-6": "npm:typescript@6.0.3"` and import from `typescript-6`. `scripts/` is meant for thin wrappers; these two files are the exception until the
  `cli` feature exists in M2, and say so in a comment.

- [ ] **Step 1: Write the failing test** `tests/public-surface.test.ts`:

```ts
test('headless exports what a game sim and an editor need', async () => {
  const api = await import('#src/headless.ts')
  for (const name of ['createSim', 'definePlugin', 'defineSystem', 'defineComponent', 'defineCommand', 'physics',
    'Transform', 'Body', 'Collider', 'BodyKind', 'Player', 'isHeld', 'wasPressed', 'controlsCommand', 'createRecorder',
    'playReplay', 'verifyReplay', 'parseReplay', 'writeReplay', 'CONTENT_TYPES', 'parseContent', 'writeContent',
    'parseProject', 'loadGame', 'formatDiagnostic', 'jsonSchemaFor', 'PROJECT_FILE', 'spawnLevel', 'createGameSim',
    'levelSize', 'Look', 'Thing', 'FRAMEWORK_VERSION']) expect(api, name).toHaveProperty(name)
})
test('the committed JSON Schemas are what the code produces', ...)   // schemas/*.schema.json toEqual jsonSchemaFor(type)
```

  and the smoke, `tests/install/smoke.mjs`, run by CI in an empty folder after `npm install <the packed tarball>`:
  import `@automataframework/framework/headless`, `loadGame` over the fixture game's files (copied beside it by the job),
  `createGameSim` with no game plugin, step 60 times with no commands, print the hash, and exit non-zero unless it
  equals `idleHash60` in `tests/golden/push-crate.json`. Add that key in this task: a new case in
  `push-crate.parity.test.ts` runs the same 60 idle ticks and expects `golden.idleHash60`, recorded from Node's log
  like any golden (a new key, not a moved hash).
- [ ] **Step 2: Add the `package` job to CI:** `pnpm build`, `pnpm schemas --check`, `pnpm api-report`, `pnpm pack`,
  the smoke. Push; `check` fails on the missing exports.
- [ ] **Step 3: Fill the two entries, write the scripts, run** `pnpm schemas`, `pnpm build` and
  `pnpm api-report --update` locally and commit what they write. Write `README.md`: what the package is in the spec's
  positioning words, install, the smallest game (load, `startGame`), and where the schemas are.
- [ ] **Step 4: Push; all jobs pass**, including `package`.
- [ ] **Step 5: Commit** (`feat: the public surface, build, API report and install smoke`).

### Task 15: Release 0.1.0

**Files:**
- Create: `.changeset/config.json`, `.changeset/first-release.md`, `.github/workflows/release.yml`, `CHANGELOG.md`
- Modify: `package.json` (version `0.1.0`, `publishConfig`: public, npmjs.org)

- [ ] **Step 1: Check "Before starting" item 3** with the coordinator. Without the Owner's `NPM_TOKEN`, finish Steps
  2 to 4 and report that publishing waits on it.
- [ ] **Step 2: Write `release.yml`** (a workflow file, as Task 1's was: both are named by this plan, which the
  Owner reviews)**:** on `push` to `main`, one job on `ubuntu-latest`, `permissions: contents:
  write, id-token: write`, `concurrency: release`. Install, `pnpm build`, then `pnpm changeset publish` with
  `NPM_TOKEN`, which publishes only when `package.json`'s version is not on npm yet and tags it. So a release is a
  pull request that carries the version change, and nothing is pushed to `main` by a bot.
- [ ] **Step 3: Add the changeset** (`minor`: "The first release: the M1 thin thread."), run `pnpm changeset version`
  locally, and commit (`chore(release): 0.1.0`) `package.json` at `0.1.0`, `CHANGELOG.md`, and `version.test.ts` now
  comparing `FRAMEWORK_VERSION` with `package.json`.
- [ ] **Step 4: Push; all jobs pass.** Mark the pull request ready, set progress to the stage's 100%, and send the
  coordinator the end summary: commits, test counts per job, the three goldens' hashes, every deviation, what is open.
- [ ] **Step 5: After the merge session merges,** read the `release` run and confirm with
  `npm view @automataframework/framework version` printing `0.1.0`. Report the result. The stage is done only then.

# Plan Q: The Game Checklist In Every Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session at a time, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A game made with `automata create` meets every "Must have" box of the Owner's game checklist with no line of
its own code, keeps meeting it because `automata check` and a browser in its own CI say when it stops, and gets the
"Good to have" boxes a framework can give for free.

**Architecture:** Three places carry the checklist. The flow gains what a finished game has and ours lacks: losing and
Try again, Start again, How to play, a goal line, a score and its best, a sound switch, Delete all my saves, a loading
bar that says when it is slow, Back, and page-wide touch and scroll defaults. The template becomes one `startFlow` call,
with a level that can be lost and won (this is plan K's Step U). `automata
check` gains a `page` part, a `words` rule, an "ends" rule and `--ship`. Everything the flow shows still comes from
files (`automata.toml`, the messages), and nothing new reaches a sim unless a game asks for it, so only the template's
own recording moves.

**Tech Stack:** TypeScript 7.0.2 strict, Svelte 5.57.1, Zod 4.6.6, Effect (the `cli` feature), Vitest 5.0.3 (browser
mode on Playwright 1.63.0), Biome 2.5.15, knip 6.39.0, pnpm 10.34.6, Node 24.21.0. **No new dependency in the
framework.** **One new development dependency in the template, approved by the Owner (Q1, answer A, 2026-11-15):**
`playwright` 1.63.0, the version the framework's own tests use.

**Spec:** [`docs/superpowers/specs/2026-11-15-game-checklist-design.md`](../specs/2026-11-15-game-checklist-design.md).
Read it first, with plan U's plan ([`2026-11-15-game-flow.md`](2026-11-15-game-flow.md), whose shapes this plan
extends) and plan K's Step U ([`2026-11-14-m2-cli.md`](2026-11-14-m2-cli.md), "Part 2"). This plan argues from them and
does not repeat their reasons.

**Principles served:** onboarding first (a first-time player is told the goal, can lose, try again and find How to
play; a first-time developer gets all of it from `automata create`); 1, agent-first (every box the framework can judge
is a step of `automata check` with a file, a line and a sentence; every new thing the flow shows is a field or a
message key); the drunk-grandma test (the words table in Task 5); 6, the stack carries over (no new framework
dependency). It breaks none: 2D only, one package, no editor code, nothing built ahead of its user (the template uses
every part).

## The Owner's questions

- **Q1 (answered, 2026-11-15): A.** Every new game gets Playwright and a short play test in its own CI. Task 16.
- **The template's recording moves once** (Task 15). That is not a question to answer now but a gate: the pull request
  that moves it does not merge until the Owner has seen before and after and said yes. The executor sends both to the
  coordinator and waits.
- No other question is open. If one comes up, send it to the coordinator with options and a recommendation, and wait.

## Global Constraints

- **One golden moves, once: `template/replays/level-1.json`, in Task 15, in a commit that names it.** No other recorded
  hash moves: `tests/golden/*` and the Examples goldens keep theirs. Everything new the sim could see is either taken
  out of what the sim is given (Task 1) or joined to a sim only when the game asks (Task 2). If any other recorded hash
  differs in CI, stop that task and report it. Never re-record to get green. One golden is **new** (Task 2's
  `tests/golden/fall.json`), recorded from CI the way `tests/fixtures/golden.ts` says, in a commit that says "new".
- **Only the boxes about the game itself** (the Owner, 2026-11-15). Nothing here is about sending a game to a host:
  no store page, no age rating, no questions asked at sending, no appeal. No file, word or check names a host.
- **Cut by the Owner as one host's rules (2026-11-15), and not in this plan:** "no ads"; never asking for money;
  no tracking and the lockdown on outside sites (so no content security policy and no `[network] allow`); a check
  that fails a game still the starter; and the device and gamepad checks (the Android run, the no-WebGPU test, the
  made game played by gamepad). The framework's own standing rules are not cut: every screen still works by touch,
  gamepad and keys, and the existing `create-play` job still plays a new game in three engines at five sizes. A later
  export target for that host will hold a game to the whole list (Handoffs).
- **Mobile first** (the Owner, 2026-11-14): every new screen and line is designed and tested at 390 by 844 first.
  Input priority is touch, then gamepad, then keyboard and mouse.
- **Touch targets:** every control at least 44 CSS pixels both ways, every primary action at least 48, at every size in
  `tests/fixtures/game/screens.ts`. Never shrink one to fit. Words on a screen are 18 px or more.
- **Every action works three ways:** touch, gamepad (bottom button presses, right button goes back, start pauses) and
  keyboard (arrows, Enter or Space, Escape).
- **The drunk-grandma test.** Each new screen has one obvious thing to press, in at most three words. The words are
  Task 5's table; a word not in the table is not added without adding it there. No screen says "slot", "retry",
  "policy", "CSP", "save file" or "session". Sentences `automata check` prints are for a developer or an agent, in
  English, and each says the file, the place, what is wrong and what to write instead.
- **No default language.** No word shows before the player has a language, except the slow-loading line, which is said
  only when the device's language is one of the six. No `'en'` in `src/`. US spelling.
- **The order of the flow is the Owner's** and is not reopened. `lost` is a step beside `done`, not a new place in the
  order.
- **A game changes the flow through files, not code.** `automata.toml` for what shows, messages for the words, CSS
  custom properties for the look; code replaces a whole screen (`FlowOptions.screens`) and nothing smaller.
- **No file over 600 lines.** `src/features/flow/flow.ts` is at 578: Task 6 splits it before adding to it.
- **No `.svelte` file outside `src/features/ui/` and `src/features/screens/`.** Features import only from features
  below them (`tests/architecture/rules.ts`).
- **The editors are not touched** (they are on hold), and nothing they call changes shape: `startGame`, `loadGame`,
  `writeContent`, `project-write.ts` keep their signatures. New project fields are optional.
- **Tests run only in GitHub-hosted CI.** Run nothing locally: no install, typecheck, lint, build, test or generator.
  Push, then read the pull request's CI run. Push each test red before its code.
- **Generated files.** When the `package` job fails on `pnpm api-report`, take the new text from that job's log and
  commit it. Each pull request that changes the public surface adds a `patch` changeset, as `.changeset/` has them.
  The template's `package.template.json` has no lockfile, so Task 16's dependency needs no install.
- **Commits:** author and committer `McThayDT <107786093+mcthaydt@users.noreply.github.com>`; set the config before
  every commit; install the local hook that refuses any other author before the first; no AI attribution anywhere;
  never the Owner's real name; never force-push.
- **Tracker:** after each task, update `docs/superpowers/progress.md` (Cycle 12). Tasks 1 to 22 are 4% of stage 4
  each (7a and 7b are 2% each); the last 12% is the final green run with every check passing and the Owner's yes to the moved recording.

## Order, and what each part waits for

The parts keep the spec's letters. They are built in this order, six pull requests. B comes before A because the
template's level names `lost`, `score` and a goal, and its recording may move only once. Each is green and merged
before the next starts, with one exception: Part C does not wait for the Owner's gate on Part A.

| Pull request | Part | Tasks | Waits for |
|---|---|---|---|
| 1 | B1, what needs no page | 1 to 5 | The spec merged (AF 137). |
| 2a | B2, losing, the start of a level, How to play, the score, the switches | 6 to 9 | Pull request 1. Plan U's audit fixes (AF 136) on `main`: if they are not, merge `main` when they land and keep going. |
| 2b | B2, the page, loading, sound, the whole visit | 10 to 13 | Pull request 2a. |
| 3 | A, the template on the flow | 14 to 17 | Pull request 2b. **The Owner's yes to the moved recording, before merge.** |
| 4 | C, the checks | 18 to 20 | Pull request 2b on `main`, and pull request 3 green (merged, or waiting only for the Owner). |
| 5 | D, the journeys and the docs | 21, 22 | Pull requests 3 and 4, both merged. |

Pull request 4 branches from `main`, not from pull request 3: Part C's tests hold on the template before and after
Part A. Pull requests 3 and 4 both touch `template/AGENTS.md` and the README, so whichever merges second merges `main`
first. At most two of this plan's branches are open at once, so the count stays under five. Task 7 is two tasks, 7a
and 7b; where this plan says "Task 7" it means both.

Plan F (the feel runtime) and the Scenes cycle are being built at the same time and touch `game.ts`, `hud` and
`level/`. Whichever lands second merges `main` and keeps the other's change. If a file this plan names has moved,
follow it; if a shape this plan relies on has changed, stop and report.

## The builder's calls

The spec leaves these to the builder, or is silent. They are settled here so the executor makes none of them. The
audit should weigh each.

1. **`lost` is an event named in `automata.toml`, read exactly as `done` is** (`endsLevel`'s rule: a touch event counts
   only when a hero made it). When `done` and `lost` are raised in the same tick, `done` wins: a player who falls
   through the door has won.
2. **`hero.fell` is its own small plugin, joined only to a game whose `lost` is exactly `"hero.fell"`.** Adding an
   event to `movesPlugin` would change the schema hash of every game with a built-in hero and move every recording.
   So `fallPlugin` follows `joinPlugin` and `touchPlugin`: "only a game that asks has it, so every other game keeps the
   sim it had". A hero is any thing with `Player` and a `Body`, whether the framework moves it or the game's own
   rules do, so the plugin depends on `physics` and `commands` and never on the moves plugin. A hero has fallen when its center is more than two tiles below the level's lowest row. It is said once
   for each hero in a sim. In a game for several players, the first hero to fall loses the level for all; a game that
   wants another rule raises its own event and names that.
3. **Try again and Start again start the level afresh in the same page**, as "Next level" starts one today: the old
   game is stopped and a new one made. `FlowState` gains `attempt`, a count that goes up each time, so the page can
   tell a fresh start from "Keep playing", and a test can count them (`mount.dataset.attempt`).
4. **Start again asks first** ("Start this level again?"), as "Main menu" does. Try again does not: the level is
   already lost.
5. **The goal line is a message, not a new field:** `level.<id>.goal`, beside `level.<id>.name`, which the flow already
   reads. A level with no such message has no goal line. So no level file changes shape and no hash can move for a
   word.
6. **A level waits for the first press.** The first picture is drawn, the goal line and the hint are up, and the sim
   does not step until a press that begins after the level is shown: a `keydown` that is not a repeat, a gamepad
   button that was up and goes down, or a `pointerdown`. The Enter, the pad button or the tap that chose Play is still
   down when the level appears, and it does not count. Nothing is silenced once the level starts, so a direction
   pressed that way walks from tick 0. The goal line stays three seconds after that press (on the injected `Frames`), then goes; it is also on
   the pause screen. Watch mode does not wait.
7. **`score` names one number of one resource:** `score = "hero.score.sparks"` is the field `sparks` of the resource
   `hero.score` (the last dot splits them). It is read after each step and shown in the HUD's top center, on Well done
   and on Try again. A score is one level's: each level is its own sim.
8. **The best score is kept with the settings, not in a saved game.** A game that names its own save has no place
   for it, and a best score belongs to the player on this device, not to one of three saved games. It is a settings
   section, `records`: `{ best?: number }`. "Delete all my saves" clears it.
9. **The sound switch is a flag, `muted`, in the sound settings.** With a flag the two sliders keep where the player
   put them. It is on the pause screen and in Settings.
10. **"Delete all my saves" erases every saved game and the best score.** It leaves the language, the keys and the
    volumes: those are not what a player calls a save. It asks first, and "No" has the focus.
11. **Back** is one history entry, held while a level is on the page. The flow keeps whether it holds one, and pushes
    one whenever `playing` is entered and none is held. Back while playing pauses and puts the entry back; Back with a
    screen on top closes it and puts the entry back; Back on pause, Well done or Try again goes to the menu, and the
    entry is spent, so the next Play pushes a new one; Back on the menu leaves the page as it always did.
    `FlowOptions.back` is on by default only when the page is not framed (`window.top === window.self`, which a frame
    of another origin may read): a `pushState` in a frame joins the top page's history, so a framed game leaves Back
    to the page that frames it. `back: true` or `false` overrides the default.
12. **The page-wide defaults** are set by `startFlow` on the document (`overscroll-behavior: none`, no scrolling of the
    page while a game is mounted full-height) and on the mount (`touch-action: none`, `user-select: none`,
    `-webkit-touch-callout: none`), and put back by `stop()`. The screens' own lists still scroll inside themselves.
13. **Loading:** a bar in place of the ring, filled as files arrive (one for `automata.toml`, then one for each file it
    lists). After 10 seconds with no file arriving, the slow line, in the device's language when it is one of the six
    and never otherwise. A read that fails is tried once more after one second. The problem screen's button keeps its
    words, "Load the page again": "Try again" is what the lost screen says, and one button name means one thing.
14. **(Cut.)** The page's content security policy and `[network] allow` were this call. The Owner cut them
    (2026-11-15); the text is in this file's history (commit bfc4e414) for the later export-target plan.
15. **`--ship` is a flag of `automata check`** (the spec's call) and adds one step, `ship`, after `tests`. Plain
    `check` says the same findings as notes.
16. **The saves-version check reads `gameSave`**, an optional export of a game's `src/headless.ts` (a `SaveDef`).
    `automata replay --accept` writes `meta.save` (`"<version>:<hash of the schema>"`) into each recording; `--ship`
    fails when the hash differs from the newest recording's and the version does not. The hash is the framework's own hash of the save schema's JSON Schema (`z.toJSONSchema`
    with `io: 'input'`, as `describeSchemas` in `sim/create-sim.ts` makes one), so one schema gives one hash in every
    engine and every run. A game with no `gameSave` uses
    the flow's own save, which the framework versions, and is not checked.
17. **The template is for two players** (`players = 2`, a second start point, "Add a player"), as Step U says. It all
    moves in the one move of the recording.
18. **The template's own play test runs against the built folder** (`vite build`, then `vite preview`), in Chromium
    and WebKit, at 390 by 844 with touch and at 1280 by 720 with keys. It is kept out of `npm test` and of
    `automata check`'s `tests` step, so a developer with no browsers installed still passes `check`. CI runs it as a
    second job.

## Review Focus

The inputs the spec implies and no happy-path test would meet. Each names its test and the task that owns it.

1. **Lost and won in one tick, or lost twice** (two heroes fall together; a hero falls into the door): one screen,
   Well done when both, and one count of `attempt`. Task 3 (`steps.test.ts`) and Task 6 (`lost.browser.test.ts`).
2. **Try again pressed twice quickly, or 50 times in a row:** one game on the page, one canvas, the same entity count
   as the first start, no reload. Task 6 (`restart.browser.test.ts`).
3. **Back at an awkward moment:** while loading, on the language picker, with Settings open on pause, twice quickly,
   and after `stop()`. Never a blank page, never two entries, never a pause screen under the menu. Task 10
   (`back.browser.test.ts`).
4. **Storage holds garbage or refuses** when the best score is read or the saves are deleted: the game still opens,
   the score still counts, nothing throws, and the player is told once that it was not kept. Task 8
   (`records.test.ts`) and Task 9 (`delete.browser.test.ts`).
5. **The network at its worst while loading:** a file that arrives after the slow line showed, one that fails once and
   then arrives, one that fails twice, and all files failing. The bar never goes backwards, the slow line goes when a
   file arrives, and the end is the game or the problem screen, never a blank. Task 11 (`loading.browser.test.ts`).

## File Structure

```
src/features/content/project.ts          + lost, score; scoreRef
src/features/content/load.ts             the new fields' cross-file checks
src/features/level/fall.ts               NEW: fallPlugin, fellEvent, levelBottom
src/features/level/uses.ts               + usesFalls
src/features/level/game-sim.ts           + gameSimPlugins; joins fallPlugin when the game asks
src/features/level/sim-content.ts        lost and score leave what the sim is given
src/features/sim/create-sim.ts           + Sim.read(resourceId)
src/features/audio/settings.ts           + muted
src/features/web/speaker.ts              a compressor before the master gain
src/features/game/game.ts                + waitForPress, waiting(), score()
src/features/ui/Frame.svelte             a screen fades in and out
src/features/screens/
  lost.ts  Lost.svelte                   NEW: Try again
  how.ts   How.svelte   how-rows.ts      NEW: How to play (rows are pure)
  pause.ts menu-items.ts menu.ts         + again, how, the sound switch
  hud.ts   Hud.svelte                    + the goal line, the hint, the score
  done.ts  Done.svelte                   + the score and the best
  settings.ts settings-rows.ts           + the sound switch, Delete all my saves
  screens.ts                             + lost and how in ScreenMakers
src/features/flow/
  steps.ts                               + the lost step, level-lost, again, attempt, the how screen
  play.ts                                NEW: a level on the page (moved out of flow.ts, then grown)
  records.ts                             NEW: the best score (pure)
  back.ts                                NEW: Back
  page-guard.ts                          NEW: the page-wide defaults
  loading.ts                             the bar, the slow line; retrying(read)
  sections.ts                            + records
  events.ts                              + screen.lost
src/features/locale/library/*.json       + Task 5's words, six languages
src/features/locale/labels.ts            + levelGoal
src/features/cli/
  check-page.ts                          NEW: the page part of the rules step
  check-words.ts                         NEW: the words rule
  check-ends.ts                          NEW: done, lost and score can happen
  check-ship.ts                          NEW: the ship step and its list
  check.ts args.ts report.ts help.ts mcp-tools.ts replay.ts live.ts ports.ts   --ship, the new step, meta.save, gameSave
template/                                the page, the level, the door, the words, the feels and sounds,
                                         tests/play/, vitest.play.config.ts, the second CI job; the recording
skills/, template/AGENTS.md, README.md   the maker's boxes; the new fields, screens and checks
tests/                                   mirrors the above; tests/fixtures/flow/ gains a level that can be lost
```

---

## Part B1: what needs no page (pull request 1)

### Task 1: The project file says what loses a level and what the score is

**Files:**
- Modify: `src/features/content/project.ts`, `src/features/content/load.ts`, `src/features/level/sim-content.ts`,
  `src/features/content/content.ts` (exports), `tests/features/content/project.test.ts`,
  `tests/features/level/sim-content.test.ts`, `tests/public-surface.test.ts`

**Interfaces:**
- Produces:

```ts
export interface Project {
  // …as today, plus:
  /** The event that loses a level, like `hero.fell`. Left out, a level cannot be lost. */
  readonly lost?: string | undefined
  /** The number the game counts: a resource and one of its fields, like `hero.score.sparks`. */
  readonly score?: string | undefined
}
/** `score` as its two halves: the last dot splits them. `undefined` when the project names none. */
export function scoreRef(project: Project): { readonly resource: string; readonly field: string } | undefined
```

  `lost` is checked as `done` is (the same custom check, at most 96 characters, `WORDS_PATTERN`). `score` is at most 96
  characters, `WORDS_PATTERN`, with at least one dot. `sim-content.ts`'s `FLOW_FIELDS` becomes
  `['levels', 'done', 'warnings', 'splash', 'lost', 'score']`, and the two new keys leave the project the sim is given.

- [ ] **Step 1: Write the failing tests.**

```ts
test('lost and score are read', …)                             // lost: 'hero.fell', score: 'hero.score.sparks'
test('a project that writes none of them has none of the keys', …)   // Object.hasOwn false for both
test.each([
  ['lost = "Hero Fell!"', 'Write the event that loses a level, like lost = "hero.fell".'],
  ['score = "sparks"', 'Write a resource and one of its numbers, like score = "hero.score.sparks".'],
])('%s is refused with its sentence', …)
test('lost and done may not name the same event', …)   // 'A level cannot be won and lost by the same event. Change lost or done.'
test('scoreRef splits at the last dot', …)             // { resource: 'hero.score', field: 'sparks' }
// sim-content.test.ts
test('lost and score never reach the sim: the content hash is the same with and without them', …)
```

- [ ] **Step 2: Push; red.**
- [ ] **Step 3: Add the two fields, their hints, `scoreRef` and the `FLOW_FIELDS` entries.**
- [ ] **Step 4: Push; green, and every golden unchanged.**
- [ ] **Step 5: Commit** `feat(content): the project file names what loses a level and the score`.

### Task 2: A hero that falls out of the level says so

**Files:**
- Create: `src/features/level/fall.ts`, `tests/features/level/fall.test.ts`,
  `tests/features/level/fall.parity.test.ts`, `tests/golden/fall.json` (new, with `"finalHash": ""`),
  `tests/fixtures/game/fall-game.ts`
- Modify: `src/features/level/uses.ts`, `src/features/level/game-sim.ts`, `src/features/level/level.ts` (exports),
  `src/headless.ts`, `tests/public-surface.test.ts`

**Interfaces:**
- Consumes: `Project.lost` (Task 1).
- Produces:

```ts
/** The event a fallen hero raises: `hero.fell`, with the player's number and the hero's id, as a move event has. */
export const fellEvent: EventDef<z.ZodType<{ readonly player: number; readonly sid: number }>>
/** How many tile rows the level has (its own `tiles`, or its scene's ground rows). */
export function levelBottom(content: GameContent, level: string): number
/** How far below the lowest row a hero's center must be to have fallen, in tiles. */
export const FALL_DEPTH = 2
/**
 * Says `hero.fell` once for each hero whose center is below `bottom + FALL_DEPTH`. A hero is any thing with `Player`
 * and a `Body`: it needs `physics` and `commands`, and never the moves plugin.
 */
export function fallPlugin(options: { readonly bottom: number }): PluginDef
/** The framework's own plugins for this game, in the order a sim joins them, without the game's own. */
export function gameSimPlugins(options: GameSimOptions): readonly PluginDef[]
/** True for a game whose project says `lost = "hero.fell"`, and for nothing else: the hero needs no `moves`. */
export function usesFalls(content: GameContent): boolean
```

  The list `createGameSim` builds today moves, with the same plugins in the same order, into `gameSimPlugins`
  (exported from the headless entry). `createGameSim` calls it and puts `options.plugins` after it, so no sim changes
  and no hash moves. A caller that needs to know what a game's sim registers (Task 19) reads it from there.
  `gameSimPlugins` adds `fallPlugin({ bottom: levelBottom(content, level) })` last, only when `usesFalls(content)`. The comment says what the others say: only a game that asks has it, so every other game keeps
  the sim it had. The plugin keeps who has fallen in a component of its own on the hero (`level.fallen`), so a
  snapshot carries it.

- [ ] **Step 1: Write the failing tests.** `fall-game.ts` makes the fixture game with a two-tile gap in the floor of
  its level and `lost = "hero.fell"`.

```ts
test('a hero that walks into the gap raises hero.fell once, with its player number', …)
test('a hero standing on the lowest row has not fallen', …)
test('a crate that falls raises nothing', …)
test('two heroes that fall raise one event each', …)
test('a restored snapshot of a fallen hero does not raise it again', …)
test('a game with no lost has no fall plugin: its schema hash is the recorded one', …)   // tests/golden/schema-hash.json
test('a game whose lost is another event has no fall plugin', …)
test('a hero with no moves, moved by the game\'s own rules, falls and raises hero.fell', …)   // the fixture's hero
test('gameSimPlugins gives the plugins createGameSim joins, in its order, for each fixture game', …)   // by plugin id
// fall.parity.test.ts
test('the fall, in this engine, ends at the recorded hash', …)   // expectGolden(…, fall.json), 240 ticks
```

- [ ] **Step 2: Push; red.** The Node job says GOLDEN NOT RECORDED and prints the JSON.
- [ ] **Step 3: Build `fall.ts`, `usesFalls` and `gameSimPlugins`, which `createGameSim` then calls.**
- [ ] **Step 4: Commit the printed `fall.json`** in a commit that says the golden is new. **Push; green in four
  engines, and no other golden differs.** If one does, stop and report.
- [ ] **Step 5: Commit** `feat(level): a hero that falls out of the level raises hero.fell, for a game that names it`.

### Task 3: The flow can be lost, started again and asked how to play

**Files:**
- Modify: `src/features/flow/steps.ts`, `tests/features/flow/steps.test.ts`

**Interfaces:**
- Produces (additions to plan U's shapes; everything else is as it is):

```ts
export type FlowStep = /* …as today… */ | 'lost'
export type Over = 'settings' | 'saves' | 'players' | 'how'
export interface FlowState {
  // …as today, plus:
  /** How many times a level has been started this visit. It goes up on every fresh start, never on "Keep playing". */
  readonly attempt: number
}
export type FlowEvent = /* …as today… */
  | { readonly type: 'level-lost' }
  /** Start the level being played afresh. */
  | { readonly type: 'again' }
export const FLOW_START: FlowState   // { step: 'loading', warned: false, taken: false, attempt: 0 }
```

  Rows added to `advance`'s table (every other row keeps its target; every arrow into `playing` except `resume` adds
  one to `attempt`):

| From | Event | To |
|---|---|---|
| `playing` | `level-lost` | `lost`, the same level |
| `lost` | `again` | `playing` the same level, `attempt + 1` |
| `lost` | `leave` | `menu`, `taken: false` |
| `paused`, no `over` | `again` | `playing` the same level, `attempt + 1` |
| `paused`, with `over` | `again` | unchanged |
| `lost`, `done` | `level-lost`, `level-done`, `pause` | unchanged (the very same object) |
| every step but `playing` | `level-lost` | unchanged (the very same object) |
| `menu`, `done`, `playing`, and every step before the menu | `again` | unchanged (the very same object) |
| `menu` or `paused`, no `over` | `open`, `over: 'how'` | the same step with `over: 'how'` (plan U's rule, one more name) |

  `to()`, which builds "what a visit carries and nothing else", carries `attempt` too, so the count is never dropped
  on the way to the menu and back.

- [ ] **Step 1: Write the failing tests:** one per row, then:

```ts
test.each(/* every step */)('%s given level-lost, and given again: only the table\'s rows change anything', …)
test('leave for the menu and play again: attempt keeps counting, it does not start over', …)
test('lose, try again, lose, try again, win: attempt is 1, 2, 3 and the step ends at done', …)
test('pause, Keep playing: attempt does not change', …)
test('pause, Start again: attempt goes up and the step is playing', …)
test('level-lost while lost or done gives the very same object back', …)
test('Next level and Continue each add one to attempt', …)
```

- [ ] **Step 2: Push; red. Step 3: grow `steps.ts`. Step 4: push; green.**
- [ ] **Step 5: Commit** `feat(flow): a level can be lost and started again`.

### Task 4: The best score, with no page

**Files:**
- Create: `src/features/flow/records.ts`, `tests/features/flow/records.test.ts`
- Modify: `src/features/flow/sections.ts`, `src/features/flow/flow.ts` (exports),
  `src/features/audio/settings.ts`, `tests/features/audio/settings.test.ts`

**Interfaces:**
- Produces:

```ts
export interface Records { readonly best?: number | undefined }
export const RecordsSchema: z.ZodType<Records>          // strict; best is a finite number
export const RECORDS_DEFAULT: Records                   // {}
/** `records` with `score` as the best when it beats it; the very same object when it does not, or is not finite. */
export function withScore(records: Records, score: number | undefined): Records
// sections.ts
export interface Sections { /* …as today, plus: */ readonly records: SettingsHandle<Records> }
// audio/settings.ts
export interface SoundSettings { /* …as today, plus: */ readonly muted?: boolean | undefined }
/** The volumes the speaker is given: both 0 while `muted`, else the player's own. */
export function heardVolumes(settings: SoundSettings): { readonly sound: number; readonly music: number }
```

  `wireSound` (`sections.ts`) gives the audio `heardVolumes(...)`. Settings kept before this plan have no `muted` and
  no `records` section and must read as they are.

- [ ] **Step 1: Write the failing tests.**

```ts
test('the first score is the best', …)                       // withScore({}, 3) → { best: 3 }
test('a lower or equal score gives the very same object', …)
test('NaN, Infinity and undefined give the very same object', …)
test('sound settings kept without muted still read, and are not muted', …)
test('muted gives 0 and 0, and the sliders keep their numbers', …)
test('a records section holding garbage reads as the default', …)   // through openSections on a test host
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green.**
- [ ] **Step 5: Commit** `feat(flow): the best score and a sound switch in the settings`.

### Task 5: The new words, in six languages

**Files:**
- Modify: `src/features/locale/library/{en,es,ko,ja,zh,pt}.json`,
  `src/features/locale/library/automata.translations.toml` (the new keys wait for a native reader, as the rest do),
  `tests/features/locale/library.test.ts`, `tests/features/flow/grandma.test.ts`

**The words.** English is what the Owner reads; the others are first drafts for native readers. Japanese follows the
library's own style (kanji, as its other lines do).

| Key | en | es | ko | ja | zh | pt |
|---|---|---|---|---|---|---|
| `automata.lost.title` | You lost. | Has perdido. | 졌어요. | 負けました。 | 你输了。 | Você perdeu. |
| `automata.lost.again` | Try again | Intentar de nuevo | 다시 하기 | もう一度 | 再试一次 | Tentar de novo |
| `automata.pause.again` | Start again | Empezar de nuevo | 처음부터 다시 | 最初から | 重新开始 | Começar de novo |
| `automata.pause.again-ask` | Start this level again? | ¿Empezar este nivel de nuevo? | 이 레벨을 처음부터 다시 할까요? | このレベルを最初からやり直しますか？ | 要重新开始这一关吗？ | Começar este nível de novo? |
| `automata.menu.how` | How to play | Cómo jugar | 게임 방법 | 遊び方 | 怎么玩 | Como jogar |
| `automata.how.walk` | Walk | Caminar | 걷기 | 歩く | 走 | Andar |
| `automata.how.jump` | Jump | Saltar | 점프 | ジャンプ | 跳 | Pular |
| `automata.how.double-jump` | Jump again in the air | Saltar otra vez en el aire | 공중에서 한 번 더 점프 | 空中でもう一度ジャンプ | 在空中再跳一次 | Pular de novo no ar |
| `automata.how.wall-jump` | Jump off a wall | Saltar desde una pared | 벽을 차고 점프 | 壁をけってジャンプ | 蹬墙跳 | Pular de uma parede |
| `automata.how.dash` | Dash | Impulso | 대시 | ダッシュ | 冲刺 | Arrancada |
| `automata.how.slide-left` | Slide your left thumb | Desliza el pulgar izquierdo | 왼쪽 엄지를 밀어요 | 左の親指をスライド | 滑动左手拇指 | Deslize o polegar esquerdo |
| `automata.how.slide-right` | Slide your right thumb | Desliza el pulgar derecho | 오른쪽 엄지를 밀어요 | 右の親指をスライド | 滑动右手拇指 | Deslize o polegar direito |
| `automata.how.tap-left` | Tap with your left thumb | Toca con el pulgar izquierdo | 왼쪽 엄지로 눌러요 | 左の親指でタップ | 用左手拇指点一下 | Toque com o polegar esquerdo |
| `automata.how.tap-right` | Tap with your right thumb | Toca con el pulgar derecho | 오른쪽 엄지로 눌러요 | 右の親指でタップ | 用右手拇指点一下 | Toque com o polegar direito |
| `automata.how.dash-button` | Tap the dash button | Toca el botón de impulso | 대시 버튼을 눌러요 | ダッシュボタンをタップ | 点冲刺按钮 | Toque no botão de arrancada |
| `automata.hud.score` | Score: {score} | Puntos: {score} | 점수: {score} | スコア: {score} | 得分：{score} | Pontos: {score} |
| `automata.hud.best` | Best: {best} | Mejor: {best} | 최고: {best} | ベスト: {best} | 最高：{best} | Melhor: {best} |
| `automata.loading.slow` | Still loading. Your internet may be slow. | Sigue cargando. Tu internet puede estar lento. | 아직 불러오는 중이에요. 인터넷이 느릴 수 있어요. | まだ読み込み中です。インターネットが遅いのかもしれません。 | 还在加载。你的网络可能有点慢。 | Ainda carregando. Sua internet pode estar lenta. |
| `automata.settings.delete` | Delete all my saves | Borrar todo lo guardado | 저장한 것 모두 지우기 | セーブをすべて消す | 删除我的全部存档 | Apagar tudo o que salvei |
| `automata.settings.delete-ask` | Delete every saved game and your best score? You cannot get them back. | ¿Borrar todas las partidas guardadas y tu mejor puntuación? No se pueden recuperar. | 저장한 게임과 최고 점수를 모두 지울까요? 되돌릴 수 없어요. | セーブしたゲームとベストスコアをすべて消しますか？元には戻せません。 | 要删除所有存档和最高分吗？删除后找不回来。 | Apagar todos os jogos salvos e sua melhor pontuação? Não dá para recuperar. |
| `automata.settings.delete-yes` | Delete them | Borrarlos | 지우기 | 消す | 删除 | Apagar |
| `automata.settings.delete-no` | Keep them | Conservarlos | 그대로 두기 | 残す | 保留 | Manter |

Words reused, not added: "Main menu" (`automata.done.menu`), "Back" (`automata.back`), "Sound"
(`automata.settings.sound`), "Pause" (`automata.pause.button`), "Load the page again" (`automata.problem.reload`), the
hints (`automata.hint.*`).

- [ ] **Step 1: Write the failing tests.** `library.test.ts`: every key of the table is in all six files, with the
  same placeholders in each; no value is empty or equals its key. `grandma.test.ts`'s rule "no key is unused" lists
  these keys as owed to Tasks 6 to 11 (a named list in the test, emptied task by task; Task 13 asserts it is empty).
- [ ] **Step 2: Push; red. Step 3: add the words. Step 4: push; green.**
- [ ] **Step 5: Commit** `feat(locale): the words for losing, starting again, how to play, the score and deleting saves`.
  **Open pull request 1.** Tracker to 20% of stage 4.

---

## Part B2: the screens and the flow (pull requests 2a and 2b)

Every screen task has the same proof, as plan U's have: a Node test of the pure part, and a real-browser test
(`*.browser.test.ts`, three engines) that opens the screen at the five sizes of `tests/fixtures/game/screens.ts`,
checks nothing is cut off, every control is at least 44 px and the primary at least 48, walks it by touch, by a fake
gamepad and by keys, and takes a picture for `ci-screens`. The task lists only what is particular to it.

`tests/fixtures/flow/game.ts` gains, in Task 6, a third level, `level-pit`, with a gap in its floor, and the options
`lost` (default `'hero.fell'`), `score` and `goal` words in its three languages, so every later test can lose.

### Task 6: Try again, and Start again

**Files:**
- Create: `src/features/flow/play.ts`, `src/features/screens/lost.ts`, `src/features/screens/Lost.svelte`,
  `tests/features/screens/lost.browser.test.ts`, `tests/features/flow/lost.browser.test.ts`,
  `tests/features/flow/restart.browser.test.ts`
- Modify: `src/features/flow/flow.ts`, `src/features/flow/loading.ts`, `src/features/flow/events.ts`,
  `src/features/screens/screens.ts`, `src/features/screens/pause.ts`, `tests/fixtures/flow/game.ts`,
  `tests/features/screens/pause.browser.test.ts`

**Interfaces:**
- Consumes: Task 3's `lost` step, `again` and `attempt`; Task 5's words.
- Produces:

```ts
// screens/lost.ts: "You lost.", Try again (primary, focused), Main menu. Escape and the pad's right button do nothing.
export function lostScreen(options: ScreenBase & {
  readonly score?: number          // shown as "Score: n" when given (Task 8 gives it)
  readonly best?: number
  readonly onAgain: () => void
  readonly onMenu: () => void
}): Screen
export interface ScreenMakers { /* …as today, plus: */ readonly lost: typeof lostScreen }
// screens/pause.ts
export type PauseItem = 'resume' | 'again' | 'add-player' | 'settings' | 'leave'   // Task 7b adds 'how'
// flow/loading.ts: what one step's events mean for the level. `done` wins over `lost`.
export function levelEnd(
  project: Pick<Project, 'done' | 'lost'>,
  events: readonly { readonly type: string; readonly payload: unknown }[],
): 'done' | 'lost' | undefined
// flow/events.ts
export const FLOW_EVENTS   // + 'screen.lost'
```

  `mount.dataset.attempt` is `String(state.attempt)`. `data-state` gains `lost`. The pause screen's buttons, top to
  bottom: Keep playing, Start again, Add a player (when there is room), Settings, Main menu. Start again asks
  (`automata.pause.again-ask`; yes is `automata.pause.again`, no is "Keep playing").

- [ ] **Step 1: Move, change nothing.** `startLevel`, `putOverlay`, `showPause` and the Escape wiring leave `flow.ts`
  for `play.ts` as one function, `createPlay(deps)`, that `flow.ts` calls. No behavior changes. Push; every existing
  flow test green. Commit `refactor(flow): a level on the page in its own file`. `flow.ts` is then under 450 lines.
- [ ] **Step 2: Write the failing tests.**

```ts
// lost.browser.test.ts (the flow, on level-pit)
test('the hero walks into the gap: data-state is lost, the Try again screen is up and Try again has the focus', …)
test('Try again: data-state is playing, data-attempt went up by one, the hero is back at its start, the page did not reload', …)
test('Main menu from the lost screen: the menu, and Continue opens the same level', …)
test('two heroes fall in one tick: one lost screen, attempt unchanged until Try again', …)       // Review Focus 1
test('a hero that falls through the door in the tick it touches it: Well done, not You lost', …)  // Review Focus 1
test('screen.lost is raised once on the audio', …)
test('pause, Start again, No: still paused; Start again, yes: playing afresh, attempt up by one', …)
test('by keys alone: fall, Enter, play again', …)
// restart.browser.test.ts
test('Try again pressed twice in one frame starts one game', …)                                  // Review Focus 2
test('50 times: fall and try again; one canvas in the mount, the sim has the entity count of the first start, performance.navigation shows no reload', …)
test('a game with no lost can never reach the lost step', …)
```

- [ ] **Step 3: Push; red.**
- [ ] **Step 4: Build the screen, `levelEnd`, the `lost` case of `present` and Start again on pause.** A fresh start
  stops the old game before the new one is made, and the epoch guard that drops a late answer covers a second press.
- [ ] **Step 5: Push; green in three engines.**
- [ ] **Step 6: Commit** `feat(flow): Try again when a level is lost, and Start again on pause`.

### Task 7a: The goal line, and a level that waits for you

**Files:**
- Create: `tests/features/flow/start-card.browser.test.ts`, `tests/fixtures/flow/press.ts` (one helper,
  `pressToStart`, for every test that needs a level moving)
- Modify: `src/features/game/game.ts`, `src/features/screens/hud.ts`, `src/features/screens/Hud.svelte`,
  `src/features/screens/pause.ts`, `src/features/flow/play.ts`, `src/features/locale/labels.ts` (`levelGoal`, beside
  `levelName`), `tests/features/locale/labels.test.ts`

**Interfaces:**
- Produces:

```ts
// locale/labels.ts: the level's goal in the player's words (`level.<id>.goal`), or undefined when the game has no
// such word. Read as `levelName` reads `level.<id>.name`: a key that comes back as itself is a word the game lacks.
export function levelGoal(words: Words, levelId: string): string | undefined
// game.ts
export interface GameOptions { /* …plus: */
  /**
   * The sim does not step until the first press that begins after the game is shown: a `keydown` that is not a
   * repeat, a gamepad button that was up and goes down, or a `pointerdown`. Nothing is silenced once it starts.
   */
  readonly waitForPress?: boolean }
export interface Game { /* …plus: */
  /** True from the start until that first press, in a game made with `waitForPress`. */
  waiting(): boolean }
// screens/hud.ts
export function hud(options: /* …as today, plus: */ {
  /** The level's goal and what to press, shown at the top until three seconds after the first press. */
  readonly card?: () => { readonly goal?: string; readonly hint?: string } | undefined
}): …
```

  A press that was already down when the level appeared does not start it: the game notes which keys and pad buttons
  are down on its first frame and waits for each to come up before it counts, and a `pointerdown` counts only when it
  arrives after that frame. So the Enter, the pad's bottom button or the tap that chose Play, Try again or Next level
  never starts a level. The hint on the card is `playHint(...)` for keys and a gamepad and nothing on touch (the
  thumbs' own hints are on the screen). The flow starts every level with `waitForPress: true`, sets
  `mount.dataset.waiting` (present while waiting), and takes the card down three seconds after `waiting()` turns false,
  counted on `frames`. The pause screen shows the goal line under "Paused". Flow tests written before this task that
  expect a level to move at once call `pressToStart` after the level shows.

- [ ] **Step 1: Write the failing tests.**

```ts
// labels.test.ts
test('levelGoal gives the game\'s word, and undefined for a level with none', …)
// start-card.browser.test.ts
test('a level starts still: the tick stays 0, data-waiting is there, the goal line and the hint show', …)
test('pressing Right starts it and the hero walks from the first tick', …)
test('a touch starts it; a gamepad button starts it', …)
test('the Enter, the pad button and the tap that pressed Play do not start the level', …)   // each held for 30 frames
test('a held key\'s repeats do not start it; letting go and pressing again does', …)
test('Try again and Next level wait the same way', …)
test('three seconds after the first press the card is gone; before that it is there', …)   // frames moved by hand
test('a level with no goal word shows the hint alone; on touch with no goal, no card', …)
test('the pause screen shows the goal line', …)
test('watch mode does not wait', …)
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green in three engines.**
- [ ] **Step 5: Commit** `feat(flow): the goal line, and a level that waits for the first press`.

### Task 7b: How to play

**Files:**
- Create: `src/features/screens/how.ts`, `src/features/screens/How.svelte`, `src/features/screens/how-rows.ts`,
  `tests/features/screens/how-rows.test.ts`, `tests/features/screens/how.browser.test.ts`
- Modify: `src/features/screens/menu-items.ts`, `src/features/screens/pause.ts`, `src/features/screens/screens.ts`,
  `src/features/flow/overs.ts`, `src/features/flow/play.ts`

**Interfaces:**
- Consumes: `levelGoal` (Task 7a); Task 3's `over: 'how'`.
- Produces:

```ts
// screens/how-rows.ts (pure)
export interface HowRow {
  /** What the hero does: "Walk", "Jump", "Jump again in the air", "Jump off a wall", "Dash", "Pause". */
  readonly move: string
  /** How, on the device in use: "Arrow keys", "Space", "The stick", "Slide your left thumb". */
  readonly how: string
}
export function howRows(facts: {
  readonly device: DeviceKind
  readonly moves: { readonly doubleJump: boolean; readonly wallJump: boolean; readonly dash: boolean } | undefined
  readonly first: (action: string) => string | undefined   // as playHint takes it
  readonly swapped: boolean                                // "Swap sides" is on
  readonly words: Words
}): readonly HowRow[]
// screens/how.ts: the goal line (when there is one), the rows, and Back (primary). A list that scrolls inside itself.
export function howScreen(options: ScreenBase & {
  readonly goal?: string
  readonly rows: () => readonly HowRow[]        // asked again when the device in use changes
  readonly onBack: () => void
}): Screen
export interface ScreenMakers { /* …plus: */ readonly how: typeof howScreen }
export type MenuItem = /* … */ | 'how'      // after 'settings', before 'quit'
export type PauseItem = /* … */ | 'how'     // after 'settings', before 'leave'
```

  `howRows`: Walk and Jump always; "Jump again in the air", "Jump off a wall" and "Dash" only when the hero has them; a
  hero with no `moves` lists the game's own controls by their labels (`controlRows`' labels); "Pause" last (Escape, the
  start button, or the corner button's name). On touch, with the sides not swapped, walking is
  `automata.how.slide-left` and jumping `automata.how.tap-right`; swapped, the other two; the dash is
  `automata.how.dash-button`. On the menu the goal is the first level's; on pause it is the level being played.

- [ ] **Step 1: Write the failing tests.**

```ts
// how-rows.test.ts
test('keys, a plain hero: Walk is "Arrow keys", Jump is its key, Pause is Escape; no other row', …)
test('a hero with every move has the three more rows, in the table\'s order', …)
test('a gamepad: Walk is "The stick", Jump is its button\'s name', …)
test('touch: slide left, tap right; swapped: slide right, tap left; a dash is the dash button', …)
test('a changed key is the one named', …)
test('a hero with no moves lists the game\'s own controls', …)
// how.browser.test.ts
test('How to play from the menu and from pause: the rows, Back has the focus, Back returns to where it was opened', …)
test('plugging in a gamepad while it is open changes the rows', …)
test('at 844x390 with a hero that has every move, only the list scrolls', …)
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green in three engines.**
- [ ] **Step 5: Commit** `feat(flow): How to play, on the menu and on pause`.

### Task 8: The score and the best score

**Files:**
- Modify: `src/features/sim/create-sim.ts`, `src/features/game/game.ts`, `src/features/screens/hud.ts`,
  `Hud.svelte`, `done.ts`, `Done.svelte`, `src/features/flow/play.ts`, `src/features/flow/flow.ts`,
  `tests/features/sim/read.test.ts` (new), `tests/features/flow/score.browser.test.ts` (new),
  `tests/features/flow/records.test.ts`

**Interfaces:**
- Consumes: `scoreRef` (Task 1), `withScore`, `Sections.records` (Task 4), `lostScreen`'s `score` and `best` (Task 6).
- Produces:

```ts
// sim: a resource's value by its id, or undefined when the sim has none of that id. A read; never a way to write.
interface Sim { read(resourceId: string): unknown }
// game.ts: the project's score now, or undefined when it names none or the number is not there.
interface Game { score(): number | undefined }
// hud.ts / done.ts
hud(options: { /* …plus: */ readonly score?: () => number | undefined })          // "Score: n", top center
doneScreen(options: { /* …plus: */ readonly score?: number; readonly best?: number })
```

  The flow writes the best score when a level ends, won or lost, and shows "Best: n" on both screens once there is
  one. A write the store refuses is told once on that screen with `automata.done.not-kept`, as progress is.
  `Sim.read` changes no hash: it reads.

- [ ] **Step 1: Write the failing tests.**

```ts
test('Sim.read gives a resource\'s value, and undefined for an id the sim does not have', …)
test('a game with score shows "Score: 0", and "Score: 1" after the spark is taken', …)
test('a game with no score shows no score line', …)
test('a score that names a missing resource or a field that is not a number shows no line and throws nothing', …)
test('Well done and You lost both show the score; the best shows from the second level-end on', …)
test('the best is still there after a reload', …)
test('storage refuses: the score still counts, the screen says once it was not kept', …)   // Review Focus 4
test('at 390x844 the score does not cover the pause button or the hero\'s number', …)
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green. API report from the `package` job's log.**
- [ ] **Step 5: Commit** `feat(flow): the score on the screen and the best score kept`.

### Task 9: The sound switch, and Delete all my saves

**Files:**
- Modify: `src/features/screens/pause.ts`, `Pause.svelte`, `settings.ts`, `Settings.svelte`, `settings-rows.ts`,
  `src/features/flow/play.ts`, `src/features/flow/overs.ts`, `src/features/flow/places.ts`,
  `tests/features/screens/pause.browser.test.ts`, `tests/features/screens/settings.browser.test.ts`,
  `tests/features/flow/delete.browser.test.ts` (new)

**Interfaces:**
- Consumes: `SoundSettings.muted`, `heardVolumes` (Task 4).
- Produces:

```ts
pauseScreen(options: { /* …plus: */
  readonly sound?: { readonly on: boolean; readonly onChange: (on: boolean) => void } })   // a Toggle, "Sound"
// places.ts
interface Places<S> { /* …plus: */
  /** Erases every saved game. Answers how many could not be erased. */
  eraseAll(): Promise<number> }
settingsScreen(options: { /* …plus: */ readonly onDeleteSaves?: () => Promise<void> })
```

  Settings' sound part gains the same toggle above its sliders, and Settings' last row is "Delete all my saves". It
  opens the kit's dialog with `automata.settings.delete-ask`, "Delete them" and "Keep them"; "Keep them" has the
  focus. After a yes the flow erases every place, sets `records` to its default and, when Settings was opened from the
  menu, draws the menu again (no Continue). During a level it is hidden: a player mid-level is not offered it.

- [ ] **Step 1: Write the failing tests.**

```ts
test('the pause screen has a Sound toggle; off: the speaker hears 0 and 0; on: the sliders\' own numbers', …)
test('Sound off is still off after a reload, and the toggle in Settings agrees', …)
test('Settings on the menu ends with Delete all my saves; during a level it is not there', …)
test('Delete, Keep them: nothing changes, and Escape is Keep them', …)
test('Delete, Delete them: no saved game, no best score, the menu says Play; the language, a changed key and the volumes are as they were', …)
test('storage refuses the erase: nothing throws, and the player is told once', …)         // Review Focus 4
test('a saved game that is garbage in storage: the game still opens, and Delete all my saves clears it', …)
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green.**
- [ ] **Step 5: Commit** `feat(flow): a sound switch on pause, and Delete all my saves`.
  **Open pull request 2a.** Tracker to 36% of stage 4.

*Pull request 2b starts here.*

### Task 10: The page holds still, and Back does something sensible

**Files:**
- Create: `src/features/flow/page-guard.ts`, `src/features/flow/back.ts`,
  `tests/features/flow/page-guard.browser.test.ts`, `tests/features/flow/back.browser.test.ts`
- Modify: `src/features/flow/flow.ts`, `src/features/flow/types.ts`

**Interfaces:**
- Produces:

```ts
// page-guard.ts: sets builder's call 12 and answers the function that puts everything back as it was.
export function guardPage(mount: HTMLElement): () => void
// back.ts (the page's history is given, so a test hands its own)
export interface BackSeams {
  readonly push: () => void                      // history.pushState of a marked entry
  readonly on: (listener: () => void) => () => void   // popstate
}
/** What Back means in `state`: an event for the flow, whether to put the entry back, or nothing (leave the page). */
export function backMeans(state: FlowState): { readonly event?: FlowEvent; readonly again: boolean } | undefined
export function wireBack(options: {
  readonly state: () => FlowState
  readonly dispatch: (event: FlowEvent) => void
  readonly onState: (listener: (state: FlowState) => void) => () => void
  readonly seams?: BackSeams
}): () => void
/** Whether Back is the game's when nobody says: only in a page that is not framed (`top === self`). */
export function backDefault(page: { readonly top: unknown; readonly self: unknown }): boolean
export interface FlowOptions { /* …plus: */ readonly back?: boolean }   // default backDefault(window)
```

  `backMeans`: with `over` → `back`, again; `playing` → `pause`, again; `paused`, `done`, `lost` → `leave`, not again;
  anything else → `undefined`. `wireBack` keeps whether an entry is held: it pushes one whenever `playing` is entered
  and none is held, and after each `again: true`; an entry Back took with `again: false` is no longer held. So there
  are never two entries, and Play after a return to the menu gets a new one. In a frame nothing is pushed unless the
  game says `back: true`: a frame's `pushState` joins the top page's history, and that Back is the top page's.

- [ ] **Step 1: Write the failing tests.**

```ts
// page-guard
test('a swipe up, down and sideways on the game at 390x844 moves neither window.scrollY nor the mount', …)
test('a double tap does not change visualViewport.scale; a long press selects no text', …)
test('a list inside Settings still scrolls', …)
test('stop() puts the document\'s and the mount\'s styles back exactly', …)
test('a page that is longer than the game (the mount is 300 px high in an article) still scrolls outside the mount', …)
// back
test.each(/* every row of backMeans */)('%s', …)
test('Back while playing pauses, and the page is still here', …)
test('Back on pause is the menu; Back on the menu leaves (the test\'s history hears it)', …)
test('Back with Settings open on pause closes Settings and stays paused', …)               // Review Focus 3
test('Back while loading and on the language picker is not caught', …)
test('Back twice in one frame while playing: paused, then the menu; never two entries', …)
test('Play, Back, Back to the menu, Play again, Back: paused, not gone', …)
test('lose, Back to the menu, Continue, Back: paused, not gone', …)
test('backDefault: true when top is self, false when it is not', …)
test('in a frame nothing is pushed and nothing is listened to; back: true in a frame turns it on', …)   // a real iframe
test('back: false pushes nothing and listens to nothing; after stop() nothing is listened to', …)
```

  The fifth page-guard test settles the guard's reach: the document is stopped from scrolling only when the mount
  fills the viewport's height; the mount's own three properties are always set.
- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green in three engines.**
- [ ] **Step 5: Commit** `feat(flow): the page holds still under the game, and Back pauses before it leaves`.

### Task 11: Loading that says how far, says when it is slow, and tries once more

**Files:**
- Modify: `src/features/flow/loading.ts`, `src/features/flow/flow.ts`, `src/features/locale/words.ts`
- Create: `tests/features/flow/retrying.test.ts`, `tests/features/flow/loading.browser.test.ts`

**Interfaces:**
- Produces:

```ts
/** Milliseconds with no file arriving before the slow line shows. */
export const SLOW_MS = 10_000
/** Milliseconds before a failed read is tried the one more time. */
export const RETRY_MS = 1000
/** A `read` that tries once more after `wait()` when the first try rejects, and tells `arrived` each success. */
export function retrying<T>(
  read: (path: string) => Promise<T>,
  options: { readonly wait: () => Promise<void>; readonly arrived?: (path: string) => void },
): (path: string) => Promise<T>
/** The bar. `role="progressbar"` with `aria-valuenow`; no letters until `slow` is given some. */
export function putLoadingBar(mount: HTMLElement): {
  /** `done` of `total` files have arrived. Never draws less than it has drawn. */
  progress(done: number, total: number): void
  /** Shows the line under the bar, or takes it away with `undefined`. */
  slow(line: string | undefined): void
  remove(): void
}
// locale/words.ts: the framework's own sentence in one of the six languages, with no game loaded.
export function libraryWords(language: Language): Words
```

  `putLoadingMark` goes; `putLoadingBar` takes its place. The total is 1 until `automata.toml` has been read, then
  1 plus the files it lists. Both `read` and `readPicture` go through `retrying`. The slow line is
  `automata.loading.slow` in the first of `host.deviceLanguages()` that is one of the six, and nothing when none is.
  It goes away when a file arrives and can come back. Time is counted on `frames`. Under reduced motion the bar fills
  without easing.

- [ ] **Step 1: Write the failing tests.**

```ts
// retrying.test.ts
test('a read that works is called once', …)
test('a read that fails once is tried again after the wait, and its answer is given', …)
test('a read that fails twice rejects with the second error, after exactly two calls', …)
// loading.browser.test.ts (a `read` the test holds open, frames moved by hand)
test('the bar is there at once, with no letters, and fills as files arrive', …)
test('10 seconds with nothing: the slow line, in the device\'s language; a file arrives: it is gone', …)
test('a device whose language is not one of the six never sees a line', …)
test('a file that arrives after the slow line showed: the bar goes on from where it was, never back', …)   // Review Focus 5
test('one file fails once: the game starts', …)
test('one file fails twice: the problem screen, with its button; never an empty mount', …)
test('every file fails: the problem screen', …)
test('the mount is never without a child from the first frame to the menu', …)   // a MutationObserver counts
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green.**
- [ ] **Step 5: Commit** `feat(flow): a loading bar, a line when it is slow, and one more try for a file that fails`.

### Task 12: Loud sounds held down, music with no seam, and screens that fade

**Files:**
- Modify: `src/features/web/speaker.ts`, `src/features/ui/Frame.svelte`, `src/features/screens/show.ts`,
  `tests/features/web/speaker.browser.test.ts`, `tests/features/audio/music-player.test.ts`,
  `tests/features/ui/frame.browser.test.ts`

**Interfaces:**
- Produces: no new name. The speaker's graph becomes: each bus → a `DynamicsCompressorNode` set as a limiter
  (threshold −3 dB, knee 0, ratio 20, attack 0.003 s, release 0.25 s) → the master gain (0.5, as it is) → the
  destination. A limiter, not a softer compressor, because Web Audio adds make-up gain worked out from the curve: at
  −12 dB, ratio 8 it is about +6 dB on everything quiet, which would change every existing game's mix. If the "within
  1 dB" test below still fails in an engine, a gain after the compressor takes off the measured difference, as one
  named constant with a comment; the test is never loosened. A screen put up
  by `show` fades in over 150 ms and out over 100 ms (opacity only), and does neither under
  `prefers-reduced-motion: reduce`. A screen that is fading out takes no press.

- [ ] **Step 1: Write the failing tests.**

```ts
test('every bus reaches the destination through one compressor, then the master gain', …)   // the fake context's graph
test('one voice alone is within 1 dB of what it was before, in peak and in RMS', …)   // the old graph and the new, both rendered
test('sixteen voices at once: no sample is above 1', …)
// both render with an OfflineAudioContext in each of the three engines: the compressor's look-ahead differs by engine
test('a looped track: the last note of one pass and the first of the next are one beat apart, to the sample', …)
test('a screen fades in; under reduced motion it is fully there on the first frame', …)
test('a press on a screen that is fading out does nothing', …)
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green. The `sounding.json` golden does not move** (it records
  the cue log, not the graph); if it does, stop and report.
- [ ] **Step 5: Commit** `feat(web): a compressor on the speaker; screens fade in and out`.

### Task 13: The fixture game's whole visit, lost and won, and what every screen owes

**Files:**
- Modify: `tests/features/flow/journey-touch.browser.test.ts`,
  `journey-keys.browser.test.ts`, `journey-sizes.browser.test.ts`, `tests/features/flow/grandma.test.ts`
- Create: `tests/features/flow/names.browser.test.ts`, `tests/features/ui/contrast.test.ts`,
  `tests/features/flow/away.browser.test.ts`

- [ ] **Step 1: Write the failing tests.**

```ts
// the touch and keys journeys each gain one visit (the gamepad's stays as plan U left it; each new screen's own
// test still walks it by gamepad, as every screen's does)
test('touch: read the goal, tap to start, fall, Try again, reach the door, Next level, pause, How to play, Back, Sound off, Start again, yes, the last door, Main menu', …)
test('keys alone: the same visit, and Back (the browser\'s) pauses', …)
// journey-sizes: the lost screen, How to play, the start card and the loading bar join the screens opened at each size
// names.browser.test.ts
test('every button, toggle, slider and link the flow ever shows has an accessible name that is not empty and is not a key', …)
// contrast.test.ts (Node: reads the kit's default colors from UI_PROPERTIES)
test('the kit\'s words on its surfaces, and on its primary button, are 4.5 to 1 or more', …)
// away.browser.test.ts
test('hide the page mid-jump and show it: paused; Keep playing; the level can still be finished; no sound played while hidden', …)
test('no sound is asked of the speaker before the first press of the visit', …)
test('with both volumes at 0 a level is lost, tried again and won', …)
```

  `grandma.test.ts`: the list of words owed (Task 5) is empty; the lost and how screens each name exactly one
  `primary` button.
- [ ] **Step 2: Push; red where a screen falls short.** Fix the screen, not the test. A size that cannot fit without
  shrinking a control below its floor is a stop: report it.
- [ ] **Step 3: Push; green in three engines.** The pictures reach `ci-screens`.
- [ ] **Step 4: Commit** `test(flow): a visit lost and won by thumb and by keys; names, contrast, a hidden page`.
- [ ] **Step 5: Open pull request 2b. Report the pictures to the coordinator** for the Owner's screenshot review (the
  five sizes; say plainly the fixture's art is boxes). Tracker to 52% of stage 4.

---

## Part A: the template on the flow (pull request 3; plan K's Step U)

### Task 14: The template's page as one `startFlow` call

**Files:**
- Modify: `template/src/features/page/page.ts`, `template/src/main.ts`,
  `template/src/style.css`, `template/content/messages/*.json`,
  `tests/template/page.browser.test.ts`, `tests/template/words.test.ts`, `tests/template/messages.test.ts`,
  `tests/template/files.test.ts`

**Interfaces:**
- Consumes: `startFlow` and everything Part B gave it.
- Produces: `template/src/features/page/page.ts` becomes:

```ts
export function startPage(root: HTMLElement, options: PageOptions = {}): Promise<Flow>
```

  one `startFlow` call with `game: GAME_ID`, `read` and `readPicture` fetched from beside the page (the two helpers
  stay, since they turn a web page answered for a missing file into "no such file"), `plugins: gamePlugins`, and,
  when the address has `?watch`, `watch: () => fetch('replays/level-1.json')` parsed with `parseReplay`. `PageOptions`
  keeps `read`, `readPicture`, `host` and `frames`. Its own loading mark, problem screen, picker step, key hint,
  `WORDS` and settings code go, with `.loading`, `.hint` and `.problem` from `style.css` and the three `page.*`
  messages from all six files. `main.ts` sets `window.automataFlow` (the flow) and keeps `window.automataGame` as a
  getter of `flow.game()`.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/template
test('page.ts imports only the framework and the game\'s own files, calls startFlow once, and is under 60 lines', …)
test('no message key starts with page.', …)
// page.browser.test.ts, rewritten on the flow: a first visit walks picker, splash, menu, Play; a problem in a file is
//   the framework's problem screen; ?watch plays the recording and a tap takes over; stop() empties the mount
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green in three engines.**
- [ ] **Step 5: Commit** `feat(template): the page is one startFlow call`.

### Task 15: A level that can be won and lost, for two players, and its recording

**Files:**
- Create: `template/content/characters/door.json`, `template/content/figures/door.json`,
  `template/content/feels/take.json`, `template/content/feels/fall.json`, `template/content/sounds/land.json`,
  `take.json`, `fall.json`, `template/content/cues/cues.json`
- Modify: `template/automata.toml`, `template/content/levels/level-1.json`, `template/content/messages/*.json`,
  `template/src/headless.ts` (comment only), `template/tests/features/hero/hero.test.ts`,
  `template/replays/level-1.json` (**the golden**), `tests/template/hero-play.ts`,
  `tests/template/replay.parity.test.ts`, `tests/template/art.test.ts`, `tests/template/files.test.ts`

**The level** (16 wide, 9 rows; a gap two tiles wide in the floor; the crate and the door past it):

```
#..............#
#..............#
#..............#
#..............#
#..............#
#..............#
#..............#
#..............#
#######..#######
```

  Things: `spark-1` at (4.5, 7.5), `crate-1` at (11.5, 7.5), `door-1` at (13.5, 7.5). Starts: player 1 at (2.5, 7.5),
  player 2 at (1.5, 7.5). The gap is columns 7 and 8. The crate stands past the gap, between the landing and the
  door, so a play that wins pushes it toward the door and not into the gap. A player who jumps over it and pushes it
  back can still drop it in: that is play, not a fault, since a fallen crate raises nothing (Task 2) and the level can
  still be won. The level file's `$comment` says so. A running jump clears the gap with a tile to spare with the template's move numbers
  (`jumpPaths` gives the reach; `hero.test.ts` holds it, so a changed number that makes the gap impossible, or leaves
  no margin, fails a test). If the template's numbers do not give that tile of margin, stop and report: do not change
  the hero's numbers or the gap to fit.

  `door.json`: `body: "fixed"`, `size` 1 by 2, `kind: "door"`, `touch: "sense"`, `figure: "door"`. Its figure is a
  rounded frame in two of the template's own colors.

  `automata.toml` gains, each with a comment in the file's own plain style:

```toml
players = 2
levels = ["level-1"]
done = "door.touched"
lost = "hero.fell"
score = "hero.score.sparks"
```

  and the `[[content]]` blocks of the new files. Messages gain `level.level-1.goal` ("Get to the door." / "Llega a la
  puerta." / "문까지 가세요." / "ドアまで行こう。" / "走到门那里。" / "Chegue até a porta.") in the six files.
  Feels: `take` on `spark.taken` (a small burst in the spark's color, a buzz of 0.2 for 2 ticks), `fall` on
  `hero.fell` (a buzz of 0.6 for 8 ticks, no dust). Sounds: three short synthesized sounds in the `sound` schema's own
  shape, modeled on `tests/fixtures/audio/content.ts` (a low thud for `land`, a rising two-note chirp for `take`, a
  falling tone for `fall`). `cues.json` plays each on `hero.landed`, `spark.taken` and `hero.fell`.

**The play** (`tests/template/hero-play.ts`): hold right from tick 0; jump one tile before the gap's edge; keep right
to the door.
`TEMPLATE_TICKS` is the tick the door is touched plus 60. The test asserts, on the recorded play, that the spark was
taken, the crate was pushed, `hero.fell` was never raised and `door.touched` was, by player 1.

- [ ] **Step 1: Write the failing tests.**

```ts
// template/tests/features/hero/hero.test.ts (the game's own tests, which a new game keeps)
test('walking off the edge of the gap loses the level', …)        // hero.fell is raised
test('a jump at the edge clears the gap', …)
test('a jump started up to one tile before the edge clears the gap', …)   // the margin a real-time page needs
test('a crate pushed back into the gap falls, loses nothing, and the door still wins the level', …)
test('touching the door wins the level', …)                       // door.touched with player 1
test('taking the spark makes the score 1', …)
// tests/template
test('the template names done, lost, score, levels and players, and a goal for its level in six languages', …)
test('every feel and cue of the template names an event its sim can raise', …)
test('the recorded play takes the spark, pushes the crate, never falls and ends at the door', …)
test('the recorded play of the template still plays, in this engine', …)      // exists; fails until re-recorded
```

- [ ] **Step 2: Push; red.**
- [ ] **Step 3: Write the content and the play.** Take the hashes out of `template/replays/level-1.json` so the parity
  test prints the new recording.
- [ ] **Step 4: Commit the printed recording alone**, in one commit:
  `test(template): record the template's play again (moved: the level gains a gap, a door and a second start, and names lost)`.
  **Push; green in four engines, and no other golden differs.**
- [ ] **Step 5: Send the coordinator the before and after for the Owner:** the two `contentHash`, `schemaHash` and
  final hashes, the two levels side by side, the `ci-screens` picture of the new level at 390 by 844, and one
  sentence on why (the level can now be won and lost). **Pull request 3 does not merge until the Owner says yes.**
  Go on with Tasks 16 and 17 meanwhile.
- [ ] **Step 6: Commit** `feat(template): a level with a gap and a door, for two players, with a goal and a score`.

### Task 16: A browser in every game's own CI (the Owner's answer to Q1)

**Files:**
- Create: `template/tests/play/play.test.ts`, `template/tests/play/serve.ts`, `template/vitest.play.config.ts`
- Modify: `template/package.template.json`, `template/vite.config.ts`, `template/.github/workflows/check.yml`,
  `template/tsconfig.json`, `template/README.md`, `template/gitignore`, `knip` settings of the template if it has any,
  `tests/template/files.test.ts`, `tests/workflows/create.test.ts`, `tests/install/create-smoke.mjs`

**Interfaces:**
- Produces, in a new game:

```jsonc
// package.json scripts, added
"build": "vite build",
"play-test": "vitest run --config vitest.play.config.ts"
// devDependencies, added
"playwright": "1.63.0"
```

  `vite.config.ts` gains `test: { exclude: ['tests/play/**', 'node_modules/**', 'dist/**'] }`, so `npm test` and
  `automata check` never need a browser. `vitest.play.config.ts` includes only `tests/play/**`, one file at a time,
  with a 120 second timeout. `serve.ts` starts `vite preview` on a free port for the built `dist/` and stops it.
  `check.yml` gains a second job, `play`, after `check`: checkout, Node 24.21.0, `npm install`,
  `npx playwright install --with-deps chromium webkit`, `npm run build`, `npm run play-test`. Every action is pinned
  to the commits the first job uses.

  `play.test.ts`, once for Chromium and once for WebKit, at 390 by 844 with touch and at 1280 by 720 with keys:

```ts
test('the game opens: a first visit reaches the menu, and nothing is outside the screen', …)
test('Play: the hero reaches the door and the game says Well done', …)
test('walk into the gap: You lost; Try again plays again without the page loading again', …)
```

  It reads the game only as a player and an agent can: `data-state`, `data-attempt`, what is on the screen, and
  `window.automataGame`. It holds no hash and no position, so a maker who redraws the level changes two numbers at the
  top of the file (where the gap is, where the door is), which a comment says. It jumps one tile before the gap, not
  at its edge: a page playing in real time reads the hero's place a few ticks late, and Task 15's margin is what keeps
  this test from failing now and then.

- [ ] **Step 1: Write the failing tests** in the framework: `files.test.ts` (the template has the three files, the two
  scripts and `playwright` at exactly 1.63.0; `tests/play/` is excluded from `npm test`); `create.test.ts` (the
  workflow has the `play` job with pinned actions and both browsers); `create-smoke.mjs` (in a made game,
  `automata check` passes on a machine with no browsers installed).
- [ ] **Step 2: Push; red. Step 3: write the files. Step 4: push; green.** The play test itself first runs in Task 21's
  job; here the smoke proves it is wired and stays out of `check`.
- [ ] **Step 5: Commit** `feat(template): every new game plays itself in two browsers in its own CI`.

### Task 17: The create journey meets the new game, and Step U closes

**Files:**
- Modify: `tests/create/create.journey.test.ts`, `tests/install/create-smoke.mjs`, `tests/install/create-commands.ts`,
  `tests/template/builtins.test.ts` (new), `README.md` ("Start here", "The smallest game"),
  `template/README.md`, `template/AGENTS.md`, `tests/docs/readme.test.ts`,
  `docs/superpowers/plans/2026-11-14-m2-cli.md` (Step U ticked, pointing here)

- [ ] **Step 1: Write the failing tests.** The journey's existing cases move onto the flow (each starts by walking the
  picker and pressing Play), and gain Step U's four: Play on the menu; pause and back; a key changed in Settings and
  used in the level; a second player added with a gamepad. `builtins.test.ts` is Step U's anti-goal test: every
  built-in the README's section titles name (saves, languages, sound, art, gamepads, the flow, replays) is used by a
  file of the template, by a rule the test states per section.
- [ ] **Step 2: Push; red. Step 3: fix the journey's helpers and the docs. Step 4: push; green on three operating
  systems (`create-smoke`) and in three browsers at five sizes (`create-play`).**
- [ ] **Step 5: Commit** `test(create): the new game is walked through its flow; plan K's Step U is done`.
  **Open pull request 3** (it waits for the Owner's yes from Task 15). Tracker to 68% of stage 4.

---

## Part C: the checks (pull request 4)

All four are text and data: none starts a browser. Each sentence below is exact; a test holds each.

### Task 18: The `page` part of the `rules` step

**Files:**
- Create: `src/features/cli/check-page.ts`, `tests/features/cli/check-page.test.ts`
- Modify: `src/features/cli/check-rules.ts`, `tests/features/cli/check-rules.test.ts`

**Interfaces:**
- Produces:

```ts
/**
 * What a game's page may not do. `files` is every `.ts`, `.js`, `.svelte`, `.html` and `.css` under `src/` plus
 * `index.html`, by path. Text, not a syntax tree, as `ruleProblems` is. Sorted by file, then place.
 */
export function pageProblems(files: Readonly<Record<string, string>>): Diagnostic[]
```

  `rulesStep` reads those files and reports `ruleProblems` then `pageProblems`. Comments are skipped
  (`withoutComments`). Three groups are held: nothing pops up, no password or personal details, nothing in the
  background. (Money, tracking and outside addresses were cut by the Owner and have no row.) The names, and the
  sentence each gets (`{name}` is what was found):

| Found | Sentence |
|---|---|
| `alert`, `confirm`, `prompt`, called | `{name} stops the game with a box the player did not ask for. Show a screen of your own instead.` |
| `open`, called | `A game does not open windows by itself. To offer a link, use host.openLink from a button the player presses.` |
| `Notification`, `PushManager` | `A game sends no notifications.` |
| `document.write` | `document.write can wipe the page. Add elements with document.createElement.` |
| `navigator.serviceWorker`, `new SharedWorker` | `A game runs nothing in the background. Take this out.` |
| `navigator.geolocation`, `getUserMedia`, `getDisplayMedia`, `navigator.clipboard.read` | `A game does not ask for the player's place, camera, microphone or clipboard. Take this out.` |
| `<input` or `createElement('input')` with `type` `password`, `email` or `tel`, or an `autocomplete` of `name`, `email`, `tel`, `street-address`, `postal-code`, `cc-number` or one starting `address-` | `A game never asks for a password or personal details. Take this field out.` |

  A called name (the first two rows) counts as `window.name(`, `globalThis.name(` or `self.name(` anywhere, and as a
  bare `name(` only when it follows no dot and the file declares no `name` of its own (`const`, `let`, `var`,
  `function`, a parameter or an import). So `db.open(`, `indexedDB.open(` and a game's own `confirm` are not found.
  `withoutComments` strips script comments; in an `.html` file `<!-- -->` is stripped too.

- [ ] **Step 1: Write the failing tests:** one per row (found, at its line, with its sentence); then:

```ts
test('the template as create writes it has no page problem', …)
test('window.confirm(, globalThis.alert( and self.open( are found', …)
test('a file that declares its own confirm, prompt or open may call it', …)   // const confirm = …; function open() {}
test('indexedDB.open(…) and db.open(…) are not found', …)
test('a field inside <!-- --> in index.html is not found', …)
test('a name in a comment or as part of a longer name is not found', …)       // myalert(, // alert(
test('an address of another site in the code is not a problem', …)             // cut by the Owner: no row for it
test('a game with no index.html says so once, at index.html', …)
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green.**
- [ ] **Step 5: Commit** `feat(cli): automata check reads the game's page for what a game must never do`.

### Task 19: Words that are not finished, and a game that can end

**Files:**
- Create: `src/features/cli/check-words.ts`, `src/features/cli/check-ends.ts`,
  `tests/features/cli/check-words.test.ts`, `tests/features/cli/check-ends.test.ts`
- Modify: `src/features/cli/check-files.ts`, `src/features/cli/check-rules.ts`, `src/features/cli/report.ts`

**Interfaces:**
- Produces:

```ts
/** A finding that is a note every day and a problem under `--ship`. */
export interface ShipFinding extends Diagnostic { readonly rule: 'words' | 'size' | 'small-words' | 'save' }
export interface StepReport { /* …plus: */ readonly ship?: readonly ShipFinding[] }
/** Messages that are not finished, in every language the game has. */
export function unfinishedWords(content: GameContent): ShipFinding[]
/** The event and resource ids these plugins register, read from each plugin's own `events` and `resources`. */
export function simIds(plugins: readonly PluginDef[]): {
  readonly events: readonly string[]
  readonly resources: readonly string[]
}
/**
 * What is wrong with how the game's levels end. `ids` is `simIds` of the game's whole list of plugins; `read` gives
 * a resource's value at tick 0 (Task 8's `Sim.read`), for the score's field.
 */
export function endProblems(
  content: GameContent,
  sim: {
    readonly ids: ReturnType<typeof simIds>
    readonly read: (resourceId: string) => unknown
  },
): { readonly problems: Diagnostic[]; readonly notes: string[] }
```

  `unfinishedWords`: a message that is empty or only spaces; equals its own key; or holds `TODO`, `FIXME`, `lorem`,
  `ipsum`, `xxx`, `placeholder` or `test` as a whole word, whatever the capitals. Sentence: `"{key}" in {language}
  still says "{value}". Write what the player should read.` A key under `level.` whose value is a level's real name
  holding "test" is still found: the maker renames it or ships without `--ship`.

  `endProblems`, each at `automata.toml`:

| When | What |
|---|---|
| `done` names an event the sim does not register | problem: `done = "{event}" can never happen: nothing in this game raises it. A door needs a character with "kind": "door" and "touch": "sense".` |
| `done` is a touch event of a kind no thing in some level of `levels` has | problem, at that level's file: `This level has no {kind}, so it can never be finished. Put one in "things".` |
| `lost` names an event the sim does not register | problem: `lost = "{event}" can never happen: nothing in this game raises it. Write lost = "hero.fell" and the framework raises it when a hero falls out of the level, or name an event your own rules raise.` |
| `score` names a resource the sim does not have, or a field that is not a number | problem: `score = "{score}" is not a number this game counts. Name a resource and one of its numbers, like "hero.score.sparks".` |
| neither `done` nor `lost` | note: `This game can be neither won nor lost. Add done = "…" or lost = "…" to automata.toml, or give the player something to aim for.` |

  The `files` step carries `unfinishedWords` in `ship` and one note with their count (`3 words are not finished. See
  them with automata check --ship.`). The `rules` step carries `endProblems` when the game's code could be loaded
  (`game.code.rules` has `plugins`), and says nothing about ends when it could not (the code's own problem is already
  reported). It gets the ids from the game's own copy of the framework, as the replays step does, never from the
  command's: `simIds([...game.code.framework.gameSimPlugins({ content }), ...game.code.rules.plugins])` (Task 2). For
  `score` alone it makes one sim with `game.code.framework.createGameSim`, reads the field with `Sim.read` and
  disposes the sim. A hero needs no `moves` to fall (Task 2), so `lost = "hero.fell"` is always registered and has no
  row of its own.

- [ ] **Step 1: Write the failing tests:** one per row of both lists, then: the template has none of them; a game in
  three languages reports a `TODO` in each language it is in; "contest" and "latest" are not "test".
- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green.**
- [ ] **Step 5: Commit** `feat(cli): automata check finds words that are not finished and levels that cannot end`.

### Task 20: `automata check --ship`

**Files:**
- Create: `src/features/cli/check-ship.ts`, `tests/features/cli/check-ship.test.ts`
- Modify: `src/features/cli/args.ts`, `check.ts`, `report.ts`, `help.ts`, `mcp-tools.ts`, `replay.ts`, `cli.ts`,
  `live.ts`, `ports.ts`, `tests/features/cli/args.test.ts`, `report.test.ts`, `mcp-tools.test.ts`, `replay.test.ts`,
  the tests of `live.ts` and of the test `Code` service the other CLI tests use,
  `skills/automata/SKILL.md`, `skills/automata-content/SKILL.md`, `skills/automata-rules/SKILL.md`,
  `template/AGENTS.md`, `tests/skills/skills.test.ts`, `README.md` ("automata check")

**Interfaces:**
- Consumes: `ShipFinding` and `StepReport.ship` (Task 19).
- Produces:

```ts
export type StepName = /* …as today… */ | 'ship'          // last in STEP_NAMES; run only with --ship
export function runCheck(options: { /* …plus: */ readonly ship?: boolean }): …
export interface CheckReport { /* …plus: */
  /** Under --ship: what only the game's makers can judge, in the order to try them. */
  readonly byHand?: readonly string[] }
/** The ship step: every earlier step's `ship` findings as problems, plus its own. */
export function shipStep(game: GameFolder, earlier: readonly StepReport[]): Effect.Effect<StepReport, never, FilesService>
/** The list a maker tries by hand. */
export const BY_HAND: readonly string[]
// ports.ts: the game's code as the command loads it. `save` is `gameSave`, when src/headless.ts exports one.
export interface GameCode { /* …rules, when it loaded, gains: */ readonly save?: SaveDef<unknown> }
/** `"<version>:<hash>"` of a save: the hash is of its schema's JSON Schema, `io: 'input'`, as describeSchemas makes it. */
export function saveMark(framework: typeof Headless, save: SaveDef<unknown>): string
// replay.ts: `--accept` writes meta.save (saveMark) when the game has a gameSave (builder's call 16)
```

  `live.ts` reads `gameSave` from the loaded `src/headless.ts` beside `gamePlugins` and `actions`, and refuses one that
  is not a `SaveDef` with a sentence at `src/headless.ts`. The hash uses the game's own copy of the framework, like
  everything else the command works out about a game.

  `check --ship` and the MCP `check` tool's new `ship: true` do the same. `--ship` with `--only` is refused: `--ship
  checks everything. Leave out --only.` The ship step's own findings:

| Rule | When | Sentence |
|---|---|---|
| `size` | a picture under `content/` is over 512 KB | `{file} is {n} KB. A picture over 512 KB makes the game slow to open. Make it smaller.` |
| `small-words` | a `font-size` under 14px in a `.css` or `.svelte` file under `src/` | `{file} has words {n} pixels tall. Under 14 a phone cannot read them.` |
| `save` | `gameSave`'s schema hash differs from the newest recording's `meta.save` and its version does not | `The saved game's shape changed and its version did not, so players would lose their saves. Raise version in defineSave and add the step that upgrades the old one.` |

  Half-made menus have no rule of their own: a `screens` option that imports a file that is not there already fails
  the `types` step every day, and the rest ("is this menu finished?") is the sixth line of the list below. The spec's
  table gives that box to `--ship`; it is held by `types` and the list instead.

  The ship step also says one note, which never fails, for each level in `levels` that has no `level.<id>.goal` in the
  source language: `{level} has no goal line. Add "level.{level}.goal" to your messages, so a new player is told what
  to do.` It is a note because a game may say its goal in its own way.

  After the steps, the report prints `BY_HAND` under "Try these yourself":

```
In five seconds, is it clear what to do?
Can someone who has never seen it work out how to play, with nobody explaining?
Is there enough to do: a few minutes of play, or a reason to play again?
Does it get harder bit by bit?
Did you make the art, the music and the characters, or are you allowed to use them?
Are there any stand-in pictures, half-made menus, or spots that do something when tapped that nobody would guess?
Do the pictures and words look cared for, the same style on every screen?
Is color ever the only clue? Is sound ever the only clue?
Can luck make a level impossible? Does anything appear right on top of the player?
Play it for ten minutes on a real phone.
Play it with one hand, on bad Wi-Fi, after locking and unlocking the phone, and after many restarts.
Hand it to someone and say nothing. Is it still fun after 30 seconds?
```

  The skills and `template/AGENTS.md` gain a section, "Before you ship", that says: run `automata check --ship`, fix
  what it names, then work through the list with the person. `skills.test.ts` holds that each line of `BY_HAND` is in
  `skills/automata/SKILL.md`.

- [ ] **Step 1: Write the failing tests.**

```ts
test('check --ship on a new game passes and prints the list', …)     // an unchanged starter is not a problem (the Owner)
test('a TODO in a message is a note in check and a problem in --ship', …)
test.each(/* every row above */)('%s', …)
test('--ship --only files is refused with its sentence', …)
test('--json carries ship findings and byHand', …)
test('the MCP check tool with ship: true gives the same report', …)
test('replay --accept writes meta.save for a game that exports gameSave, and nothing for one that does not', …)
test('the same save schema gives the same mark twice; a changed field changes the hash; a changed version changes the version', …)
test('a gameSave that is not a SaveDef is a problem at src/headless.ts', …)
test('a level with no goal line is a note under --ship and does not fail it; the template has none', …)
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green. API report and help text from the job's log.**
- [ ] **Step 5: Commit** `feat(cli): automata check --ship, and the list only a game's makers can try`.
  **Open pull request 4.** Tracker to 80% of stage 4.

---

## Part D: the journeys and the docs (pull request 5)

### Task 21: The made game, played the hard ways

**Files:**
- Create: `tests/create/checklist.journey.test.ts`, `tests/create/made-game.ts` (the setup the two journey files
  share, moved out of `create.journey.test.ts`: make, install, check, serve)
- Modify: `tests/create/create.journey.test.ts`, `.github/workflows/ci.yml` (`create-play` gets a 60 minute limit),
  `tests/workflows/ci.test.ts`

The made game is served by its own `automata play`, as the journey serves it today. The built folder (the spec's
"built folder") is played by the game's own play test, which this job runs last.

- [ ] **Step 1: Write the failing tests.**

```ts
test('lose and try again by touch and by keys', …)
test('at each of the five sizes every button and the canvas are inside the viewport and the safe area', …)
test('50 restarts: no reload, one canvas, the entity count of the first start', …)
test('hide and show the page mid-level in three engines, and play on', …)
test('reload on every screen (picker, splash, menu, playing, paused, settings, lost, done): the visit goes on from the saved settings and games', …)
test('the address bar slides (the viewport\'s height changes by 80 px): everything still fits', …)
test('the network slowed to 50 kb/s: the bar, then the slow line, then the game', …)
test('one content file fails once: the game starts; fails always: the problem screen with its button', …)
test('no sound before the first tap; the level is won with the sound off', …)
test('storage full of garbage under the game\'s keys: the game opens and plays', …)
test('a swipe on the game at phone size does not move the page', …)
test('the game\'s own play test passes: npm run build && npm run play-test', …)     // Chromium and WebKit are installed in this job
test('automata check --ship on the untouched game passes and prints the list to try by hand', …)
```

- [ ] **Step 2: Push; red. Step 3: fix what the journeys find, in the framework or the template, never in the test.**
  A fix that would move the template's recording again is a stop: report it.
- [ ] **Step 4: Push; green in three engines.** Pictures of the lost screen, How to play and the start card in the
  made game reach `ci-screens`.
- [ ] **Step 5: Commit** `test(create): the made game lost, restarted, hidden, reloaded, slowed and cut off`.

### Task 22: The docs, the skills and the handoffs

**Files:**
- Modify: `README.md`, `skills/automata/SKILL.md`, `skills/automata-content/SKILL.md`, `skills/automata-api/` (the
  generated reference), `CLAUDE.md` (Structure: `template/tests/play/`; the flow's sentence gains losing, the score
  and Back), `tests/docs/readme.test.ts`, `tests/skills/skills.test.ts`, `tests/public-surface.test.ts`,
  `docs/superpowers/progress.md`

- [ ] **Step 1: Write the failing tests.** `readme.test.ts`: "Screens and the flow" names `lost`, `score`, the goal
  message, How to play, Back, `back: false` and that a framed game leaves Back alone, each with one example; a new section, "The checklist every game
  meets", lists the Must-have groups in the spec's words with, for each box, where it is held (a default, a check, or
  "yours": the `BY_HAND` line); "The automata command" documents `--ship` and the `page` part; a
  new game's README says what its `play` job does and how to change the two numbers. `public-surface.test.ts`: the
  browser entry has `lostScreen`, `howScreen`, `howRows`; the headless entry has `scoreRef`,
  `fellEvent`, `usesFalls`, `gameSimPlugins`, and none of the screens.
- [ ] **Step 2: Push; red. Step 3: write them** (developer text, in English, on purpose).
- [ ] **Step 4: Push; every check green.**
- [ ] **Step 5: Commit** `docs: the checklist every game meets, in the README, the skills and the tracker`.
  **Open pull request 5.** Tracker to 88%, then 100% on the last green run. Send the coordinator the summary and the
  handoffs below.

---

## Handoffs

- **Plan D (Examples).** When its framework pin moves past pull request 2b, the demo gets Try again, Start again, How
  to play, the sound switch, Delete all my saves, Back and the loading bar with no change. It names its own `lost`
  (its co-op rule may raise its own event), `score` and `level.<id>.goal` in six languages, and gains a `play` job like the template's. Its recordings move only if it names
  `lost = "hero.fell"`: that is a golden move there, named and shown. Every level now waits for the first press, so
  the demo's journeys must press once after a level shows before they expect it to move, in the same pull request that
  moves the pin, or the pin move turns them red.
- **The Site.** Nothing to do. The Site only frames the demo's built page and never calls `startFlow`; the framework
  leaves Back alone in a frame (Task 10), so Back on the Site is the Site's.
- **Editors.** Nothing they call changes shape. `automata.toml`'s three new fields load when their pin moves. Their
  Play stays `startGame`, which does not wait for a press unless asked.
- **Plan F (the feel runtime).** The start card and the score are in the HUD, over the mount: a shake must not move
  them. The template's `take` and `fall` feels are drawn once plan F draws feels; their buzz works now.
- **Plan N (online).** `startOnlineGame` keeps its own page, and nothing here puts `lost` into a room.
- **Plan W's `automata words --compile`.** Step U was to wire it. Nothing in the checklist needs it, so this plan does
  not: it has no owner again, and the coordinator should give it one.
- **A Ruken export target, later** (the Owner, 2026-11-15: "We'll eventually add Rukin as an export target. And when
  we do, we should use all of the things that we said we need to have."). That target's plan holds a game to the
  whole checklist, with what was cut here: no ads; never asking for money; no tracking and the lockdown on outside
  sites (the content security policy, `[network] allow` and the address rules of the `page` part, written out in
  this file's history at commit bfc4e414); a `--ship` that fails an unchanged starter; and the device and gamepad
  checks (iPhone, Android, computer, WebGL without WebGPU, a game played by gamepad alone). `CLAUDE.md` still lists
  Ruken as left out; that line changes with that plan, not this one.
- **Release 4.** A publish step runs `automata check --ship`. `--ship` is ready for it; nothing here calls it. Task
  18 refuses a service worker, which is the checklist's box. If distribution wants one so a game plays offline, that
  plan reopens the row on purpose, with the Owner, instead of tripping on it.
- **Before Release 1:** every word of Task 5 and the template's goal line wait for a native speaker's read in five
  languages.
- **Left to the maker, and said so by `--ship`:** whether it is clear, fun, fair, original and finished to look at;
  real phones.

## Self-review

- **Spec coverage, Must have.** *It works:* Play again always works, with no reload (Tasks 3, 6; 50 restarts in Tasks
  6 and 21); never stuck (Start again and Menu on pause, Task 6; a level that cannot end, Task 19); switching apps
  (Tasks 13, 21); reloading (Task 21); no scrolling (Tasks 10, 21); fits the screen (Tasks 13, 21); no sound until a
  tap, playable with the sound off (Tasks 13, 21); slow or failed loading says so (Tasks 11, 21). The device and
  gamepad boxes are cut (the Owner); what the framework already proves for them stays as it is. *There's a game
  here:* clear in five seconds (the goal line, the hint and the waiting start, Task 7; the template's goal, Task 15);
  win or lose (Tasks 1 to 3, 6, 15; the note, Task 19); works it out alone (Task 7); enough to do (the best score,
  Task 8; the maker's, Task 20). *Its own thing:* the art is the maker's (the list, Task 20); "still the starter" is
  cut. *Finished:* test words (Tasks 19, 20); half-made menus (the `types` step and the list, Task 20); stand-in pictures, hidden spots and sloppy pictures
  (the list, Task 20). *Honest:* nothing pops up to cut in (the `page` part, Task 18); "no ads" and the store-page
  boxes are left out. *Safe:* passwords and details, background work, and no other window unless the player asks
  (Task 18's `open` row); money, tracking and the lockdown on outside sites are cut.
- **Spec coverage, Good to have.** Score and best (Tasks 1, 4, 8); double tap and long press (Task 10); address bar
  (Task 21); Back (Task 10); no slow-down over restarts (Tasks 6, 21); small files and tiny words (Task 20); mute
  (Tasks 4, 9); loud sounds and the music's seam (Task 12); loading progress and retry (Task 11); How to play, game
  over, Play again (Tasks 6, 7); broken saves (Tasks 9, 21); wipe and start fresh (Task 9); a new version keeps saves
  (Task 20); time to react (Task 7); buttons have names, words readable (Task 13); something happens on score, hit
  and loss (Task 15's feels and sounds); screens change smoothly (Task 12). Everything the spec marks "done" gains
  the test the spec asks for in Tasks 13 and 21.
- **Spec coverage, the rest.** `--ship`: Task 20. Part A as plan
  K's Step U, with the one move of the recording shown to the Owner: Tasks 14 to 17. Q1's answer: Task 16, run in
  Task 21. New words in six languages: Task 5. Skills and `AGENTS.md` name the maker's boxes: Task 20.
- **Calls a reader should check.** The spec was brought into line with five of them after this plan was written
  (its commit 879c3d4e), so the two agree: the best score is a settings section (call 8); mute is a flag (call 9); the
  goal is a message key by convention (call 5); the
  problem screen's button keeps "Load the page again" (call 13); `hero.fell` is a plugin of its own, joined only when
  named (call 2), which is what keeps every other recording still. The rest are this plan's alone: `done` wins over
  `lost` (1), Start again asks (4), a level waits for the first press (6), what Delete erases (10), Back's rules (11),
  the saves-version check through `gameSave` (16), two players in the template (17). Reduced motion for shake and
  freeze is plan F's and is not a task here.
- **After the plan audit** (`audits/2026-11-15-plan-q-plan-audit.md`, 2026-11-15). All seven important findings and
  all eleven minor ones are in: any hero can fall, with or without `moves` (I1); `gameSimPlugins` is what a check
  reads a game's events and resources from (I2); Back gets a new entry on every Play (I3); only a press that begins
  after the level shows starts it (I4); a framed game leaves Back alone (I5); the compressor is a limiter, held to 1
  dB on one voice (I6); `gameSave` reaches the command through `live.ts` and `ports.ts`, with a defined hash (I7);
  `levelGoal` is in `labels.ts` (M1); the rows of `advance` left unsaid are said (M2); the `page` part's names do not
  catch a game's own (M3); the `screens` rule is dropped for the `types` step and the list (M4); the crate stands
  past the gap, and what happens if it is pushed back in is said and tested (M5); the play jumps a tile early, with a test of the margin (M6); the "Safe" sentence is right (M7);
  Task 7 is 7a and 7b, pull request 2 is 2a and 2b, and Part C does not wait for the Owner's gate (M8); the demo's
  journeys press first (M9); the service worker row is handed to Release 4 (M10); `--ship` notes a level with no goal
  line (M11).
- **Not covered, on purpose:** the demo (handoff); the editors; a publish step; anything about sending a game to a
  host; `automata words --compile` (handoff, with no owner).
- **End to end.** Every pull request has real-browser tests: pull request 1 the fall's parity in four engines; 2a each new
  screen at five sizes; 2b whole visits by thumb and by keys; 3 the template's page and the create journey on the flow; 4 `check --ship` through the packed package in `create-smoke`; 5 the made game
  in three engines, and the game's own play test in two.
- **Type consistency.** `FlowState.attempt`, `'lost'`, `'again'`, `'level-lost'` and `Over`'s `'how'` are Task 3's and
  are what Tasks 6, 7 and 10 read. `levelEnd` (Task 6) replaces `endsLevel`'s one use. `Records`, `withScore` and
  `heardVolumes` are Task 4's, used in Tasks 8 and 9. `scoreRef` (Task 1) is read by `Game.score()` (Task 8) and
  `endProblems` (Task 19). `gameSimPlugins` (Task 2) and `Sim.read` (Task 8) are what Task 19's `simIds` and
  `endProblems` are given. `levelGoal` is Task 7a's, used in 7b and in Task 20's note.
  `ShipFinding` and `StepReport.ship` are Task 19's, used in Task 20. `PauseItem` and `MenuItem` each gain names in
  Tasks 6 and 7 and nowhere else.
- **Review Focus.** Each of the five lines names a test in a task that owns the code (Tasks 3, 6, 8, 9, 10, 11).
- **Proportion.** The code blocks are signatures, tables of exact words and test names; no function body is written
  out.

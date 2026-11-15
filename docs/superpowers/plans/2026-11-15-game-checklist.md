# Plan Q: The Game Checklist In Every Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session at a time, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A game made with `automata create` meets every "Must have" box of the Owner's game checklist with no line of
its own code, keeps meeting it because `automata check` and a browser in its own CI say when it stops, and gets the
"Good to have" boxes a framework can give for free.

**Architecture:** Three places carry the checklist. The flow gains what a finished game has and ours lacks: losing and
Try again, Start again, How to play, a goal line, a score and its best, a sound switch, Delete all my saves, a loading
bar that says when it is slow, Back, and page-wide touch and scroll defaults. The template becomes one `startFlow` call
under a strict content security policy, with a level that can be lost and won (this is plan K's Step U). `automata
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
  "No ads" is left out too (the Owner, 2026-11-15): it is one host's rule. No check, sentence or test here is about
  ads; the policy and the `page` part stay for what they hold under "It's safe" and "nothing pops up".
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
  each; the last 12% is the final green run with every check passing and the Owner's yes to the moved recording.

## Order, and what each part waits for

The parts keep the spec's letters. They are built in this order, five pull requests, each green and merged before the
next starts. B comes before A because the template's level names `lost`, `score` and a goal, and its recording may
move only once.

| Pull request | Part | Tasks | Waits for |
|---|---|---|---|
| 1 | B1, what needs no page | 1 to 5 | The spec merged (AF 137). |
| 2 | B2, the screens and the flow | 6 to 13 | Pull request 1. Plan U's audit fixes (AF 136) on `main`: if they are not, merge `main` when they land and keep going. |
| 3 | A, the template on the flow | 14 to 17 | Pull request 2. **The Owner's yes to the moved recording, before merge.** |
| 4 | C, the checks | 18 to 20 | Pull request 3 (the checks are tested on the new template). |
| 5 | D, the journeys and the docs | 21, 22 | Pull request 4. |

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
   sim it had". A hero has fallen when its center is more than two tiles below the level's lowest row. It is said once
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
   does not step until a key, a gamepad button or a touch. Nothing is silenced while it waits, so a held Right walks
   from tick 0. The goal line stays three seconds after that press (on the injected `Frames`), then goes; it is also on
   the pause screen. Watch mode does not wait.
7. **`score` names one number of one resource:** `score = "hero.score.sparks"` is the field `sparks` of the resource
   `hero.score` (the last dot splits them). It is read after each step and shown in the HUD's top center, on Well done
   and on Try again. A score is one level's: each level is its own sim.
8. **The best score is kept with the settings, not in a saved game** (the spec says "the flow's progress save gains
   `best`"). A game that names its own save has no place for it, and a best score belongs to the player on this
   device, not to one of three saved games. It is a settings section, `records`: `{ best?: number }`. "Delete all my
   saves" clears it.
9. **The sound switch is a flag, `muted`, in the sound settings** (the spec says "the same setting as volume 0"). With
   a flag the two sliders keep where the player put them. It is on the pause screen and in Settings.
10. **"Delete all my saves" erases every saved game and the best score.** It leaves the language, the keys and the
    volumes: those are not what a player calls a save. It asks first, and "No" has the focus.
11. **Back** is one history entry, added the first time a level starts. Back while playing pauses and puts the entry
    back; Back with a screen on top closes it and puts the entry back; Back on pause, Well done or Try again goes to
    the menu; Back on the menu leaves the page as it always did. `FlowOptions.back: false` turns it off, for a page
    that frames a game and owns its own history.
12. **The page-wide defaults** are set by `startFlow` on the document (`overscroll-behavior: none`, no scrolling of the
    page while a game is mounted full-height) and on the mount (`touch-action: none`, `user-select: none`,
    `-webkit-touch-callout: none`), and put back by `stop()`. The screens' own lists still scroll inside themselves.
13. **Loading:** a bar in place of the ring, filled as files arrive (one for `automata.toml`, then one for each file it
    lists). After 10 seconds with no file arriving, the slow line, in the device's language when it is one of the six
    and never otherwise. A read that fails is tried once more after one second. The problem screen's button keeps its
    words, "Load the page again": "Try again" is what the lost screen says, and one button name means one thing.
14. **The policy is a line in the game's `index.html` that `automata check` holds to `pagePolicy(project)`**, a pure
    function. `automata create` writes it and `automata check --fix` rewrites it. No build plugin: nothing runs at
    build time that an agent cannot read in a file. The project file names no room server today, so there is no
    `<room>` of its own: an online game lists its room server in `[network] allow`, the one list.
15. **`--ship` is a flag of `automata check`** (the spec's call) and adds one step, `ship`, after `tests`. Plain
    `check` says the same findings as notes.
16. **The saves-version check reads `gameSave`**, an optional export of a game's `src/headless.ts` (a `SaveDef`).
    `automata replay --accept` writes `meta.save` (`"<version>:<hash of the schema>"`) into each recording; `--ship`
    fails when the hash differs from the newest recording's and the version does not. A game with no `gameSave` uses
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
6. **The real policy in a real browser, in development:** the template under its `<meta>` served by `automata play`
   (Vite's own socket and styles) and from the built folder, in three engines, raises no `securitypolicyviolation`.
   Task 14's test. If one is raised that the game does not need (Vite's socket in one engine), stop and report it with
   the violation's text; do not loosen the policy to pass.

## File Structure

```
src/features/content/project.ts          + lost, score, [network] allow; scoreRef
src/features/content/policy.ts           NEW: pagePolicy(project), POLICY_META, readPolicy(html)
src/features/content/load.ts             the new fields' cross-file checks
src/features/level/fall.ts               NEW: fallPlugin, fellEvent, levelBottom
src/features/level/uses.ts               + usesFalls
src/features/level/game-sim.ts           joins fallPlugin when the game asks
src/features/level/sim-content.ts        lost, score and network leave what the sim is given
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
src/features/cli/
  check-page.ts                          NEW: the page part of the rules step
  check-words.ts                         NEW: the words rule
  check-ends.ts                          NEW: done, lost and score can happen
  check-ship.ts                          NEW: the ship step and its list
  check.ts args.ts report.ts help.ts mcp-tools.ts replay.ts create.ts   --ship, the new step, meta.save, the policy
template/                                the page, the level, the door, the words, the feels and sounds, the policy,
                                         tests/play/, vitest.play.config.ts, the second CI job; the recording
skills/, template/AGENTS.md, README.md   the maker's boxes; the new fields, screens and checks
tests/                                   mirrors the above; tests/fixtures/flow/ gains a level that can be lost
```

---

## Part B1: what needs no page (pull request 1)

### Task 1: The project file says what loses a level, what the score is, and who the game may talk to

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
  /** Other addresses the game may talk to. Left out, only its own. */
  readonly network?: { readonly allow: readonly string[] } | undefined
}
/** `score` as its two halves: the last dot splits them. `undefined` when the project names none. */
export function scoreRef(project: Project): { readonly resource: string; readonly field: string } | undefined
```

  `lost` is checked as `done` is (the same custom check, at most 96 characters, `WORDS_PATTERN`). `score` is at most 96
  characters, `WORDS_PATTERN`, with at least one dot. `network.allow` is 1 to 16 entries, none twice, each an `https:`
  or `wss:` origin with no path, query or userinfo (`https://api.example.com`, `wss://rooms.example.com:2567`).
  `sim-content.ts`'s `FLOW_FIELDS` becomes `['levels', 'done', 'warnings', 'splash', 'lost', 'score', 'network']`, and
  the three new keys leave the project the sim is given.

- [ ] **Step 1: Write the failing tests.**

```ts
test('lost, score and [network] allow are read', …)            // lost: 'hero.fell', score: 'hero.score.sparks'
test('a project that writes none of them has none of the keys', …)   // Object.hasOwn false for all three
test.each([
  ['lost = "Hero Fell!"', 'Write the event that loses a level, like lost = "hero.fell".'],
  ['score = "sparks"', 'Write a resource and one of its numbers, like score = "hero.score.sparks".'],
  ['[network]\nallow = ["http://a.example"]', 'Write an address that starts with https:// or wss:// and has no path, like "https://api.example.com".'],
  ['[network]\nallow = ["https://a.example/x"]', /* the same sentence */],
  ['[network]\nallow = ["https://a.example", "https://a.example"]', 'This address is already in the list.'],
])('%s is refused with its sentence', …)
test('lost and done may not name the same event', …)   // 'A level cannot be won and lost by the same event. Change lost or done.'
test('scoreRef splits at the last dot', …)             // { resource: 'hero.score', field: 'sparks' }
// sim-content.test.ts
test('lost, score and network never reach the sim: the content hash is the same with and without them', …)
```

- [ ] **Step 2: Push; red.**
- [ ] **Step 3: Add the three fields, their hints, `scoreRef` and the `FLOW_FIELDS` entries.**
- [ ] **Step 4: Push; green, and every golden unchanged.**
- [ ] **Step 5: Commit** `feat(content): the project file names what loses a level, the score and who the game may talk to`.

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
/** Says `hero.fell` once for each hero whose center is below `bottom + FALL_DEPTH`. */
export function fallPlugin(options: { readonly bottom: number }): PluginDef
/** True for a game whose project says `lost = "hero.fell"`. */
export function usesFalls(content: GameContent): boolean
```

  `createGameSim` adds `fallPlugin({ bottom: levelBottom(content, level) })` after `movesPlugin`, only when
  `usesFalls(content)`. The comment says what the others say: only a game that asks has it, so every other game keeps
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
// fall.parity.test.ts
test('the fall, in this engine, ends at the recorded hash', …)   // expectGolden(…, fall.json), 240 ticks
```

- [ ] **Step 2: Push; red.** The Node job says GOLDEN NOT RECORDED and prints the JSON.
- [ ] **Step 3: Build `fall.ts`, `usesFalls` and the line in `createGameSim`.**
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
| `menu` or `paused`, no `over` | `open`, `over: 'how'` | the same step with `over: 'how'` (plan U's rule, one more name) |

- [ ] **Step 1: Write the failing tests:** one per row, then:

```ts
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

## Part B2: the screens and the flow (pull request 2)

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
export type PauseItem = 'resume' | 'again' | 'add-player' | 'settings' | 'leave'   // Task 7 adds 'how'
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
test('by gamepad alone: fall, press the bottom button, play again', …)
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

### Task 7: The goal line, a level that waits for you, and How to play

**Files:**
- Create: `src/features/screens/how.ts`, `src/features/screens/How.svelte`, `src/features/screens/how-rows.ts`,
  `tests/features/screens/how-rows.test.ts`, `tests/features/screens/how.browser.test.ts`,
  `tests/features/flow/start-card.browser.test.ts`
- Modify: `src/features/game/game.ts`, `src/features/screens/hud.ts`, `src/features/screens/Hud.svelte`,
  `src/features/screens/menu-items.ts`, `src/features/screens/pause.ts`, `src/features/screens/screens.ts`,
  `src/features/flow/overs.ts`, `src/features/flow/play.ts`, `src/features/locale/names.ts` (`levelGoal`)

**Interfaces:**
- Produces:

```ts
// locale: the level's goal in the player's words (`level.<id>.goal`), or undefined when the game has no such word.
export function levelGoal(words: Words, has: (key: string) => boolean, level: string): string | undefined
// game.ts
export interface GameOptions { /* …plus: */
  /** The sim does not step until the first key, gamepad button or touch. Nothing is silenced meanwhile. */
  readonly waitForPress?: boolean }
export interface Game { /* …plus: */
  /** True from the start until that first press, in a game made with `waitForPress`. */
  waiting(): boolean }
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
// screens/hud.ts
export function hud(options: /* …as today, plus: */ {
  /** The level's goal and what to press, shown at the top until three seconds after the first press. */
  readonly card?: () => { readonly goal?: string; readonly hint?: string } | undefined
}): …
```

  `howRows`: Walk and Jump always; "Jump again in the air", "Jump off a wall" and "Dash" only when the hero has them; a
  hero with no `moves` lists the game's own controls by their labels (`controlRows`' labels); "Pause" last (Escape, the
  start button, or the corner button's name). On touch, with the sides not swapped, walking is
  `automata.how.slide-left` and jumping `automata.how.tap-right`; swapped, the other two; the dash is
  `automata.how.dash-button`. The hint on the card is `playHint(...)` for keys and a gamepad and nothing on touch
  (the thumbs' own hints are on the screen). The flow starts every level with `waitForPress: true`, sets
  `mount.dataset.waiting` (present while waiting), and takes the card down three seconds after `waiting()` turns false,
  counted on `frames`. The pause screen shows the goal line under "Paused".

- [ ] **Step 1: Write the failing tests.**

```ts
// how-rows.test.ts
test('keys, a plain hero: Walk is "Arrow keys", Jump is its key, Pause is Escape; no other row', …)
test('a hero with every move has the three more rows, in the table\'s order', …)
test('a gamepad: Walk is "The stick", Jump is its button\'s name', …)
test('touch: slide left, tap right; swapped: slide right, tap left; a dash is the dash button', …)
test('a changed key is the one named', …)
test('a hero with no moves lists the game\'s own controls', …)
// start-card.browser.test.ts
test('a level starts still: the tick stays 0, data-waiting is there, the goal line and the hint show', …)
test('holding Right starts it and the hero walks from the first tick', …)
test('a touch starts it; a gamepad button starts it', …)
test('three seconds after the first press the card is gone; before that it is there', …)   // frames moved by hand
test('a level with no goal word shows the hint alone; on touch with no goal, no card', …)
test('the pause screen shows the goal line', …)
test('watch mode does not wait', …)
// how.browser.test.ts
test('How to play from the menu and from pause: the rows, Back has the focus, Back returns to where it was opened', …)
test('plugging in a gamepad while it is open changes the rows', …)
test('at 844x390 with a hero that has every move, only the list scrolls', …)
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green in three engines.**
- [ ] **Step 5: Commit** `feat(flow): the goal line, a level that waits for the first press, and How to play`.

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
export interface FlowOptions { /* …plus: */ readonly back?: boolean }   // default true
```

  `backMeans`: with `over` → `back`, again; `playing` → `pause`, again; `paused`, `done`, `lost` → `leave`, not again;
  anything else → `undefined`. The entry is pushed the first time `playing` is entered and again whenever `again` says
  so, and never twice in a row.

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
- Produces: no new name. The speaker's graph becomes: each bus → a `DynamicsCompressorNode` (threshold −12 dB, knee
  12, ratio 8, attack 0.003 s, release 0.25 s) → the master gain (0.5, as it is) → the destination. A screen put up
  by `show` fades in over 150 ms and out over 100 ms (opacity only), and does neither under
  `prefers-reduced-motion: reduce`. A screen that is fading out takes no press.

- [ ] **Step 1: Write the failing tests.**

```ts
test('every bus reaches the destination through one compressor, then the master gain', …)   // the fake context's graph
test('sixteen voices at once, rendered offline: no sample is above 1', …)
test('a looped track: the last note of one pass and the first of the next are one beat apart, to the sample', …)
test('a screen fades in; under reduced motion it is fully there on the first frame', …)
test('a press on a screen that is fading out does nothing', …)
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green. The `sounding.json` golden does not move** (it records
  the cue log, not the graph); if it does, stop and report.
- [ ] **Step 5: Commit** `feat(web): a compressor on the speaker; screens fade in and out`.

### Task 13: The fixture game's whole visit, lost and won, and what every screen owes

**Files:**
- Modify: `tests/features/flow/journey-touch.browser.test.ts`, `journey-pad.browser.test.ts`,
  `journey-keys.browser.test.ts`, `journey-sizes.browser.test.ts`, `tests/features/flow/grandma.test.ts`
- Create: `tests/features/flow/names.browser.test.ts`, `tests/features/ui/contrast.test.ts`,
  `tests/features/flow/away.browser.test.ts`, `tests/features/render/no-webgpu.browser.test.ts`

- [ ] **Step 1: Write the failing tests.**

```ts
// the three journeys each gain one visit
test('touch: read the goal, tap to start, fall, Try again, reach the door, Next level, pause, How to play, Back, Sound off, Start again, yes, the last door, Main menu', …)
test('gamepad alone: the same visit', …)
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
// no-webgpu.browser.test.ts
test('with navigator.gpu deleted, a game starts and draws its first picture', …)
```

  `grandma.test.ts`: the list of words owed (Task 5) is empty; the lost and how screens each name exactly one
  `primary` button.
- [ ] **Step 2: Push; red where a screen falls short.** Fix the screen, not the test. A size that cannot fit without
  shrinking a control below its floor is a stop: report it.
- [ ] **Step 3: Push; green in three engines.** The pictures reach `ci-screens`.
- [ ] **Step 4: Commit** `test(flow): a visit lost and won by thumb, gamepad and keys; names, contrast, a hidden page`.
- [ ] **Step 5: Open pull request 2. Report the pictures to the coordinator** for the Owner's screenshot review (the
  five sizes; say plainly the fixture's art is boxes). Tracker to 52% of stage 4.

---

## Part A: the template on the flow (pull request 3; plan K's Step U)

### Task 14: The policy, and the template's page as one `startFlow` call

**Files:**
- Create: `src/features/content/policy.ts`, `tests/features/content/policy.test.ts`,
  `tests/template/policy.browser.test.ts`
- Modify: `template/index.html`, `template/src/features/page/page.ts`, `template/src/main.ts`,
  `template/src/style.css`, `template/content/messages/*.json`, `src/features/cli/create.ts`, `src/headless.ts`,
  `tests/template/page.browser.test.ts`, `tests/template/words.test.ts`, `tests/template/messages.test.ts`,
  `tests/template/files.test.ts`, `tests/features/cli/create.test.ts`

**Interfaces:**
- Consumes: `Project.network` (Task 1); `startFlow` and everything Part B gave it.
- Produces:

```ts
/** The content security policy a game's page carries: the spec's text, with `network.allow` after 'self' in connect-src. */
export function pagePolicy(project: Pick<Project, 'network'>): string
/** The `<meta http-equiv="Content-Security-Policy" content="…">` line for it. */
export function policyMeta(project: Pick<Project, 'network'>): string
/** The policy a page's HTML carries in such a meta, or undefined when it has none. */
export function readPolicy(html: string): string | undefined
```

  `pagePolicy({})` is exactly:

  `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'`

  (`worker-src 'self'` is the spec's "It's safe" row written out.) `template/index.html` carries `policyMeta({})` as
  the first element of `<head>` after the charset.

  `template/src/features/page/page.ts` becomes:

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
// policy.test.ts
test('pagePolicy with no network is the exact text', …)
test('allowed addresses follow \'self\' in connect-src, in the file\'s order, and appear nowhere else', …)
test('readPolicy finds the meta whatever the order of its attributes, and undefined when there is none', …)
// tests/template
test('index.html carries exactly policyMeta of its own project', …)
test('page.ts imports only the framework and the game\'s own files, calls startFlow once, and is under 60 lines', …)
test('no message key starts with page.', …)
// page.browser.test.ts, rewritten on the flow: a first visit walks picker, splash, menu, Play; a problem in a file is
//   the framework's problem screen; ?watch plays the recording and a tap takes over; stop() empties the mount
// policy.browser.test.ts: the template's built page served with its meta, in three engines             // Review Focus 6
test('a whole visit (picker, menu, play, pause, settings, lose, win) raises no securitypolicyviolation', …)
test('a script from another origin, an inline script, a frame and a fetch to another origin are each refused', …)
```

- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green in three engines.** A violation the game itself causes
  is a bug in the framework to fix here. One it does not need is a stop (Review Focus 6).
- [ ] **Step 5: Commit** `feat(template): the page is one startFlow call under a strict policy`.

### Task 15: A level that can be won and lost, for two players, and its recording

**Files:**
- Create: `template/content/characters/door.json`, `template/content/figures/door.json`,
  `template/content/feels/take.json`, `template/content/feels/fall.json`, `template/content/sounds/land.json`,
  `take.json`, `fall.json`, `template/content/cues/cues.json`
- Modify: `template/automata.toml`, `template/content/levels/level-1.json`, `template/content/messages/*.json`,
  `template/src/headless.ts` (comment only), `template/tests/features/hero/hero.test.ts`,
  `template/replays/level-1.json` (**the golden**), `tests/template/hero-play.ts`,
  `tests/template/replay.parity.test.ts`, `tests/template/art.test.ts`, `tests/template/files.test.ts`

**The level** (16 wide, 9 rows; a gap two tiles wide in the floor; the door past it; the crate before it):

```
#..............#
#..............#
#..............#
#..............#
#..............#
#..............#
#..............#
#..............#
#########..#####
```

  Things: `spark-1` at (4.5, 7.5), `crate-1` at (6.5, 7.5), `door-1` at (13.5, 7.5). Starts: player 1 at (2.5, 7.5),
  player 2 at (1.5, 7.5). The gap is columns 9 and 10: a jump from a standing run clears two tiles with the template's
  move numbers (`jumpPaths` gives the reach; `hero.test.ts` holds it, so a changed number that makes the gap
  impossible fails a test).

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

**The play** (`tests/template/hero-play.ts`): hold right from tick 0; jump at the gap's edge; keep right to the door.
`TEMPLATE_TICKS` is the tick the door is touched plus 60. The test asserts, on the recorded play, that the spark was
taken, the crate was pushed, `hero.fell` was never raised and `door.touched` was, by player 1.

- [ ] **Step 1: Write the failing tests.**

```ts
// template/tests/features/hero/hero.test.ts (the game's own tests, which a new game keeps)
test('walking off the edge of the gap loses the level', …)        // hero.fell is raised
test('a jump at the edge clears the gap', …)
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
test('the whole visit asked nothing of any other address', …)     // page.on('request'): every URL is this origin, data: or blob:
```

  It reads the game only as a player and an agent can: `data-state`, `data-attempt`, what is on the screen, and
  `window.automataGame`. It holds no hash and no position, so a maker who redraws the level changes two numbers at the
  top of the file (where the gap is, where the door is), which a comment says.

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

### Task 18: The `page` part of the `rules` step, and the policy held in place

**Files:**
- Create: `src/features/cli/check-page.ts`, `tests/features/cli/check-page.test.ts`
- Modify: `src/features/cli/check-rules.ts`, `src/features/cli/check-files.ts`, `src/features/cli/create.ts`,
  `tests/features/cli/check-rules.test.ts`, `tests/features/cli/check-files.test.ts`

**Interfaces:**
- Consumes: `pagePolicy`, `policyMeta`, `readPolicy` (Task 14); `Project.network` (Task 1).
- Produces:

```ts
/**
 * What a game's page may not do. `files` is every `.ts`, `.js`, `.svelte`, `.html` and `.css` under `src/` plus
 * `index.html`, by path; `allow` is `[network] allow`. Text, not a syntax tree, as `ruleProblems` is. Sorted by file,
 * then place.
 */
export function pageProblems(files: Readonly<Record<string, string>>, allow: readonly string[]): Diagnostic[]
```

  `rulesStep` reads those files and reports `ruleProblems` then `pageProblems`. Comments are skipped
  (`withoutComments`). The names, and the sentence each gets (`{name}` is what was found):

| Found | Sentence |
|---|---|
| `alert(`, `confirm(`, `prompt(` | `{name} stops the game with a box the player did not ask for. Show a screen of your own instead.` |
| `window.open`, `open(` on `window` or bare | `A game does not open windows. To offer a link, use host.openLink from a button the player presses.` |
| `Notification`, `PushManager` | `A game sends no notifications.` |
| `document.write` | `document.write can wipe the page. Add elements with document.createElement.` |
| `navigator.sendBeacon` | `A game does not send what players do anywhere. Take this out.` |
| `PaymentRequest` | `A game never asks for money. Take this out.` |
| `navigator.serviceWorker`, `new SharedWorker` | `A game runs nothing in the background. Take this out.` |
| `navigator.geolocation`, `getUserMedia`, `getDisplayMedia`, `navigator.clipboard.read` | `A game does not ask for the player's place, camera, microphone or clipboard. Take this out.` |
| `location.href =`, `location.assign(`, `location.replace(` with anything but a reload | `A game never sends the player to another page. Use host.openLink from a button the player presses.` |
| `<input` or `createElement('input')` with `type` `password`, `email` or `tel`, or an `autocomplete` of `name`, `email`, `tel`, `street-address`, `postal-code`, `cc-number` or one starting `address-` | `A game never asks for a password or personal details. Take this field out.` |
| `http://…`, `https://…`, `ws://…`, `wss://…` or `//host` in code or markup, when its origin is not in `allow` and is not `http://www.w3.org/` (a namespace) | `This game talks only to itself. To let it reach {origin}, add it to [network] allow in automata.toml and say why in a comment there.` |
| `eval(`, `new Function(` | `The page's policy refuses code made from text. Write the function out.` |

  The `files` step gains: `index.html` with no policy meta is a problem (`This page has no content security policy.
  Run automata check --fix to put it back.`); one whose policy is not `pagePolicy(project)` is a problem (`The page's
  content security policy does not match automata.toml. Run automata check --fix.`); `--fix` rewrites the meta, or
  adds it after the charset. `automata create` writes it from the new game's own project file.

- [ ] **Step 1: Write the failing tests:** one per row (found, at its line, with its sentence); then:

```ts
test('the template as create writes it has no page problem', …)
test('a name in a comment or as part of a longer name is not found', …)       // myalert(, // alert(
test('an address in [network] allow is not a problem; the same host on another port is', …)
test('location.reload() is not a problem', …)
test('a game with no index.html says so once, at index.html', …)
test('--fix puts a missing policy back, and rewrites one that does not match; a second run changes nothing', …)
test('adding an address to [network] allow, then --fix: the policy has it in connect-src', …)
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
export interface ShipFinding extends Diagnostic { readonly rule: 'words' | 'starter' | 'size' | 'small-words' | 'save' }
export interface StepReport { /* …plus: */ readonly ship?: readonly ShipFinding[] }
/** Messages that are not finished, in every language the game has. */
export function unfinishedWords(content: GameContent): ShipFinding[]
/**
 * What is wrong with how the game's levels end. `events` and `resources` are the ids the game's own sim registers
 * (read from a sim made with its plugins, as the replays step makes one).
 */
export function endProblems(
  content: GameContent,
  sim: { readonly events: readonly string[]; readonly resources: Readonly<Record<string, unknown>> },
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
| `lost` names an event the sim does not register | problem: `lost = "{event}" can never happen: nothing in this game raises it. A hero with "moves" raises hero.fell when it falls out of the level.` |
| `lost` is `hero.fell` and the hero has no `moves` | problem: `lost = "hero.fell" needs a hero the framework moves. Give the hero "moves", or name an event your own rules raise.` |
| `score` names a resource the sim does not have, or a field that is not a number | problem: `score = "{score}" is not a number this game counts. Name a resource and one of its numbers, like "hero.score.sparks".` |
| neither `done` nor `lost` | note: `This game can be neither won nor lost. Add done = "…" or lost = "…" to automata.toml, or give the player something to aim for.` |

  The `files` step carries `unfinishedWords` in `ship` and one note with their count (`3 words are not finished. See
  them with automata check --ship.`). The `rules` step carries `endProblems` when the game's code could be loaded, and
  says nothing about ends when it could not.

- [ ] **Step 1: Write the failing tests:** one per row of both lists, then: the template has none of them; a game in
  three languages reports a `TODO` in each language it is in; "contest" and "latest" are not "test".
- [ ] **Step 2: Push; red. Step 3: build. Step 4: push; green.**
- [ ] **Step 5: Commit** `feat(cli): automata check finds words that are not finished and levels that cannot end`.

### Task 20: `automata check --ship`

**Files:**
- Create: `src/features/cli/check-ship.ts`, `tests/features/cli/check-ship.test.ts`
- Modify: `src/features/cli/args.ts`, `check.ts`, `report.ts`, `help.ts`, `mcp-tools.ts`, `replay.ts`, `cli.ts`,
  `tests/features/cli/args.test.ts`, `report.test.ts`, `mcp-tools.test.ts`, `replay.test.ts`,
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
// replay.ts: `--accept` writes meta.save when src/headless.ts exports gameSave (builder's call 16)
```

  `check --ship` and the MCP `check` tool's new `ship: true` do the same. `--ship` with `--only` is refused: `--ship
  checks everything. Leave out --only.` The ship step's own findings:

| Rule | When | Sentence |
|---|---|---|
| `starter` | `name` is "My Game", or `package.json`'s name is `my-game` | `This game is still called "{name}". Give it its own name in automata.toml and package.json.` |
| `starter` | a level, figure or messages file is byte for byte the template's | `{file} is still the starter's. Make it your own, or take it out.` |
| `starter` | `FlowOptions.screens` names a screen whose file is not there (an import under `src/` that does not resolve) | `{file} names a screen that is not there. Add the file, or take the screen out.` |
| `size` | a picture under `content/` is over 512 KB | `{file} is {n} KB. A picture over 512 KB makes the game slow to open. Make it smaller.` |
| `small-words` | a `font-size` under 14px in a `.css` or `.svelte` file under `src/` | `{file} has words {n} pixels tall. Under 14 a phone cannot read them.` |
| `save` | `gameSave`'s schema hash differs from the newest recording's `meta.save` and its version does not | `The saved game's shape changed and its version did not, so players would lose their saves. Raise version in defineSave and add the step that upgrades the old one.` |

  After the steps, the report prints `[network] allow` back (`This game may talk to: …`, or `This game talks only to
  itself.`), then `BY_HAND` under "Try these yourself":

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
Play it for ten minutes on a real iPhone, and on a real Android phone.
Play it with one hand, on bad Wi-Fi, after locking and unlocking the phone, and after many restarts.
Hand it to someone and say nothing. Is it still fun after 30 seconds?
```

  The skills and `template/AGENTS.md` gain a section, "Before you ship", that says: run `automata check --ship`, fix
  what it names, then work through the list with the person. `skills.test.ts` holds that each line of `BY_HAND` is in
  `skills/automata/SKILL.md`.

- [ ] **Step 1: Write the failing tests.**

```ts
test('check on a new game passes, with notes that it is still the starter', …)
test('check --ship on a new game fails, naming the name and each starter file', …)
test('rename it, redraw the level and the figures, change the words: --ship passes and prints the list', …)
test('a TODO in a message is a note in check and a problem in --ship', …)
test.each(/* every row above */)('%s', …)
test('--ship --only files is refused with its sentence', …)
test('--json carries ship findings and byHand', …)
test('the MCP check tool with ship: true gives the same report', …)
test('replay --accept writes meta.save for a game that exports gameSave, and nothing for one that does not', …)
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

The made game is served two ways: by its own `automata play`, and from its built folder (`npm run build`, then a
plain static server over `dist/` under a sub-path, as a host serves it). Every case below runs against the built
folder; the first three also run against `automata play`.

- [ ] **Step 1: Write the failing tests.**

```ts
test.each(ENGINES × SIZES)('%s at %s: a first visit to the door, and every button and the canvas are inside the viewport and the safe area', …)
test('Chromium with an Android phone\'s user agent and a mobile viewport: play to the door by touch', …)
test('lose and try again by touch, by keys and by gamepad', …)
test('50 restarts: no reload, one canvas, the entity count of the first start', …)
test('hide and show the page mid-level in three engines, and play on', …)
test('reload on every screen (picker, splash, menu, playing, paused, settings, lost, done): the visit goes on from the saved settings and games', …)
test('the address bar slides (the viewport\'s height changes by 80 px): everything still fits', …)
test('the network slowed to 50 kb/s: the bar, then the slow line, then the game', …)
test('one content file fails once: the game starts; fails always: the problem screen with its button', …)
test('every request of a whole visit is to the game\'s own origin', …)
test('no sound before the first tap; the level is won with the sound off', …)
test('storage full of garbage under the game\'s keys: the game opens and plays', …)
test('a swipe on the game at phone size does not move the page', …)
test('the game\'s own play test passes: npm run build && npm run play-test', …)     // Chromium and WebKit are installed in this job
test('automata check --ship on the untouched game fails with "still the starter"', …)
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
  message, How to play, Back and `back: false`, each with one example; a new section, "The checklist every game
  meets", lists the Must-have groups in the spec's words with, for each box, where it is held (a default, a check, or
  "yours": the `BY_HAND` line); "The automata command" documents `--ship`, the `page` part and `[network] allow`; a
  new game's README says what its `play` job does and how to change the two numbers. `public-surface.test.ts`: the
  browser entry has `lostScreen`, `howScreen`, `howRows`; the headless entry has `pagePolicy`, `scoreRef`,
  `fellEvent`, `usesFalls`, and none of the screens.
- [ ] **Step 2: Push; red. Step 3: write them** (developer text, in English, on purpose).
- [ ] **Step 4: Push; every check green.**
- [ ] **Step 5: Commit** `docs: the checklist every game meets, in the README, the skills and the tracker`.
  **Open pull request 5.** Tracker to 88%, then 100% on the last green run. Send the coordinator the summary and the
  handoffs below.

---

## Handoffs

- **Plan D (Examples).** When its framework pin moves past pull request 2, the demo gets Try again, Start again, How
  to play, the sound switch, Delete all my saves, Back and the loading bar with no change. It names its own `lost`
  (its co-op rule may raise its own event), `score` and `level.<id>.goal` in six languages, carries
  `policyMeta(project)` in its page and gains a `play` job like the template's. Its recordings move only if it names
  `lost = "hero.fell"`: that is a golden move there, named and shown.
- **The Site.** It frames the demo and owns its own history: when the demo moves to this flow it passes
  `back: false`, or Back in the Site would pause the framed game first. The framed game's policy is the game's own;
  the Site's header must allow the frame as it does today.
- **Editors.** Nothing they call changes shape. `automata.toml`'s three new fields load when their pin moves. Their
  Play stays `startGame`, which does not wait for a press unless asked.
- **Plan F (the feel runtime).** The start card and the score are in the HUD, over the mount: a shake must not move
  them. The template's `take` and `fall` feels are drawn once plan F draws feels; their buzz works now.
- **Plan N (online).** An online game lists its room server in `[network] allow`; `startOnlineGame` keeps its own
  page, and nothing here puts `lost` into a room.
- **Plan W's `automata words --compile`.** Step U was to wire it. Nothing in the checklist needs it, so this plan does
  not: it has no owner again, and the coordinator should give it one.
- **Release 4.** A publish step runs `automata check --ship`. `--ship` is ready for it; nothing here calls it.
- **Before Release 1:** every word of Task 5 and the template's goal line wait for a native speaker's read in five
  languages.
- **Left to the maker, and said so by `--ship`:** whether it is clear, fun, fair, original and finished to look at;
  real phones.

## Self-review

- **Spec coverage, Must have.** *It works:* iPhone, Android, computer (Task 21's sizes, engines and the Android run;
  the built folder); WebGL without WebGPU (Task 13); gamepad (Tasks 6, 7, 13, 21); Play again always works, no reload
  (Tasks 3, 6; 50 restarts in Tasks 6 and 21); never stuck (Start again and Menu on pause, Task 6; a level that cannot
  end, Task 19); switching apps (Tasks 13, 21); reloading (Task 21); no scrolling (Tasks 10, 21); fits the screen
  (Tasks 13, 21); no sound until a tap, playable with the sound off (Tasks 13, 21); slow or failed loading says so
  (Tasks 11, 21). *There's a game here:* clear in five seconds (the goal line, the hint and the waiting start, Task 7;
  the template's goal, Task 15); win or lose (Tasks 1 to 3, 6, 15; the note, Task 19); works it out alone (Task 7);
  enough to do (the best score, Task 8; the maker's, Task 20). *Its own thing:* still the starter, and the art (Task
  20). *Finished:* stand-in pictures and starter figures, test words, half-made menus (Tasks 19, 20); hidden spots and
  sloppy pictures (the list, Task 20). *Honest:* nothing pops up to cut in (the policy, Task 14; the `page` part, Task 18); "no ads" is left out, as the Owner said;
  the store-page boxes are left out, as the Owner said. *Safe:* passwords and details, money, tracking, other sites,
  background work (Tasks 14, 18; every request same-origin, Tasks 16, 21).
- **Spec coverage, Good to have.** Score and best (Tasks 1, 4, 8); double tap and long press (Task 10); address bar
  (Task 21); Back (Task 10); no slow-down over restarts (Tasks 6, 21); small files and tiny words (Task 20); mute
  (Tasks 4, 9); loud sounds and the music's seam (Task 12); loading progress and retry (Task 11); How to play, game
  over, Play again (Tasks 6, 7); broken saves (Tasks 9, 21); wipe and start fresh (Task 9); a new version keeps saves
  (Task 20); time to react (Task 7); buttons have names, words readable (Task 13); something happens on score, hit
  and loss (Task 15's feels and sounds); screens change smoothly (Task 12). Everything the spec marks "done" gains
  the test the spec asks for in Tasks 13 and 21.
- **Spec coverage, the rest.** The policy and `[network] allow`: Tasks 1, 14, 18. `--ship`: Task 20. Part A as plan
  K's Step U, with the one move of the recording shown to the Owner: Tasks 14 to 17. Q1's answer: Task 16, run in
  Task 21. New words in six languages: Task 5. Skills and `AGENTS.md` name the maker's boxes: Task 20.
- **Where this plan departs from the spec's letter,** for the audit to weigh: the best score is a settings section,
  not a field of the progress save (call 8); mute is a flag, not volume 0 (call 9); the goal is a message key by
  convention, not a field (call 5); there is no `<room>` in the policy because the project file names no room server
  (call 14); the problem screen's button keeps "Load the page again" (call 13); `hero.fell` is a plugin of its own,
  joined only when named, and not an event of plan H's hero in every game (call 2), which is what keeps every other
  recording still. Reduced motion for shake and freeze is plan F's and is not a task here.
- **Not covered, on purpose:** the demo (handoff); the editors; a publish step; anything about sending a game to a
  host; `automata words --compile` (handoff, with no owner).
- **End to end.** Every pull request has real-browser tests: pull request 1 the fall's parity in four engines; 2 every
  new screen at five sizes and whole visits by thumb, gamepad and keys; 3 the template's page under its real policy
  and the create journey on the flow; 4 `check --ship` through the packed package in `create-smoke`; 5 the made game
  in three engines, and the game's own play test in two.
- **Type consistency.** `FlowState.attempt`, `'lost'`, `'again'`, `'level-lost'` and `Over`'s `'how'` are Task 3's and
  are what Tasks 6, 7 and 10 read. `levelEnd` (Task 6) replaces `endsLevel`'s one use. `Records`, `withScore` and
  `heardVolumes` are Task 4's, used in Tasks 8 and 9. `scoreRef` (Task 1) is read by `Game.score()` (Task 8) and
  `endProblems` (Task 19). `pagePolicy`, `policyMeta` and `readPolicy` are Task 14's, used in Task 18.
  `ShipFinding` and `StepReport.ship` are Task 19's, used in Task 20. `PauseItem` and `MenuItem` each gain names in
  Tasks 6 and 7 and nowhere else.
- **Review Focus.** Each of the six lines names a test in a task that owns the code (Tasks 3, 6, 8, 9, 10, 11, 14).
- **Proportion.** The code blocks are signatures, tables of exact words and test names; no function body is written
  out.

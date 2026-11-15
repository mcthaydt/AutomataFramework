# Plan G: Live Move Numbers and the Jump's Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The editors' Feel can change a built-in hero's numbers while the level plays, and can draw what a jump
reaches, with the framework's own move step doing both.

**Architecture:** A tune is a command, like a key press: `startGame({ tunable: true })` adds one command and one
resource to the `moves` plugin, `game.tune(values)` sends the command, and the plugin reads the tuned numbers in place
of the file's from that tick on. So a tuned play is still recorded, saved, restored and replayed like any other, and
a game that does not ask for it keeps exactly the sim it had. The jump's path is one pure function over `stepMoves`
on flat ground, held to the real sim by a parity test.

**Tech Stack:** as plan H (TypeScript strict, Zod, Rapier's deterministic 2D build, Vitest in Node and three
browsers). **No new dependency.**

**Spec:** the Feel editor's spec in AutomataFrameworkEditors,
[`docs/superpowers/specs/2026-11-15-feel-editor-design.md`](https://github.com/mcthaydt/AutomataFrameworkEditors/blob/main/docs/superpowers/specs/2026-11-15-feel-editor-design.md),
"What Feel needs from the framework": F1 (numbers changed while playing), F2 (the jump's path), F3 (the numbers'
table). F4 (an effect fired on demand) is plan F's and is not here. Principles served: 1 (a number an agent types and
a number a person slides reach the hero the same way) and 2 (tuning by thumb, while playing, on an iPad). The editors'
own plan is `docs/superpowers/plans/2026-11-15-feel-editor.md` in that repo.

## Global Constraints

Plan H's "Global Constraints" hold here word for word (sim math, y points down, a tick is 1/60 of a second, no file
over 600 lines, `sim/create-sim.ts` gains nothing, tests only in GitHub-hosted CI and written first, generated files
taken from the `package` job's log, the commit identity, no AI attribution, never force-push, an Owner question is
never defaulted). Added by this plan:

- **Starts only when plan H is merged.** Every name below is plan H's as built on its branch (pull request 101). The
  first step of Task 1 checks them on `main`; a name that differs is used as `main` has it and reported.
- **No golden moves, and none is added.** `tests/golden/moves.json`, `template/replays/level-1.json` and every other
  golden keep their hashes: nothing here joins a sim that did not ask for it. If one differs in CI, stop and report.
- **Offline only.** `startOnlineGame` never makes a tunable sim.
- **One pull request,** four tasks, 22% each; the last 12% is the final green run. Tracker: `docs/superpowers/progress.md`,
  a new "Cycle 11: live move numbers and the jump's path" (the merge session numbers cycles in merge order).
- **A `patch` changeset** and the API report (`docs/api/framework.api.md`, from the `package` job's log), as every
  change to the public surface has.

## The builder's calls

1. **A tune is a command, not a setter on the plugin.** A setter would be a number the sim reads that no recording
   holds, so `game.replay()` after a tune would not verify and a restore would forget it. As a command it is input
   like any other. Plan H's handoff said "there is no changing a number inside a running game"; the Feel spec's F1
   asks for it, and this is how it is done without breaking that plan's rules.
2. **The tuned numbers live in a resource** (`level.tuned`, `{ values: number[] }`, empty until the first tune), so
   they are in every snapshot and in the schema hash of a tunable sim only.
3. **The command carries all eighteen,** in `MOVE_NUMBERS` order, already held inside the framework's limits by the
   caller's side (`moveNumbersOf`) and held again by the plugin, so a hand-made command cannot step outside them.
   Its `source` is 0: it is nobody's hero.
4. **A tune changes every hero in the sim.** Only the project's hero has `moves`, so there is one set of numbers.
5. **The jump's path is worked out with no physics:** `stepMoves` once a tick, then one tick of gravity on the
   speed, then the speed on the place, which is what Rapier does to a body in the air. On the ground the foot stays
   on the floor. The parity test of Task 2 holds it to the real sim within 0.05 tiles; if it cannot be made to
   agree, stop and report (the fallback, a real sim on a flat level made in memory, is a different shape of call and
   is the plan audit's or the coordinator's to choose).
6. **Reach is measured for a hero that does everything right:** a jump from a full-speed run with jump held; each air
   jump pressed on the first tick the hero stops rising; a dash from standing on the ground.

## Review Focus

1. **A tune on the very tick a jump is pressed:** the jump leaves at the new `jump-speed`, once. Task 3,
   `tune.test.ts`.
2. **A value that is not a number at all** (`NaN`, `Infinity`, a missing id): the framework's value stands, nothing
   throws, and the sim never holds a non-finite number. Task 1, `moves.test.ts`; Task 3, `tune.test.ts`.
3. **Two tunes inside one frame:** the later one wins and one command is sent. Task 4, `game.browser.test.ts`.
4. **`tune` on a game that did not ask for it, or after `stop`:** a sentence that says what to pass; after `stop`,
   nothing happens and nothing throws. Task 4.
5. **Numbers at their limits** (`jump-speed` 30 with three air jumps, `fall-speed` 5): the path still ends, in
   under 1200 ticks, back on the floor. Task 2, `jump-path.test.ts`.

## File Structure

```
src/features/content/moves.ts      + moveNumbersOf
src/features/level/jump-path.ts    NEW jumpPaths: pure, over stepMoves
src/features/level/tune.ts         NEW TuneCommand, Tuned, tuneCommand, tunedNumbers, the `level.tune` system
src/features/level/moves.ts        movesPlugin({ gravity, tunable }); the system reads tunedNumbers first
src/features/level/game-sim.ts     GameSimOptions.tunable
src/features/level/level.ts, src/headless.ts   exports
src/features/game/game.ts          GameOptions.tunable, Game.tune
src/features/game/online.ts        never tunable
README.md, skills/                 one paragraph: what `tunable` is for and that a game never needs it
tests/features/content/moves.test.ts, tests/features/level/{jump-path,tune}.test.ts,
tests/features/level/jump-path.parity.test.ts, tests/features/game/game.browser.test.ts,
tests/public-surface.test.ts (or the test that holds the headless entry's names, as `main` has it)
```

---

### Task 1: The numbers from plain values, and the names Feel reads (F3)

**Golden impact:** none.

**Files:**
- Modify: `src/features/content/moves.ts`, `src/features/content/content.ts`, `src/features/level/level.ts`
- Test: `tests/features/content/moves.test.ts`, the headless entry's names test

**Interfaces:**
- Produces:

```ts
/**
 * The eighteen from plain values by id (a tuning file's `numbers` as `tuningNumbers` gives them, or a slider's), held
 * as `moveNumbers` holds a file's: inside the framework's limits, whole where counted. An id left out, or a value
 * that is not a finite number, is the framework's value. Ids it does not know are ignored. Frozen.
 */
export function moveNumbersOf(values: Readonly<Record<string, number>>): MoveNumbers
```

- The headless entry exports, by these names: `MOVE_NUMBERS`, `MoveNumberInfo`, `MoveNumbers`, `moveNumbers`,
  `moveNumbersOf`, `DEFAULT_HERO_CONTROLS`, `tuningNumbers`, `usesMoves`, `stepMoves`, `MOVE_START`,
  `MoveState`, `MoveInput`, `MoveSwitches`, `MoveEventName`, `MOVE_EVENTS`, `Moves`, `Touching`, `RESERVED_KEYS`,
  `RESERVED_PAD`, `PAD_BUTTONS`, `PAD_STICKS`, `MAX_ACTIONS`. (`heroControls` is not one: it is the `input` feature's,
  which needs a page, and Feel builds its list from `DEFAULT_HERO_CONTROLS`. Plan audit I3.)

- [ ] **Step 1: Check plan H's names on `main`.** `git grep -n "export" src/features/content/moves.ts
  src/features/level/move-step.ts src/features/level/moves.ts`. Note any that differs from this plan in the tracker
  and use `main`'s.
- [ ] **Step 2: Write the failing tests.**

```ts
// moves.test.ts
test('moveNumbersOf with nothing gives every framework value', ...)
test('moveNumbersOf takes a value by its id', ...)                 // { 'jump-speed': 15 } -> jumpSpeed 15, walkSpeed 6
test('moveNumbersOf holds a value at the limit', ...)              // 99 -> 30, 1 -> 4
test('moveNumbersOf floors a counted number', ...)                 // { 'dash-ticks': 10.5 } -> 10
test('moveNumbersOf gives the framework value for NaN and Infinity, and ignores an id it does not know', ...)
test('moveNumbersOf of tuningNumbers(file) equals moveNumbers(file), for the moves fixture', ...)
// the names test
test('the headless entry has every name Feel reads', ...)          // the list above, each `toBeDefined()` or a type import
```

- [ ] **Step 3: Push; red.**
- [ ] **Step 4: Write `moveNumbersOf`** beside `moveNumbers`, sharing `held`; `moveNumbers` may call it. Export what
  the names test misses from `level.ts` (`stepMoves`, `MOVE_START` and the step's types are the likely ones).
- [ ] **Step 5: Push; green. Commit** `feat: the hero's numbers from plain values, and the names an editor reads`

### Task 2: The jump's path (F2)

**Golden impact:** none.

**Files:**
- Create: `src/features/level/jump-path.ts`, `tests/features/level/jump-path.test.ts`,
  `tests/features/level/jump-path.parity.test.ts`
- Modify: `src/features/level/level.ts`

**Interfaces:**
- Consumes: `stepMoves`, `MOVE_START`, `MoveSwitches` (plan H Task 5), `MoveNumbers`.
- Produces, exported from `level.ts` and so from the headless entry:

```ts
/** A place on a path, in tiles from the hero's feet where it began. x is along the way it faces; y points down. */
export interface PathPoint { readonly x: number; readonly y: number }
export interface JumpPaths {
  /** A held jump from a full-speed run on flat ground: a point a tick, from the press to the landing. */
  readonly jump: { readonly points: readonly PathPoint[]; readonly up: number; readonly across: number }
  /** The same jump with every air jump the hero has, each pressed as it stops rising. Only with `doubleJump`. */
  readonly airJump?: {
    readonly points: readonly PathPoint[]; readonly up: number; readonly across: number
    /** How much higher one air jump takes it than the jump alone. */
    readonly rise: number
  }
  /** How high a wall jump takes it from where it left the wall. Only with `wallJump`. */
  readonly wallJump?: { readonly up: number }
  /** How far one dash goes along the ground from standing. Only with `dash`. */
  readonly dash?: { readonly across: number }
}
/** The default pull of `createGameSim`, tiles a second each second. */
export const DEFAULT_GRAVITY = 30
/** What the hero's moves reach, by the framework's own move step. `up` and `across` are tiles, never negative. */
export function jumpPaths(numbers: MoveNumbers, on: MoveSwitches, gravity?: number): JumpPaths
```

**How one path is run** (builder's calls 5 and 6): the state starts as `MOVE_START` standing (`stood` true,
`grace` at `ledgeGrace`); for the jump, also `run` at `walkSpeed` and `walking` true, with `dir` 1. Each tick:
`stepMoves` with `below` true while the feet are on the floor, `vx` and `vy` as the last tick left them, `hover` as
`-gravity / 60`; then `vy += gravity / 60`, `y += vy / 60`, `x += vx / 60`; a foot at or under the floor (within
`TOUCH_SLOP`) is on it, with `y` 0 and `vy` 0. The jump: `jumpPressed` on tick 0, `jumpHeld` throughout, until the
tick after it lands. The air jump: the same, with `jumpPressed` again on the first tick whose `vy` is not negative,
once for each of `airJumps`. The wall jump: begun in the air beside a wall (`below` false, `wall` 1), `jumpPressed`
on tick 0, held, until it stops rising. The dash: standing, `dashPressed` on tick 0, `dir` 0, until `state.dash` is
0. No path runs past 1200 ticks. `createGameSim` reads `DEFAULT_GRAVITY` for its own default.

- [ ] **Step 1: Write the failing tests** in `jump-path.test.ts` (Node, no sim):

```ts
test('the framework numbers: a jump reaches 2.3 tiles up and lands 4.7 across', ...)   // toBeCloseTo(…, 3)
test('the path starts at the feet, never goes under the floor, and ends on it', ...)   // first {0,0}; every y <= 0; last y is 0
test('one point a tick: 48 points for the framework numbers', ...)
test('more jump-speed reaches higher and farther; more walk-speed reaches no higher and farther', ...)
test('jump-cut does not change a held jump', ...)
test('with doubleJump off there is no airJump; with it on, the air jump reaches higher than the jump, by `rise`', ...)
test('air-jumps 3 reaches higher than air-jumps 1', ...)
test('a dash goes 3 tiles for the framework numbers, and dash-ticks 20 goes 6', ...)
test('with dash off there is no dash; with wallJump on, the wall jump goes up, and more wall-jump-up goes higher', ...)
test('half the gravity reaches about twice as high', ...)
test('every number at each of its two limits gives a path that ends inside 1200 ticks', ...)   // a table over MOVE_NUMBERS, all switches on
test('the answer is frozen, and the same call gives equal numbers', ...)
```

- [ ] **Step 2: Write the failing parity test** in `jump-path.parity.test.ts` (Node and three browsers, real
  physics, on a level made in the test: a flat floor 48 tiles long, walls at both ends, the hero's start at x 3 and
  nothing else. The moves fixture's `level-2` is 16 tiles wide, too short for `walk-speed` 10 with `jump-speed` 20,
  which lands about 13 tiles on. Plan audit I5):

```ts
test('the real hero, run to full speed and jumped with jump held, tops out and lands where jumpPaths says', ...)
// highest feet and landing x, each within 0.05 tiles of `jump.up` and `jump.across`
test('the same with an air jump pressed as it stops rising', ...)   // within 0.05 of `airJump.up`
test('a real dash from standing ends within 0.05 tiles of `dash.across`', ...)
test('with jump-speed 20 and walk-speed 10 in the tuning file, both still agree', ...)
```

- [ ] **Step 3: Push; red.** **Step 4: Write `jumpPaths`.** **Step 5: Push; green in four engines.** If the parity
  test cannot be made green within 0.05 tiles, stop and report with the numbers it gave (builder's call 5). The
  unit test's numbers (2.3, 4.7, 48 points, 3 and 6 tiles) are the plan's sums, not measurements: when the parity
  test is green and a unit number differs from it in the second decimal, the unit test takes the parity test's
  number and the report says so; that is not a stop (plan audit I6). The likeliest gap is the dash, which on the
  real floor meets ground friction the path does not have (plan audit I7).
- [ ] **Step 6: Commit** `feat: what a hero's jump reaches, by its own move step`

### Task 3: A tune is a command (F1, the sim's half)

**Golden impact:** none. The command, the resource and the system join a sim only when it is made with `tunable`.

**Files:**
- Create: `src/features/level/tune.ts`, `tests/features/level/tune.test.ts`
- Modify: `src/features/level/moves.ts`, `src/features/level/game-sim.ts`, `src/features/level/level.ts`

**Interfaces:**
- Consumes: `moveNumbersOf` (Task 1), `MOVE_NUMBERS`, `movesPlugin` (plan H).
- Produces:

```ts
// tune.ts
/** The hero's eighteen numbers from this tick on: `values` in `MOVE_NUMBERS` order. Only a tunable sim knows it. */
export const TuneCommand: CommandDef<...>      // 'tune', strict payload { values: number[] } of exactly eighteen finite numbers
/** The numbers the last tune gave, or none yet. In every snapshot of a tunable sim. */
export const Tuned: ResourceDef<...>           // 'level.tuned', { values: number[] }, starting empty
/** The command that tunes at `tick`. Its source is 0: nobody's hero. */
export function tuneCommand(tick: number, seq: number, numbers: MoveNumbers): Command
/** The tuned numbers, held inside the framework's limits, or `undefined` before the first tune. */
export function tunedNumbers(ctx: SimContext): MoveNumbers | undefined
// moves.ts
export function movesPlugin(options: {
  readonly gravity: { readonly x: number; readonly y: number }
  /** Adds the tune command and its resource. Left out, the plugin is exactly as it was. */
  readonly tunable?: boolean
}): PluginDef
// game-sim.ts
export interface GameSimOptions { /* as today, plus */ readonly tunable?: boolean }
```

With `tunable`: the plugin's config is `{ tunable: true }` (as `physics` writes `touching`), its commands are
`[TuneCommand]`, its resources `[Tuned]`, and it gains a system `level.tune` in the `input` phase that writes the
last `TuneCommand` of the tick (highest `seq`) into `Tuned`. The `level.moves` system takes
`tunedNumbers(ctx) ?? moveNumbers(file)`. `tunedNumbers` keeps its answer by the resource's array, as `moveNumbers`
keeps a file's, so a tick allocates nothing. `createGameSim` passes `tunable` on only when the game `usesMoves`; with
`tunable` and a hero without `moves` it throws `'Only a game whose hero has "moves" can be tuned while it plays.'`

- [ ] **Step 1: Write the failing tests** in `tune.test.ts` (Node, real physics, `loadMovesGame`, two sims fed the
  same script side by side where it says "as"):

```ts
test('a tune at tick 30 to jump-speed 20: the next jump tops out higher than in the sim that was not tuned', ...)
test('a tune resets nothing: on the tick it lands, the hero\'s Transform, Body and Moves and the crate\'s Transform are as in the sim that was not tuned', ...)
test('a tune on the tick jump is pressed: the hero leaves at the new speed, and jumped is said once', ...)   // Review Focus 1
test('before any tune the numbers are the file\'s: the tunable sim plays the moves script to the same places as the plain one', ...)
test('two tunes in one tick: the later one stands', ...)
test('a hand-made command with jump-speed 99 plays as 30; one with seventeen values, or a NaN, is refused by the sim', ...)   // Review Focus 2
test('saved after a tune and restored into a new tunable sim, the play ends on the same hash', ...)
test('a recording with a tune in it verifies', ...)                                    // createRecorder, then the replay check plan H's parity test uses
test('a sim made without tunable refuses the command as unknown-command, and its schemaHash differs from the tunable sim\'s', ...)
// tests/golden/moves.json holds no schema hash; that the plain sim is unchanged is moves.parity.test.ts, untouched and green (plan audit I2)
test('tunable with a hero that has no moves throws the sentence', ...)
```

- [ ] **Step 2: Push; red.** **Step 3: Build it.** **Step 4: Export** `TuneCommand`, `Tuned`, `tuneCommand` and
  `tunedNumbers` from `level.ts`. Push; green, every golden unmoved (no golden file is in the diff).
- [ ] **Step 5: Commit** `feat: a hero's numbers can change while it plays, as a command`

### Task 4: `game.tune`, the docs and the last run (F1, the page's half)

**Golden impact:** none.

**Files:**
- Modify: `src/features/game/game.ts`, `src/features/game/online.ts`, `src/features/game/watch.ts`,
  `src/features/cli/replay.ts`, `README.md`, the skill under `skills/` that
  tells an agent how to tune the hero, `docs/api/framework.api.md` (from the log), a changeset,
  `docs/superpowers/progress.md`
- Test: `tests/features/game/game.browser.test.ts`, `tests/docs/readme.test.ts`, the `automata replay` test under
  `tests/features/cli/` (a recording with a `tune` and `meta.tunable` verifies)

**Interfaces:**
- Consumes: Task 3's `tuneCommand`, `GameSimOptions.tunable`; Task 1's `moveNumbersOf`.
- Produces:

```ts
export interface GameOptions { /* as today; `tunable` comes with GameSimOptions */ }
export interface Game {
  /* as today, plus */
  /**
   * For an editor: the hero's built-in numbers by id (`{ 'jump-speed': 13 }`), from the next tick, with nothing
   * else reset. A number left out is the framework's value, so pass them all. Only in a game started with
   * `tunable: true`; a game itself never needs it, because its numbers are its tuning file.
   */
  tune(values: Readonly<Record<string, number>>): void
}
```

`tune` keeps the latest values and the loop's next step sends one `tuneCommand` with them, numbered by the game's
own sequence, before the players' commands. In a game not started with `tunable` it throws
`'This game was not started with "tunable": true, so its numbers cannot change while it plays.'` After `stop` it
does nothing. While the game is paused the tune waits and lands on the first tick after `resume`.
`startOnlineGame` passes no `tunable` to any sim it makes, whatever it is given; `OnlineOptions` is
`Omit<GameOptions, 'players' | 'level'>` today, so it becomes `Omit<GameOptions, 'players' | 'level' | 'tunable'>`.

**A tuned play replays outside the test too** (plan audit I1). `automata replay` (`src/features/cli/replay.ts`) and
`watchReplay` make their sim from the content and the replay's `meta`, with no `tunable`, so a recording holding a
`tune` would read as "the rules changed" and drop the command. So `startGame` writes `meta.tunable = "true"` into the
recording when it was started with `tunable`, and `cli/replay.ts` and `watch.ts` pass `tunable: meta.tunable ===
"true"` to `createGameSim`. A replay without that key plays exactly as before, so no golden moves.

A freeze from plan F holds the loop's steps as a pause does; a tune made during one lands on the first step after it,
like a tune made while paused. Plan F and this plan both change the loop's `step` in `game.ts`; the one built second
is rebased on the first (plan audit I9).

- [ ] **Step 1: Write the failing tests** in `game.browser.test.ts` (three engines, the moves fixture):

```ts
test('started with tunable, tune({ jump-speed: 20 }) makes the next jump\'s top higher than the one before it', ...)   // heroes() after each draw
test('tune keeps the hero where it is: its box is the same on the frame after the tune', ...)
test('two tunes before one frame send one command, with the later values', ...)                // Review Focus 3: game.replay() holds one `tune`
test('tune while paused lands after resume', ...)
test('tune on a game not started with tunable throws the sentence; tune after stop does nothing', ...)   // Review Focus 4
test('game.replay() of a tuned play verifies, and its meta says tunable', ...)
test('a game not started with tunable writes no tunable key into its replay', ...)
```

and in `readme.test.ts`: the README names `tunable` once, in the paragraph that says what the editors use it for.

- [ ] **Step 2: Push; red.** **Step 3: Build it; write the README paragraph and the skill's line** ("An editor may
  change these numbers while the game plays; a game changes them in its tuning file."). The README paragraph also
  says that the editors play with the framework's gravity, so a game whose code passes its own `gravity` sees its
  jump drawn for the default (plan audit I10).
- [ ] **Step 4: Push.** Take `docs/api/framework.api.md` from the `package` job's log, add the changeset, push again;
  every check green.
- [ ] **Step 5: Commit** `feat: an editor can tune a playing game`, the tracker at 100% of stage 4, and report: each
  task's commit and test count, any name of plan H's that differed, and the merge commit for the editors' pin.

## Handoffs

- **AutomataFrameworkEditors, the Feel plan's Task 1:** the pin moves to this plan's merge commit. Feel reads
  `jumpPaths(moveNumbers(file), switches)` for the note and calls `game.tune(tuningNumbers(file))` from its Play.
- **Plan F (the feel runtime):** F4, an effect fired on demand in a running game, is that plan's. A game started
  with `tunable` is the editors' play, so that is the game it will be fired in.
- **Plan U (screens)** and **plan D (the demo):** nothing changes for either. Neither passes `tunable`.

## Self-review

- **Spec coverage.** F1: Tasks 3 and 4 ("from the next tick, offline only, without resetting anything. A game never
  calls it. No golden moves"). F2: Task 2 ("uses `stepMoves`, never its own maths": the only maths beside it is one
  tick of gravity, held to the real sim by the parity test; units are tiles; reach up and across, with an air jump,
  a dash's length). F3: Task 1.
- **Where this plan differs from the spec, and why.** F2 also gives a wall jump's height and an air jump's `rise`,
  which the Feel spec's slider table shows beside those numbers ("with its height"). F1 is a command and a resource
  (builder's call 1), which is more than "a call", so that a tuned play still replays.
- **Types.** `moveNumbersOf` (Task 1) is used by Tasks 3 and 4; `tuneCommand` takes `MoveNumbers`; `Game.tune` takes
  ids and values and turns them with `moveNumbersOf`.

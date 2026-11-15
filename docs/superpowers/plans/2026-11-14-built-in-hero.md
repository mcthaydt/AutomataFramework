# Plan H: The Built-in Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A game whose hero's character file has `moves` is played by the framework with no game code: walk, a fair
jump, and (each switched on in the file) double jump, wall jump and dash, every number in a tuning file, the controls
from that file, and a two-thumb touch scheme made for a phone, so the editors' Play can run a real hero from content
alone.

**Architecture:** `content` learns `moves` on a character, the eighteen numbers and their limits, and `buzz` in a feel
file. `physics` gains a switched-on `Touching` component, filled after every step with what a body stands on and
leans against. `level` gains a `moves` plugin, added by `createGameSim` only when the project's hero has `moves`: one
pure step function decides the speed from what the player holds, and one system applies it. `input` gains the thumb
scheme (pure gesture rules, then the page part) beside today's buttons, and the controls read from the tuning file.
`host` gains `buzz`. `game` wires all of it, so `startGame` needs neither `controls` nor `plugins`. The template moves
to it and drops its own movement code.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.6.6, Rapier's deterministic 2D build 0.21.0, Koota 0.6.6, PixiJS
8.22.0, Vitest 5.0.3 (browser mode and journeys on Playwright 1.63.0), Biome 2.5.15, knip 6.39.0, pnpm 10.34.6, Node
24.21.0. **No new dependency.**

**Spec:** [`docs/superpowers/specs/2026-11-14-content-hero-controls-design.md`](../specs/2026-11-14-content-hero-controls-design.md),
an addendum to [`2026-11-14-m2-design.md`](../specs/2026-11-14-m2-design.md). Read the spec first; this plan argues
from it and does not repeat its reasons. Principles served: 1 (movement is two documented JSON files), 2 (the editors'
Play runs on an iPad from content alone), and the onboarding rule (thumbs are shown where to go).

## Global Constraints

- **Mobile first, then gamepad, then keyboard and mouse** (the Owner, 2026-11-14). Every task that touches controls
  designs and tests the thumbs first. No move works on one device only.
- **No framework golden moves.** Everything in `tests/golden/` that exists today, `schema-hash.json` included, keeps
  its hashes: none of those games has `moves`. If one differs in CI, stop that task and report it. Never re-record.
- **One golden moves, once, in Task 15:** `template/replays/level-1.json`. The commit names it, the pull request shows
  the hash before and after and says what the recorded play does, and the pull request is not merged until the Owner
  has seen it. Examples' two goldens are plan D's.
- **One new golden:** `tests/golden/moves.json` (Task 8), committed with `"finalHash": ""` and recorded from CI.
- **No new dependency.** If a task seems to need a package, stop and report.
- **Sim math:** the `level` and `physics` code added here uses `+ - * /`, comparisons, `Math.min`, `Math.max`,
  `Math.abs` and `Math.floor` only, and `sim/dmath.ts` for anything else. No `Math.sign`, `Math.hypot`, `Math.round`
  on sim state, no clock, no `Math.random`.
- **y points down.** Up is a negative speed. A tick is 1/60 of a second.
- **Touch sizes:** a round button is at least 64 CSS pixels; nothing a thumb must hit is smaller. Words are never
  under 18 pixels.
- **Touch is read on `pointerdown` and `pointermove`,** never on `click` or `pointerup`.
- **No file over 600 lines.** `input/input.ts` is at 390 and `sim/create-sim.ts` at 587: add nothing to
  `create-sim.ts`.
- **Tests run only in GitHub-hosted CI.** Run nothing locally: no `pnpm install`, typecheck, lint or test. Push, then
  read the pull request's CI run. Write each test first and push it red before its code, as earlier plans did.
- **Generated files.** `schemas/*.json` and `docs/api/framework.api.md` are committed. When the `package` job fails
  on `pnpm schemas --check` or `pnpm api-report`, take the new text from that job's log and commit it.
- **Commits:** author and committer `McThayDT <107786093+mcthaydt@users.noreply.github.com>`; set the config before
  every commit; no AI attribution anywhere; never force-push.
- **An Owner question is never defaulted.** Send it to the coordinator with options and a recommendation, and wait.
- **Tracker:** after each task, update `docs/superpowers/progress.md` (Cycle 6). Tasks 1 to 15 are 6% each; the last
  10% is the final green run with every check passing.

## Before starting

- **Plan W (no default language)** is planned and may be built first. If `startGame` already requires `locale` and
  `src/` has no English fallback when this starts, follow that: nothing here adds one. This plan is written so it
  fits either way: the thumb scheme with no `words` shows its pictures and no sentence, and names its two halves with
  the labels the game's own tuning file gives.
- **There is no feel runtime.** Feel files (dust, shake, freeze) are read and checked, and nothing draws them yet; no
  plan owns that. This plan adds `buzz` to the file and builds only the small part that buzzes
  (`src/features/game/buzz.ts`). When the feel runtime is planned it takes that file in.
- **Plan T (story) is not built.** Its plan reads `on-ground` from how the body moved. The spec asks for one shared
  answer: plan T's execution reads `Touching.below` (Task 4) instead. See Handoffs.

## The builder's calls

The spec leaves these to the builder, or is silent. They are settled here so the executor makes none of them.

1. **Ground and walls are read from Rapier's contact normals,** not from a cast, into a `Touching` component the
   physics plugin fills after each step (Task 4). It is what the solver itself used, it works on a seesaw and a
   swinging platform, and being a component it is in the snapshot, so a restore, a rollback and a replay need no
   query at all. If the two seam tests of Task 4 cannot be made green with normals, the fallback is three short casts
   of the body's own shape (0.05 tiles down, left and right) behind the same component, and the executor reports
   that it took it.
2. **A wall is something that does not move:** a tile, or a thing with a fixed body. A crate is never a wall, so a
   hero can push it. Ground is anything solid, a crate included.
3. **The hero does not push into a wall.** Walking toward a felt wall sets the sideways speed to nothing, so friction
   never holds a hero to a wall in the air (a fault today's hero has).
4. **A wall jump needs only the wall,** not the stick held toward it. The slide needs the hold; the jump does not,
   because "against a wall it is the wall jump" must be true for a thumb that is not walking.
5. **During the wall-jump lock the sideways speed is left alone,** whatever is held.
6. **A dash holds its height** by setting the upward speed to minus one tick of gravity, which the step's gravity
   brings to nothing. A dash into a wall ends there. Jump pressed during a dash is remembered (`early-press`) and
   nothing else acts until the dash ends.
7. **The cut applies to every jump** (ground, air, wall): letting go while rising keeps `jump-cut` of the speed.
8. **Only the project's hero may have `moves`.** A `moves` on another character is refused in words.
9. **A tuning file with no `controls` list gets the framework's controls** (as a number left out gets the
   framework's value). A list that is there and lacks `left`, `right`, `jump` or (with dash on) `dash` is refused.
10. **The template's tuning file lists the eight numbers walk and jump use,** not all eighteen. The spec says "every
    number above"; ten of them do nothing in a game that has those moves off, and a first game should hold nothing
    that does nothing. The demo's file (plan D) lists all eighteen.
11. **The template's level has no door,** so the `create-play` journey plays "from the start to the spark", and the
    spark's count is the sign that it got there.
12. **A gamepad button is named by where it sits** ("the bottom button", "the left button", "the right trigger",
    "the stick"), not by a letter. A browser cannot tell an Xbox pad from a PlayStation one, and "Press A" is wrong
    on half of them.
13. **The thumb numbers,** in CSS pixels and milliseconds, are named constants in `thumb-rules.ts`: dead zone 12; the
    ring follows a thumb further than 56 from its middle; a flick is 56 sideways within 110 ms, at least twice as far
    sideways as up or down, one dash per flick. Hints fade after three uses and come back after 20 seconds with no
    touch. These are a start: nothing in CI can feel a phone, so the Owner's review on a real phone is where they
    move.
14. **Upright and narrow gets the band; everything else is played under the thumbs.** The two halves are a band
    under the level when the mount is taller than wide and under 600 pixels wide; the band is 32% of the height,
    between 180 and 260 pixels. Otherwise the halves cover the game and take no room.
15. **A thumb that lands and lifts between two ticks still jumps.** The scheme remembers a press until the next tick
    has read it.
16. **One finger owns a half.** A second finger in the same half does nothing until the first lifts. A walking thumb
    that slides into the other half is still walking.
17. **Hint counts are kept for the page's life only.** Saving them is plan U's, with the rest of the settings.
18. **A buzz is for the player who is touching the screen:** only when that event's player last used touch (an event
    with no player counts as player 1's). A watched replay never buzzes. The web host cannot set a strength, so it
    buzzes for the feel file's time and skips a strength of 0.
19. **No snapshot version step.** The move state is a component, and a component is part of the schema hash already.
20. **Feel files stay in what the sim is given,** as they are today, so a changed buzz is "the content changed" to a
    replay.

## Notes from the build and its audit

Added after PR 101 merged, from [the implementation audit](../audits/2026-11-15-built-in-hero-implementation-audit.md)
(PR 126). These are where the build went beyond or beside the plan; each is sound, and each is written here so the next
reader does not undo it.

- **A hero rising from a jump is never "below" (audit M2).** Task 5, step 1 of a tick. Rapier fills its contacts before it
  integrates, so on the tick after a jump the feet still touch the floor. Without the rule in `move-step.ts` ("moving
  up is not standing") the jump would land at once and could not be cut. Do not take it out.
- **The walk stops at a wall by the sign of `run`, not of `dir` (audit M3).** Builder's call 3. A hero gliding toward a
  wall with nothing held also stops at it, which is what "never push into a wall" means for a body in motion.
- **A tick with a press does not start a wall slide (audit M3).** Builder's call 4. It wall jumps, so a press and a
  slide never fight over the same tick.
- **The web buzz is shorter than call 18 says (audit M7).** `web.ts` scales the time by the strength instead of buzzing
  for the feel file's full time and skipping a strength of 0, so the template's landing (strength 0.3, three ticks) is
  a 15 ms buzz, which many Android phones do not make felt. Left as built until the Owner has tried it on an Android
  phone (the audit's P2); the numbers or the rule move then, with the template's feel file.
- **The walk test's tolerance is 4%, not 2% (audit M8).** `tests/features/level/moves.test.ts`. Friction on the ground
  eats more of the first tick from rest than the plan expected (`walk-grip` 3 accounts for it). If it is ever tightened,
  start by measuring where the extra 2% goes.
- **The fix stage (this PR)** closed the audit's five important findings (I1 to I5) and two minors: the dash hint has its own
  room (the walk hint's picture and words hide when only the dash is due), the template's key hint names the dash when
  the hero has it, the `create-play` journey walks to the spark and jumps in all three ways (key or thumb, stick, and
  the pad's bottom button) and reads the game's count, a finger on the glass is never "left alone" for the hints, a
  press not yet read does not outlive a mask, and a turned tablet lets go of a held thumb. It is left to a later cycle:
  M1 (`lockDir`, kept for the hash and for a later move), M4 (kinematic bodies as walls, to decide when moving
  platforms arrive), M9, M10, M11 and the Owner's two phone items P1 and P2.
- **The hints' words stand on a dark chip, and a tall screen keeps room for the hints (the Owner's choice, 2026-11-15).**
  The words of the walk, jump and dash hints have the buttons' dark background behind them at full strength; only the
  dashed circle is faint. On a screen at least 600 px tall (a tablet, a desktop window) the room under the game is 230 px,
  so the circles and their words end under the floor instead of across its edge; a shorter one keeps 120.
- **The turned-screen test waits for the resize itself (audit I5).** It failed once in Chromium on a busy runner because
  it waited a fixed second for the `ResizeObserver`; the thumbs tests now resolve from an observer of their own, made
  after the thumbs', and the hint tests drive the hints' interval by hand. No test in that file waits for a length of
  time any more.
- **A turn is told by the width.** The mount's width moving by more than 24 px, or the mount going from wide to tall or
  back, lets go of every finger; a browser bar sliding in and out moves only the height and does not.

## Review Focus

Each line names its test and the task that owns it.

1. **A thumb lands and lifts inside one slow frame:** the hero still jumps, once, a short jump. Task 12,
   `thumbs.browser.test.ts`.
2. **A second finger in a half, and a walking thumb that crosses the middle:** the second finger does nothing; the
   crossing thumb keeps walking and never jumps. Task 11, `thumb-rules.test.ts`.
3. **The phone is turned while a thumb is down:** everything is let go, the hero stops, and the halves are redrawn
   for the new shape. Task 12, `thumbs.browser.test.ts`.
4. **A number in the file outside the framework's limits, or a fraction where ticks are counted:** `loadGame` (and so
   `automata check`) refuses the file and says which number and what to write; content that never went through
   `loadGame` (an editor's draft, a test's game in memory) still plays inside the limits. Task 2, `moves.test.ts`
   (audit I2).
5. **Saved keys from before the game had `dash`, one of them now `dash`'s own key:** that one saved binding is
   dropped, the rest are kept, nothing throws. Task 9, `hero-controls.test.ts`.

## File Structure

```
src/features/content/character.ts       moves, its checks, three more clip names in the words
src/features/content/moves.ts           NEW MOVE_NUMBERS, moveNumbers, DEFAULT_HERO_CONTROLS, the tuning's hero checks
src/features/content/tuning.ts          tuningInfo.check calls moves.ts
src/features/content/feel.ts            buzz
src/features/physics/components.ts      Touching
src/features/physics/touching.ts        NEW the rule that turns contact normals into below, left, right
src/features/physics/{physics,physics-world,rapier}.ts   physics({ touching }), filled in sync-out
src/features/level/move-step.ts         NEW stepMoves: pure, the whole of how a hero moves
src/features/level/moves.ts             NEW Moves, moveEvent, movesPlugin, the system
src/features/level/{uses,hero,game-sim,clip,sprite,level}.ts   usesMoves, the hero's parts, the plugin, the clips
src/features/input/hero-controls.ts     NEW heroControls(content)
src/features/input/thumb-rules.ts       NEW the gestures, no page
src/features/input/thumb-hints.ts       NEW when a hint shows, no page
src/features/input/thumbs.ts            NEW the two halves on the page
src/features/input/touch-settings.ts    NEW TouchSettings (swap sides, vibration) as plain data
src/features/input/{touch,input}.ts     drain, setSwapped; the scheme option
src/features/host/{host,test}.ts        buzz
src/features/web/web.ts                 buzz through navigator.vibrate
src/features/locale/hints.ts            NEW playHint, teachHint, inputName
src/features/locale/library/*.json      + automata.thumbs.*, automata.hint.*, automata.teach.*, automata.key.*, automata.pad.*
src/features/render/{render,camera}.ts  setThumbRoom
src/features/game/buzz.ts               NEW the part of feel that buzzes
src/features/game/{game,online}.ts      controls and plugins optional, the scheme, the buzzer
template/                               moves, hero-moves.json, land.json; move.ts and controls.ts go
skills/, README.md                      how to tune the hero
tests/fixtures/moves/                   NEW the fixture game with every move on, and its script
tests/                                  mirrors the above
```

---

### Task 1: `moves` in a character file

**Golden impact:** none.

**Files:**
- Modify: `src/features/content/character.ts`, `schemas/character.json` (from the `package` job's log)
- Test: `tests/features/content/character.test.ts`

**Interfaces:**
- Produces:

```ts
/** How the framework moves a hero. Walk and jump are always on. */
export interface Moves {
  /** The tuning file with the numbers and the controls, by id. */
  readonly tuning: string
  readonly 'double-jump': boolean
  readonly 'wall-jump': boolean
  readonly dash: boolean
}
export interface Character { /* as today, plus */ readonly moves?: Moves | undefined }
// CharacterInput: the three switches may be left out, and are then false.
```

- [ ] **Step 1: Write the failing tests** in `character.test.ts`:

```ts
test('moves with only a tuning reads, and the three switches are false', ...)
test('moves on a fixed body, or on one that is not upright, is refused in words', ...)
// 'A hero that walks needs a moving body that stays upright: make its body "dynamic" and "upright" true.' at ['moves']
test('moves with touch is refused', ...)
// 'A hero that walks cannot also be touched: take out "touch" or "moves".' at ['moves']
test('a tuning that names no listed file is refused with the listed ids', ...) // noSuch('tuning', ...) at 'moves.tuning'
test('moves on a character that is not the project\'s hero is refused', ...)
// 'Only the hero is moved by a player: "moves" belongs on "<hero>", the character automata.toml names as hero.' at 'moves'
test('an unknown key inside moves is refused', ...)
test('a hero whose "tuning" names another file than "moves.tuning" is refused', ...)   // audit I7
// 'This hero takes its numbers from "moves.tuning" ("<moves>"). Take out "tuning", or make it the same file.' at 'tuning'
```

- [ ] **Step 2: Push; the node job fails on these seven.**
- [ ] **Step 3: Add `moves` to `CharacterSchema`** as a `strictObject` (`tuning: Id`, the three booleans
  `.default(false)`), each field with a `describe` in plain words; the two shape checks in `superRefine`; the two
  cross-file checks in `characterInfo.check` (`game.has('tuning', …)`, `game.hero`), and in `superRefine` the check
  that a top-level `tuning` (the field characters have today, which nothing in the framework reads) names the same
  file as `moves.tuning` when both are there (audit I7: one hero, one tuning file). Add
  `'moves.tuning': 'Write the id of the tuning file with the hero\'s numbers, like "hero-moves".'` to `missing`.
  Widen the `clips` description to name `air-jump`, `wall` and `dash` as clips that play by how a hero with `moves`
  moves.
- [ ] **Step 4: Push; green. Commit the new `schemas/character.json` from the `package` job's log.**
- [ ] **Step 5: Commit** `feat: a character file can say the framework moves it`

### Task 2: The numbers, their limits and the hero's controls

**Golden impact:** none.

**Files:**
- Create: `src/features/content/moves.ts`, `tests/features/content/moves.test.ts`
- Modify: `src/features/content/tuning.ts` (`tuningInfo.check`), `src/features/content/content.ts` (exports),
  `src/headless.ts`

**Interfaces:**
- Produces:

```ts
export interface MoveNumberInfo {
  readonly id: string        // 'walk-speed'
  readonly key: keyof MoveNumbers
  readonly about: string     // the spec's sentence, word for word
  readonly value: number     // the framework's value
  readonly min: number       // the framework's limits
  readonly max: number
  readonly step: number      // 0.5 for a speed, 1 for ticks and counts, 0.05 for jump-cut
  readonly whole: boolean    // ticks and counts
}
/** The eighteen, in the spec's order. */
export const MOVE_NUMBERS: readonly MoveNumberInfo[]
export interface MoveNumbers {
  readonly walkSpeed: number; readonly walkGrip: number; readonly airGrip: number
  readonly jumpSpeed: number; readonly jumpCut: number; readonly ledgeGrace: number
  readonly earlyPress: number; readonly fallSpeed: number
  readonly airJumps: number; readonly airJumpSpeed: number
  readonly wallSlideSpeed: number; readonly wallJumpOut: number; readonly wallJumpUp: number
  readonly wallJumpLock: number
  readonly dashSpeed: number; readonly dashTicks: number; readonly dashRest: number; readonly airDashes: number
}
/** Each number from the file, held inside the framework's limits, whole where it is counted; the framework's value
 *  for one the file leaves out, and for a file that is `undefined`. Frozen. The same object for the same file. */
export function moveNumbers(tuning: TuningFile | undefined): MoveNumbers
/** The spec's controls table as a tuning file writes it: left, right, jump, dash, in that order. */
export const DEFAULT_HERO_CONTROLS: readonly TuningControl[]
```

`DEFAULT_HERO_CONTROLS`, exactly:

| action | label | keys | side | pad | shared |
|---|---|---|---|---|---|
| `left` | Left | `ArrowLeft`, `KeyA` | left | `dpad-left`, `left-stick-left` | `[KeyA]`, `[ArrowLeft]` |
| `right` | Right | `ArrowRight`, `KeyD` | left | `dpad-right`, `left-stick-right` | `[KeyD]`, `[ArrowRight]` |
| `jump` | Jump | `Space`, `ArrowUp`, `KeyW` | right | `south` | `[KeyW]`, `[ArrowUp]` |
| `dash` | Dash | `ShiftLeft`, `ShiftRight`, `KeyX` | right | `west`, `r2` | `[ShiftLeft]`, `[ShiftRight]` |

- [ ] **Step 1: Write the failing tests** in `moves.test.ts`:

```ts
test('the eighteen ids, values and limits are the spec\'s table', ...)   // the table typed out in the test
test('a file with none of them gives every framework value; undefined gives the same', ...)
test('a value outside the limits is held at the limit', ...)             // a file whose own range is 0 to 100: jump-speed 50 -> 30, jump-speed 1 -> 4
test('a counted number with a fraction is floored', ...)                 // dash-ticks 10.5 -> 10
test('the same file gives the same object', ...)
test('the framework controls pass checkControls, with dash and without', ...)
// the checks, through loadGame on a small game in memory. Each is a refusal, as every content check is (the
// diagnostics have no warnings); the clamp above is for content that never went through loadGame (audit I2):
test('a range outside the limits is named with what to write', ...)
// '"jump-speed" can be 4 to 30 in a game, and this file lets it reach 50. Keep "min" and "max" inside 4 to 30.' at numbers[i].max
test('a counted number with a fraction is named', ...)
// '"dash-ticks" is a whole number. Write one, like 10.' at numbers[i].value
test('a controls list without jump is named', ...)
// 'The hero\'s controls have no "jump". Add it to "controls" with its keys, like ["Space"].' at 'controls'
test('dash is asked for only when the hero dashes', ...)
test('a tuning no hero names is checked for none of this', ...)
```

- [ ] **Step 2: Push; red.**
- [ ] **Step 3: Write `moves.ts`.** `moveNumbers` keeps its answers in a `WeakMap` keyed by the file. The check is
  `heroTuningProblems(tuning, game, report)`, called from `tuningInfo.check`; it finds the hero with
  `game.get('character', game.hero)` and does nothing unless that character's `moves.tuning` is this file's id.
- [ ] **Step 4: Export** `MOVE_NUMBERS`, `moveNumbers`, `DEFAULT_HERO_CONTROLS` and the three types from
  `content.ts` and `src/headless.ts`. Push; green.
- [ ] **Step 5: Commit** `feat: the hero's eighteen numbers, their limits and its controls`

### Task 3: `buzz` in a feel file

**Golden impact:** none (no game in `tests/golden/` has a feel file with `buzz`).

**Files:**
- Modify: `src/features/content/feel.ts`, `schemas/feel.json`
- Test: `tests/features/content/feel.test.ts`

**Interfaces:**
- Produces: `export interface Buzz { readonly strength: number; readonly ticks: number }`, and
  `FeelFile.buzz?: Buzz | undefined`. `strength` is 0 to 1; `ticks` is `ticks('How long it buzzes', 30)`.

- [ ] **Step 1: Failing tests:** a file with only `buzz` reads; `strength` 1.5 and `ticks` 31 are refused; the
  "say what happens" sentence now reads `'Say what happens: add "dust", "shake", "freeze" or "buzz".'`.
- [ ] **Step 2: Push; red.** **Step 3:** add it, with `missing` entries
  `'buzz.strength': 'Write how strong the buzz is, from 0 to 1, like 0.3.'` and
  `'buzz.ticks': 'Write how many ticks it buzzes, like 4.'`.
- [ ] **Step 4: Push; green; commit the schema from the log.**
- [ ] **Step 5: Commit** `feat: a feel file can buzz`

### Task 4: What a body stands on and leans against

**Golden impact:** none. `physics({ touching: true })` is a new config key and a new component, both only when asked
for, as `joints` is.

**Files:**
- Create: `src/features/physics/touching.ts`, `tests/features/physics/touching.test.ts`,
  `tests/features/physics/touching.parity.test.ts`
- Modify: `src/features/physics/components.ts`, `physics.ts`, `physics-world.ts`, `rapier.ts`, `src/headless.ts`

**Interfaces:**
- Produces:

```ts
/** What the body touched after the last step. `below`: something solid under it. `left`, `right`: something that
 *  does not move (a tile, a fixed body) against that side. All false for an entity with no collider. Not drawn.
 *  Only a sim made with `physics({ touching: true })` has it. */
export const Touching: ComponentDef<{ below: 'bool'; left: 'bool'; right: 'bool' }>   // 'physics.touching'
export interface PhysicsOptions { /* as today, plus */ readonly touching?: boolean }

// touching.ts: pure
export interface FeltContact {
  /** The normal, pointing from the other collider toward this body. */
  readonly nx: number; readonly ny: number
  /** The nearest contact point's distance, in tiles; nought or less when the two overlap. */
  readonly dist: number
  /** True when the other collider has a dynamic body. */
  readonly moves: boolean
}
export const TOUCH_SLOP = 0.02
export const STEEP = 0.7
export function felt(contacts: readonly FeltContact[]): { below: boolean; left: boolean; right: boolean }

// PhysicsAdapter gains:
contactsOf(world: World, collider: number): FeltContact[]   // solid pairs only; sensors give none
```

`contactsOf` skips a manifold with no contact points (Rapier keeps one for two boxes whose bounds overlap, with a
zero normal), so it never reaches `felt` (audit M1). `felt`: a contact counts when `dist <= TOUCH_SLOP`. `below` when `ny <= -STEEP`. `left` when `nx >= STEEP` and the
other does not move; `right` when `nx <= -STEEP` and the other does not move.

- [ ] **Step 1: Failing unit tests** in `touching.test.ts`, on `felt` alone: flat ground; a slope of 44 degrees is
  ground and one of 46 is not; a wall on each side; a crate at the side is no wall; a contact 0.03 away is nothing; no
  contacts is nothing.
- [ ] **Step 2: Failing parity tests** in `touching.parity.test.ts` (Node and three browsers, real Rapier):

```ts
test('a box at rest on a floor is below and nothing else', ...)
test('a box in the air is nothing', ...)
test('a box pushed against a wall in the air is right, and stops being so when it leaves', ...)
test('a box on a crate is below; a box beside a crate is neither left nor right', ...)
test('walking across the seam between two tile runs never says left or right', ...)      // every tick of the walk
test('sliding down a wall of four stacked runs never says below before the floor', ...)   // every tick of the fall
test('a box on a swinging platform stays below while it swings', ...)
test('restored from a snapshot, the next ticks say the same as the sim that was not restored', ...)
test('a sim made without touching has the schema hash it had', ...)                       // golden schema-hash.json
```

- [ ] **Step 3: Push; red.**
- [ ] **Step 4: Build it.** `contactsOf` in `rapier.ts` walks the collider's contact pairs and their manifolds with
  the installed package's own calls (read its `.d.ts`: the pair walk, the manifold's normal, its contact count and
  each contact's distance), turning each normal to point toward this collider. `PhysicsWorld.syncOut` fills
  `Touching` for each entity that has it, in ascending sid order, after the bodies are written back. `physics()`
  adds the component and `touching: true` to its config only when asked.
- [ ] **Step 5: Push; green in four engines.** If the two seam tests cannot be made green with normals, take the
  fallback of builder's call 1 and say so in the report.
- [ ] **Step 6: Commit** `feat: physics can say what a body stands on and leans against`

### Task 5: How a hero moves, as one pure function

**Golden impact:** none.

**Files:**
- Create: `src/features/level/move-step.ts`, `tests/features/level/move-step.test.ts`

**Interfaces:**
- Consumes: `MoveNumbers` (Task 2).
- Produces:

```ts
export const MoveMode = { plain: 0, airJump: 1, wall: 2, dash: 3 } as const
/** What a hero remembers between ticks. Field order is the component's (Task 6) and never changes. */
export interface MoveState {
  face: number       // 1 right, -1 left
  stood: boolean     // ground was felt at the last tick
  grace: number      // ledge-grace ticks left
  press: number      // early-press ticks left
  rising: boolean    // in a jump that letting go can still cut
  airJumps: number   // used since the ground or a wall
  sliding: boolean   // sliding down a wall
  lock: number       // wall-jump-lock ticks left
  lockDir: number
  dash: number       // dash ticks left
  dashDir: number
  rest: number       // dash-rest ticks left
  airDashes: number  // used since the ground
  walking: boolean
  mode: number       // a MoveMode, for the clip
  run: number        // the sideways speed this step last asked for (f32, audit I1)
}
export const MOVE_START: MoveState   // face 1, everything else nought and false
export interface MoveInput {
  readonly dir: -1 | 0 | 1            // right minus left
  readonly jumpPressed: boolean; readonly jumpHeld: boolean; readonly dashPressed: boolean
  readonly below: boolean
  readonly wall: -1 | 0 | 1           // -1 a wall on the left, 1 on the right
  readonly vx: number; readonly vy: number
}
export interface MoveSwitches { readonly doubleJump: boolean; readonly wallJump: boolean; readonly dash: boolean }
export type MoveEventName =
  | 'walked' | 'jumped' | 'landed' | 'left-ground' | 'air-jumped' | 'wall-slid' | 'wall-jumped' | 'dashed'
/** One tick of one hero. `hover` is the upward speed that one tick of gravity brings to nothing. */
export function stepMoves(
  state: MoveState, input: MoveInput, n: MoveNumbers, on: MoveSwitches, hover: number,
): { readonly state: MoveState; readonly vx: number; readonly vy: number; readonly events: readonly MoveEventName[] }
```

**The order inside one tick** (the tests below pin it; the function follows it line for line):

1. **Ground.** `below && !stood`: `landed`; `airJumps`, `airDashes` to 0; `rising` false. `!below && stood`:
   `left-ground`. Then `stood = below`. `canStand = below || grace > 0`; then `grace = below ? ledgeGrace :
   max(0, grace - 1)`.
2. **The press.** `jumpPressed`: `press = earlyPress + 1`. `rest = max(0, rest - 1)`.
3. **A dash under way** (`dash > 0`): if `wall === dashDir`, the dash ends (`dash = 0`, `rest = dashRest`) and the
   tick carries on at 4; else `vx = dashDir * dashSpeed`, `vy = hover`, `dash -= 1` (reaching 0 sets
   `rest = dashRest`, and `run = dashDir * walkSpeed`, so the hero comes out of a dash at a walk), `mode = dash`,
   `press = max(0, press - 1)`, and the tick ends here. A dash that ends at a wall sets `run = 0`.
4. **A dash begins** (`on.dash && dashPressed && rest === 0 && (below || airDashes < airDashes limit)`):
   `dashDir = dir !== 0 ? dir : face`; `face = dashDir`; in the air `airDashes += 1`; `rising = false`; `lock = 0`;
   `dash = dashTicks`; `dashed`; then as 3 for this tick.
5. **Walk.** The walk starts from `run`, the speed the step asked for last tick, never from `input.vx`: ground
   friction (0.5 on both colliders, so about 0.25 tiles a second taken off each tick) would otherwise eat the grip and
   the hero would never hold `walk-speed` on the ground (audit I1). Today's hero sets its speed outright every tick,
   so a crate it pushes slows it within a tick and no more; this keeps that. With `lock > 0`: `run` is left alone and
   `lock -= 1`. Else the target is `dir * walkSpeed`, the grip is `below ? walkGrip : airGrip`, and `run` goes toward
   the target by at most `walkSpeed / grip` (all the way when the grip is 0). Then, if `dir !== 0 && wall === dir`,
   `run = 0`. `vx = run`. `dir !== 0` sets `face = dir`. `below && dir !== 0 &&
   !walking`: `walked`. `walking = below && dir !== 0`.
6. **Wall slide** (`on.wallJump`): `sliding` is `!below && wall !== 0 && dir === wall && vy > 0`. While sliding,
   `vy = min(vy, wallSlideSpeed)` and `airJumps = 0`; on the tick it begins, `wall-slid`.
7. **Jump**, the first that fits, when `press > 0`:
   a. `canStand`: `vy = -jumpSpeed`, `grace = 0`, `stood = false`, `jumped`.
   b. `on.wallJump && !below && wall !== 0`: `vx = run = -wall * wallJumpOut`, `vy = -wallJumpUp`,
      `lock = wallJumpLock`, `lockDir = -wall`, `face = -wall`, `sliding = false`, `wall-jumped`.
   c. `on.doubleJump && !below && airJumps < airJumps limit`: `vy = -airJumpSpeed`, `airJumps += 1`, `air-jumped`.
   Each sets `rising = true` and `press = 0`. With none, `press -= 1`.
8. **The cut.** `rising && vy < 0 && !jumpHeld`: `vy *= jumpCut`, `rising = false`. `vy >= 0`: `rising = false`.
9. **The cap.** `vy = min(vy, fallSpeed)`.
10. **The mode.** `sliding`: `wall`. Else, after an air jump and until `vy >= 0` or the ground: `airJump`. Else
    `plain`.

- [ ] **Step 1: Write the failing tests** in `move-step.test.ts`. A helper `run(inputs, numbers?, switches?)` feeds a
  list of inputs and returns every tick's answer. One test per sentence of the spec's "How it plays", each with exact
  numbers:

```ts
test('walk reaches 6 in 3 ticks on the ground and 6 in the air, and at grip 0 at once', ...)      // 2, 4, 6
test('a press on the ground leaves at -12 and says jumped once', ...)
test('ledge grace: a press 6 ticks after the ground still jumps, 7 does not', ...)
test('early press: a press 6 ticks before the ground jumps on landing, 7 does not', ...)
test('letting go while rising keeps half; holding keeps all; letting go while falling changes nothing', ...)
test('falling never passes 20', ...)
test('double jump off: a press in the air does nothing', ...)
test('double jump: one press in the air goes up at -10, a second does nothing, the ground gives it back', ...)
test('air-jumps 3 gives three', ...)
test('wall slide: held toward the wall and falling, the fall is 3 at most, and wall-slid is said once', ...)
test('a wall gives the air jump back', ...)
test('wall jump: up at -11 and away at 7, and for 8 ticks holding toward the wall changes nothing', ...)
test('a wall jump needs no hold toward the wall', ...)
test('dash: 18 along the facing for 10 ticks with no fall, then 30 ticks before the next', ...)
test('a dash goes the way that is held, not the facing', ...)
test('air-dashes 1: one dash in the air until the ground', ...)
test('a dash into a wall ends at the wall', ...)
test('jump pressed during a dash is kept and used when the dash ends on the ground', ...)
test('walking toward a wall keeps the sideways speed at nothing', ...)
test('the walk goes from the speed it asked for: an input vx cut by friction does not slow the next tick', ...)   // audit I1
test('a dash ends at walk speed; one that ends at a wall ends at nothing', ...)                                   // audit I1
test('walked is said on the first step after standing, not on every tick', ...)
test('landed and left-ground are each said once, and a jump is not left-ground', ...)
test('the mode is dash, wall, airJump and plain at the right ticks', ...)
test('each number at its two limits moves the hero as the limit says', ...)   // a table over MOVE_NUMBERS
test('the state that comes back is a new object; the one given is not changed', ...)
```

- [ ] **Step 2: Push; red.** **Step 3: Write `stepMoves`.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat: how a hero moves, as one pure step`

### Task 6: The `moves` plugin, and a hero the framework moves

**Golden impact:** none. The plugin, `Touching` and the move state join a sim only when the hero has `moves`.

**Files:**
- Create: `src/features/level/moves.ts`, `tests/features/level/moves.test.ts`
- Modify: `src/features/level/uses.ts`, `hero.ts`, `game-sim.ts`, `level.ts`, `src/headless.ts`

**Interfaces:**
- Consumes: `stepMoves`, `MOVE_START` (Task 5); `moveNumbers` (Task 2); `Touching`, `physics({ touching })` (Task 4).
- Produces:

```ts
export function usesMoves(content: GameContent): boolean   // the project's hero has `moves`
/** The move state, `MoveState`'s fields in its order: i32 for face, lockDir, dashDir; u32 for the counts and the
 *  mode; bool for the rest. Not drawn. */
export const Moves: ComponentDef<...>                      // 'moves'
export interface MoveEvent { readonly player: number; readonly sid: number }
/** The one event object for `hero.<name>`. */
export function moveEvent(name: MoveEventName): EventDef<z.ZodType<MoveEvent>>
export const MOVE_EVENTS: readonly MoveEventName[]
/** `gravity` is the sim's; the plugin works `hover` out of it and the tick: `hover = -gravity.y * dt` (audit M2). */
export function movesPlugin(options: { readonly gravity: { readonly x: number; readonly y: number } }): PluginDef
```

The plugin: name `moves`, `dependsOn: ['level']`, no config, components `[Moves]`, the eight events, one system
`level.moves` in `gameplay`. For each entity with `Player`, `Body`, `Moves` and `Touching`, in query order, it builds
a `MoveInput` (`isHeld`, `wasPressed`; `dash` only when the switch is on; `wall` is `-1` for `Touching.left`, `1` for
`right`, `0` for both or neither), reads the numbers and switches of the entity's character (`Thing.character`), calls
`stepMoves`, writes `Body.vx` and `vy` and the state, and emits each event with the player's number.

`createGameSim`: `physics({ …, touching: usesMoves(content) })`, and `movesPlugin` after `touchPlugin` and before the
game's own. `heroParts` adds `[Moves, MOVE_START]` and `[Touching, {}]` when the hero has `moves`, so a hero who joins
is the hero the level would have made.

- [ ] **Step 1: Write the failing tests** in `moves.test.ts` (Node, real physics, a small game in memory):

```ts
test('createGameSim with no plugins moves the hero: held right, it is further right; jump, it leaves the ground', ...)
test('held right on a floor for 60 ticks, the hero covers walk-speed tiles, give or take 2%', ...)   // audit I1: friction does not eat the walk
test('each event is said once, on the tick it happens, with the player\'s number', ...)
test('the numbers come from the tuning file: jump-speed 20 jumps higher than 12', ...)
test('a switch that is off does nothing: no double jump without "double-jump"', ...)
test('a game without moves has the plugins, the components and the schema hash it had', ...)   // golden schema-hash.json
test('a game with moves has the moves plugin after touch and before the game\'s own', ...)
test('a hero who joins a co-op game has the move state and is moved', ...)
test('a game plugin may run after level.moves', ...)        // defineSystem({ after: ['level.moves'] }) is accepted
test('two heroes: each player\'s keys move only their own', ...)
```

- [ ] **Step 2: Push; red.** **Step 3: Build it.** **Step 4: Export** `usesMoves`, `Moves`, `moveEvent`,
  `MOVE_EVENTS`, `MoveMode`, `movesPlugin` and the types from `level.ts` and `src/headless.ts`. Push; green.
- [ ] **Step 5: Commit** `feat: the framework moves a hero whose file has moves`

### Task 7: The three new clips

**Golden impact:** none (`sprites.json` and `art.json` have no `moves`).

**Files:**
- Modify: `src/features/level/clip.ts`, `sprite.ts`
- Test: `tests/features/level/clip.test.ts`, `sprite.test.ts`

**Interfaces:**
- Produces: `MotionClip` gains `'air-jump' | 'wall' | 'dash'`.
  `motionClip(vx, vy, now, still, landing, mode = MoveMode.plain)`: `dash` gives `'dash'`, `wall` gives `'wall'`,
  `airJump` with `vy < -VERTICAL` gives `'air-jump'`; anything else is today's answer. `NEAREST` gains
  `'air-jump': 'jump'`, `wall: 'fall'`, `dash: 'run'`.

- [ ] **Step 1: Failing tests:** the three modes give the three clips; with mode `plain` every existing case answers
  as before (the existing table, run again); a character without the three clips plays `jump`, `fall` and `run`; a
  hero with `moves` faces `Moves.face`, so one sliding down a wall faces away from where it is pushed.
- [ ] **Step 2: Push; red.** **Step 3:** `spritesSystem` reads the mode and the face from `Moves` only in a game
  where `usesMoves(content)` is true (the component does not exist in any other sim).
- [ ] **Step 4: Push; green.** **Step 5: Commit** `feat: clips for the air jump, the wall and the dash`

### Task 8: The moves golden, in four engines, alone, together and online

**Golden impact:** new `tests/golden/moves.json`.

**Files:**
- Create: `tests/fixtures/moves/automata.toml`, `content/characters/{hero,crate}.json`,
  `content/tuning/hero-moves.json` (all eighteen numbers at the framework's values, the four controls),
  `content/levels/{level-1,level-2}.json`, `game.ts`, `read.ts`, `script.ts`, `tests/golden/moves.json`
  (`{"ticks": 0, "finalHash": "", "checks": []}`), `tests/features/level/moves.parity.test.ts`,
  `tests/features/level/moves-co-op.parity.test.ts`, `tests/features/net/moves-online.parity.test.ts`

**Interfaces:**
- Produces: `loadMovesGame(overrides?)`, `MOVES_TICKS`, `movesScript(tick): Command[]`, for Tasks 12 and 14.

The level (`level-1`, built for the script): a floor; a ledge to run off; a gap that needs the double jump; two walls
three tiles apart to climb by wall jumps; a crate to stand on; a long floor to dash along; a pit wide enough that only
an air dash crosses it. `level-2` has starts for players 1 and 2 on one floor, facing each other.

The script, in order, each step a comment in `script.ts` with its ticks: walk right; a held jump and a tapped jump;
run off the ledge and jump within the grace; a press six ticks before landing; the double jump; slide down the first
wall, then wall jump three times between the two; stand on the crate and jump from it; dash on the ground; dash in the
air across the pit; stand still.

- [ ] **Step 1: Write the failing tests.**

```ts
// moves.parity.test.ts
test('the moves game plays as its script says, and matches its golden', ...)
// asserts along the way, from the events: jumped 5+, landed, left-ground, air-jumped 1, wall-slid 1+, wall-jumped 3, dashed 2;
// the tapped jump's top is lower than the held one's; the hero ends right of the pit
test('the recording of that play verifies, and its text is the same in every engine', ...)   // expectRecorded
test('saved at tick 200 and restored, it ends on the golden\'s hash', ...)
// moves-co-op.parity.test.ts
test('two heroes on one floor, one dashes into the other: one hash in every engine', ...)    // recorded beside moves.json as "coOpHash"
// moves-online.parity.test.ts (plan N's fixtures, the moves game's content, no game plugins)
test('a room and two players with a forced lag end on one hash, after at least one rollback', ...)
test('that hash is the hash of the same commands played straight through', ...)
```

- [ ] **Step 2: Push. The node job fails with GOLDEN NOT RECORDED** and the JSON; commit it, and the two recorded
  values it asks for next. **Step 3: Push; green in Node, Chromium, WebKit and Firefox.** A hash that differs between
  engines is never re-recorded: stop and report.
- [ ] **Step 4: Commit** `test: the moves golden, in four engines, co-op and online`

### Task 9: The controls come from the tuning file

**Golden impact:** none.

**Files:**
- Create: `src/features/input/hero-controls.ts`, `tests/features/input/hero-controls.test.ts`
- Modify: `src/features/game/game.ts`, `online.ts`, `src/features/input/input.ts` (exports), `src/index.ts`,
  `src/headless.ts`
- Test: `tests/features/game/game.browser.test.ts`

**Interfaces:**
- Produces:

```ts
/** The controls of a game whose hero has `moves`: its tuning file's list, else the framework's (without `dash` when
 *  the hero does not dash). `undefined` for a game whose hero has no `moves`. Throws what `controlsFromList` throws. */
export function heroControls(content: GameContent, given?: Controls): Controls | undefined
export interface GameOptions { /* `controls` is now optional */ readonly controls?: Controls }
```

`heroControls` answers, for a game whose hero has `moves`, the tuning file's list when it has one, else `given`, else
the framework's (audit I3: the spec's "when both are given, the tuning file wins" is about a file that has a list; a
file with none must not throw away the controls a game passed in code). `startGame` and `startOnlineGame`: the
controls are `heroControls(content, options.controls) ?? options.controls`. With neither, throw
before anything is on the page: `'This game has no controls. Give its hero "moves" in its character file, or pass
"controls" to startGame.'` With both, the file wins and the console is told once:
`'startGame: the controls come from the tuning file "<id>". The "controls" passed in code are not used.'`

- [ ] **Step 1: Failing tests.** `hero-controls.test.ts`: the file's list in its order; the framework's four with
  dash on and three with it off; `undefined` without `moves`; **(Review Focus 5)** `applySettings` over these
  controls with a saved binding that gives `jump` the key `KeyX` drops that one binding, keeps a saved `left`, and
  throws nothing. `game.browser.test.ts`: `startGame` with no `controls` and no `plugins` on the moves fixture puts a
  hero on screen that a held key moves; with neither a file nor `controls` it throws the sentence and leaves the mount
  empty; with both, the file's keys work and the console heard the note once; a tuning file with no list and
  `controls` in code plays the code's keys and says nothing (audit I3).
- [ ] **Step 2: Push; red.** **Step 3: Build.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat: a game with a built-in hero needs no controls in code`

### Task 10: `buzz` through the host, and the two settings as plain data

**Golden impact:** none.

**Files:**
- Create: `src/features/game/buzz.ts`, `src/features/input/touch-settings.ts`, `tests/features/game/buzz.test.ts`,
  `tests/features/input/touch-settings.test.ts`
- Modify: `src/features/host/host.ts`, `test.ts`, `src/features/web/web.ts`, `src/features/game/game.ts`,
  `online.ts`, `src/index.ts`, `src/headless.ts`
- Test: `tests/features/host/test.test.ts`, `tests/features/web/web.browser.test.ts`

**Interfaces:**
- Produces:

```ts
export interface Host {
  /** True where the device can buzz. */
  readonly canBuzz: boolean
  /** A short buzz: `strength` 0 to 1, for `ms` milliseconds. False, and nothing happens, where it cannot. */
  buzz(strength: number, ms: number): boolean
}
// testHost: `buzzes: { strength: number; ms: number }[]`, and an option `canBuzz` (default true)
// WebSeams.navigator gains an optional `vibrate`

// input/touch-settings.ts
export interface TouchSettings { readonly format: 1; readonly swapSides: boolean; readonly vibration: boolean }
export const TOUCH_SETTINGS_DEFAULT: TouchSettings      // swapSides false, vibration true
export const TouchSettingsSchema: z.ZodType<TouchSettings, TouchSettings>

// game/buzz.ts
export interface Buzzer { hear(step: { readonly events: readonly SimEvent[] }): void; setOn(on: boolean): void }
export function createBuzzer(options: {
  readonly content: GameContent
  readonly host: Pick<Host, 'buzz' | 'canBuzz'>
  /** What that player last used. */
  readonly device: (player: number) => DeviceKind
  readonly tickHz: number
  readonly on: boolean
}): Buzzer

// game.ts
export interface GameOptions { /** Saved touch settings (the `touch` section). Default TOUCH_SETTINGS_DEFAULT. */ readonly touchSettings?: unknown }
export interface Game { setVibration(on: boolean): void }
```

The buzzer: for each event of the step, each feel file with that `on` and a `buzz` asks the host for
`buzz(strength, ticks * 1000 / tickHz)`, when it is on, the host can, and the event's `player` (1 when it has none)
last used touch. It hears the same steps the audio hears, in `game.ts` and in `online.ts`. `watchReplay` makes none.

- [ ] **Step 1: Failing tests.** `buzz.test.ts`: a landing with the template's feel file asks the fake host once with
  the file's strength and the right milliseconds; off asks nothing; a keyboard player asks nothing; a host that
  cannot buzz is never asked and nothing throws; two feel files on one event ask twice; a strength of 0 asks
  nothing. `web.browser.test.ts`: `canBuzz` follows whether `vibrate` exists; with none, `buzz` answers false and
  does not throw. `touch-settings.test.ts`: the default passes its schema; an unknown key is refused.
- [ ] **Step 2: Push; red.** **Step 3: Build.** Every existing `Host` in `tests/` gains the two members.
- [ ] **Step 4: Push; green.** **Step 5: Commit** `feat: a host can buzz, and a feel file's buzz reaches it`

### Task 11: The thumb gestures, with no page

**Golden impact:** none.

**Files:**
- Create: `src/features/input/thumb-rules.ts`, `src/features/input/thumb-hints.ts`,
  `tests/features/input/thumb-rules.test.ts`, `tests/features/input/thumb-hints.test.ts`

**Interfaces:**
- Produces:

```ts
// thumb-rules.ts
export const DEAD_ZONE_PX = 12
export const FOLLOW_PX = 56
export const FLICK_PX = 56
export const FLICK_MS = 110
export type Half = 'walk' | 'jump'
export interface ThumbRules {
  /** A finger lands. `half` is where it landed; `ms` is the event's own time. */
  down(id: number, half: Half, x: number, y: number, ms: number): void
  move(id: number, x: number, y: number, ms: number): void
  /** A finger lifts, or the system takes the touch away. */
  up(id: number): void
  /** Lets go of everything: the window lost focus, or the screen turned. */
  clear(): void
  /** Fingers down now do nothing until they lift: a press that ended a screen. */
  mask(): void
  /** What is held now: any of 'left', 'right', 'jump'. */
  held(): Set<string>
  /** `held()`, and anything pressed and let go since the last drain ('dash' is only ever here). Empties that list. */
  drain(): Set<string>
  /** Where to draw the ring: its middle and the thumb, or `undefined` with no walking thumb. */
  ring(): { readonly cx: number; readonly cy: number; readonly x: number; readonly y: number } | undefined
  /** How many times each has been done, for the hints. */
  uses(): { readonly walk: number; readonly jump: number; readonly dash: number }
}
export function createThumbRules(options: { readonly dash: boolean }): ThumbRules

// thumb-hints.ts
export const HINT_USES = 3
export const HINT_IDLE_MS = 20_000
/** Which hints show: each until it has been done three times, and all again after 20 seconds with no touch. */
export function hintsShown(
  uses: { readonly walk: number; readonly jump: number; readonly dash: number },
  msSinceTouch: number,
  dash: boolean,
): { readonly walk: boolean; readonly jump: boolean; readonly dash: boolean }
```

The rules: the first finger to land in a half owns it until it lifts. The walking thumb's ring starts where it lands;
`left` or `right` is held while the thumb is more than `DEAD_ZONE_PX` to that side of the ring's middle; a thumb
further than `FOLLOW_PX` from the middle pulls the middle after it. A flick is `FLICK_PX` sideways inside `FLICK_MS`,
at least twice as far sideways as up or down; it adds `dash` and that side to the next drain, and the next flick
needs the thumb to lift or to have been slower than half that for a moment. The jumping thumb holds `jump` from the
call to `down` until `up`. `uses` counts a walk each time a side is first held, a jump on each landing, a dash on each
flick.

- [ ] **Step 1: Write the failing tests.**

```ts
// thumb-rules.test.ts
test('a thumb down in the walk half holds nothing until it slides 12 px', ...)
test('13 px right holds right; back inside the dead zone holds nothing; 13 px left holds left', ...)
test('a thumb that slides 200 px drags the ring, so 69 px back the other way turns round', ...)
test('a thumb down in the jump half holds jump at once, and lets go on up', ...)
test('down and up before a drain still gives jump once, then nothing', ...)
test('a second finger in a half does nothing; when the first lifts, the next finger down takes the half', ...)   // Review Focus 2
test('a walking thumb that slides into the jump half still walks and never jumps', ...)                          // Review Focus 2
test('60 px in 100 ms is a flick: dash and that side, once', ...)
test('60 px in 300 ms is a walk, not a flick', ...)
test('a flick up or down is not a dash', ...)
test('a flick with the thumb lifted at its end still gives dash and its side in the next drain', ...)
test('with dash off, no flick is a dash', ...)
test('mask holds back what is down until it lifts', ...)
test('clear lets go of everything, and the ring is gone', ...)
// thumb-hints.test.ts
test('each hint shows for its first three uses and not after', ...)
test('all come back after 20 seconds with no touch', ...)
test('the dash hint never shows in a game without dash', ...)
```

- [ ] **Step 2: Push; red.** **Step 3: Write both files.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat: the two-thumb gestures, as rules with no page`

### Task 12: The thumb scheme on the page

**Golden impact:** none.

**Files:**
- Create: `src/features/input/thumbs.ts`, `tests/features/input/thumbs.browser.test.ts`
- Modify: `src/features/input/touch.ts` (`drain`, `setSwapped`), `input.ts`, `src/features/render/render.ts`,
  `camera.ts`, `src/features/game/game.ts`, `online.ts`
- Test: `tests/features/render/camera.test.ts`, `tests/features/input/input.browser.test.ts`

**Interfaces:**
- Consumes: `createThumbRules`, `hintsShown` (Task 11); `TouchSettings` (Task 10).
- Produces:

```ts
// touch.ts: the interface both schemes answer to
export interface Touch {
  /* as today, plus */
  /** What `held` says, and anything pressed and let go since the last drain. The buttons have none of those. */
  drain(): Set<string>
  /** Walking on the right and jumping on the left. The buttons swap their corners. */
  setSwapped(on: boolean): void
  /** How many pixels at the bottom the camera should keep the heroes clear of: the thumbs' resting corners. */
  room(): number
}
// thumbs.ts
export function createThumbs(
  mount: HTMLElement,
  controls: Controls,
  options: { readonly dash: boolean; readonly win?: Window; readonly words?: Words; readonly now?: () => number },
): Touch
// input.ts
export interface InputOptions { /** Set for a game with a built-in hero: the thumb scheme, not a button an action. */ readonly thumbs?: { readonly dash: boolean } }
export interface Input { setSwapSides(on: boolean): void; swapSides(): boolean; thumbRoom(): number }
// render.ts
export interface Renderer { /** Keeps the heroes this many CSS pixels clear of the bottom, in a level with a view. */ setThumbRoom(px: number): void }
```

What is on the page (class names are the hooks a game's stylesheet has; colours come from the existing
`--automata-touch-*` properties, so a game that dressed the buttons has dressed the thumbs):

- `div.automata-thumbs` with two `div.automata-thumb-half`, `data-half="walk"` and `"jump"`, each `role="group"` with
  an `aria-label`: with words, `automata.thumbs.walk` and `automata.thumbs.jump`; with none, the tuning file's own
  labels (`left` and `right` joined with " / ", and `jump`'s). `touch-action:none`, no selection, no callout, no
  context menu. Walk is the left half unless swapped.
- **Shape** (builder's call 14): the band under the level, `inset()` its height and `room()` 0; or over the whole
  mount, `inset()` 0 and `room()` 120. A `ResizeObserver` on the mount picks again, and a change of shape calls the
  rules' `clear()` (Review Focus 3).
- **The ring** (`div.automata-thumb-ring`, 112 across, with a 48 knob) drawn from `rules.ring()`; lit with the
  pressed colours while a side is held. **The arrow** (`div.automata-thumb-arrow`, 96 across) lit while jump is held.
- **The hints** (`div.automata-thumb-hint`): a faint ring 96 from the left and bottom edges and a faint arrow 96 from
  the right and bottom (inside the safe area), each with its words under it at 18 pixels (`automata.thumbs.walk-hint`,
  `-jump-hint`, and in a game with dash `-dash-hint` under the ring's). Shown by `hintsShown`. With no `words`, the
  pictures and no sentence.
- **Round buttons** (`button.automata-touch-button`, `data-action`, 64 across, 12 apart), stacked upward from above
  the jump half's resting corner (their bottom edge at the higher of 200 pixels and half the overlay's height; in the
  band, just above the band): first the dash mark in a game with dash, then one for every action that is not `left`,
  `right`, `jump` or `dash`, in the controls' order, said with `controls.<action>` as today's buttons are.
- Each half listens to `pointerdown` (and captures the pointer), `pointermove`, `pointerup`, `pointercancel` and
  `lostpointercapture`; the window's `blur` clears. Shown at once on a coarse pointer and on the first touch
  anywhere else, as today's buttons are.

`createInput` makes `createThumbs` when `thumbs` is given and `createTouch` otherwise; `poll` reads `touch.drain()`
where it read `touch.held()`; everything else that reads what is held keeps `held()`. `startGame` and
`startOnlineGame` pass `thumbs` when `usesMoves(content)` (the spec: the scheme follows the hero, not where the
controls came from; audit I3), apply `touchSettings.swapSides`, and give the renderer `input.thumbRoom()` beside the
inset. **A level with no `view` has no camera to move** (the template's level is one: 16 by 9 tiles, its floor at the
bottom of the screen, under the thumbs on a sideways phone), so there `startGame` gives the room to `setInset`
instead and the level is fitted above it (audit I4). `setThumbRoom`: in a level with a `view`, the box round the heroes
has `px / scale` more tiles under it (the scale of the last frame drawn), still inside the level.

- [ ] **Step 1: Write the failing tests** in `thumbs.browser.test.ts` (real pointer events with `pointerType`
  `'touch'`, in Chromium, WebKit and Firefox):

```ts
test('the two halves are groups named Walk and Jump, in the player\'s language', ...)
test('with no words, the halves take the tuning file\'s labels and the hints show no sentence', ...)
test('the ring appears where the thumb lands and follows a thumb that slides far', ...)
test('a thumb down in the jump half is held before any pointerup', ...)
test('down and up inside one frame is one jump for the next poll', ...)                 // Review Focus 1
test('a cancelled touch lets go', ...)
test('the screen turned with a thumb down: nothing is held, and the halves are redrawn', ...)   // Review Focus 3
test('swapped, walking is on the right half and jumping on the left', ...)
test('the hints fade after three uses, and come back after 20 seconds', ...)            // `now` is the test's
test('a game with dash has the dash mark, 64 px, and a tap on it is a dash', ...)
test('a game\'s own action is a 64 px button above the jump half, and holding it does not jump', ...)
test('nothing scrolls, zooms or opens a menu under a thumb', ...)
test('a game whose hero has no moves still gets the buttons', ...)
test('an element the page stacks over a half, outside the mount, takes its own touch and the half sees none', ...)   // audit I5: the editors' Stop, plan U's Pause
```

  and in `camera.test.ts`: with room for the thumbs the shot's box reaches further down; with none it is today's.
- [ ] **Step 2: Push; red.** **Step 3: Build.** **Step 4: Push; green in three browsers.**
- [ ] **Step 5: Commit** `feat: the two-thumb scheme for a built-in hero`

### Task 13: The words, and the hints for keys and gamepads

**Golden impact:** none.

**Files:**
- Create: `src/features/locale/hints.ts`, `tests/features/locale/hints.test.ts`
- Modify: the six `src/features/locale/library/*.json`, `automata.translations.toml` beside them, `locale.ts`,
  `src/index.ts`, `src/headless.ts`
- Test: `tests/features/locale/library.test.ts`

**Interfaces:**
- Produces:

```ts
/** A key or a gamepad input as a person says it: `ArrowLeft` is "Left arrow", `KeyA` is "A", `south` is "the bottom button". */
export function inputName(input: string, words: Words): string
/** What to tell a player about walking and jumping (and dashing, in a game that has it) on the device they use.
 *  `first(action)` is the first key or button of an action, as `input.inputsFor(player, action)[0]`. */
export function playHint(options: {
  readonly device: DeviceKind
  readonly first: (action: string) => string | undefined
  readonly dash: boolean
  readonly words: Words
}): string
/** How to do one new move on the device in use: the sentence a level shows where the move is first needed. */
export function teachHint(options: {
  readonly move: 'double-jump' | 'wall-jump' | 'dash'
  readonly device: DeviceKind
  readonly first: (action: string) => string | undefined
  readonly words: Words
}): string
```

The template's `hint.*` and `key.*` words move into the library under `automata.hint.*` and `automata.key.*`, in all
six languages, as the template has them now. The new words, with a first draft of each language for the plan audit
and a native check to correct:

| key | en | es | pt | ko | ja | zh |
|---|---|---|---|---|---|---|
| `automata.thumbs.walk` | Walk | Caminar | Andar | 걷기 | 歩く | 行走 |
| `automata.thumbs.jump` | Jump | Saltar | Pular | 점프 | ジャンプ | 跳跃 |
| `automata.thumbs.dash` | Dash | Impulso | Arrancada | 대시 | ダッシュ | 冲刺 |
| `automata.thumbs.walk-hint` | Slide to walk | Desliza para caminar | Deslize para andar | 밀어서 걷기 | スライドで歩く | 滑动行走 |
| `automata.thumbs.jump-hint` | Tap to jump | Toca para saltar | Toque para pular | 탭해서 점프 | タップでジャンプ | 点击跳跃 |
| `automata.thumbs.dash-hint` | Flick to dash | Desliza rápido para impulsarte | Deslize rápido para arrancar | 빠르게 밀어서 대시 | フリックでダッシュ | 快速滑动冲刺 |
| `automata.teach.double-jump.touch` | Tap again in the air | Toca otra vez en el aire | Toque de novo no ar | 공중에서 한 번 더 탭 | 空中でもう一度タップ | 在空中再点一次 |
| `automata.teach.double-jump.press` | Press {input} again in the air | Pulsa {input} otra vez en el aire | Aperte {input} de novo no ar | 공중에서 {input} 한 번 더 누르기 | 空中でもう一度{input}を押す | 在空中再按一次{input} |
| `automata.teach.wall-jump.touch` | Tap while you slide down a wall | Toca mientras bajas por una pared | Toque enquanto desliza pela parede | 벽을 타고 내려올 때 탭 | 壁をすべりながらタップ | 贴墙下滑时点击 |
| `automata.teach.wall-jump.press` | Press {input} while you slide down a wall | Pulsa {input} mientras bajas por una pared | Aperte {input} enquanto desliza pela parede | 벽을 타고 내려올 때 {input} 누르기 | 壁をすべりながら{input}を押す | 贴墙下滑时按{input} |
| `automata.teach.dash.press` | Press {input} to dash | Pulsa {input} para impulsarte | Aperte {input} para arrancar | {input} 눌러서 대시 | {input}でダッシュ | 按{input}冲刺 |
| `automata.hint.dash` | {input} to dash. | {input} para impulsarte. | {input} para arrancar. | {input}: 대시. | {input}でダッシュ。 | {input}冲刺。 |
| `automata.hint.stick` | The stick | La palanca | O direcional | 스틱 | スティック | 摇杆 |
| `automata.key.shift` | Shift | Mayús | Shift | Shift | Shift | Shift |
| `automata.pad.south` | the bottom button | el botón de abajo | o botão de baixo | 아래 버튼 | 下のボタン | 下方按钮 |
| `automata.pad.west` | the left button | el botón izquierdo | o botão da esquerda | 왼쪽 버튼 | 左のボタン | 左侧按钮 |
| `automata.pad.r2` | the right trigger | el gatillo derecho | o gatilho direito | 오른쪽 트리거 | 右トリガー | 右扳机 |

A touch player's dash teaching is `automata.thumbs.dash-hint`. A pad input with no word of its own says its name as
written (`north`).

`playHint` and `teachHint` begin each sentence with a capital letter in the languages that have them (the first
letter through `toLocaleUpperCase` with the language's tag), so a button's name can start one.

- [ ] **Step 1: Failing tests** in `hints.test.ts`: at a keyboard with the framework's controls, "Arrow keys to move.
  Space to jump."; with dash, "… Shift to dash."; on a gamepad, "The stick to move. The bottom button to jump."; on
  touch `playHint` is the empty text (the thumbs carry their own hints); `teachHint` for each move on each device, in
  English and in Spanish; a changed key is named, not the default. `library.test.ts` (existing): the six files have
  the same keys.
- [ ] **Step 2: Push; red.** **Step 3: Build.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat: the thumbs' words, and hints for keys and gamepads, in six languages`

### Task 14: The whole scheme in real browsers, at the five sizes

**Golden impact:** none.

**Files:**
- Create: `tests/features/game/thumbs.browser.test.ts`, `tests/features/game/moves-pad.browser.test.ts`
- Modify: `.github/workflows/ci.yml` only if the `screens` job needs the new picture names (it takes every file of
  the `screens-*` artifacts today; read it first)

**Interfaces:**
- Consumes: `loadMovesGame`, `movesScript` (Task 8); `SCREENS` (`tests/fixtures/game/screens.ts`).

- [ ] **Step 1: Write the failing tests.** For each of the five `SCREENS`, in each engine, `startGame` on the moves
  fixture with no `controls` and no `plugins`:

```ts
test(`${name}: both halves are inside the mount, the level is whole above the band or the halves cover it`, ...)
test(`${name}: a thumb slid right walks the hero right; lifted, it stops`, ...)
test(`${name}: a held thumb jumps higher than a tap`, ...)           // the hero's highest point, from game.sim
test(`${name}: the jump begins on the first tick after the thumb lands`, ...)   // hero.jumped at that tick
test(`${name}: a flick dashes, and the fake host is asked to buzz with the feel file's strength`, ...)
test(`${name}: every round button is 64 px, inside the mount, and clear of the jump hint`, ...)
test(`${name}: with the thumbs over the game, the hero's box never enters the bottom 120 px`, ...)   // game.heroes()
test(`${name}: the same with the fixture's level copied without its view: the level is fitted above the thumbs`, ...)   // audit I4
test(`${name}: a picture is saved`, ...)    // thumbs-<name>.png, hints showing, to the screens artifact
```

  `moves-pad.browser.test.ts` (the test's own pad, through `gamepads`): the stick walks, the bottom button jumps and
  double jumps, the left button and the right trigger dash; the same at a keyboard with Space and Shift.
- [ ] **Step 2: Push; red.** **Step 3: Fix what the tests find** in Tasks 10 to 13's code, each fix its own commit.
- [ ] **Step 4: Push; green in three browsers.** Look at the fifteen pictures on `ci-screens` before going on (and
  put them in the review artifact at phone sideways, phone upright, tablet upright, tablet sideways and desktop, the
  Owner's format, saying plainly that the halves are the final look and the game's art is still boxes; audit M5): a
  thumb, a hint or a button that covers the hero, or words that are cut, is a defect to fix here.
- [ ] **Step 5: Commit** `test: the thumb scheme at five sizes in three browsers`

### Task 15: The template moves to the built-in hero

**Golden impact:** `template/replays/level-1.json` moves, once. See Global Constraints.

**Files:**
- Delete: `template/src/features/hero/move.ts`, `template/src/features/page/controls.ts`
- Create: `template/content/tuning/hero-moves.json`, `template/content/feels/land.json`
- Modify: `template/content/characters/hero.json`, `template/automata.toml`, `template/src/features/hero/hero.ts`,
  `template/src/features/page/page.ts`, `template/src/headless.ts`, the six `template/content/messages/*.json` and
  `template/automata.translations.toml`, `template/tests/features/hero/hero.test.ts`, `template/README.md`,
  `template/AGENTS.md`, `template/replays/level-1.json`, `skills/automata-content/SKILL.md`,
  `skills/automata-rules/SKILL.md`, `skills/automata-api/SKILL.md`, `README.md`, `docs/api/framework.api.md`
- Test: `tests/template/{actions,files,messages,words,replay.parity,page.browser}.test.ts`,
  `tests/create/create.journey.test.ts`, `tests/install/` (what the package holds), `tests/docs/`

**Interfaces:**
- Consumes: everything above. Produces nothing later tasks use.

What changes in the template:

- `hero.json` gains `"moves": { "tuning": "hero-moves" }` (walk and jump only, the Owner's Q2).
- `hero-moves.json`: the eight numbers walk and jump use (`walk-speed`, `walk-grip`, `air-grip`, `jump-speed`,
  `jump-cut`, `ledge-grace`, `early-press`, `fall-speed`), each with the spec's `about`, the framework's value, the
  framework's limits as its range and the step of Task 2; and `controls` with `left`, `right` and `jump` from
  `DEFAULT_HERO_CONTROLS`. Written as `writeContent` writes it.
- `land.json`: `on: "hero.landed"`, `dust` (6 specks, `#e8dcc0`, speed 2, life 18) and `buzz` (strength 0.3, 3
  ticks). The dust is the sign that is not a buzz; it is drawn when the feel runtime exists.
- `automata.toml` lists both, each with a one-line comment in the file's own voice.
- `hero.ts` keeps the score and nothing else: no `Hero` component, `systems: [countSparks]`.
- `page.ts` passes no `controls`; the keyboard hint is `playHint`; the `touch` settings section is opened beside
  `controls` and given to `startGame` as `touchSettings`. `headless.ts` keeps `actions`.
- The messages lose `hint.*` and `key.*` (the framework says them now) and keep `controls.*`.
- `README.md` and `AGENTS.md`: "to change how the hero moves, change a number in
  `content/tuning/hero-moves.json`"; "to give it a double jump, a wall jump or a dash, add the switch to
  `content/characters/hero.json`"; no movement code. Both stay under their line limits.
- The skills say the same, list the eighteen ids and the eight events, and say a game's own rules may run
  `after: ['level.moves']`.
- The framework's `README.md` gains a short section, "A hero with no code", with the two files.

- [ ] **Step 1: Change the tests first.** `actions.test.ts`: the template's `actions` are the tuning file's
  controls, in order. `files.test.ts`: no file under `template/src` reads `isHeld` or `wasPressed`, and none exports
  `CONTROLS`. `replay.parity.test.ts`: the scripted play (`hero-play.ts`, unchanged) still pushes the crate right,
  ends left of it and takes the spark. `page.browser.test.ts`: the touch tests ask for the two halves, not the three
  buttons. `create.journey.test.ts`, at each of its sizes: the new game is played from the start to the spark **by
  keyboard, by gamepad** (a pad the test puts in `navigator.getGamepads` before the page loads) **and by thumbs**,
  and its source has no movement code.
- [ ] **Step 2: Push; red.**
- [ ] **Step 3: Make the template's changes.** Empty the recorded hashes in `template/replays/level-1.json` the way
  `replay.parity.test.ts`'s header says a recording is taken, push, and commit what the node job prints. The commit
  message is `feat!: the template's hero is the framework's; template/replays/level-1.json moves` and its body says
  why (the game's own `hero` component goes, the move state and `physics.touching` come in, the content gains two
  files) and gives the final hash before and after.
- [ ] **Step 4: Push; green on every job,** `create` on three systems and `create-play` included. Commit the API
  report from the `package` job's log.
- [ ] **Step 5: Tell the coordinator** the golden moved, with the two hashes and one sentence on what the recorded
  play shows, for the Owner. Update the tracker to 100% of the tasks.

---

## Handoffs

- **AutomataFrameworkEditors, the redesign plan's Task 19 (Play).** It needs an amendment once this is merged and the
  pin moves. What it relies on, all from `@automataframework/framework`:
  - `startGame({ content, mount, host, locale, readPicture, level })` with no `controls` and no `plugins` plays any
    game whose hero has `moves`, with the thumb scheme on a touch screen. Task 19's G1 holds: `canPlay` is
    `usesMoves(content)`, the name plan H kept. A game without `moves` does not play: Task 19's notice
    (`playNeedsCode`) is the answer, as that plan says (audit I6; an earlier line here said "the physics-only
    picture", which the merged Editors plan does not do).
  - Task 19's `startPlay({ mount, content, level, art })`: the level as it is on screen goes in as
    `content.levels[id]` with `level: id`; `startGame` loads its own pictures through `readPicture` and takes no
    `Art`, so the editors pass the picture reader they draw with and `art` is not needed (the amendment's call).
    `host` is `webHost()`. Play passes no `settings` and opens none, so nothing is written to the device, which the
    editors' list of device keys requires.
  - Stop sits outside the mount, stacked above it: Task 12's test proves such an element takes its own touch and the
    half under it sees none, which answers Task 19's "a touch on Stop never starts a walk".
  - Which language Play speaks is settled (the Owner, 2026-11-14, the Editors plan audit's Q2, answer A): the
    editors' language when the game has it, else Play shows the game's flags once. Plan H changes nothing about it:
    Play builds a `Locale` that answers that language and passes it as `locale`, as plan W requires.
  - `MOVE_NUMBERS` (ids, the spec's `about`, values, limits, steps) is what the Tuner draws for a hero's tuning
    file; a slider never leaves the framework's limits. A Tuner change is a new content value and a new `startGame`:
    there is no changing a number inside a running game.
  - `heroControls(content)`, `playHint` and `teachHint` for the key and gamepad hints beside the canvas.
  - The halves take the game's own `--automata-touch-*` look; the editor's chrome never restyles them.
  - The game's own plugins (the template's score) do not run in Play.
  - The spec's "a Tuner change to `jump-speed` felt in the next Play" is the Feel editor's journey (M3, Tuner inside
    Feel), not Task 19's: Task 19 has no Tuner (audit M4).
- **Plan U (screens).** Settings gains two toggles, both in the `touch` section (`TouchSettingsSchema`,
  `TOUCH_SETTINGS_DEFAULT`): "Swap sides" (`game.input.setSwapSides`) and "Vibration: on / off"
  (`game.setVibration`; show it only where `host.canBuzz`). Pause stays in the top corner, above the halves. The
  remap screen names a key or a button with `inputName`. Hint counts kept across visits are plan U's to save.
- **Plan D (Examples).** The demo's hero gets `moves` with all three switches, a tuning file with all eighteen
  numbers and the four controls, and feel files that buzz on a landing, a wall jump and a dash, each with a sound
  or dust of its own. Its `move.ts` and `CONTROLS` go. Level one teaches walk and jump, level two the double jump,
  level three the wall jump and the dash, each with `teachHint` where the move is first needed and a clear sign when
  it is done. `replays/level-1.json` and `replays/test-game.json` move once, each named in its commit and shown to
  the Owner. Its journeys play the three levels by thumbs at a phone size and by keyboard. The pin moves to the
  commit that lands this plan.
- **Plan T (story).** Its plan (builder's call 8) now carries a note pointing here (audit I9). `on-ground` is
  `Touching.below`, if Task 4 is on `main` when plan T builds its senses; if plan T goes first, it keeps its own
  sense, and moving it later is plan T's change, with its own golden named: `createGameSim` asks for `touching` when a behaviour file
  uses that sense, and the critter's parts carry `Touching`. `blocked` may read `Touching.left` and `right`.
- **Plan S (audio).** `hero.jumped`, `hero.landed` and the other six are now the framework's own events, with
  `{ player, sid }`. A game with a built-in hero must not define events of those names itself.
- **The feel runtime (no plan yet; the audit's answer to where it lives).** In this repo, as its own plan (plan F),
  after this one and before plan D's demo step, whose "dust on landing" needs it; see the plan audit's "The feel
  runtime". Until it is built the template's `land.json` buzzes and its dust is not drawn, so on Android the buzz is
  briefly the only sign of a landing besides the landing itself: plan F closes that. It takes `game/buzz.ts` in and draws `dust`, `shake` and `freeze` from the
  same events. Until then a feel file's `buzz` works and its other three effects are read and not drawn.
- **Release 4 (Tauri).** Real haptics are that adapter's `buzz`, with the strength the web cannot give.

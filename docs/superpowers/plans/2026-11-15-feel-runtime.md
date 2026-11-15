# Plan F: The Feel Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A feel file's `dust`, `shake` and `freeze` are drawn when its event fires, in a game played alone, watched or
online, with a "Screen shake" setting a player can turn off and a `showFeel` call that plays one file on demand for the
Feel editor.

**Architecture:** A new pure feature, `feel`, hears each step's events (as `audio.hear` does) and gives back plain data
for each drawn frame: the specks, the shake offset and how long the picture is held. `render` draws that data (a dust
layer in the stage, an offset on it, a held picture). `game` wires it: one small file feeds the runtime and plan H's
buzzer from the same steps, and the loop learns to hold. `host` learns to say the device asked for less motion.
Nothing reaches the sim, so no recorded hash moves.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.6.6, PixiJS 8.22.0, Vitest 5.0.3 (browser mode and journeys on
Playwright 1.63.0), Biome 2.5.15, knip 6.39.0, pnpm 10.34.6, Node 24.21.0. **No new dependency.**

**Spec:** [`docs/superpowers/specs/2026-11-15-feel-runtime-design.md`](../specs/2026-11-15-feel-runtime-design.md), an
addendum to [`2026-11-14-m2-design.md`](../specs/2026-11-14-m2-design.md). Read the spec first; this plan argues from
it and does not repeat its reasons. Principles served: 1 (an effect is one documented JSON file and the runtime adds no
state; the pure part answers "what would this frame show?" with no page), 2 (the Feel editor's "Show me" runs the
framework's own drawing on an iPad) and the onboarding rule (a drawn sign beside every buzz).

## Global Constraints

- **Mobile first.** Every browser test and journey runs at phone size first (390x844 upright, 844x390 sideways), then
  tablet (820x1180, 1180x820), then desktop (1280x720). Nothing drawn here may cover or move a touch control.
- **No golden moves.** Everything in `tests/golden/` and `template/replays/level-1.json` keeps its hashes, with feel
  files present, in all four engines. If one differs in CI, stop that task and report it. Never re-record.
- **One new golden:** `tests/golden/feel-frames.json` (Task 4), committed with `"finalHash": ""` and recorded from
  CI. Its commit names it.
- **No new dependency.** If a task seems to need a package, stop and report.
- **Effects are presentation only.** No file under `src/features/feel/` or `src/features/game/feel-wiring.ts` may
  call `sim.step`, send a command or write a component. `feel` is a pure feature: no clock, no `Math.random`, no I/O.
- **Feel math:** `+ - * /`, comparisons, `Math.min`, `Math.max`, `Math.abs`, `Math.floor`, `Math.ceil`, `Math.imul`
  and bit operators, and `sim/dmath.ts` (`sin`, `cos`) for anything else, so the same events and frame times give the
  same frames in Node and the three browsers.
- **The spec's numbers:** at most **256** specks on screen; a speck is **1/8 tile** and never under **2 device
  pixels**; no hold runs past **30 ticks**; a shake is at most the file's `strength` (itself at most 1 tile) and is
  rounded to whole device pixels; two shakes take the larger, never the sum.
- **y points down.** Up is a negative speed. A tick is `1 / tickHz` of a second (60 by default).
- **Words:** the switch is called "Screen shake". It passes the drunk-grandma test in every language.
- **No file over 600 lines.** `render/stage.ts` is at 354, `game/online.ts` at 348, `game/game.ts` at 268.
- **Tests run only in GitHub-hosted CI.** Run nothing locally: no `pnpm install`, typecheck, lint or test. Push, then
  read the pull request's CI run. Write each test first and push it red before its code.
- **Generated files.** `docs/api/framework.api.md` is committed. When the `package` job fails on `pnpm api-report`,
  take the new text from that job's log and commit it.
- **Commits:** author and committer `McThayDT <107786093+mcthaydt@users.noreply.github.com>`; set the config before
  every commit; no AI attribution anywhere; never force-push.
- **An Owner question is never defaulted.** Send it to the coordinator with options and a recommendation, and wait.
- **Tracker:** after each task, update `docs/superpowers/progress.md` (Cycle 9, the feel runtime). Tasks 1 to 12 are
  7.5% each; Task 13 is 5% (when plan U's settings screen is not on `main` it stays a handoff and its 5% joins the
  last run's); the last 5% is the final green run with every check passing.

## Before starting

- **Plan H must be on `main`** (PR 101). This plan uses its `game/buzz.ts`, `Host.buzz`, the `hero.*` events with
  `{ player, sid }`, `tests/fixtures/moves/` and the template's `content/feels/land.json`. If any is missing, stop
  and report.
- **A feel file is not the sim's content** (audit C1). `src/features/level/sim-content.ts` must have `'feel'` in
  `LEFT_OUT` and take out the `feels` map, with a test in `tests/features/level/sim-content.parity.test.ts` like the
  sound one: the full game with and without its three feel files has the same `contentHash`. The audit asked plan H's
  build to add it before its Task 14 records `template/replays/level-1.json`. If it is not on `main`, Task 1 adds it;
  if a recorded hash then moves (a golden recorded with a feel file in its content), stop and report it with the
  before and after hashes: a golden moves only with the Owner seeing.
- **Plan U (PR 103) may land before or after.** If its Task 2 is on `main`, `game/loop.ts` and `game/game.ts` already
  carry `onStep`, `paused` and `broken`: keep them, and add this plan's lines beside them. The feel wiring hears a step
  in the same place `onStep`'s listeners do.
- **The Owner's two answers are in the spec** (freeze is a real pause offline and a held picture online; one "Screen
  shake" switch, on by default, off first under reduced motion). No Owner question is open.

## The builder's calls

The spec leaves these to the plan, or is silent. They are settled here so the executor makes none of them.

1. **Where `feel` sits.** In `LAYERS`, after `server` and before `render`, and in `PURE_FEATURES`. It imports
   `content` (the file's types and schema), `sim` (`SimEvent`, `dmath`) and `level` (`colourNumber`).
2. **A speck's path is a formula of its age,** not a sum over frames, so chopping time differently never changes
   where it is. With `u = age / life` (0 to 1): `x = x0 + vx * life * (u - u*u/2)`,
   `y = y0 + vy * life * (u - u*u/2) + 0.25 * u*u` (it slows to a stop and sinks a quarter of a tile), and it fades as
   `1 - u*u`. Its direction is within 60 degrees of straight up and its speed is half to all of the file's `speed`,
   both from the noise.
3. **Noise** is a 32-bit mix of four integers (the seed, the event's tick, the thing's `sid`, a counter) with
   `Math.imul`; Task 1 gives the code. A `play` uses a tick of its own that counts down from -1, so two "Show me"
   presses differ and neither can match a heard event.
4. **A shake** changes direction 30 times a second: at age `a`, `beat = floor(a * 30)`, the size is
   `strength * (1 - a / length)` and each axis is `size * (2 * noise - 1)`. Of several shakes the one with the
   larger size now is the one shown.
5. **Where dust starts:** the bottom middle of the thing's box as of the newest step when the scene still has it, and
   as of the last picture drawn when it was taken away in that step. The spec says "the last picture drawn" so a
   taken spark keeps its place; for a thing still there that would start a landing's dust up to a frame's fall above
   the ground, and the spec's own test asks for dust "at its feet". *A deviation in words, not in what the spec
   wants; the audit should check it.*
6. **Who counts a hold down.** The feel runtime, from the frame times it is given. A hold of the whole game is
   spent by `hold(seconds)`: the loop asks it first in every frame and takes what was held out of the time before
   counting steps, so held time is never owed, and a hold that starts in a step stops the rest of that frame's
   steps. A hold of the picture only (online, and `play`) is spent by `frame(seconds)` with the dust, so it also
   runs in a paused game, where a hold of the game waits. Neither kind is spent by the frame it starts in, so a
   freeze of four ticks is four ticks.
7. **The held picture is the first one drawn after the freeze starts,** so a spark taken in that step is already
   gone from it. While held, `render` draws that same picture again with the new dust.
8. **Shake moves the level, its things, the ropes and the dust.** The backdrop and the sky strip that covers the
   thumbs' room do not move. `heroes()` answers without the offset, so nothing that follows a hero's box jitters.
9. **`begin()` drops a game hold** and forgets the last tick; specks and shakes already flying finish. A new sim
   never starts frozen.
10. **Watch mode** restores the sim to tick 0 between rounds, so it calls `begin()` at each restore; without it the
    second round would be silent. Its freeze is a real pause (the spec's "offline"). It never buzzes: it makes no
    buzzer. It has no `showFeel`: the Feel editor plays the real level with `startGame`. Add it when an editor needs it.
11. **`showFeel` while paused** needs frames the stopped loop does not ask for: while the game is paused by hand and
    the feel is not idle, a small pump (`game/still-frames.ts`) asks for frames and draws the same picture with the
    feel's next frame. It never runs while the page is hidden.
12. **`showFeel`'s buzz** is asked for player 1 under plan H's rules. Its dust starts at `at`, or at the hero of the
    lowest player when `at` is left out; with no such thing it makes no dust and still shakes and holds.
13. **Content that never went through `loadGame`** (an editor's game in memory) plays inside the schema's limits:
    `count` at most 64, `speed` at most 32, `life` at most 120 ticks, `strength` at most 1, shake `ticks` at most 60,
    freeze at most 30. A number that is not finite makes that one effect do nothing. `showFeel` is stricter: it
    refuses a file the schema refuses.
14. **The settings are plain data in `feel`,** as `TouchSettings` is in `input`: a schema, `feelSettingsFirst(reduced)`
    and `feelSettingsOf(saved, reduced)`. `startGame` takes `feelSettings?: unknown`; anything that does not read as
    the section starts from what the host says about motion. Saving it is the page's job (plan U).
15. **The word** is `automata.feel.shake` in the framework's library, in six languages, so plan U only shows it.
16. **`Game.feel()`** gives the `FeelFrame` of the last picture drawn. It is how a test, an agent or the Feel editor
    reads what is on screen without reading pixels.
17. **The template is not rewired.** Its `land.json` (plan H) is drawn as soon as this lands; `startGame`'s own answer
    covers a first visit under reduced motion. Opening the `feel` section in the template's page is plan K's Step U.

## Review Focus

Each line names its test and the task that owns it.

1. **A tab that slept: one frame of ten seconds.** Every speck, shake and hold is over, nothing is `NaN`, no fade is
   below 0, and the game takes at most `MAX_STEPS_PER_FRAME` steps. Task 4, `feel.test.ts`; Task 7, `loop.test.ts`.
2. **The phone is turned during a shake or a freeze, or while paused with dust in the air.** The picture put back
   has the same specks and offset, and once the shake is over a later resize draws no offset. Task 6,
   `feel.browser.test.ts` (render).
3. **The sim goes back in time: a watch's next round, an online re-sync, a new level.** The first landing after it
   still makes dust, and no hold from before carries over. Task 4, `feel.test.ts`; Task 9, `watch` and `online` tests.
4. **A flood: forty events in one step, each with dust, a shake and a freeze.** 256 specks at most (the newest
   kept), one hold of at most 30 ticks, the largest shake, and a frame is still drawn. Task 4, `feel.test.ts`.
5. **An event that names nothing usable:** a payload of `null`, a `sid` that is a string, a thing never drawn, a
   draft with `count: 10000` or `NaN`. No dust and no throw from `hear`; shake and freeze still happen; `showFeel`
   refuses the draft in words. Task 4, `feel.test.ts`; Task 10, `show-feel.browser.test.ts`.

## File Structure

```
tests/architecture/rules.ts             feel in LAYERS and PURE_FEATURES
src/features/feel/feel.ts               NEW entry: createFeel, Feel, FeelFrame, FeelSpeck, FeelPlace, the re-exports
src/features/feel/noise.ts              NEW four integers in, a number from 0 to 1 out
src/features/feel/dust.ts               NEW a burst's specks and where one is at an age
src/features/feel/shake.ts              NEW a shake's offset at an age
src/features/feel/limits.ts             NEW the schema's limits applied to a file that was never checked
src/features/feel/settings.ts           NEW FeelSettings, its schema, its first values
src/features/host/{host,test}.ts        reducedMotion
src/features/web/web.ts                 reducedMotion through matchMedia
src/features/render/stage.ts            the dust layer, the offset
src/features/render/render.ts           draw(alpha, feel), place(sid), the held picture
src/features/level/join.ts              firstHeroSid
src/features/game/loop.ts               hold, held, the frame's time given to draw
src/features/game/feel-wiring.ts        NEW the runtime and the buzzer fed from the same steps
src/features/game/still-frames.ts       NEW frames for a paused game whose feel is still moving
src/features/game/buzz.ts               play(feel, player)
src/features/game/{game,watch,online}.ts  the wiring; setShake, feel, showFeel
src/features/locale/library/*.json      + automata.feel.shake
src/headless.ts                         + the feel feature
tests/fixtures/feel/                    NEW the feel game (the moves game plus three feel files), its script, its page
tests/golden/feel-frames.json           NEW
tests/                                  mirrors the above
README.md, skills/                      what a feel file now does on screen
```

---

### Task 1: The `feel` feature's place, its noise and its settings

**Golden impact:** none.

**Files:**
- Create: `src/features/feel/feel.ts` (the re-exports only, for now), `noise.ts`, `settings.ts`,
  `tests/features/feel/noise.test.ts`, `tests/features/feel/settings.test.ts`
- Modify: `tests/architecture/rules.ts`, `src/headless.ts` (the export, and the feature named in its first comment),
  `tests/public-surface.test.ts`, and `src/features/level/sim-content.ts` only if "Before starting" found `'feel'`
  missing from `LEFT_OUT`
- Test: `tests/architecture/rules.test.ts`, `tests/public-surface.test.ts`

**Interfaces:**
- Produces:

```ts
// noise.ts
/** The same four integers always give the same number, 0 up to but not 1, in every engine. */
export function noise(a: number, b: number, c: number, d: number): number
// settings.ts
export interface FeelSettings { readonly format: 1; /** False: no shake is drawn. */ readonly shake: boolean }
export const FeelSettingsSchema: z.ZodType<FeelSettings, FeelSettings>   // strict
/** What a new player starts with: shake on, unless the device asked for less motion. */
export function feelSettingsFirst(reducedMotion: boolean): FeelSettings
/** What a saved value says, or `feelSettingsFirst(reducedMotion)` for anything that does not read as the section. */
export function feelSettingsOf(saved: unknown, reducedMotion: boolean): FeelSettings
```

- [ ] **Step 1: Write the failing tests.**

```ts
// rules.test.ts
test('feel may import content, sim and level, and render may import feel', …)      // no violation
test('feel may not import render, and may not read a clock or Math.random', …)     // both are violations
test('feel may not use a Math function an engine may round its own way', …)        // Math.sin, Math.pow: violations (audit M6)
// public-surface.test.ts: the headless entry exports feelSettingsFirst, feelSettingsOf and FeelSettingsSchema
// noise.test.ts
test('the same four numbers give the same answer, and it is from 0 up to but not 1', …)   // 10 000 draws
test('changing any one of the four changes the answer', …)
test('ten thousand draws fill ten equal bins with 800 to 1200 each', …)
// settings.test.ts
test('a new player has shake on', () => expect(feelSettingsFirst(false)).toEqual({ format: 1, shake: true }))
test('a device that asks for less motion starts with shake off', () => expect(feelSettingsFirst(true).shake).toBe(false))
test('a saved choice wins whatever the device says', () =>
  expect(feelSettingsOf({ format: 1, shake: true }, true).shake).toBe(true))
test('anything that does not read as the section is the first values', …)   // undefined, {}, { shake: 'yes' }, an extra key
```

- [ ] **Step 2: Push; red.**
- [ ] **Step 3: Build.** `LAYERS` gains `'feel'` between `'server'` and `'render'`; `PURE_FEATURES` gains it, with a
  line in its comment ("its only clock is the frame times it is handed"). The painter's `PAINTER_MATH` check also
  covers every file under `src/features/feel/` (its comment says why: the frames are a golden in four engines).
  `src/headless.ts` exports the feature. The noise, exactly:

```ts
const mix = (h: number, k: number): number => {
  let x = (h ^ Math.imul(k | 0, 0x9e3779b1)) | 0
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return (x ^ (x >>> 16)) | 0
}
export const noise = (a: number, b: number, c: number, d: number): number =>
  (mix(mix(mix(mix(0x2545f491, a), b), c), d) >>> 0) / 4294967296
```

- [ ] **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(feel): the feature's place, its noise and the screen shake setting as plain data`

### Task 2: Dust, as numbers

**Golden impact:** none.

**Files:**
- Create: `src/features/feel/dust.ts`, `src/features/feel/limits.ts`, `tests/features/feel/dust.test.ts`,
  `tests/features/feel/limits.test.ts`

**Interfaces:**
- Consumes: `noise`; `Dust`, `Shake`, `Freeze`, `FeelFile` (`content`); `sin`, `cos` (`sim/dmath.ts`);
  `colourNumber` (`level`).
- Produces:

```ts
// dust.ts
export const MAX_SPECKS = 256
/** A speck's side, in tiles. */
export const SPECK_SIZE = 0.125
/** One speck in flight: where it started, how fast, and how old it is, in tiles and seconds. */
export interface Speck {
  readonly x0: number; readonly y0: number; readonly vx: number; readonly vy: number
  readonly color: number; readonly life: number; age: number
}
/** One speck as it is drawn: its middle and side in tiles, its colour (0xrrggbb) and how solid it is (1 to 0). */
export interface FeelSpeck {
  readonly x: number; readonly y: number; readonly size: number; readonly color: number; readonly alpha: number
}
/** The specks of one burst, all starting at `at`. `key` is what makes this burst's noise its own. */
export function burst(dust: Dust, at: { readonly x: number; readonly y: number },
  key: { readonly seed: number; readonly tick: number; readonly sid: number }, tickHz: number): Speck[]
/** Where a speck is now; `undefined` once its age has reached its life. */
export function speckAt(speck: Speck): FeelSpeck | undefined
// limits.ts
/** The file with every number inside the schema's limits; an effect with a number that is not finite is left out. */
export function withinLimits(feel: FeelFile): FeelFile
```

Speck `i` of a burst: `angle = (noise(seed, tick, sid, 2*i) * 2 - 1) * (PI / 3)` (a constant written out, not
`Math.PI`), `speed = dust.speed * (0.5 + 0.5 * noise(seed, tick, sid, 2*i + 1))`, `vx = speed * sin(angle)`,
`vy = -speed * cos(angle)`, `life = dust.life / tickHz`. The path is builder's call 2.

- [ ] **Step 1: Write the failing tests.**

```ts
const DUST = { count: 6, color: '#e8dcc0', speed: 2, life: 18 }   // the template's land.json
test('a burst has `count` specks, all starting at the place, in the file\'s colour', …)   // 6, color 0xe8dcc0
test('every speck starts going up, within 60 degrees of straight up, at half to all of the speed', …)  // vy < 0, |vx| <= |vy| * 1.7321, 1 <= speed <= 2
test('the same key gives the same burst; another tick or sid gives another', …)
test('a speck is drawn at full strength at age 0 and is gone at its life', …)       // alpha 1; undefined at 18/60 s
test('a speck fades and never goes below 0 or above 1', …)                          // 100 ages across its life
test('a speck ends a quarter of a tile below where its speed alone would leave it', …)   // y at u just under 1
test('a speck is an eighth of a tile', () => expect(speckAt(first)?.size).toBe(0.125))
// limits.test.ts
test('count 10000 plays as 64, strength 5 as 1, a freeze of 500 ticks as 30', …)
test('a NaN speed leaves the dust out and keeps the shake', …)
test('a file inside the limits comes back unchanged', …)
```

- [ ] **Step 2: Push; red.** **Step 3: Build.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(feel): a burst of dust as numbers, and the limits a file plays inside`

### Task 3: Shake, as numbers

**Golden impact:** none.

**Files:**
- Create: `src/features/feel/shake.ts`, `tests/features/feel/shake.test.ts`

**Interfaces:**
- Produces:

```ts
/** How many times a second a shake changes direction. */
export const SHAKE_HZ = 30
/** One shake in progress, in tiles and seconds. */
export interface Shaking {
  readonly strength: number; readonly length: number; readonly seed: number; readonly tick: number; age: number
}
/** The offset now, in tiles, and how big the shake still is; all zero once its age has reached its length. */
export function shakeAt(shake: Shaking): { readonly x: number; readonly y: number; readonly size: number }
/** The offset of the shake that is biggest now; zero for none. */
export function largestShake(shakes: readonly Shaking[]): { readonly x: number; readonly y: number }
```

The formula is builder's call 4: `x` uses `noise(seed, tick, beat, 0)`, `y` uses `noise(seed, tick, beat, 1)`.

- [ ] **Step 1: Write the failing tests.**

```ts
test('at its start the offset is at most the strength on each axis', …)             // strength 0.4: |x|, |y| <= 0.4
test('it fades: the size is half at half its length and zero at the end', …)
test('the offset holds for a thirtieth of a second, then changes', …)
test('two shakes take the larger, never the sum', …)   // 0.2 and 0.6 together: |x|, |y| <= 0.6 and equal to the 0.6 shake alone
test('no shake is a zero offset', () => expect(largestShake([])).toEqual({ x: 0, y: 0 }))
```

- [ ] **Step 2: Push; red.** **Step 3: Build.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(feel): a shake as numbers`

### Task 4: `createFeel`: events in, frames out

**Golden impact:** none moves. **New:** `tests/golden/feel-frames.json`.

**Files:**
- Modify: `src/features/feel/feel.ts`
- Modify: `tests/public-surface.test.ts` (`createFeel`, `MAX_FREEZE_TICKS`)
- Create: `tests/features/feel/feel.test.ts`, `tests/features/feel/feel-frames.parity.test.ts`,
  `tests/golden/feel-frames.json`, `tests/fixtures/feel/script.ts`

**Interfaces:**
- Consumes: Tasks 1 to 3.
- Produces:

```ts
/** A thing's box, in tiles: its middle and its size. */
export interface FeelPlace { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
/** What one drawn frame shows of the game's feel. Plain data. */
export interface FeelFrame {
  readonly specks: readonly FeelSpeck[]
  /** How far the level's picture is moved, in tiles. */
  readonly shake: { readonly x: number; readonly y: number }
  /** Ticks the picture is still held for, rounded up; 0 for none. */
  readonly freeze: number
}
export const MAX_FREEZE_TICKS = 30
export interface FeelOptions {
  readonly content: Pick<GameContent, 'feels'>
  readonly tickHz: number
  readonly settings: FeelSettings
  /** Makes this game's noise its own. Default 0. */
  readonly seed?: number
  /** What a heard freeze holds: the whole game (the loop waits) or only the picture. Default 'game'. */
  readonly freezes?: 'game' | 'picture'
}
export interface Feel {
  /** A new sim is about to be heard: forgets the last tick and drops a game hold. Dust and shakes in flight finish. */
  begin(): void
  /** Answers one step's events. A step whose tick was already heard is ignored. Never throws. */
  hear(step: { readonly tick: number; readonly events: readonly SimEvent[] }): void
  /** Fires one feel file now, at the thing `at` (no dust when left out). Its freeze holds the picture only. */
  play(feel: FeelFile, at?: number): void
  /** Spends this frame's time on a hold of the whole game, and answers the seconds it spent. The loop calls it first. */
  hold(seconds: number): number
  /**
   * Moves the dust, the shakes and a hold of the picture on by this frame's time and says what to draw. `place`
   * answers where a thing is.
   */
  frame(seconds: number, place: (sid: number) => FeelPlace | undefined): FeelFrame
  setSettings(settings: FeelSettings): void
  /** True while the whole game is held. */
  readonly holding: boolean
  /** True when there is nothing to draw and nothing held. */
  readonly idle: boolean
}
export function createFeel(options: FeelOptions): Feel
```

Rules the tests pin:
- An event is answered by every file whose `on` equals its `type`, in id order, each through `withinLimits`. Files
  are read once, at `createFeel`.
- The thing an event names is `payload.sid` when it is a whole number; anything else names nothing.
- A burst waits for the next `frame`, which asks `place(sid)` once and starts it at `{ x, y: y + h / 2 }`; no place,
  no dust. A burst is never older than the frame that starts it (it starts at age 0 and is drawn in that frame).
- Past `MAX_SPECKS`, the oldest specks go first.
- A freeze of `n` ticks sets its hold (the game's, or the picture's for `play` and for `freezes: 'picture'`) to the
  later of what is left and `n / tickHz`, and a hold never ends more than `MAX_FREEZE_TICKS / tickHz` after the
  moment it began (audit I3): extending it never moves that limit, so a stream of sparks online or of "Show me"
  presses cannot hold the picture for good. Once a hold is over, the next freeze starts a new one. `hold(s)` spends `s` on the
  game's hold and answers `min(s, what it had left)`. `frame(s)` spends `s` on the picture's hold, except one that
  started since the last frame. `freeze` is the larger of the two that is left, in ticks, rounded up
  with slack: what is left under a millionth of a second is none, and `ceil(left * tickHz - 1e-6)` (audit M5, as the
  loop's `SLACK_MS`).
- `frame` moves dust and shakes on even while held. A negative or non-finite `seconds` counts as 0, in both.
- With `settings.shake` false the offset is `{ x: 0, y: 0 }`; the shake still ages, so turning it on mid-shake shows
  the rest.

- [ ] **Step 1: Write the failing tests.** `feel.test.ts`, with a made-up content of three files (`land`: dust on
  `hero.landed`; `thud`: shake 0.4 for 12 ticks on `crate.dropped`; `spark`: freeze 4 on `spark.taken`) and
  `place = (sid) => (sid === 7 ? { x: 3, y: 5, w: 1, h: 2 } : undefined)`:

```ts
test('an event fires each matching file once, in id order', …)
test('a tick heard twice fires once, and after begin() the same tick fires again', …)          // Review Focus 3
test('an event no file is on, or a name a game made up with no file, does nothing', …)
test('dust starts at the bottom middle of the named thing', …)                                 // every speck at age 0: x 3, y 6
test('`count` specks, all gone after `life` ticks of frames', …)                               // 6, then 0 after 18 frames of 1/60
test('an event that names no thing makes no dust, and its shake and freeze still happen', …)   // payload null, sid 'a', sid 99
test('past 256 specks the oldest go first', …)                                                 // five bursts of 64: 256, none from the first
test('a shake starts within its strength, is zero after its ticks, and two take the larger', …)
test('shake off in the settings is a zero offset; on again shows what is left', …)
test('a freeze reports its ticks and counts down as time is held', …)                          // 4, then 3 after hold(1/60) and a frame
test('a hold of the picture is not spent by the frame it starts in: four ticks is four frames of 1/60 held', …)
test('a second freeze extends the hold to the later end, and no hold is past 30 ticks', …)
test('a picture hold extended every 20 ticks is over 30 ticks after it began, and the next frame is not held', …)  // audit I3
test('4/60 s less 1/60 s held is 3 ticks, not 4: the rounding has slack', …)                   // audit M5
test('with freezes "picture", hold answers 0 and the frames count the freeze down', …)
test('play fires one file at a thing; its freeze never holds the game', …)
test('dust keeps moving while held', …)
test('forty events in one step: 256 specks, one hold of 30 ticks at most, the largest shake', …)   // Review Focus 4
test('one frame of ten seconds ends everything: idle, no NaN, no fade below 0', …)             // Review Focus 1
test('a file never checked plays inside the limits', …)                                        // count 10000 makes 64
test('idle is true before anything, false with a speck, a shake or a hold, and true again after', …)
```

  `feel-frames.parity.test.ts` runs `tests/fixtures/feel/script.ts` (a fixed list of steps and frame times: a
  landing, a drop, a spark, two overlapping shakes, uneven frames of 1/60, 1/120, 1/30 and 0.25 s), hashes the
  canonical JSON of every frame with `lib/canonical.ts` and `lib/xxhash64.ts`, and compares with
  `tests/golden/feel-frames.json` through `expectGolden` (`ticks` is the number of frames, `checks` is empty).

- [ ] **Step 2: Push; red** (the parity test says GOLDEN NOT RECORDED once the code is in).
- [ ] **Step 3: Build `createFeel`.**
- [ ] **Step 4: Push; record.** Commit the JSON the Node job prints into `tests/golden/feel-frames.json`; push;
  green in Node and the three browsers.
- [ ] **Step 5: Commit** `feat(feel): events in, frames out; tests/golden/feel-frames.json is new`

### Task 5: The host says when the device asked for less motion

**Golden impact:** none.

**Files:**
- Modify: `src/features/host/host.ts`, `src/features/host/test.ts`, `src/features/web/web.ts`, and every hand-made
  `Host` under `tests/`
- Test: `tests/features/host/test-host.test.ts`, `tests/features/web/web.browser.test.ts`

**Interfaces:**
- Produces:

```ts
export interface Host {
  /** True where the device asked for less motion (a phone's "Reduce Motion"). Read when a game starts. */
  reducedMotion(): boolean
}
// TestHostOptions.reducedMotion?: boolean (default false)
// WebSeams.matchMedia?: (query: string) => { readonly matches: boolean }   (default window.matchMedia, when the page has one)
```

`webHost` asks `(prefers-reduced-motion: reduce)`; a page with no `matchMedia`, or one that throws, answers false.

- [ ] **Step 1: Failing tests.** `test-host.test.ts`: false by default, true when asked. `web.browser.test.ts`: the
  seam's answer is the host's; no `matchMedia` is false; one that throws is false.
- [ ] **Step 2: Push; red.** **Step 3: Build.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(host): a host says when the device asked for less motion`

### Task 6: The renderer draws a feel frame

**Golden impact:** none.

**Files:**
- Modify: `src/features/render/stage.ts`, `src/features/render/render.ts`
- Create: `tests/features/render/feel.browser.test.ts`

**Interfaces:**
- Consumes: `FeelFrame`, `FeelPlace` (Task 4).
- Produces:

```ts
export interface Renderer {
  /** As before; `feel` adds the dust and the shake, and while `feel.freeze` is above 0 the picture is held. */
  draw(alpha: number, feel?: FeelFrame): void
  /**
   * A thing's box in tiles: as of the newest step when the scene has it, else as of the last picture drawn (a thing
   * taken away in the newest step). `undefined` for a thing that was never drawn.
   */
  place(sid: number): FeelPlace | undefined
}
// stage.ts
draw(views: readonly View[], links: readonly RopeLine[], shot?: Shot,
  feel?: { readonly specks: readonly FeelSpeck[]; readonly shake: { readonly x: number; readonly y: number } }): void
```

- The stage gains `dustLayer` (one `Graphics`, cleared and filled each paint) between `linkLayer` and `cover`, with
  the same fit. A speck is a square of side `max(size, 2 / (fit.scale * resolution))` tiles, centred, filled with its
  colour at its alpha.
- The offset is `snap(shake.x * fit.scale)` and `snap(shake.y * fit.scale)` CSS pixels, added to the position of
  `root`, `linkLayer` and `dustLayer` only. `Stage.fit` and `Renderer.heroes()` answer without it.
- `last` keeps the feel too, so `resize`, `setInset`, `setRoom` and a density change put the same picture back.
- The held picture (builder's call 7): `render.ts` keeps what it last gave the stage. When `feel.freeze > 0` and the
  frame before was also frozen, it gives the stage those same views, links and shot with the new feel; `drawnAt` does
  not move. A `draw` with no `feel` is exactly as before. `heroes()` answers from the views the held picture shows
  (audit I5), so anything placed over a hero (plan U's number over each hero) stays on the held picture.

- [ ] **Step 1: Write the failing tests** (three engines; the box fixture of `render.browser.test.ts`; pixels through
  `tests/fixtures/game/pixels.ts`), each at 390x844 first:

```ts
test('a speck is drawn in its colour where the frame says, over a box', …)
test('a speck on a phone-size level is never under two device pixels', …)                 // a 64-tile-wide world at 390 px
test('a faded speck lets what is under it show', …)                                       // alpha 0.5: between the two colours
test('a shake moves the box by whole device pixels and the canvas does not move', …)
test('heroes() answers the same box with and without a shake', …)
test('while the picture is held, heroes() answers the held box though a step moved the hero', …)   // audit I5
test('no shake in the frame puts the box back exactly', …)
test('while the frame says freeze, the box stays where it was drawn though a step moved it, and the dust still moves', …)
test('the first frame of a freeze shows the newest step', …)                              // a thing removed in that step is gone
test('after the freeze the box is where the sim has it', …)
test('place answers the newest step for a thing there, the last picture for one just removed, and undefined for one never drawn', …)
test('turning the mount during a shake puts back the same specks and offset; after the shake a resize has none', …)  // Review Focus 2
test('dust is under the sky strip kept for the thumbs', …)                                // setInset(120): a speck there is not drawn over it
```

- [ ] **Step 2: Push; red.** **Step 3: Build.** **Step 4: Push; green; look at the `screens-*` pictures.**
- [ ] **Step 5: Commit** `feat(render): dust, a shake and a held picture, drawn from a feel frame`

### Task 7: The loop can hold

**Golden impact:** none.

**Files:**
- Modify: `src/features/game/loop.ts`
- Test: `tests/features/game/loop.test.ts`

**Interfaces:**
- Produces:

```ts
export function createLoop(options: {
  tickHz: number
  step: () => void
  /** `ms` is the time this frame took, held or not. */
  draw: (alpha: number, ms: number) => void
  frames: Frames
  /** Called first in every frame with the milliseconds that passed; answers how many of them the game was held for. */
  hold?: (ms: number) => number
  /** Asked before each step; true takes no more steps this frame. */
  held?: () => boolean
}): Loop
```

In a frame: `passed` is measured as today; `held = hold?.(passed) ?? 0` (kept within 0 to `passed`) is taken out
before the pool is added to, so it is never owed; steps run while the pool has a tick, the cap is not reached and
`held?.()` is false; the "a whole tick behind is dropped" rule applies only when the cap stopped the steps, not a
hold; `draw(alpha, passed)`. Stopping and starting the loop does not touch a hold: it belongs to whoever answers
`hold`, so pausing during one keeps the rest.

- [ ] **Step 1: Write the failing tests** (a fake `hold`/`held` that holds for a set number of milliseconds once a
  chosen step has run):

```ts
test('a hold of four ticks: the next four 60 Hz frames take no step and the fifth takes one', …)
test('after a hold the tick count goes on one a frame: nothing is caught up', …)          // 20 more frames, 20 steps
test('a hold that starts in a step stops the rest of that frame\'s steps, and they are taken after it', …)   // a 30 Hz frame
test('draw is called in every held frame, with the same alpha and the frame\'s time', …)
test('a frame longer than the hold steps for what is left over, and no more', …)          // hold 2 ticks, one frame of 5
test('stopping and starting during a hold does not shorten it', …)
test('one frame of ten seconds during a hold takes at most MAX_STEPS_PER_FRAME steps', …)  // Review Focus 1
test('with no hold and no held the loop is as it was', …)                                 // the existing tests stay as they are
```

- [ ] **Step 2: Push; red.** **Step 3: Build.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(game): the loop can hold still without owing the time`

### Task 8: A game played alone draws its feel

**Golden impact:** none. This task proves it: see its last test.

**Files:**
- Create: `src/features/game/feel-wiring.ts`, `tests/features/game/feel-wiring.test.ts`,
  `tests/features/game/feel.browser.test.ts`, `tests/fixtures/feel/game.ts`,
  `tests/features/feel/goldens.parity.test.ts`
- Modify: `src/features/game/game.ts`

**Interfaces:**
- Consumes: `createFeel` (Task 4); `Host.reducedMotion` (Task 5); `Renderer.draw`, `place` (Task 6); the loop's
  `hold` and `held` (Task 7); `createBuzzer` (plan H).
- Produces:

```ts
// feel-wiring.ts
export interface FeelWiring {
  begin(): void
  /** One step, to the feel and to the buzzer. */
  hear(step: { readonly tick: number; readonly events: readonly SimEvent[] }): void
  /** The loop's `hold`, in milliseconds. Only for a game whose freezes hold the game. */
  hold(ms: number): number
  readonly holding: boolean
  /** Draws the picture with this frame's feel: `feel.frame(ms / 1000, renderer.place)`, then `renderer.draw`. */
  draw(alpha: number, ms: number): void
  setShake(on: boolean): void
  setVibration(on: boolean): void
  /** The feel of the last picture drawn. */
  frame(): FeelFrame
  readonly idle: boolean
}
export function createFeelWiring(options: {
  readonly content: GameContent
  readonly host: Pick<Host, 'buzz' | 'canBuzz' | 'reducedMotion'>
  readonly renderer: Pick<Renderer, 'draw' | 'place'>
  readonly tickHz: number
  readonly seed: number
  /** The saved `feel` section, as the settings kept it. */
  readonly feelSettings: unknown
  readonly freezes: 'game' | 'picture'
  /** Left out, nothing ever buzzes (a watched replay). */
  readonly buzz?: { readonly device: (player: number) => DeviceKind; readonly on: boolean }
}): FeelWiring
// game.ts
export interface GameOptions {
  /** What the player chose about feel (`FeelSettings`, as the settings kept it). Anything else: shake on, unless the device asked for less motion. */
  readonly feelSettings?: unknown
}
export interface Game {
  /** The player's setting: whether the picture may shake. Dust and freezes are not changed by it. */
  setShake(on: boolean): void
  /** What the last picture drew of the game's feel: the specks, the shake offset and the ticks still held. */
  feel(): FeelFrame
}
```

`startGame` makes one wiring (`freezes: 'game'`, `seed: sim.seed`) in place of its own `createBuzzer`; the step calls
`wiring.hear(result)` where it called `buzzer.hear`; the loop gets `hold: wiring.hold`, `held: () => wiring.holding`
and `draw: wiring.draw`; `wiring.begin()` goes beside `audio?.begin()`; `setVibration` goes through the wiring.

`tests/fixtures/feel/game.ts`: `loadFeelGame(overrides?)`, the moves game (`tests/fixtures/moves/`) with a spark in
level one and three feel files: `land` (`hero.landed`: dust 6, `#e8dcc0`, speed 2, life 18; buzz 0.3 for 3 ticks),
`leap` (`hero.jumped`: shake 0.2 for 12 ticks) and `got` (`spark.taken`: freeze 6, dust 12, `#ffd23f`, speed 3,
life 24).

- [ ] **Step 1: Write the failing tests.** `feel-wiring.test.ts` (Node, a fake renderer and `testHost`):

```ts
test('one step reaches the feel and the buzzer: a landing on touch is dust and one buzz', …)
test('with no buzz options nothing ever asks the host', …)
test('feelSettings left out: shake on; on a host that asked for less motion: shake off; a saved choice wins', …)
test('setShake(false) in the middle of a shake draws a zero offset on the next frame', …)
test('where freezes hold the picture, the frames alone count the hold down and hold() answers 0', …)
```

  `feel.browser.test.ts` (three engines, `manualFrames`, `testHost`, the feel game, 390x844 first):

```ts
test('the hero lands and dust is drawn at its feet, and is gone after its life', …)       // game.feel().specks, and a pixel
test('a jump shakes the level and not the touch controls or the mount', …)                // the thumbs' boxes before and after
test('on a host that asked for less motion a jump draws no shake and a landing still draws dust', …)
test('setShake(false) stops the shake; setShake(true) brings it back', …)
test('taking the spark holds the tick count for six ticks, then it goes on one a frame', …)
test('a jump key pressed during the hold and still down when it ends jumps on the first step after it', …)
test('a tap on the thumbs during the hold still jumps on the first step after it', …)       // thumbs keep a tap
test('pause during a hold keeps the rest: after resume the tick count waits out what was left', …)
test('a page hidden during a hold and shown again does the same', …)
test('two heroes on one screen hold together', …)
test('a recording made across a freeze replays to the same hash in a headless sim', …)
test('the same play with the three feel files taken out records the same commands and ends on the same hash', …)   // audit C1
test.each(SIZES)('at %s the dust never covers a touch control', …)                        // elementFromPoint at each control is the control
```

  `goldens.parity.test.ts` (Node and three browsers): for each of `moves.json`, `co-op.json`, `sprites.json` and the
  template's `replays/level-1.json`, the run with a `createFeel` hearing every step and a frame taken after each ends
  on the recorded hash.

  A key pressed and let go wholly inside a hold is not seen: the keyboard and the pads are read as what is down at
  each poll (`input/keyboard.ts`, `input/held.ts`), and latching them would change what every game records, which is
  `input`'s to plan (audit I2). Touch keeps a tap until the next poll (`thumbs.ts`). Do not change `input` here.

- [ ] **Step 2: Push; red.** **Step 3: Build.** **Step 4: Push; green on every job; look at the pictures.**
- [ ] **Step 5: Commit** `feat(game): a game played alone draws its dust and shake and holds for a freeze`

### Task 9: Watched and online games draw their feel

**Golden impact:** none (`online-two-players.json` and the watch's recorded hash are checked by their own tests).

**Files:**
- Modify: `src/features/game/watch.ts`, `src/features/game/online.ts`
- Test: `tests/features/game/watch.browser.test.ts`, `tests/features/game/online.browser.test.ts`

**Interfaces:**
- Produces:

```ts
export interface WatchOptions { /** As `GameOptions.feelSettings`. */ readonly feelSettings?: unknown }
export interface Watch { /** As `Game.feel`. */ feel(): FeelFrame }
export interface OnlineGame { setShake(on: boolean): void; feel(): FeelFrame }
```

- `watchReplay`: a wiring with `freezes: 'game'` and no `buzz`; the step gives it `sim.step`'s tick and events; the
  loop gets `hold`, `held` and `draw`; `wiring.begin()` at the start and at every restore between rounds. While
  resting or finished it still draws through the wiring with alpha 1.
- `startOnlineGame`: a wiring with `freezes: 'picture'` in place of its `createBuzzer`. The step's order changes
  (audit I1): after `session.advance` and the deltas, check for a sync first, before the `audio === undefined`
  return, and on one call `wiring.begin()` and `audio?.begin()`; then each of `advance.steps` goes to `wiring.hear`
  and, with audio, to `audio.hear`. A sync's own steps can carry ticks at or below the last one heard, and heard
  before `begin` they would be dropped. The loop gets no `hold`: the room never waits.

- [ ] **Step 1: Write the failing tests.**

```ts
// watch.browser.test.ts
test('a watched replay draws dust on a landing and shakes on a jump', …)
test('a watched replay never asks the host to buzz', …)                                   // testHost.buzzes is empty
test('a freeze holds a watched replay, and it still ends on its recorded hash', …)
test('the second round makes dust again', …)                                              // Review Focus 3
test('a watch under reduced motion draws no shake', …)
// online.browser.test.ts
test('a freeze online holds the picture and not the ticks', …)     // session.sim.tick goes on; game.feel().freeze counts down
test('after the hold the picture shows where things are now', …)
test('both pages of a room with a freeze file end on the same hash', …)
test('after a sync the next landing still makes dust', …)                                 // Review Focus 3
test('a landing in the very advance that syncs makes dust', …)                            // audit I1
test('a landing online on touch is one buzz, as before', …)
```

- [ ] **Step 2: Push; red.** **Step 3: Build.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(game): watched and online games draw their feel; online a freeze holds only the picture`

### Task 10: "Show me": one feel on demand

**Golden impact:** none.

**Files:**
- Create: `src/features/game/still-frames.ts`, `tests/features/game/show-feel.browser.test.ts`
- Modify: `src/features/game/game.ts`, `src/features/game/feel-wiring.ts`, `src/features/game/buzz.ts`,
  `src/features/level/join.ts`, `src/features/level/level.ts`, `src/features/content/content.ts` (export what the
  check needs, if it is not exported)
- Test: `tests/features/game/buzz.test.ts`, `tests/features/level/join.test.ts`

**Interfaces:**
- Produces:

```ts
// level/join.ts
/** The sid of the lowest player's hero; `undefined` when nobody is in. */
export function firstHeroSid(sim: Sim): number | undefined
// buzz.ts
export interface Buzzer { /** One file's buzz, now, for that player, under the same rules as `hear`. */ play(feel: FeelFile, player: number): void }
// feel-wiring.ts
export interface FeelWiring { /** Plays one checked file at a thing: the feel's `play`, and the buzzer's for player 1. */ show(feel: FeelFile, at: number | undefined): void }
// still-frames.ts
/** While `wanted()` is true, asks for frames and calls `draw(ms)` with the time each took. `kick()` starts it; it stops itself. */
export function createStillFrames(options: { frames: Frames; wanted: () => boolean; draw: (ms: number) => void }):
  { kick(): void; stop(): void }
// game.ts
export interface Game {
  /**
   * Plays one feel file once, at the thing whose sid is `at` (the first hero when left out), playing or paused. The
   * file may be an unsaved draft. Nothing is sent to the sim and nothing is recorded; its freeze holds the picture
   * only. Throws a `RangeError`, in plain words, for a file `FeelSchema` refuses.
   */
  showFeel(feel: FeelFile, at?: number): void
}
```

`showFeel` checks the file the way `loadGame` checks a feel file (`checkData` with `FeelSchema` and the content's
own voice) and throws a `RangeError` whose message is the diagnostics' sentences joined by a space. Then
`wiring.show(file, at ?? firstHeroSid(sim))`. In `game.ts`, the still frames are `wanted: () => pausedByHand &&
host.visible() && !stopped && !wiring.idle` and `draw: (ms) => wiring.draw(lastAlpha, ms)`, where `lastAlpha` is the
alpha the loop last drew with (1 before any), so the picture does not jump. `kick()` is called by `showFeel` and by
`pause()`; `resume()` and `stop()` call its `stop()`. A paused game's own hold waits (nothing calls `hold`), and a
shown feel's hold of the picture runs out in these frames (builder's call 6). So dust or a shake that was in the air
when the player paused also finishes, and the paused picture comes to rest.

- [ ] **Step 1: Write the failing tests.**

```ts
// show-feel.browser.test.ts (390x844 first)
test('showFeel draws the burst at the first hero', …)
test('showFeel with a sid draws it at that thing', …)
test('showFeel while paused draws the burst, moves it, and asks for no more frames once it is gone', …)
test('showFeel takes a draft that is not in the game\'s content', …)
test('a draft the schema refuses throws a RangeError that says what to write, and nothing is drawn', …)   // count 10000; NaN; no effect at all
test('showFeel\'s freeze holds the picture and the tick count goes on', …)
test('a recording made while showFeel runs is the same as one made without it', …)        // same commands, same final hash
test('with shake off, showFeel draws no shake', …)
test('showFeel on touch buzzes once; on a keyboard it does not', …)
test('showFeel when nobody is in and no sid is given shakes and makes no dust', …)
test('a hidden page asks for no frames for a shown feel', …)
// join.test.ts
test('firstHeroSid is the lowest player\'s hero, and undefined in an empty co-op game', …)
```

- [ ] **Step 2: Push; red.** **Step 3: Build.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(game): showFeel plays one feel file on demand, playing or paused`

### Task 11: The word, the README and the skills

**Golden impact:** none.

**Files:**
- Modify: the six `src/features/locale/library/*.json`, `README.md`, `skills/automata-content/SKILL.md`, `skills/automata-api/SKILL.md`, `skills/automata-rules/SKILL.md`,
  `template/README.md` and `template/AGENTS.md` (one line each, inside their line limits),
  `docs/api/framework.api.md`
- Test: `tests/features/locale/` (the library's own tests), `tests/docs/readme.test.ts`, `tests/skills/skills.test.ts`

`automata.feel.shake`: "Screen shake" (English), "Temblor de pantalla" (Spanish), "화면 흔들림" (Korean),
"画面の揺れ" (Japanese), "屏幕震动" (Chinese), "Tremor da tela" (Portuguese). The five translations stay
unread, like every other word waiting for a native speaker: an unread word is one with no mark, so
`automata.translations.toml` is not touched (audit M2).

The README's content table says what a feel file does on screen, and a new section, "Feel", says in this order: what
is drawn (dust at the thing's feet, a shake of the level only, a freeze); that a freeze really pauses a game played
alone and only holds the picture online; `feelSettings`, `setShake` and `FeelSettingsSchema`, with the three lines
that open the `feel` settings section; `game.feel()`; `game.showFeel(file)`; and that none of it can change a
recording. Its example uses only what the package exports. The skills say the same in the agent's words, and that a
game's own code may emit any event (`crate.dropped`) for a feel file to answer.

- [ ] **Step 1: Failing tests.** `readme.test.ts`: the README has a "Feel" section that names `showFeel`, `setShake`,
  `feelSettings`, `FeelSettingsSchema` and `feelSettingsFirst`, each exported by the package. `skills.test.ts`: the
  content skill's feel part names the three effects and "Screen shake". The library's tests already fail a key one
  language lacks.
- [ ] **Step 2: Push; red.** **Step 3: Write.** **Step 4: Push; green; commit the API report from the `package`
  job's log.**
- [ ] **Step 5: Commit** `docs: what a feel file does on screen, and the Screen shake word in six languages`

### Task 12: The journeys: real pages, three browsers, five sizes

**Golden impact:** none.

**Files:**
- Create: `tests/fixtures/feel/page/` (an `index.html` and a script that starts the feel game with `webHost()` and
  puts the game on `window.automataGame`, built the way `tests/fixtures/online/page/` is),
  `tests/journeys/feel.journey.test.ts`
- Modify: `tests/journeys/online.journey.test.ts`, `tests/create/create.journey.test.ts`,
  `tests/template/page.browser.test.ts`, `knip.json` (the page's `main.ts` is an entry, as the online page's is;
  audit M3)

Journeys read `window.automataGame.feel()` and `.sim.tick`, and take a picture at each size for the `ci-screens`
branch. Sizes, in this order: 390x844, 844x390, 820x1180, 1180x820, 1280x720. Touch sizes play with thumbs.

- [ ] **Step 1: Write the failing journeys.**

```ts
// feel.journey.test.ts, for each engine and each size
test(`${name}: the hero lands, dust is at its feet, and it is gone within half a second`, …)
test(`${name}: a jump shakes the level; the touch controls and the page do not move`, …)   // getBoundingClientRect before, during, after
test(`${name}: taking the spark holds the tick count, then the game goes on`, …)
test(`${name}: the dust never covers a touch control`, …)                                 // the two phone sizes and the two tablet sizes
// once per engine, phone upright
test('a device that asks for less motion: a first visit draws no shake and still draws dust', …)   // newContext({ reducedMotion: 'reduce' })
test('showFeel from the page while paused draws the burst at the hero, and the recording\'s hash is unchanged', …)
test('?watch draws dust and shake, and navigator.vibrate is never called', …)             // vibrate replaced by a counter before load
// online.journey.test.ts
test('a room with a freeze file: the room\'s ticks keep going, each page holds its picture, and both end on the same hash', …)
// create.journey.test.ts, at each of its sizes
// the new game: the hero's first landing draws dust (automataGame.feel().specks.length > 0), with no code written
// page.browser.test.ts
test('the template\'s landing draws dust at the hero\'s feet', …)
```

- [ ] **Step 2: Push; red.** **Step 3: Build the page and whatever the journeys need** (no change under `src/` is
  expected; one that is needed is a defect of an earlier task and is fixed there, with its own test).
- [ ] **Step 4: Push; green on every job,** `online`, `create` on three systems and `create-play` included. Look at
  every picture: the drunk-grandma test, and nothing over a control.
- [ ] **Step 5: Commit** `test: the feel runtime in real pages, at five sizes in three browsers`. Update the tracker
  to 90%.

### Task 13: The switch on the settings screen (only if plan U's settings screen is on `main`)

**Golden impact:** none. The Owner's answer 2 needs "Screen shake" on the settings screen (audit I4). Plan U's plan
does not name it, so whichever of plan U and plan F lands second builds it. If plan U's settings screen
(`src/features/screens/`, `src/features/flow/sections.ts`) is not on `main` when Task 12 is green, skip this task:
it stays the first item of the Handoffs and its 5% joins the last run's.

**Files:**
- Modify: `src/features/flow/sections.ts`, the settings screen's file in `src/features/screens/`, and where the flow
  starts the game (`feelSettings`)
- Test: `tests/features/screens/settings.browser.test.ts`, the flow's sections test

- [ ] **Step 1: Write the failing tests.**

```ts
test('Screen shake starts off under reduced motion, and a fresh page keeps what was chosen', …)
test('Screen shake starts on where the device did not ask for less motion', …)
test('turning Screen shake off stops a shake in the running game', …)                 // game.feel().shake is { x: 0, y: 0 }
test('the switch says "Screen shake" in the player\'s language and is at least 44 px tall', …)
```

- [ ] **Step 2: Push; red.** **Step 3: Build** what the Handoffs' plan U item says. **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(screens): a Screen shake switch on the settings screen`. Update the tracker to 95%,
  then to 100% once the last run is green on every check, and send the coordinator the summary.

---

## Handoffs

- **Plan U (the game's flow and screens).** `flow/sections.ts` gains the `feel` section:
  `{ name: 'feel', schema: FeelSettingsSchema, initial: feelSettingsFirst(host.reducedMotion()) }`, read when the
  flow starts and passed to `startGame` as `feelSettings`. The settings screen gains one toggle in its own part,
  after Sound: the word `automata.feel.shake`, set through the section and `game.setShake(on)`. It is shown on every
  device. Nothing is stored until the player sets it, so the device's own wish holds until then. The hud, the pause
  button and every screen sit over the mount, not in the canvas: Task 8 and Task 12 prove such an element does not
  move in a shake. If plan U's settings screen lands first, this plan's Task 13 adds the section and the toggle.
- **Plan K, Step U (the template).** The template's page opens the `feel` section beside `touch` and passes it. Its
  `?watch` passes the same `feelSettings` to `watchReplay`.
- **Plan D, Part 6 (the demo).** Three feel files: dust on `hero.landed`, a freeze on `spark.taken`, and a shake on
  `crate.dropped`, an event the demo's own small plugin emits with the crate's `sid` when a crate that was falling
  comes to rest. Its `?watch` passes `feelSettings`. No golden of the demo moves for feel: the plugin's event is
  presentation's to hear, but the plugin itself is in the sim, so if adding it changes a hash that is plan D's golden
  to name. The pin moves to the commit that lands this plan.
- **AutomataFrameworkEditors, the Feel editor's Part 3 ("Show me").** `game.showFeel(draft, at?)` on the `Game`
  from `startGame`, playing or paused; a refused draft is a `RangeError` whose message is ready to show; `game.feel()`
  says what is on screen. The editor never draws an effect itself and needs no canvas of its own. Its Play passes no
  `feelSettings`, so it follows the device. When the pin moves, any `Host` the editors make by hand needs
  `reducedMotion()`.
- **AutomataFrameworkExamples and AutomataFrameworkSite.** Any `Host` made by hand gains `reducedMotion()` when the
  pin moves. The site's rule that the watched game plays for every visitor whatever the device says about motion is
  unchanged: only the shake follows the device.
- **Plan T (story).** The speech box is over the mount and does not shake. A cutscene that wants a shake raises an
  event a feel file answers.
- **Later, when a game needs it:** `*` patterns in `on`; more kinds of effect; `showFeel` on a watched replay; a
  framework event for "anything landed"; keeping a key's or a pad's press that starts and ends inside a hold (an
  `input` change, audit I2).
- **Release 4 (Tauri).** `reducedMotion()` is that adapter's to answer from the system setting.

## Self-review

- **Spec coverage.** The `feel` feature and `createFeel` (`hear`, `begin`, `play`, `frame`): Tasks 1 to 4. Dust (the
  place, the fan, the fade, 256, moving through a freeze): Tasks 2, 4 and 6. Shake (the level only, the fade, whole
  device pixels, the larger of two, the setting, reduced motion): Tasks 3, 5, 6 and 8. Freeze offline (the loop holds,
  nothing owed, presses kept, the later end, 30 ticks, pause keeps the rest, heroes hold together) and online (the
  picture only): Tasks 4, 7, 8 and 9. Buzz beside the feel, and none in a watch: Tasks 8 and 9. F4: Task 10. The
  showcase's three events: the fixture game (Task 8) and plan D's handoff. Testing, each of the spec's lists: unit in
  Tasks 1 to 4, loop in Task 7, settings in Tasks 1, 5 and 8, goldens in Task 8, browsers and journeys in Tasks 6, 8,
  9, 10 and 12. "Left to the plan": how `render` takes a frame (Task 6), the curves (builder's calls 2 and 4), the
  hold (call 6, Task 7), `showFeel` for a watch (call 10), `src/headless.ts` and the README (Tasks 1 and 11).
- **Two things differ from the spec's words,** both named above for the audit: where dust starts for a thing still
  in the scene (call 5), and `hold(seconds)` beside `frame(seconds, place)` on the runtime (call 6), which the spec's
  list of three methods does not have.
- **Names.** `FeelFrame`, `FeelSpeck`, `FeelPlace`, `FeelSettings`, `feelSettingsFirst`, `feelSettingsOf`,
  `createFeel`, `createFeelWiring`, `showFeel`, `setShake`, `feel()`, `reducedMotion()` and `firstHeroSid` are spelled
  the same in every task that uses them.
- **No Owner question is open.**
- **The plan audit** (`audits/2026-11-15-plan-f-plan-audit.md`) accepted both deviations and changed this plan for
  its C1, I1 to I5 and M1 to M6.

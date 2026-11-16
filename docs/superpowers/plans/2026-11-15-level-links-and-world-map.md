# Plan W: Level Links And The World Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session at a time, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A game's files can say what a placed thing holds (numbers, switches, links, paths, doors), how its levels
join (through doors, and edge to edge as one seamless place) and where they sit on a map, and the framework checks all
of it, plays it with no game code, remembers what was done for good, and shows it to an agent as a list and a picture.

**Architecture:** The formats and every check live in `content` (a character declares values, a thing gives them, one
`world` file places the levels, and the loader works out which levels join into a place). The sim's `level` feature
gains parts that join only a game that uses them: switches and gates, a place built into one physics world, which
level a hero is in, and facts told to the sim by a command. Doors are read by one pure function in `level` and followed
by the `flow`; the save keeps where the player came in and the facts. The `cli` gains `automata world` and
`automata picture`, painted by a new pure painter in `content`.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4 through `src/lib/zod.ts`, Koota and Rapier's deterministic 2D build
behind `sim` and `physics`, PixiJS 8 in `render` only, Effect in `cli` only, Vitest 5.0.3 (browser mode on Playwright
1.63.0), Biome 2.5.15, knip 6.39.0. **No new dependency in any repo.**

**Spec:** [`docs/superpowers/specs/2026-11-15-level-links-and-world-map-design.md`](../specs/2026-11-15-level-links-and-world-map-design.md)
(second version, merged as #165, `127b4d7`). Read it first. This plan argues from it and does not repeat its reasons.

**Principles served:** 1, agent-first (every new thing is a documented field with a published schema, a `check`
sentence, a command and an MCP tool); 2, iPad-first editors (World reads these formats; its own tasks are gated below);
3, layers in order (no file names a side, a place is named numbers, nothing 3D is built). It breaks none: no new
dependency, nothing built ahead of its user (the test game uses every built part), and a game that uses none of it keeps
its sim, its hashes and its replays.

## The Owner's answers this plan stands on

- The spec's five answers (2026-11-15): joins come from where levels sit on the map; a joined place is one seamless
  world, all of it running at once; what was done for good is remembered as facts; the test game gets a third level
  joined to level 2's right edge; all twelve calls are fine.
- **Paths wait for Characters (the Owner, 2026-11-15, 22:41 UTC, asked from this plan's thread: "B, one thing at a
  time").** Nothing on `main` runs a character's behaviour rules: the runner was built with the story work (pull request
  #64, closed, last commit `fc909a2`) and parked with it. So this cycle writes, checks and draws a `path` value and the
  `walk-path` act, and **no critter walks until the Characters slice**. The walk and its golden are the deferred tasks
  at the end of this plan; the test game's critter stands still until then.
- **The plan audit's two questions (the Owner, 2026-11-15, 22:59 UTC, "1. a 2. a"):** (1a) a level's picture for
  an agent uses numbered badges, with a list beside it that says in words what each number is (call 4); (2a) a door
  opens the next level at once, with no "level done" screen between (call 5). The spec's sentences on both, and its
  one sentence that a door's replay is one level, are changed to say so, in the pull request that carries this fix.

## What is on main and what is not (read on 2026-11-15, `main` at `127b4d7`)

The spec was written as if the work after slice 3 were still on `main`. It was taken off by #153 (the tag
`archive/before-slice-cut` keeps it). What that changes here:

| The spec says | On `main` today | This plan |
|---|---|---|
| a behaviour rule may `walk-path`; "as `wander` does" | behaviour files are a format only; nothing runs them | the format and its checks now; the walk is deferred (the Owner, above) |
| open stretches: "no ground, no ledge"; "inside the scene's size, for a scene level"; joined only when used "as joints, slopes and falls do" | no scenes, ledges, slopes or falls; a level's ground is its `tiles` | an edge tile is open when it is not solid; the Scenes plan widens `isOpen` when it returns (one function, Task 3) |
| the picture's painter is "the one Node already uses for figures and scenes"; it draws "the scene's ground, sky and backdrop" | `paintFigure` and `paintBackdrop` only; Node cannot read a PNG (the reader was cut) | a new pure `paint-level.ts`; ground and tileset tiles are flat colour; no backdrop (call 4) |
| the level name on screen and the goal line read which level the hero is in | neither exists (plan Q's built parts were cut) | the save and the renderer's look read it now; plan Q's screens read it when they return |
| the demo follows doors through the flow | the demo's page calls `startGame`, not `startFlow` (plan D Part 8, later) | doors are read by a pure function the flow and the demo's page both call (call 3) |
| `flow.ts` | 589 lines of the 600 allowed | all new flow code goes in new files |

## My calls, for the audit and the Owner to overrule

1. **A press and a gate's wait are worked out from the boxes, not from Rapier's events** (the spec left it to the
   plan). One pure overlap test (Task 6) says what stands on a switch and what stands in a gate. It holds no hidden
   count, so a restore, a despawn and a rebuilt collider cannot leave a switch stuck.
2. **A place's ground is one grid.** The joined levels' solid tiles are laid into one grid before the boxes are made,
   so a floor that runs across an edge is one box and nothing catches on the seam. `spawnLevel` picks one box a row
   (`tileRuns`) or `tileBoxes` by the game (a `#` level in a game whose hero has no `moves` keeps a box a row, so no
   recorded game moves); `spawnPlace` always uses `tileBoxes`, since a seam is a seam in any game, and a place is
   new, so no golden has one (audit L1).
3. **`doorTaken` lives in `level`, not `flow`.** It is pure and needs no page, so the flow calls it and so can a game
   whose page is its own (the test game today). The flow still owns what happens next.
4. **Pictures carry numbers, and the words are in a list beside them.** A tag, an arrow's end and a door's target are
   each a small numbered badge; the command prints what each number means, with the source language's words. A picture
   then needs only ten digits (no font for six languages), and badges are small enough to be moved apart. The spec's
   "small labels in the source language" are the list. **The Owner chose this (2026-11-15, 22:59 UTC).**
5. **A door opens its level at once, with no "level done" screen between.** The project's `done` event still ends a
   level as it does today. **The Owner chose this (2026-11-15, 22:59 UTC).**
6. **The world file leaves the sim; what it joins goes in.** The sim is given `places` (each joined level's offset from
   its place's corner), never the map itself, so dragging a level or a whole place around the map moves no hash unless a
   join appears, moves or breaks.
7. **A thing's id has its level in front only in a place of two or more levels** (`room-2.crate-1`). A level that
   touches no other is spawned exactly as today.
8. **A switch may link only to a thing whose character says `opens`.** Anything else is a `check` sentence.
9. **A place is "big" past 8 levels or 16,384 tiles** (a note from `automata world` and `check`, never a failure).
10. **Facts reach a sim as a command at tick 0** (`facts`, source 0), so a recording carries them and replays with no
    new field. The sim believes only that: a `facts` command from any other source, or at any other tick, is
    ignored (not rejected, so a replay still reads), because online the room passes on any command a player sends
    (audit H2).
11. **The save gains two optional fields,** `last` (the level the player was last in and where they came in) and
    `facts`. `level` keeps its meaning (the furthest level reached), so a save written today still reads.
12. **Online play gets a place for free in the sim and on screen, and no doors**: doors are the flow's, and an online
    game is not started by the flow today.
13. **A hero comes in beside a door, never inside it.** A door is a sensor, and a body made inside a sensor raises
    its touch on the first step, so a hero put at a door's own middle would go straight back through a door that
    leads back (audit H1). The spot is on the door's side toward the middle of the level, clear of its box (Task 8).
14. **A player who joins late comes in the way the first heroes did,** at the level the sim was opened at, wherever
    player 1 has got to since (audit L8). A place is one world and the new hero can walk to the others; no rule
    then depends on who is where.
15. **A `words` value must name a key the source language has** (audit L12). The spec says "a key no language has";
    the source language is the one every other is a translation of, so this is the stricter and the safer check.

## Global Constraints

- No new dependency. Formats and checks in `content`; sim parts in `level`; doors followed in `flow`; commands in `cli`.
  Imports go down as `tests/architecture/rules.ts` holds (`content` is below `level`; `level` is pure: no clock, no
  `Math.random`, no I/O, and only `dmath`'s `sin`, `cos` and `hypot`).
- No file over 600 lines. `flow/flow.ts` (589) and `content/level.ts` (442) take only the lines named here.
- Strict TypeScript; Zod only through `src/lib/zod.ts`; every field `.describe()`d in plain words; unknown keys
  refused (`z.strictObject`).
- **No new field has a default.** A field left out is absent from the parsed value, so a game that writes none of this
  hashes as it did. Never `.default()` on a field this plan adds.
- **Joined only when used.** Every new component, command, event, resource and system is in a plugin `createGameSim`
  adds only for a game that uses it. Every existing golden under `tests/golden/` and `template/replays/level-1.json`
  stays byte for byte; a task that moves one stops and reports.
- A new golden is committed with `"finalHash": ""`; the Node job prints the JSON to commit; then all four engines must
  match (`tests/fixtures/golden.ts`). Never typed by hand.
- Every sentence `check` says tells the person what to fix. The files never name a side; only `check`'s sentences say
  "left", "right", "top", "bottom" and "rows", for a 2D level.
- Every word a player reads is a message key in six languages (en, es, ko, ja, zh, pt). A value's `name` and `about`
  are the team's words and are not translated.
- Tests run only in GitHub-hosted CI. Locally only `npx biome check --write`, `npx tsc --noEmit` and `npx knip`.
  Work in a draft pull request, batch pushes (each push cancels the running CI), mark it ready when the part is done.
- Before every commit: `git config --global user.name "McThayDT" && git config --global user.email "107786093+mcthaydt@users.noreply.github.com"`.
  No AI attribution anywhere. `create_pull_request` adds a "Generated by" footer that fails `commit-authors`: strip it
  with `update_pull_request` and read the body back.
- Generated files are taken from CI's logs, never written by hand: `schemas/*.schema.json` from
  `pnpm schemas --check`'s output, `docs/api/framework.api.md` from the `package` job.
- Every test disposes every sim it makes (Koota allows 16 worlds).

## Review Focus

Inputs the spec implies and a person will meet. Each has its test in the task named.

1. **A thing is taken away, or a hero leaves the game, while it stands on a plate.** The plate comes up on the next
   tick and its gate closes (Task 7).
2. **A gate closes while a hero stands in it,** or a crate rests in it for good. Nobody is stuck in a wall: it waits,
   and closes on the first tick it is empty (Task 7).
3. **Heroes come out beside a door that is close to a wall.** No hero is put inside solid ground or outside the level;
   a hero whose spread spot is solid takes the door's own spot (Task 8).
4. **A level is dragged on the map so that a join breaks, or a new one appears against a wall.** `check` and
   `automata world` name the join that appeared, moved or broke, and a save that points into the old place still opens
   (Tasks 3, 12, 13).
5. **A saved game names a level, a door or a fact the game no longer has.** Continue opens the level's own starts, or
   the first level, and a fact about a thing that is gone is ignored; nothing throws (Tasks 9, 12).
6. **A door that leads back.** Heroes come out beside it, clear of its box, and no door is raised on the next ticks;
   walking into it on purpose goes back (Tasks 8, 12).
7. **Two heroes at one door a tick apart, or a second door.** The first one starts the level; the game stops
   listening and holds still at once, so the level is started once (Task 12).
8. **A player sends `facts`.** Only source 0 on tick 0 is believed; a player's `facts`, at any tick, opens nothing
   (Task 7).
9. **Continue into a level whose gate was opened for good.** The first picture already shows it open, and the
   first press is tick 1, so nothing pops open on the press (Task 10).

## File structure

```
src/features/content/values.ts          new   the declarations a character makes, their Zod shapes, shownOf, withDefaults
src/features/content/value-checks.ts    new   a level's values against its characters; one-per-level
src/features/content/world.ts           new   the world file: its type, schema and `worldInfo`, its row of the table (last)
src/features/content/outside.ts         new   the "outside the level" sentences, lifted out of level.ts for both users
src/features/content/places.ts          new   layoutWorld: which levels touch, where, and what is wrong
src/features/content/paint-level.ts     new   the level and world pictures, as bytes
src/features/content/paint-marks.ts     new   whole-number lines, circles and digit badges for the painter
src/features/content/character.ts       +     values, switch, opens, one-per-level
src/features/content/level.ts           +     a thing's `values` (shape only; the checks are in value-checks.ts)
src/features/content/behaviour.ts       +     the `walk-path` act (format only)
src/features/content/load.ts            +     one world file; `places`
src/features/level/where.ts             new   the Where resource: which levels are in this sim, and where
src/features/level/values.ts            new   valuesOf
src/features/level/overlap.ts           new   boxesOverlap
src/features/level/switches.ts          new   Pressed, Open, the facts command, the switch plugin
src/features/level/place.ts             new   levelsOf, levelAt, placeSize, shiftLevel, solidGrid
src/features/level/spawn-place.ts       new   spawnPlace
src/features/level/arrive.ts            new   arrivalSpots: where each hero comes in, beside a thing or at a spot
src/features/level/entered.ts           new   In, level.entered, the place plugin
src/features/level/doors.ts             new   doorTaken
src/features/game/stage-of.ts           new   what the renderer is given for a level or a place (render has its own stage.ts)
src/features/flow/ways.ts               new   the flow's listeners for doors, crossings and facts
src/features/cli/world.ts, picture.ts   new   the two commands
docs/formats/changes.md                 new   the public list of format changes (shipped in the package)
skills/automata-content/values-and-doors.md   new
tests/fixtures/links-game/              new   the game every task here tests on (below)
```

## The fixture game (`tests/fixtures/links-game/`)

Built in Task 2 and grown by later tasks. Every level is 16 by 9; row 8 is `################`. Loaded by
`loadLinksGame(overrides?)` in `tests/fixtures/links-game/read.ts`, the same shape as `tests/fixtures/game/read.ts`.
The hero, its tuning and `source = "en"` words are copied from the moves fixture (`tests/fixtures/game/moves-game.ts`).
`players = 2`.

| Character | Body, size | Says |
|---|---|---|
| `crate` | dynamic, 1 by 1, kind `crate` | |
| `plate` | fixed, 1 by 0.25, kind `plate`, `touch: "sense"` | `values`: `opens` (thing, kinds `["gate"]`, most 4); `switch: { opens: "opens" }` |
| `button` | as `plate`, kind `button` | adds `stays` (switch, default false); `switch: { opens: "opens", stays: "stays" }` |
| `gate` | fixed, 0.5 by 8, kind `gate` | `opens: "walk-through"` |
| `door` | fixed, 1 by 2, kind `door`, `touch: "sense"` | `values`: `to` (leads-to; not `needed`, a test that wants it needed overrides the file) |
| `goal` | fixed, 1 by 1, kind `goal`, `touch: "sense"` | `one-per-level: true` |
| `critter` | dynamic, upright, 1 by 1, kind `critter`, `behaviour: "patrol"` | `values`: `walk` (path), `reach` (number, least 1, most 8, step 0.5, default 3, shown `reach`) |

`patrol` (behaviour): one rule, `when: []`, `do: { act: "walk-path", path: "walk", speed: 2 }`.

| Level | Rows 0 to 7 | Things (`x`, `y`) | Starts |
|---|---|---|---|
| `room-1` | `#..............#` | `crate-1` crate (5.5, 7.5); `plate-1` plate (8.5, 7.875) `opens: ["gate-1"]`; `gate-1` gate (11.25, 4); `exit` door (13.5, 7) `to: { level: "room-2", thing: "door-in" }` | 1 (2.5, 7.5), 2 (3.5, 7.5) |
| `room-2` | rows 0 to 4 `#..............#`; rows 5 to 7 `#...............` | `door-in` door (2.5, 7) `to: { level: "room-1", thing: "exit" }`; `crate-1` crate (5.5, 7.5); `critter-1` critter (7.5, 7.5) `walk: [{7.5, 7.5}, {9.5, 7.5}]`; `button-1` button (11.5, 7.875) `opens: ["gate-1"], stays: true`; `gate-1` gate (13.25, 4) | 1 (2.5, 7.5), 2 (3.5, 7.5) |
| `room-3` | rows 0 to 4 `#..............#`; rows 5 to 7 `...............#` | `goal-1` goal (13.5, 7.5); `back` door (14.5, 7) `to: { level: "room-1", thing: "exit" }` | 1 (2.5, 7.5), 2 (3.5, 7.5) |

Every door in the fixture leads somewhere, and the ways in each have a way back (`door-in` to `exit`, `back` to
`exit`), so a hero who comes out beside a door is beside one that leads back: the case that matters (audit H1, M5). A
test that wants a door with no `to` takes it away by an override. The critter's box at both ends of its path clears
the crate and the button, and no two bodies in any level overlap at spawn: Task 6 holds both (audit M2). `back` is
past the goal, so a hero who walks to the goal does not pass through it.

`world`: `room-1` at (0, 0), `room-2` at (20, 0), `room-3` at (36, 0). So `room-2` and `room-3` are one place, named
`room-2`, 32 by 9, with `room-3` at offset (16, 0), joined along rows 5 to 7; `room-1` is a place of one.
`automata.toml`: `start = "room-1"`, `levels = ["room-1", "room-2", "room-3"]`, `done = "goal.touched"`.

## Pull requests

Five in AutomataFramework, in order, each a draft until its last task is green; two in AutomataFrameworkExamples after
the fifth. Stage 4's progress: 14% for each framework pull request (70%), 5% for the pin, 15% for the test game, 10% for
the last green run and the Owner's yes to the moved recording.

| Pull request | Tasks | Golden |
|---|---|---|
| 1. Formats and checks | 1 to 4 | none |
| 2. Switches and gates | 5 to 7 | new `switch.json` |
| 3. A place | 8 to 10 | new `place.json` |
| 4. Doors and what is remembered | 11, 12 | none |
| 5. The commands and the docs | 13 to 15 | new `level-picture.json` |
| Examples A | E1 | none |
| Examples B | E2, E3 | `replays/level-1.json` moves (the Owner sees it first); `replays/level-2.json` is new |

---

## Pull request 1: formats and checks

### Task 1: What a character's things can hold

**Files:**
- Create: `src/features/content/values.ts`
- Modify: `src/features/content/character.ts`, `src/features/content/content.ts` (exports)
- Test: `tests/features/content/values.test.ts`, `tests/features/content/character.test.ts`

**Interfaces (produces):**

```ts
// content/values.ts
export type ValueShown = 'tag' | 'reach' | 'arrow' | 'path' | 'none'
interface Declared { readonly id: string; readonly name: string; readonly about?: string; readonly shown?: ValueShown }
export type ValueDeclaration =
  | (Declared & { readonly type: 'number'; readonly least: number; readonly most: number; readonly step?: number; readonly default: number })
  | (Declared & { readonly type: 'switch'; readonly default: boolean })
  | (Declared & { readonly type: 'choice'; readonly from: readonly { readonly id: string; readonly name: string }[]; readonly default: string })
  | (Declared & { readonly type: 'words'; readonly default?: string })
  | (Declared & { readonly type: 'thing'; readonly kinds?: readonly string[]; readonly most?: number; readonly needed?: boolean })
  | (Declared & { readonly type: 'path'; readonly least?: number; readonly most?: number; readonly loop?: boolean })
  | (Declared & { readonly type: 'leads-to'; readonly needed?: boolean })
export const valueDeclaration: z.ZodType<ValueDeclaration>   // `variants('type', [...])`
/**
 * How the level view draws it: its own `shown`, else number, switch, choice, words 'tag'; thing 'arrow'; path 'path';
 * leads-to 'tag' (the world sheet draws every door as an arrow whatever this says). A switch's tag is drawn only when
 * the thing's value is not the declaration's default (Task 14 holds that, since it needs the placed value).
 */
export function shownOf(declaration: ValueDeclaration): ValueShown
/** What a declaration's `shown` may be: number tag|reach|none; switch, choice, words tag|none; thing arrow|none; path path|none; leads-to tag|none. */
export const SHOWN_FOR: Readonly<Record<ValueDeclaration['type'], readonly ValueShown[]>>
// content/character.ts: `Character` and `CharacterInput` gain
readonly values?: readonly ValueDeclaration[] | undefined              // at most 16
readonly switch?: { readonly opens: string; readonly stays?: string } | undefined
readonly opens?: 'walk-through' | undefined
readonly 'one-per-level'?: boolean | undefined
```

Limits: `name` 1 to 40 letters; `about` at most 200; `from` 1 to 16; a thing's `most` 1 to 16; a path's `least` and
`most` 2 to 64 (left out: 2 and 64); `step` above 0. A `words` default is a `MessageKey`.

- [x] **Step 1: Write the failing tests.** One accepted example per type, and one per sentence below (each sentence is
  asserted whole, at the path given):

| Wrong | Path | Sentence |
|---|---|---|
| a declaration id used twice | `values[i].id` | `unique`'s own: `"opens" is used twice. Each value needs its own id.` |
| `least` above `most` | `values[i].least` | `"least" must not be more than "most".` |
| a number's default outside its limits | `values[i].default` | `The default must be from 1 to 8. Got 9.` |
| a number's default off its step | `values[i].default` | `The default must be 1 plus a whole number of steps of 0.5. Got 1.3.` |
| a choice's default not in `from` | `values[i].default` | `The default must be one of: blue, red. Got "green".` |
| a `shown` its type cannot draw | `values[i].shown` | `A switch cannot be shown as "arrow". Use one of: none, tag.` |
| `switch` without `touch: "sense"` | `switch` | `A switch is pressed by what touches it: give this character "touch": "sense".` |
| `switch.opens` not a `thing` value | `switch.opens` | `"opens" must name one of this character's "thing" values. It has: (list, or nothing).` |
| `switch.stays` not a `switch` value | `switch.stays` | `"stays" must name one of this character's "switch" values. It has: (list, or nothing).` |
| `opens` on a `dynamic` body, or with `touch` | `opens` | `Only a "fixed" character with no "touch" can be walked through when open.` |

  Also: a character that writes none of the four fields parses to a value with none of the four keys
  (`Object.keys` is what it was), and `writeContent('character', …)` writes the new fields in the schema's order
  (`values`, `switch`, `opens`, `one-per-level`, after `moves`).
- [x] **Step 2: Push; the Node job fails on the new tests.**
- [x] **Step 3: Implement.** A step is checked as `Math.abs(n - Math.round(n)) < 1e-9` for `n = (value - least) / step`
  (export it as `onStep(value, least, step)`: Task 2 uses it).
- [x] **Step 4: Push; green.** `schemas/character.schema.json` is taken from `pnpm schemas --check`'s log.
- [x] **Step 5: Commit** `feat(content): a character declares the values its things hold`

### Task 2: Values on a thing, checked against its character

**Files:**
- Create: `src/features/content/value-checks.ts`, `src/features/content/outside.ts`, `tests/fixtures/links-game/` (the
  table above), `tests/fixtures/links-game/read.ts`
- Modify: `src/features/content/level.ts` (the thing's shape; `levelInfo.check` calls `checkThingValues`; the
  `outside` local of the schema's refine moves into `outside.ts`, so the schema and `checkThingValues` say the same
  sentence and `level.ts` does not grow: audit L5),
  `src/features/content/behaviour.ts` (the act), `src/features/content/character.ts` (`characterInfo.check`),
  `src/features/content/values.ts`, `content.ts`
- Test: `tests/features/content/value-checks.test.ts`, `behaviour.test.ts`, `level.test.ts`

**Interfaces:**
- Consumes: Task 1's `ValueDeclaration`, `onStep`.
- Produces:

```ts
// content/level.ts
export type ThingValue = number | boolean | string | readonly string[] | readonly LevelPoint[] | { readonly level: string; readonly thing?: string }
// LevelThing gains: readonly values?: Readonly<Record<string, ThingValue>> | undefined
// content/values.ts
/** A thing's values with its character's defaults filled in; a value with no default and none given is absent. */
export function withDefaults(character: Character, thing: LevelThing): Readonly<Record<string, ThingValue>>
// content/value-checks.ts
export function checkThingValues(level: Level, game: Listed, report: Report): void
// content/behaviour.ts: Act gains
| { readonly act: 'walk-path'; readonly path: string; readonly speed: number }
```

The thing's schema: `values` is `z.record(Id, …)` of a number, a boolean, a string of at most 96, a list of 0 to 16
ids, a list of 0 to 64 places, or `{ level, thing? }`. The lists may be empty or short in the schema on purpose: a
list the character's `most`, `least` or `needed` does not allow gets a `check` sentence that says what to fix, never
Zod's words (audit L10). Which of them a value must be is the character's to say, so `checkThingValues` checks it (the
published level schema cannot know). `checkThingValues` reads a level through a small type of its own (its `tiles` and
`things`), so `value-checks.ts` never imports `level.ts`, which calls it: imports must not make a cycle.

- [x] **Step 1: Write the failing tests** on the links game with one file overridden per test. Each sentence whole, at
  `things[i].values.<id>` unless said:

| Wrong | Sentence |
|---|---|
| an id the character does not declare | `The character "button" has no value "open". It has: opens, stays.` |
| the wrong kind of value | by type: `"reach" is a number, like 3.` / `"stays" is a yes or no: write true or false.` / `"colour" is one of: blue, red.` / `"says" is a message key, like "sign.welcome".` / `"target" holds one thing, like "gate-1".` / `"opens" holds a list of things, like ["gate-1"].` / `"walk" is a list of places, like [{ "x": 4, "y": 7.5 }, { "x": 7, "y": 7.5 }].` / `"to" is a way into a level, like { "level": "level-2", "thing": "door-in" }.` |
| a number outside its limits, or off its step | `"reach" must be from 1 to 8. Got 9.` / `"reach" must be 1 plus a whole number of steps of 0.5. Got 1.3.` |
| a choice not in `from` | `"colour" must be one of: blue, red. Got "green".` |
| a message key the source language lacks | `The game's words have no "sign.welcome". Add it to content/messages/en.json.` |
| a link to a thing not in the level | `noSuch('thing', id, ids, 'This level')` |
| a link to itself | `A thing cannot link to itself.` |
| a link to a kind `kinds` does not allow | `"crate-1" is a crate, and "opens" links only to: gate.` |
| more links than `most` | `"opens" holds at most 4 things. This has 5.` |
| a `needed` list of things left empty (`"opens": []`) | `"opens" needs at least one thing, like ["gate-1"].` (a list that is not `needed` may be empty: it links nothing) |
| a switch's link to a thing that cannot open (call 8) | `"crate-1" is a crate, which cannot be opened. Give its character "opens": "walk-through", or link something else.` |
| a path with too few or too many points | `"walk" needs from 2 to 64 places. This has 1.` |
| a path point outside the level | the level's own `outside` sentence, at `…values.walk[j].x` or `.y` |
| `leads-to` a level the game does not list | `noSuch('level', id, game.ids('level'))` |
| `leads-to` a thing not in that level | `noSuch('thing', id, ids, 'The level "room-2"')` |
| a `needed` value left out (at `things[i].values`; an override makes the door's `to` `needed`) | `Every "door" needs "to". Add it to this thing's "values".` |
| two of a `one-per-level` character (at the second, `things[i].character`) | `This level already has a "goal", and there can be only one. Move that one, or take this one out.` |
| a `walk-path` act whose `path` the character does not declare as a path (in the character file, at `behaviour`) | `The behaviour "patrol" walks the path "walk", and this character has no "path" value called "walk". It has: (list, or nothing).` |

  And: the links game loads with no problem; `withDefaults` on `button-1` gives `{ opens: ['gate-1'], stays: true }`,
  on `critter-1` `{ walk: [...], reach: 3 }`, on `plate-1` `{ opens: ['gate-1'] }`; a value equal to its default
  survives `writeContent` as written; a level with no `values` anywhere parses to the value it did (same keys).
- [x] **Step 2: Push; fails.**
- [x] **Step 3: Implement.** A check skips what it cannot see (a character or level that did not read), as the loader's
  other checks do. `level.ts` gains only the thing's field and one call.
- [x] **Step 4: Push; green.** `schemas/level.schema.json` and `behaviour.schema.json` from the log.
- [x] **Step 5: Commit** `feat(content): a thing's values, checked against its character`

### Task 3: The world file, and which levels join

**Files:**
- Create: `src/features/content/world.ts`, `src/features/content/places.ts`
- Modify: `content-types.ts` (a `world` row, **last**, after `messages`: anything that lists the kinds in the table's
  order then sees the new kind at the end and moves no other; the tests and scripts that name every kind gain `world`:
  `content-types.test.ts`, `project.test.ts`, `skills.test.ts`, `readme.test.ts`, `public-surface.test.ts`,
  `scripts/write-schemas.ts` and `cli/mcp-library.ts`: audit L13), `type-info.ts` (nothing: `editor: 'world'`,
  `part: 'map'`), `load.ts`, `content.ts`, `src/features/level/sim-content.ts`
- Test: `tests/features/content/world.test.ts`, `places.test.ts`, `load.test.ts`, `tests/features/level/sim-content.test.ts`

**Interfaces (produces):**

```ts
// content/world.ts
export interface WorldFile { readonly format: 1; readonly id: string; readonly levels: readonly { readonly level: string; readonly at: LevelPoint }[] }   // at most 1024
export const WorldSchema: z.ZodType<WorldFile, WorldFile>
/** The kind's row of the content table, as every kind has: `ContentTypeInfo<WorldFile, WorldFile>`. */
export const worldInfo: ContentTypeInfo<WorldFile, WorldFile>
// content/places.ts
/** One joined level: where its corner is, in whole tiles from its place's own corner (never less than 0). */
export interface PlaceLevel { readonly level: string; readonly x: number; readonly y: number }
/** One stretch two levels share and are both open on. `along` is the axis the stretch runs along; `from` and `to` are map tiles on it, `to` not included. */
export interface Join { readonly a: string; readonly b: string; readonly along: 'x' | 'y'; readonly from: number; readonly to: number }
export interface WorldLayout {
  readonly joins: readonly Join[]
  /** Only places of two or more levels, keyed by their first level id in code-unit order; each list sorted by level id. */
  readonly places: Readonly<Record<string, readonly PlaceLevel[]>>
  readonly problems: readonly { readonly entry: number; readonly message: string }[]
}
export function layoutWorld(world: WorldFile, levels: Readonly<Record<string, Level>>, isOpen: (level: Level, col: number, row: number) => boolean): WorldLayout
/** The loader's `isOpen`: the tile is not solid (`#`, or a tileset tile with `solid`). */
export function openTile(tilesets: Readonly<Record<string, TilesetFile>> | undefined): (level: Level, col: number, row: number) => boolean
// content/load.ts: GameContent gains
readonly worlds?: Readonly<Record<string, WorldFile>>
/** Set by the loader only when at least one place has two or more levels. */
readonly places?: Readonly<Record<string, readonly PlaceLevel[]>>
```

The rules of `layoutWorld`, for levels `a` and `b` as boxes on the map:

- They **touch** when one's edge lies on the other's and the two overlap along it by at least one tile (a shared corner
  is not a touch). For each shared tile along the edge, each side's edge tile is open or solid.
- Both open: that tile is part of a join. Tiles in a row make one `Join`. Two levels with at least one join are in one
  place; places are the groups this makes.
- Both solid: a wall, and nothing to say.
- One open, one solid: a problem, at the entry of the open level, in the spec's words:
  `room-2's right edge is open at rows 5 to 7, but room-3, which touches it, is solid there. Open room-3's left edge at those rows, or move it.`
  (`right`/`left`/`top`/`bottom` and `rows`/`columns` by where the edge is; one tile is `at row 5`.)
- Boxes that overlap: `room-2 sits on top of room-3 on the map. Move one so they do not overlap.`, at the later entry.
- `at` not in whole tiles, for a level that touches or overlaps another: `room-2 touches room-3, so where it sits must
  be in whole tiles. Got x 20.5.`

The loader: more than one listed world file is a project problem at `content[i]` of the second
(`A game has one world file, and content/world.json is already listed.`); a world entry naming a level the game does
not list is `noSuch('level', …)` at `levels[i].level`; a level named twice is `"room-2" is already on the map.` (in the
schema). `layoutWorld` runs only when every level read; its problems go on the world file at `levels[entry].at`.

`simContent` (call 6): `'world'` joins `LEFT_OUT` and `worlds` leaves with it; `places` stays. A game with no world
file still gets the very same object back: its early return also checks `content.worlds === undefined` (without it a
game with a world file and nothing else left out would be handed back whole), and the test of "the very same object"
gains a game that lists a world file and has `places` (audit L13).

- [x] **Step 1: Write the failing tests.** `layoutWorld` on small made-up levels: side by side joined (one `Join`,
  `along: 'y'`, the right `from` and `to`); stacked (`along: 'x'`); corner to corner (nothing); a gap of one tile
  (nothing); both solid (no join, no problem, two places of one, so `places` is `{}`); each problem above, whole; three
  in a row make one place of three; the place's offsets are from its top left corner whatever the map's numbers are
  (moving all three by (100, -7) gives the same `places`). The links game: `content.places` deep-equals
  `{ 'room-2': [{ level: 'room-2', x: 0, y: 0 }, { level: 'room-3', x: 16, y: 0 }] }`, and a game with no world file,
  or one whose levels do not touch, has no `places` key. `simContent` of the links game has `places`, no `worlds`, and
  no `world` entry in `project.content`; moving `room-1` on the map gives a `simContent` that is deep-equal.
- [x] **Step 2: Push; fails.**
- [x] **Step 3: Implement.**
- [x] **Step 4: Push; green**, with `schemas/world.schema.json` from the log; every existing golden unmoved.
- [x] **Step 5: Commit** `feat(content): the world file, and levels that join where they touch`

### Task 4: The public list of format changes

**Files:**
- Create: `docs/formats/changes.md`, `tests/docs/format-changes.test.ts`
- Modify: `package.json` (`files` gains `docs/formats/changes.md`), `tests/package.test.ts` if it lists the packed files

The page, newest first. One entry per change:

```markdown
## 2026-11-15 · character · values, switch, opens and one-per-level

A character can now list the values its things hold ...
**An older file needs:** nothing.
**Schema:** `0000000000000000`
```

The hash is `xxhash64` (`src/lib/xxhash64.ts`) of the bytes of `schemas/<kind>.schema.json`, 16 hex digits. This
cycle's entries: `character`, `level` (a thing's `values`), `behaviour` (`walk-path`), `world` (new kind), and under
them one first entry per kind as it stood before this cycle ("The format as first listed"), so every schema has one.

- [x] **Step 1: Write the failing test:** for every `schemas/*.schema.json` but `replay`, the newest entry of that kind
  ends with the file's hash; else it fails with
  `schemas/level.schema.json changed and docs/formats/changes.md has no entry for it. Add one, newest first, ending with: **Schema:** \`<hash>\``.
  An entry whose kind has no schema fails too. The packed package holds the page (`tests/package.test.ts`).
- [x] **Step 2: Write the page with every hash as sixteen zeros; push; the test fails and prints each hash.**
- [x] **Step 3: Put the printed hashes in; push; green.**
- [x] **Step 4: Commit** `docs(formats): the public list of format changes, held to the schemas`
- [x] **Step 5: Tick this pull request's tasks here and in `progress.md`, mark it ready, report to the coordinator.**

Every later task that changes a schema adds its entry in the same commit. None is planned after this pull request.

---

## Pull request 2: switches and gates

### Task 5: Which levels are in a sim, and a thing's values from game code

**Files:**
- Create: `src/features/level/where.ts`, `src/features/level/values.ts`
- Modify: `src/features/level/uses.ts`, `game-sim.ts`, `level.ts`, `src/headless.ts`, `src/index.ts`
- Test: `tests/features/level/values.test.ts`, `tests/public-surface.test.ts`

**Interfaces (produces):**

```ts
// level/uses.ts
export function usesValues(content: GameContent): boolean     // a character with `values`
export function usesSwitches(content: GameContent): boolean   // a character with `switch` or `opens`
// level/where.ts
export interface SimLevel { readonly level: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number }
/** Which levels this sim holds and where, and whether a thing's id has its level in front. Never changes after tick 0. */
export const Where: ResourceDef   // { levels: SimLevel[], prefixed: boolean }
export function wherePlugin(levels: readonly SimLevel[]): PluginDef   // name 'where', config { levels }; prefixed is levels.length > 1
/** The level and the file id of a thing: 'room-2.crate-1' gives { level: 'room-2', id: 'crate-1' }; unprefixed, the sim's one level. Undefined for a hero. */
export function thingIn(where: { levels: readonly SimLevel[]; prefixed: boolean }, thingId: string): { readonly level: string; readonly id: string } | undefined
// level/values.ts
export interface ThingValues {
  number(id: string): number
  switch(id: string): boolean
  choice(id: string): string
  words(id: string): string | undefined
  /** The linked things as entities' StableIds, in the order written; one that is gone is left out. */
  things(id: string): readonly number[]
  /** In the sim's own tiles: the level's offset is already added. */
  path(id: string): readonly LevelPoint[]
  leadsTo(id: string): { readonly level: string; readonly thing?: string } | undefined
}
export function valuesOf(ctx: SimContext, sid: number): ThingValues
```

`wherePlugin` joins when `usesValues(content)`, or (Task 8) the opened level is in a place. Until Task 8,
`createGameSim` gives it the one opened level at (0, 0). A getter throws a plain `Error` when the character does not
declare that id with that type (`The character "critter" has no number called "hits". It has: reach.`), and `valuesOf`
throws `This entity is not a thing from a level.` for a tile or a hero.

- [x] **Step 1: Write the failing tests** on the links game opened at `room-2`: `valuesOf(…button-1).switch('stays')`
  is true and `.things('opens')` is `[sid of gate-1]`; `critter-1`'s `number('reach')` is 3 (the default) and
  `path('walk')` is the two places; the two throws; a game with no `values` has no `Where` (asking for it throws) and
  ends sixty idle ticks on `push-crate.json`'s `idleHash60`.
- [x] **Step 2: Push; fails.** **Step 3: Implement.** **Step 4: Push; green; every golden unmoved.**
- [x] **Step 5: Commit** `feat(level): a thing's values, read from game code`

### Task 6: Two boxes that overlap

**Files:** Create `src/features/level/overlap.ts`; modify `level.ts` and `src/headless.ts` (it is exported: the test
game's own tests use it); test `tests/features/level/overlap.test.ts`.

```ts
/** A box by its middle, its half sizes and its turn in radians. */
export interface TurnedBox { readonly x: number; readonly y: number; readonly hw: number; readonly hh: number; readonly rotation: number }
/** True when the two overlap by more than `SLOP` (0.01 tile) on every axis: boxes that only touch do not. Separating axes, with dmath's sin and cos. */
export function boxesOverlap(a: TurnedBox, b: TurnedBox): boolean
```

- [x] **Step 1: Tests:** apart; touching edges (false); overlapping by 0.02 (true); one inside the other; a 1 by 1 box
  turned 45 degrees whose corner reaches into a plate (true) and whose corner is 0.05 short (false); the same answer
  with `a` and `b` swapped, for each. And the links game's own levels (audit M2): no two bodies in any level overlap
  at spawn (solid tiles, things and the heroes at the starts), and `critter-1`'s box at each end of its path
  overlaps none.
- [x] **Step 2 to 4: push red, implement, push green.** **Step 5: Commit** `feat(level): a pure overlap test for boxes`

### Task 7: Switches open gates

**Files:**
- Create: `src/features/level/switches.ts`, `tests/golden/switch.json`
- Modify: `src/features/level/hero.ts` (`characterParts`), `spawn-level.ts`, `game-sim.ts`, `level.ts`, `src/headless.ts`
- Test: `tests/features/level/switches.test.ts`, `tests/features/level/switches.parity.test.ts`

**Interfaces:**
- Consumes: Tasks 5 and 6.
- Produces:

```ts
export const Pressed: ComponentDef<{ on: 'bool' }>                    // on a thing whose character has `switch`; not drawn
export const Open: ComponentDef<{ on: 'bool'; kept: 'bool' }>         // on a thing whose character has `opens`; not drawn
/** `<kind>.opened` or `<kind>.closed`, payload { thing: string, sid: number }; the same object every call, as `touchEvent` is. */
export function openEvent(kind: string, what: 'opened' | 'closed'): EventDef
/** Raised once when a `stays` switch first holds a thing open for good: { fact: 'room-2.gate-1.open' }. */
export const FactKept: EventDef       // id 'fact.kept'
/** Tells the sim what was done for good before this play: sent once, at tick 0, with source 0. Believed only so (below). */
export const FactsCommand: CommandDef  // id 'facts', payload { facts: string[] } (at most 1024, each at most 200 letters)
export function factsCommand(facts: readonly string[]): Command        // { tick: 0, source: 0, seq: 0, type: 'facts', … }
export function switchPlugin(): PluginDef   // name 'switches', dependsOn ['level', 'where']
```

A fact is `<level>.<thing>.open`, the level and the thing's id as the files write them, whatever the sim's ids are.

`level.switches` runs once a tick, in `gameplay`, lowest sid first within each pass. The schedule breaks ties by
system name (`sim/schedule.ts`), and `level.switches` sorts after `level.moves`, so a press always reads the boxes
after the hero's moves, wherever the plugin is in the list. It names no `after`: a name the sim does not have makes
the schedule throw, and a game whose hero has no `moves` has no `level.moves` (audit L2). A test holds the order
(`orderSystems` of the two).

1. **Facts:** only a `facts` command with `source === 0` on tick 0 is believed. Any other (a player's, which online
   is any command a seat sends, or one on a later tick) is ignored, never rejected, so a replay still reads (audit H2).
   For each believed fact, the thing it names, if it is in this sim and has `Open`, gets `kept: true`. A fact that
   names nothing here is ignored.
2. **Presses:** a switch is pressed when any other entity with a `Thing` and a body that is not `fixed` overlaps its
   box (`boxesOverlap`, from each one's `Transform` and `Collider`). On the tick it becomes pressed, if its `stays`
   value is true, each thing it links that has `Open` and not `kept` gets `kept: true` and `FactKept` is raised for it.
3. **Open or shut:** a thing with `Open` should be open when it is `kept` or any pressed switch links it. Opening:
   `on` true, its `Collider.sensor` true, `<kind>.opened`, and its `open` clip when the game has sprites (`setClip`).
   Closing: only when nothing that is not `fixed` overlaps its box; then `on` false, `sensor` false, `<kind>.closed`
   and the `shut` clip. A field is written only when it changes.

`switchPlugin` joins only when `usesSwitches(content)` and brings `wherePlugin` with it. Where it stands in the plugin
list does not matter.

- [x] **Step 1: Write the failing tests** (Node; the links game, with `room-1`'s things moved by an override where a
  test needs a start position; every sim disposed):

```ts
test('a crate on the plate opens the gate, and off it the gate shuts')            // crate-1 placed at (8.5, 7.5): gate.opened in the first 3 ticks, Collider.sensor true; crate despawned: gate.closed next tick
test('a hero on the plate holds the gate open only while standing there')
test('two switches on one gate: it is open while either is pressed')
test('a gate does not shut on a hero standing in it; it shuts the tick after they leave')    // Review Focus 2
test('a thing taken away, or a hero who leaves, lets the plate up')                // Review Focus 1: despawn, and LeaveCommand in a two-player sim
test('a button that stays opens its gate for good and raises fact.kept once')      // payload { fact: 'room-2.gate-1.open' }; pressed again: no second event
test('facts at tick 0 open the gate before anyone moves; a fact about a missing thing is ignored')   // Review Focus 5
test('a facts command from source 1 at tick 0, and one from source 0 at tick 5, open nothing')     // Review Focus 8, audit H2
test('level.switches runs after level.moves in the schedule, with and without a hero that has moves')   // audit L2
test('straight, and restored at tick 45, a switch run agrees')
test('a game with no switch has no Pressed, no Open, no facts command')            // and ends on push-crate.json's idleHash60
```

  The parity test (`switch.json`): the links game at `room-1`, player 1 holds right for 300 ticks, then nothing for 60;
  recorded and replayed; the golden's hashes in Node and the three browsers. The hero pushes the crate over the plate
  and on through the gate. Asserted before the hashes (audit L3), so the run proves what it names: `gate.opened` was
  raised and `gate.closed` after it, the same number of times each; the crate ends beyond the gate (its `x` above
  11.5); the gate is shut at the end. If the run does not do that, change how long the hero holds right, never what
  is asserted, and say so in the report.
- [x] **Step 2: Push; fails, and the Node job prints `switch.json`.**
- [x] **Step 3: Implement; commit the printed golden.**
- [x] **Step 4: Push; all four engines match; every existing golden unmoved.**
- [x] **Step 5: Commit** `feat(level): switches open gates, with no game code`, then tick, mark ready, report.

---

## Pull request 3: a place

### Task 8: Several levels built into one world

**Files:**
- Create: `src/features/level/place.ts`, `src/features/level/spawn-place.ts`, `src/features/level/arrive.ts`
- Modify: `game-sim.ts`, `hero.ts` (`heroParts` takes a spot), `join.ts`, `where.ts` callers, `level.ts`
- Test: `tests/features/level/place.test.ts`, `spawn-place.test.ts`, `arrive.test.ts`

**Interfaces:**
- Consumes: `GameContent.places` (Task 3), `SimLevel`, `wherePlugin` (Task 5).
- Produces:

```ts
// level/place.ts
/** The levels the sim holds when `opened` is opened: its place's, sorted by level id, or itself alone at (0, 0). */
export function levelsOf(content: GameContent, opened: string): readonly SimLevel[]
/** The level whose box holds the spot (left and top edges in, right and bottom out), or undefined in none. */
export function levelAt(levels: readonly SimLevel[], x: number, y: number): string | undefined
export function placeSize(levels: readonly SimLevel[]): { readonly w: number; readonly h: number }
/** The level with every place in it moved: things, starts, joints' places and every path value's points. */
export function shiftLevel(level: Level, content: GameContent, dx: number, dy: number): Level
/** The place's solid tiles as rows of '#' and '.', empty where there is no level. */
export function solidGrid(content: GameContent, levels: readonly SimLevel[]): readonly string[]
// level/game-sim.ts: GameSimOptions gains
/** Where the heroes come in, in the opened level: beside a thing of it, or at a spot in its own tiles. Default: its starts. */
readonly arrive?: Arrive
export type Arrive = { readonly thing: string } | { readonly x: number; readonly y: number }
// level/arrive.ts: where each hero comes in (below). The spots are in the sim's tiles, the opened level's offset added.
export function arrivalSpots(content: GameContent, levels: readonly SimLevel[], opened: string, players: readonly number[], arrive?: Arrive): ReadonlyMap<number, { readonly x: number; readonly y: number }>
// level/spawn-place.ts
export function spawnPlace(sim: Sim, content: GameContent, opened: string, players: readonly number[], arrive?: Arrive): void
```

`spawnPlace`, for a level alone with no `arrive`, calls `spawnLevel` and nothing else. For a place of two or more, in
this fixed order: the boxes of `tileBoxes(solidGrid(…))`; then for each level in id order, its things in the file's
order (ids `<level>.<id>`), its anchor if a joint needs one, its joints; then the heroes, lowest number first. A ground
box inside one level is one entity as today, with that level's ground colour; a box that crosses an edge is one body
with no `Look`, and one `Look`-only entity (a transform and a look, no body) for each level's part of it, in level
order. The ground is always `tileBoxes`, never a box a row (call 2, audit L1).

The level's anchor, for a joint with no holder, is a fixed body at the place's corner, (0, 0), as `spawnLevel` makes it
at the level's corner. `shiftLevel` has already moved each joint's places by the level's offset, so the holder's
offset (`place` minus the anchor, `joints.ts`) is the place in the sim's own tiles and nothing else needs moving
(audit M6 asked whether a pinned thing in a shifted level is held in the right place; it is, and a test says so).

Heroes: with no `arrive`, at the opened level's starts. With one, `arrivalSpots` says where each comes in
(audit H1, call 13). A door is a sensor, and a body made inside a sensor raises its `touched` on the first step, so
no hero may be put inside the thing it comes in beside:

- `{ thing }`: **beside** the thing, clear of its box. The near spot is on the thing's side toward the middle of the
  level (the right side for a thing exactly at the middle): the thing's middle moved sideways by half its width, half
  the hero's width and 0.05 tile (more than the 0.01 `SLOP`), and up or down so the hero's bottom is the thing's bottom
  (the hero stands on the floor the door stands on). Player `n` is further from the thing than player 1 by the
  distance along x between the level's starts 1 and `n`, so heroes are spread as the starts are, player 1 nearest.
- `{ x, y }`: that spot (a saved place after an edge was crossed), and player `n` at the spot plus (`start n` minus
  `start 1`) of that level.
- Each hero's spots are tried in this order: its near spot; the same spot on the thing's other side (`{ thing }`
  only); its own start. The first that lies inside the opened level's box, overlaps no solid tile and overlaps no
  thing that has a `leads-to` value is the one used. An `arrive.thing` the level does not have gives the starts.

`joinPlugin`'s late joiner comes in the way the first heroes did (`heroParts(content, level, number, at?)` takes the
spot), at the level the sim was opened at, wherever player 1 has got to since (call 14, audit L8).

`createGameSim` calls `spawnPlace`, gives `wherePlugin` `levelsOf(content, level)` when there is more than one, and
gives `joinPlugin` the same `arrive`.

- [x] **Step 1: Write the failing tests:**

```ts
test('levelsOf: a lone level is itself at (0, 0); room-2 and room-3 give both, with room-3 at (16, 0)')
test('levelAt: (15.99, 5) is room-2, (16, 5) is room-3, (40, 5) is none')
test('shiftLevel moves things, starts, joints and path points, and nothing else')
test('solidGrid: the floor of the place is one unbroken row of 32, and rows 5 to 7 are open at columns 15 and 16')
test('the place of room-2 and room-3: the floor is one body 32 wide, with one Look for each level, and the sim steps')   // Look-only entities are new: step 10 ticks with them
test('things keep their level in front: room-2.crate-1 and room-3.goal-1; heroes are player-1')
test('room-1 alone is spawned exactly as spawnLevel spawns it')          // the same entity list, ids and order
test('arriving beside door-in (x 2 to 3), two heroes stand clear of it at (3.45, 7.5) and (4.45, 7.5)')   // audit H1
test('arriving beside door-in, which leads back to room-1: no door.touched in the next 60 ticks')        // Review Focus 6
test('a solid tile on the near side: the far side is used; solid on both, each hero takes its own start')   // Review Focus 3
test('a pinned crate in room-3 is held at its own place, 16 tiles on from room-3\'s corner')   // audit M6: an override pins one
test('arriving at a thing the level no longer has opens its starts')     // Review Focus 5
test('a game with no place: every golden, and idleHash60, unmoved')
```

- [x] **Step 2 to 4: push red, implement, push green; every golden unmoved.**
- [x] **Step 5: Commit** `feat(level): joined levels are built into one world`

### Task 9: Which level a hero is in

**Files:**
- Create: `src/features/level/entered.ts`
- Modify: `hero.ts`, `game-sim.ts`, `level.ts`, `src/headless.ts`, `src/features/cli/replay.ts`, `src/features/game/game.ts` (the recording's `meta`)
- Test: `tests/features/level/entered.test.ts`, `tests/features/cli/replay.test.ts`

**Interfaces (produces):**

```ts
/** On every hero, only in a place of two or more levels: the level it is in. Not drawn. */
export const In: ComponentDef<{ level: 'string' }>
/** Raised each time a hero's middle passes into another level of the place: never at spawn, never while in no level. */
export const LevelEntered: EventDef   // id 'level.entered', payload { level: string, from: string, player: number, sid: number, x: number, y: number }; x and y are in the entered level's own tiles
export function placePlugin(): PluginDef   // name 'place', dependsOn ['level', 'where']; system 'level.where', postPhysics, after physics
/** The level each hero is in, lowest player first; for a sim with one level, that level. */
export function heroLevels(sim: Sim): readonly { readonly player: number; readonly level: string }[]
```

A hero in no level's box (in the air beyond the outline) keeps the level it was last in. A recording of a game opened
with `arrive` writes it into `meta.arrive` as `thing:door-in` or `at:3.5,7.5`, and `automata replay` reads it back
(`replay.ts`), so `replays/room-2.json` plays the place as it was opened.

- [x] **Step 1: Write the failing tests:** a hero walking right from `room-2` raises `level.entered` once, with
  `level: 'room-3'`, `from: 'room-2'` and an `x` under 1; walking back raises it once more the other way; standing on
  the edge for 120 ticks raises nothing more; two heroes are tracked apart; a lone level has no `In` and no event;
  `meta.arrive` round-trips both forms through `automata replay`; a `join` command at tick 100, after player 1 has
  crossed into `room-3`, puts player 2 at `room-2`'s start for player 2, and `heroLevels` says `room-2` for them (call
  14, audit L8).
- [x] **Step 2 to 4: push red, implement, push green.**
- [x] **Step 5: Commit** `feat(level): a hero's level is known every tick, and crossing is an event`

### Task 10: A place on the page, and its proof in four engines

**Files:**
- Create: `src/features/game/stage-of.ts` (not `stage.ts`: render has one, and both are about what is drawn),
  `tests/golden/place.json`
- Modify: `src/features/render/render.ts`, `render/art.ts`, `render/stage.ts`, `src/features/game/game.ts`,
  `game/watch.ts`, `game/online.ts`, `game/art.ts`
- Test: `tests/features/level/place.parity.test.ts`, `tests/features/render/camera.test.ts`,
  `tests/features/game/place.browser.test.ts`

**Interfaces (produces):**

```ts
// game/stage-of.ts: one place that decides what the renderer is given, for startGame, watchReplay and startOnlineGame
export interface StageLevel extends SimLevel { readonly sky: number; readonly view: LevelView | undefined }
export function stageOf(content: GameContent, opened: string): { readonly world: { w: number; h: number }; readonly levels: readonly StageLevel[] }
// render/render.ts: createRenderer's options gain `levels?: readonly StageLevel[]` and `at?: string` (the level shown first); Renderer gains
/** The sky, the backdrop and the view become this level's, from the next step on. Nothing for a level it was not given. */
enter(level: string): void
// render/art.ts: loadArt gains `levels?: readonly SimLevel[]` beside its `level` (audit L7: `loadArt` is public, `src/index.ts` exports
// the render feature whole, so `level` keeps working and means a place of one at (0, 0)); with `levels`, its tiles and ground are
// placed at each level's offset. The API report gains the one option (taken from the `package` job). Art gains
backdropOf(level: string): BackdropArt | undefined
```

The camera's limits are `world`, the place's outline (`frameHeroes` already takes the level's size: it is now given the
place's). `startGame` calls `renderer.enter` when the lowest-numbered hero raises `level.entered`.

**Facts and the first picture (plan Q's return note on #169, change 5).** When `GameOptions.facts` (new, `readonly
string[]`) is not empty, `startGame` steps tick 0 once, at once, before it draws or starts its loop: the one command
of that step is `factsCommand(options.facts)` and no player's input. So a gate a fact opens is open in the first
picture, and a game that waits for a first press (plan Q's start card) waits after this step, never before it, so
the gate does not pop open on the press. The first input lands on tick 1. With no facts nothing is stepped early and
nothing changes, so no recording moves; a recording of a game opened with facts carries the one command at tick 0
and replays as it ran. `startFlow`'s Continue and the test game's page get this by calling `startGame`.

- [x] **Step 1: Write the failing tests.**
  - Parity, `place.json` (the spec's proof): the links game opened at `room-2`, with `facts: ['room-2.gate-1.open']`,
    `crate-1` moved to (12.5, 7.5) and `critter-1` taken out, all by overrides (the critter stands still this cycle
    and would only make the hero push a stack, whose speed changes for reasons that are not the seam: audit L4);
    player 1 holds right for 420 ticks. Asserted before the hashes: `level.entered` was raised exactly once, for
    player 1 (a crate raises none); the crate's `x` ends above 16 (it crossed with the hero); between the tick before
    and the tick after the hero's crossing the hero's `Body.vx` differs by less than 0.01 (no break in speed).
    Recorded, replayed, restored at tick 200, in Node and the three browsers. If the crate has not crossed by tick
    420, raise the ticks and say so in the report.
  - `camera.test.ts`: `frameHeroes({ w: 32, h: 9 }, view, [hero at x 30])` keeps the shot inside 0 to 32.
  - Browser: `startGame` on the links game at `room-2` draws both levels (the canvas is as wide as 32 tiles fitted);
    after the crossing the renderer's sky is `room-3`'s (give `room-3` its own `sky` in the test). `startGame` with
    `facts: ['room-2.gate-1.open']` has its sim at tick 1 and `gate-1` open before the first frame is drawn, and one
    with no facts is at tick 0 as it is today; the recording of the first holds the `facts` command at tick 0 and
    nothing else at tick 0.
- [x] **Step 2: Push; fails; the Node job prints `place.json`.**
- [x] **Step 3: Implement; commit the golden.**
- [x] **Step 4: Push; all engines match; every existing golden and every existing browser test unmoved.**
- [x] **Step 5: Commit** `feat(game): a place is drawn and followed as one world`, then tick, mark ready, report.

---

## Pull request 4: doors, and what is remembered

### Task 11: Which door was taken

**Files:**
- Create: `src/features/level/doors.ts`
- Modify: `level.ts`, `src/headless.ts`, `src/features/flow/steps.ts`
- Test: `tests/features/level/doors.test.ts`, `tests/features/flow/steps.test.ts`

**Interfaces (produces):**

```ts
// level/doors.ts
export interface Way { readonly level: string; readonly thing?: string; /** The door that was touched, as the files name it. */ readonly through: { readonly level: string; readonly thing: string } }
/** The first `<kind>.touched` event of the step, in order, raised by a hero on a thing that has a `leads-to` value; undefined when there is none. */
export function doorTaken(content: GameContent, opened: string, events: readonly SimEvent[]): Way | undefined
// flow/steps.ts
// FlowState gains `arrive?: Arrive` (kept in `playing` and `paused`) and `door?: true` (set only by a door, kept the
// same way); FlowEvent gains
| { readonly type: 'door'; readonly level: string; readonly arrive?: Arrive }
// and 'play' gains an optional `arrive`, so Continue can come in where the player left (and has no `door`)
```

In `playing`, `door` answers a new `playing` state with that level and `arrive` (call 5: no `done` screen, the Owner's
answer). Anywhere else it answers the same object. `pause` and `resume` carry `arrive` unchanged. `advance` cannot tell
a second door from the first (each is a new `playing` state, and the flow starts a level for each), so a level being
started once per visit is `watchWays`' to keep (Task 12, audit M1).

**Where plan Q meets this (its return note on #169, changes 4 and 5).** Plan Q's rule for starting a level is "the flow
starts a level exactly when `attempt` changes", and `attempt` is not on `main` yet. Plan W's rule is the one the flow
has: a new `playing` state from `playing` starts a level, and `door` always answers a new object, so a door starts a
level under either rule. Whichever plan lands second makes a door raise `attempt` by one, and plan Q's note carries
that change; nothing here has to know it. The flow state's `door: true` is what lets plan Q tell a level opened
through a door from one opened by Continue (which also has `arrive`): a level opened by a door is opened mid-move, so
plan Q's start card does not make it wait for a first press. Menu, Continue, Try again, Start again and Next level
carry no `door`, and so wait.

- [x] **Step 1: Write the failing tests:** `doorTaken` on real events from a sim (a hero walked into `exit` in `room-1`
  gives `{ level: 'room-2', thing: 'door-in', through: { level: 'room-1', thing: 'exit' } }`); a crate pushed into the
  door gives undefined; a door whose `to` an override takes away gives undefined; in a place the prefixed id is read
  (`room-3.back` to `room-1`: the fixture has it); two heroes through two doors in one step gives the first event's.
  `advance`: `door` in `playing` gives `playing` at the new level with `arrive` and `door: true`, always a new object;
  `play` with an `arrive` (Continue) gives `playing` with `arrive` and no `door`; `pause` and `resume` keep `arrive` and
  `door`; in `paused`, `menu` and `done` a door gives the same object. The template's door (below): in a game whose
  `done` is `door.touched` and whose door has no `to`, `doorTaken` gives undefined, and the touch still ends the level.
- [x] **Step 2 to 4: push red, implement, push green.**
- [x] **Step 5: Commit** `feat(level): which door a hero went through, as one pure answer`

### Task 12: The flow follows doors and remembers

**Files:**
- Create: `src/features/flow/ways.ts`, `tests/fixtures/flow/links.ts` (the links game for the flow's browser tests),
  `tests/features/flow/ways.test.ts`
- Modify: `src/features/flow/progress.ts`, `places.ts`, `flow.ts` (at most 10 lines: it calls `ways.ts`), `types.ts`
- Test: `tests/features/flow/progress.test.ts`, `tests/features/flow/doors.browser.test.ts`,
  `tests/features/flow/ways.test.ts`

**Interfaces:**
- Consumes: `doorTaken`, `LevelEntered`, `FactKept`, `GameOptions.arrive` and `.facts`.
- Produces:

```ts
// flow/progress.ts
export interface Progress {
  readonly level: string
  /** The level the player was last in and where they came into it. Written only by a door or an edge. */
  readonly last?: { readonly level: string; readonly thing?: string; readonly x?: number; readonly y?: number }
  /** What was done for good, sorted, each once. Written only when a `stays` switch is used. */
  readonly facts?: readonly string[]
}
/** The two optional fields as Zod shapes, for a game whose own save has doors. */
export const progressFields: { readonly last: z.ZodType; readonly facts: z.ZodType }
export function cameIn<S extends Progress>(data: S, last: NonNullable<Progress['last']>): S
/** The same object when the fact is already there. */
export function remembered<S extends Progress>(data: S, fact: string): S
/** Where Continue opens: `last` when the game still has that level, else `level`, else the project's start. */
export function continueAt(data: Progress, levels: readonly string[], start: string): { readonly level: string; readonly arrive?: Arrive }
// flow/places.ts: Places gains
cameIn(last: NonNullable<Progress['last']>): Promise<void>
remember(fact: string): Promise<void>
/** What `open` and `openNewest` found beyond the level: where to come in. */
arrive(): Arrive | undefined
// flow/ways.ts
export function watchWays(options: { game: Game; content: GameContent; level: string; onDoor(way: Way): void; onEntered(level: string, at: LevelPoint): void; onFact(fact: string): void }): () => void
```

`progressDef` becomes version 2 with `upgrades: { 1: (data) => data }` and a schema that takes the two optional
fields; a version 1 save reads as it is. `startLevel` gives `startGame` the state's `arrive` and the save's `facts`.
**The first door stops everything (audit M1):** `watchWays` calls `onDoor` once and then listens to nothing more (it
unhooks its `onStep` before `onDoor` returns), and the flow's `onDoor` pauses the game (`game.pause()`, as `done`
does) before it awaits anything, so a second hero a tick later, or a second door, starts nothing. On a door:
`places.cameIn({ level, thing })`, `places.reach(level, …)` as `done` does today, then
`dispatch({ type: 'door', … })`. On player 1's `level.entered`: `places.cameIn({ level, x, y })`. On `fact.kept`:
`places.remember(fact)`. A save that cannot be kept says what `done` says today (`automata.done.not-kept`) and the
visit goes on from memory.

- [x] **Step 1: Write the failing tests.**
  - `progress.test.ts`: `cameIn`, `remembered` (sorted, once, same object when known), `continueAt` (a `last` level the
    game dropped falls back to `level`, then to the start: Review Focus 5); a version 1 save `{ level: 'room-1' }`
    loads under version 2.
  - `ways.test.ts`, with a fake game whose `onStep` the test drives: two heroes through one door a tick apart, and
    through two different doors a tick apart, call `onDoor` once; the game is paused before the first await; the
    flow starts the level once (a count of `startLevel` calls). After the first door, `fact.kept` and `level.entered`
    steps are no longer heard.
  - `doors.browser.test.ts`, the spec's journey, in the three browsers on the links game through `startFlow`: Play; the
    hero pushes the crate onto the plate, walks through the gate and into `exit`; the state is `playing` at `room-2`
    with no screen between, and the hero is beside `door-in`. The hero stays there for 60 ticks and is still in
    `room-2` (`door-in` leads back to `room-1`, so a hero put inside it would be sent straight back: audit H1);
    walking into `door-in` on purpose opens `room-1` beside `exit`, and the hero goes through `exit` again. Then: the hero presses `button-1`, crosses into `room-3`;
    leave to the menu; Continue; the hero is in `room-3` near where it crossed, and `gate-1` is open on the first tick
    (the save holds `facts: ['room-2.gate-1.open']`), while `crate-1` is back at (5.5, 7.5). With two players, the
    first hero through the door takes both, and both stand beside `door-in`.
  - A world file edited so `room-3` no longer touches `room-2`, then Continue from that save: `room-3` opens alone at
    its starts, and nothing throws (Review Focus 4).
- [x] **Step 2 to 4: push red, implement, push green** (`flow.ts` stays under 600 lines; if it would not, move
  `startLevel`'s listeners into `ways.ts`).
- [x] **Step 5: Commit** `feat(flow): a door opens its level, and the save remembers where and what`, then tick, mark
  ready, report.

---

## Pull request 5: the commands and the docs

### Task 13: `automata world`

**Files:**
- Create: `src/features/cli/world.ts`
- Modify: `args.ts`, `cli.ts`, `help.ts`, `mcp-tools.ts`, `check-files.ts` (the notes)
- Test: `tests/features/cli/world.test.ts`, `args.test.ts`, `mcp-tools.test.ts`

**Interfaces (produces):** `automata world [folder] [--json]`, and the MCP tool `world` (`{ folder }`) that returns the
same report:

```ts
export interface WorldReport {
  readonly ok: boolean
  readonly levels: readonly { readonly level: string; readonly at: LevelPoint | null; readonly size: { w: number; h: number }; readonly start: boolean; readonly order: number | null }[]
  readonly doors: readonly { readonly from: { level: string; thing: string }; readonly to: { level: string; thing?: string } }[]
  readonly joins: readonly Join[]
  readonly places: readonly (readonly string[])[]          // every place, those of one level too
  readonly notes: readonly string[]
  readonly sentence?: string                               // when the game does not load
}
```

As words, one line each: `room-1  16 by 9  at 0, 0  start`; `room-1 exit leads to room-2 door-in`;
`room-2 and room-3 touch: room-2's right edge, rows 5 to 7`. Notes (also added to `check`'s `files` step, never a
failure): a level that is not `start`, not in `levels` and that no door or join leads to
(`Nothing leads to room-4 yet.`), and a big place (call 9:
`The place of room-2 has 9 levels (20,000 tiles). The whole place runs at once, so keep a place under 8 levels and 16,384 tiles.`).

- [x] **Step 1: Write the failing tests** on the links game in a temporary folder, as `art.test.ts` does: the report
  deep-equals the expected one (three doors, `exit`, `door-in` and `back`; one join; two places); the words; each note;
  a game with no world file lists its levels with `at: null` and no joins; a game that does not load answers
  `ok: false` with one sentence.
- [x] **Step 2 to 4: push red, implement, push green.**
- [x] **Step 5: Commit** `feat(cli): automata world lists levels, doors and joins`

### Task 14: `automata picture`

**Files:**
- Create: `src/features/content/paint-marks.ts`, `paint-level.ts`, `src/features/cli/picture.ts`,
  `tests/golden/level-picture.json`
- Modify: `content.ts`, `src/headless.ts`, `args.ts`, `cli.ts`, `help.ts`, `mcp-tools.ts`, `template/gitignore`
  (a `.automata/` line), `tests/architecture/rules.ts` only if the painter rule does not already match the two files
  (`paint-[^/]+` does)
- Test: `tests/features/content/paint-level.test.ts`, `paint-level.parity.test.ts`, `tests/features/cli/picture.test.ts`,
  `tests/template/` (the gitignore line)

**Interfaces (produces):**

```ts
// content/paint-marks.ts: whole numbers only
export function line(picture: Picture, x0: number, y0: number, x1: number, y1: number, colour: number): void
export function ring(picture: Picture, cx: number, cy: number, radius: number, colour: number): void
/** A filled square with the number in it, 3 by 5 digits; its box, so the caller can keep badges apart. */
export function badge(picture: Picture, x: number, y: number, n: number, ink: number, paper: number): { readonly w: number; readonly h: number }
// content/paint-level.ts
export interface LegendLine { readonly n: number; readonly level: string; readonly thing: string; readonly value: string; readonly shown: ValueShown; readonly says: string }
export interface Painted { readonly picture: IndexedPicture; readonly legend: readonly LegendLine[] }
export function paintLevel(content: GameContent, level: string, options?: { readonly whatItIs?: boolean }): Painted
/** The world file's sheet: each level small at its `at`, an arrow from each door to where it leads (a numbered badge at each end), a bar across each join. Undefined when no level fits (see below). */
export function paintWorld(content: GameContent): Painted | undefined
```

- **Scale:** 16 pixels a tile, or 8 when a side is over 128 tiles. The world sheet uses the largest of 8, 4, 2 and 1
  that keeps both sides at or under 2,048 pixels; when none does, the command says
  `The map is too big for one picture. Name the levels you want: automata picture room-1 room-2.`
- **As it plays:** the level's sky; each solid tile in the level's ground colour (a tileset's solid tiles too, since
  Node cannot read the tileset's picture yet: see "What is on main"); each thing as its figure's first pose, scaled into its box by whole-number nearest pixel,
  or its coloured box.
- **`whatItIs`:** solid tiles in one flat tint; then for every value whose `shownOf` is not `none`: `arrow` a line
  from the thing to each linked thing with a badge at the far end; `path` lines through its points with a 3 by 3 dot
  on each; `reach` a `ring` of that many tiles; `tag` a badge at the thing's top right, except that a `switch` is
  tagged only when the thing's value is not its declaration's default (the spec's "when it is not the default", audit
  L11); `leads-to` a badge on the door (the spec's "tag in the level": `paintWorld` draws the arrow). A badge that
  would cover an earlier one moves down by its own height until it is clear. Each badge's `LegendLine` says it in the
  source language: `says` is the number, `yes` or `no` (the framework's own words for them), the choice's `name`, the
  `words` value's text in the source language, the linked thing's id, or `to room-2, beside door-in`. The Owner chose
  numbers and a list over words on the picture (2026-11-15, 22:59 UTC).
- **Colours:** the palette is every colour in first-used order; past 255 the nearest earlier one is used (whole-number
  distance on red, green and blue). `createPicture(width, height, palette)` takes its palette first
  (`content/pixels.ts`), so each painter draws twice: a first pass that only collects the colours in the order they
  will be used, then `createPicture` with them and the same drawing again (audit L6).

`automata picture [level…] [--what-it-is] [--world] [--json]` writes `.automata/pictures/<level>.png` (or
`<level>.what.png`, or `world.png`), prints each path and then the legend, one line a badge
(`3  room-2 button-1  opens  gate-1`); `--json` gives `{ ok, pictures: [{ level, path, legend }] }`. The MCP tool
`picture` takes `{ folder, levels?, whatItIs?, world? }` and returns the same.

- [x] **Step 1: Write the failing tests:** `line`, `ring` and `badge` on a small picture, pixel for pixel (a
  horizontal, a vertical and a steep line; a ring of radius 3; the digits 0 to 9; the number 12). `paintLevel` of
  `room-2`: 256 by 144; the pixel in the middle of `crate-1` is the crate's colour; with `whatItIs`, the legend is
  exactly `opens` (arrow to `gate-1`), `stays` (tag, `yes`), `walk` (path), `reach` (reach, `3`) and `to` (tag, `to
  room-1, beside exit`, for `door-in`); a button whose `stays` is its default, `false`, has no tag (an override); two
  tags on one thing do not overlap. `paintWorld`: one bar, and for each of the three doors an arrow with a numbered
  badge at each end. Parity (`level-picture.json`): the xxhash64 of the PNG bytes of `room-2` as it plays, with `whatItIs`,
  and of the world, the same in Node and the three browsers. The command writes the files, prints the legend, and
  writes nothing for a game that does not load.
- [x] **Step 2: Push; fails; the Node job prints the three hashes.**
- [x] **Step 3: Implement; commit the golden.**
- [x] **Step 4: Push; green in all four engines.**
- [x] **Step 5: Commit** `feat(cli): automata picture paints a level, what it is, and the world`

### Task 15: The skill, the README and the close

**Files:**
- Create: `skills/automata-content/values-and-doors.md`
- Modify: `skills/automata-content/SKILL.md` (a link), `README.md`, `docs/api/framework.api.md` (from the `package`
  job), `tests/skills/skills.test.ts`, `tests/docs/readme.test.ts`, `tests/public-surface.test.ts`,
  `docs/superpowers/progress.md`
- Test: the three tests above

The skill page holds, each as whole JSON the tests load and check with `loadGame`: the declaration table; a button and
gate pair; a critter with a path (and one sentence: the walk comes with the Characters slice); two levels joined by a
door; the world file with two levels joined by an edge; the two commands and a legend read back. The README gains
"Links, paths and doors" (after "Joints and touch") and the two commands in its table and under "The automata command".

- [x] **Step 1: Write the failing tests:** every JSON block of the skill page loads as a game with no problem; the
  README's command table names `world` and `picture`; the public surface lists the new exports of `src/index.ts` and
  `src/headless.ts` (`valuesOf`, `doorTaken`, `levelsOf`, `heroLevels`, `LevelEntered`, `FactKept`, `factsCommand`,
  `openEvent`, `Pressed`, `Open`, `boxesOverlap`, `paintLevel`, `paintWorld`, `layoutWorld`, the types, `Arrive` among them).
- [x] **Step 2 to 4: push red, write, push green.**
- [x] **Step 5: Commit** `docs: links, paths and doors, for agents and for the README`
- [x] **Step 6:** Run the implementation prompt's last look over the five pull requests, tick everything here and in
  `progress.md`, mark ready, and send the coordinator the end summary: each deviation with its reason, and the
  framework commit the test game should pin.

---

## The test game (AutomataFrameworkExamples)

After pull request 5 is merged. This repo's own tracker gains a cycle for it; its plans folder gets a short page that
points here.

### Task E1: Move the pin (its own pull request)

`package.json`'s dependency, the matching `pnpm.onlyBuiltDependencies` line and the lockfile move to the merge commit of
pull request 5. Nothing else changes. `tests/pin.test.ts` and `tests/framework.test.ts` pass; both recorded plays are
unmoved (the game uses none of the new parts yet). If either moves, stop and report: "joined only when used" is broken.

- [ ] **Commit** `chore: the framework pin moves to <commit>`

### Task E2: Three levels, a door and an edge

**Files:** `content/characters/{plate,button,gate,door,goal,critter}.json`, `content/behaviours/patrol.json`,
`content/levels/level-1.json` (changed), `level-2.json`, `level-3.json` (new), `content/world.json`,
`content/messages/*.json`, `automata.toml`; `tests/game/game-files.test.ts`, `tests/game/words.test.ts`.

- **Level 1:** today's room with its four starts (x 2.5, 4, 5.5 and 7, all at y 7.5), and `crate-1`, still the first
  thing and still at (9.5, 7.5): it stays where it is, because a crate at 5.5 would sit on player 3's start (audit
  M3). New: a plate at (11.5, 7.875), to the crate's right, linked to a gate at (12.75, 4), and the exit door at
  (14, 7) leading to `level-2`, beside `door-in`. The crate is pushed two tiles onto the plate.
- **Level 2:** `door-in`, which also leads back to level 1's `exit` (so a hero who comes out beside a door that leads
  back is in the real game too, audit H1), a crate, the critter with its path (it stands still until Characters), a
  button with `stays: true` and its gate; rows 5 to 7 of its right edge open. The critter's box at both ends of its
  path clears the crate and the button.
- **No thing overlaps a start's hero or another thing,** in any of the three levels; a test says so with
  `boxesOverlap`, the critter at both ends of its path included. The exact places above are the ones to start from;
  the journey (E3) is what proves a level can be played, and the places move before the rule does.
- **Level 3:** rows 5 to 7 of its left edge open; the goal at (13.5, 7.5).
- **`world.json`:** `level-1` at (0, 0), `level-2` at (20, 0), `level-3` at (36, 0).
- **`automata.toml`:** the new files; `levels = ["level-1", "level-2", "level-3"]`.
- **Words,** in six languages, English as `source` saying what each is for: `level.level-1.goal`
  ("Push the crate onto the plate"), `level.level-2.goal` ("Press the button, then run right"), `level.level-3.goal`
  ("Reach the goal"), `goal.done` ("You reached the goal. Well done!"), and the names of the three levels. The five other languages are drafts until a native speaker
  reads them (`automata.translations.toml` marks none).
- The new characters are boxes in the demo's colours (the palette's five, nothing else; `blueprint.test.ts` holds it).
- Every content file is written by `pnpm content:write`.

- [ ] **Step 1: Tests:** the game loads; `automata world --json` (through the framework's headless entry) gives three
  levels, two doors (`exit`, and `door-in` back) and one join; no thing overlaps a start or another thing; every new
  key is in all six languages.
- [ ] **Step 2 to 4: push red, write, push green** (CI says "the content changed" for `replays/level-1.json`: expected).
- [ ] **Step 5: Commit** `feat: three levels, joined by a door and by an edge`

### Task E3: The page follows doors, the plays are recorded, the journeys

**Files:** `src/features/play/play.ts`, a new `src/features/play/ways.ts`, `replays/level-1.json`, `replays/level-2.json`,
`tests/fixtures/level-1-play.ts`, a new `tests/fixtures/level-2-play.ts`, `tests/replay/level-2.parity.test.ts`,
`tests/journeys/door.journey.test.ts`, `content/messages/*.json` (the words that go), every test and page that reads
the old words or the crate (find them with `goal.push`, `goal.pushed`, `Well done` and `crate-1`: today
`tests/journeys/{files,play,watch,look,language,pictures}.journey.test.ts`,
`tests/features/play/{play,watch,language}.browser.test.ts`, `tests/fixtures/pinned-level.ts` and
`README.md`), `CLAUDE.md` (the goldens are now three).

The page keeps calling `startGame` (it moves onto `startFlow` with plan D's Part 8). After each step it asks the
framework's `doorTaken`; on a door it stops the game and starts it again at the door's level with `arrive`, keeping the
player's devices and language, and it calls nothing else new: the place, the crossing and the camera are the
framework's. Facts live for the visit only (the demo has no saves until plan D's Part 8): the page keeps the `fact.kept`
facts in memory and hands them to the next `startGame`. The page stops listening and holds the game still on the first
door, as the flow does (audit M1). A hero comes out beside the door, clear of it (audit H1).

**What "well done" is now (audit M4).** Today the page says "well done" when the crate has moved from where the start
level put it (`goal.push`, `goal.pushed`, `CRATE`, `PUSHED_TILES` and the crate observer in `play.ts`). That rule goes,
with the two words. The strip says the goal of the level player 1 is in (`level.<id>.goal`), changing on `level.entered`
and on a door; "well done" (`goal.done`) is said when a hero touches the goal, which the page reads from `game.onStep`
as `goal.touched`, the same event the project's `done` reads. The page never names a thing by a bare id once there is
a place: where it still must (the recorded plays and journeys), the crate of the place of levels 2 and 3 is
`level-2.crate-1`, read through `heroLevels` or `thingIn`.

**What the Site reads (audit L14).** The Site's `facts` takes the start level's first thing and `replays/<start>.json`
(`src/features/facts/parse.ts`). `crate-1` stays the first thing of level 1 and `replays/level-1.json` stays the start
level's recording, so the home page's numbers still come from the crate; the Site's next cycle is told its numbers
change when the recording moves.

- [ ] **Step 1: Tests:** the journey, in the three browsers on the real levels: push the crate onto the plate, go
  through the gate and the door, come out beside `door-in` and stay there for 60 ticks (it leads back; the hero is
  still in level 2), press the button, run right into level 3 with no break, touch the goal, read "well done"
  (`goal.done`). Two players through the door a tick apart start level 2 once. `level-2.parity.test.ts` plays
  `replays/level-2.json` (the place of levels 2 and 3, the crate pushed across the edge) in Node and the three
  browsers. `tests/fixtures/pinned-level.ts`, the journeys' own level, gains a `goal-1` at (13.5, 7.5), clear of every
  start, so the journeys that play it still have a "well done" to wait for (the crate rule they used is gone); nothing
  else about it moves.
- [ ] **Step 2: Push; the recorded plays print.** `replays/level-2.json` is committed. **`replays/level-1.json` is a
  golden that moves: send the coordinator the old and new final hashes and a `ci-screens` picture of each level at
  390 by 844, and do not merge until the Owner says yes.**
- [ ] **Step 3: Implement; push; green.**
- [ ] **Step 4: Commit** `feat: the page follows doors; the plays of levels 1 and 2`, naming the moved golden in the
  commit message, then tick, mark ready, report.

---

## Gated: the World editor (AutomataFrameworkEditors)

**Blocked by the mockups-first hard stop.** No editor code starts until the Owner approves the shell and World mockups
(Editors #64), and then the editor gets its own spec, plan and audit in its own repo. These are listed so nothing the
framework hands over is forgotten; none is a task of this cycle's execution.

| Gated task | What it uses from this plan |
|---|---|
| G1. A thing's values in the inspector, each control held to its limits | `Character.values`, `withDefaults`, `checkThingValues`' sentences |
| G2. Arrows, paths, reaches and tags drawn in the level ("Show what it is") | `shownOf`, `paintLevel`'s rules, drawn live |
| G3. The world map: level pictures at their `at`, door arrows, join bars; a level snaps to whole tiles and never overlaps; the map says when a move makes, moves or breaks a join | `layoutWorld`, `paintWorld`, the world file through `writeContent` |
| G4. "Only one of these": a second placing asks "Move the goal here?" | `one-per-level` |
| G5. The editors' framework pin moves | pull request 5's merge commit |

## Deferred to the Characters slice (the Owner, 2026-11-15)

Not built in this cycle. They are written here so the Characters plan can lift them whole.

- **D1. Behaviour rules run in the sim.** `src/features/level/mind.ts` and `behaviour.ts` as built on pull request #64
  (`fc909a2`: 108 and 151 lines, with their tests), without the lines that read the `Story` resource. `behaviourPlugin`
  joins only when a character has a `behaviour`.
- **D2. `walk-path` walks.** `Mind` gains `point` (the next point's place in the path) and `step` (1 or -1). Each tick
  the walker sets only its sideways speed, toward the next point; within a quarter of a tile sideways it takes the next
  point; at the end it turns back, or goes to the first when the declaration says `loop`; blocked (it asked for speed
  and hardly moved), it turns back. A thing with no path given stands still. Golden `walk-path.json` in four engines.
- **D3. The test game's critter walks,** and `replays/level-2.json` moves for it (the Owner sees it first).

## After the plan audit (2026-11-15)

The audit (`audits/2026-11-15-plan-w-plan-audit.md`, #168) found 22 things (2 high, 6 medium, 14 low) and asked the
Owner two questions. Every finding is fixed in this plan, in one round; the Owner answered both questions (22:59 UTC:
numbered badges, and a door straight in). Where each went:

| Finding | What the plan says now | Where |
|---|---|---|
| H1 a hero comes out inside a door | heroes come in beside it, clear of its box, near side then far side then the starts; the fixture's doors lead back; a test that no door fires | call 13; Tasks 8, 12; fixture; E2 |
| H2 `facts` believed from anyone | only source 0 on tick 0 is believed; others ignored | call 10; Task 7; Review Focus 8 |
| M1 a second door starts the level twice | the first door unhooks `watchWays` and pauses the game before any await; the deep-equal test is gone | Tasks 11, 12; Review Focus 7 |
| M2 critter inside the crate | critter at (7.5, 7.5), path 7.5 to 9.5; a no-overlap test | fixture; Task 6 |
| M3 crate on player 3's start | the crate stays at (9.5, 7.5); the plate and gate are to its right | E2 |
| M4 "well done" was about the crate | the rule is the goal's touch; `goal.push` and `goal.pushed` go, `goal.done` comes | E2, E3 |
| M5 `room-3.back` missing | `back` in `room-3`; `door-in` leads back too | fixture; Tasks 11, 13, 14 |
| M6 a joint's holder in a shifted level | read against `joints.ts`: the anchor at the place's corner with shifted places is right; the plan says so and a test pins it | Task 8 |
| L1 a place's ground is always joined | said, with why | call 2; Task 8 |
| L2 the order of switches against moves | by name; no `after` (an unknown name throws); a test | Task 7 |
| L3 `switch.json` proved nothing | what is asserted before the hashes | Task 7 |
| L4 `place.json` measured a stack | the critter is taken out; the hero's speed is measured | Task 10 |
| L5 the `outside` sentence | lifted into `content/outside.ts` | Task 2; file structure |
| L6 the painter's palette comes first | two passes | Task 14 |
| L7 `loadArt` is public | keeps `level`, gains `levels` | Task 10 |
| L8 a late joiner in a place | comes in at the opened level; tested | call 14; Tasks 8, 9 |
| L9 two `stage.ts` | `game/stage-of.ts` | Task 10; file structure |
| L10 an empty list fails in Zod's words | lists 0 to 16 and 0 to 64 in the schema; `check` holds the limits | Task 2 |
| L11 two "shown" rules | a switch tags only off its default; `leads-to` is a tag in a level and an arrow on the sheet | Tasks 1, 14 |
| L12 a stricter check, unlisted | listed | call 15; self-review |
| L13 the world kind's pieces | `worldInfo`; the row last; `simContent` checks `worlds` | Task 3 |
| L14 the Site reads level 1 | `crate-1` stays first; the recording stays the start level's | E3 |
| Also noted: the spec's "a replay is still one level" | the spec's sentence is changed | spec, doors |
| Also noted: Look-only entities are new | the place test steps the sim | Task 8 |

**From plan Q's return note (#169, 2026-11-15, 23:10 UTC)**, three points where the two plans meet, each handled here:

| Point | What this plan says now | Where |
|---|---|---|
| A level with facts reaches a waiting level too late | `startGame` steps tick 0 once, with the facts and no input, before the first picture, so open gates show and the first press is tick 1 | Task 10 |
| `attempt` against a new `playing` state; a door's level does not wait | a door always answers a new state, so it starts a level under either rule and raises `attempt` when that exists; the state carries `door: true` so plan Q does not make a door's level wait | Task 11 |
| The template's door | stays the `done` touch with no `to`; `doorTaken` reads nothing from it; a second level for the starter is the Owner's question in plan Q | Handoffs; Task 11 |

## Handoffs

- **The plan audit** is done (`audits/2026-11-15-plan-w-plan-audit.md`): calls 1, 2, 6 and 10 stand (10 with the guard
  that the sim believes only source 0 at tick 0), the recorder and the room server take source 0, and `places` cannot
  move a hash for a game that only arranges its map. The implementation audit (stage 5) should try hardest to break
  what the audit could only read: a hero's arrival spot against every door and wall (Task 8), a second door a tick
  later (Task 12), and the order of `level.switches` against `level.moves` in a game with and without `moves`.
- **The Scenes plan,** when it returns: `openTile` is the one function to widen for ledges and scene ground, and
  `paintLevel` then draws the scene's own picture and the backdrop.
- **Plan Q,** when it returns (its return note is on #169, and says where it meets this plan): the goal line and the
  level name read `heroLevels`; a door raises `attempt`, and `door: true` on the state is what tells it a level was
  opened mid-move (Task 11); `startGame` already steps tick 0 when facts are given, so its start card waits after that
  step (Task 10). **The template's door stays the `done` touch** (`done = "door.touched"`, a door with no `to`),
  because a `leads-to` needs a level to lead to and the starter has one; this plan's `doorTaken` reads nothing from
  such a door. Whether the starter gets a second level is the Owner's question in plan Q (recommended: no); if it
  does, its door gets a `to` and that is plan Q's task, built on this plan's.
- **Plan D (the demo)** Part 4 is replaced by Tasks E2 and E3 here; Part 8 moves the page onto `startFlow` and then
  drops `play/ways.ts`.
- **The roadmap** (slice 3, item 4) is unchanged by this plan; the tracker says where the cycle stands.

## Self-review

- **Spec coverage.** Goals 1, 2, 4 to 11: Tasks 1 to 3 (values, one-per-level, the world file), 7 (switches, gates),
  11 and 12 (doors), 8 to 10 (the seamless place), 9 and 12 (what a level remembers), 13 and 14 (the commands, pictures),
  4 (the change list), E1 to E3 (the demo). Goal 3 (a path that walks) is half here (written, checked, drawn) and half
  deferred by the Owner. Goal 10 (ready for rooms from a seed) is met by what is not built: no `room` mark, links stay
  inside a level, ids carry the level. Every `check` sentence of the spec has a row in Task 1, 2 or 3. The spec's tests
  each have a home: the unit tests (1, 2, 3), the switch parity and the gate that waits (7), the place parity (10), no
  join builds today's world (8), the three edge sentences (3), the save test and the flow test (12), the picture's
  bytes (14), the change list (4), the journey (12), Examples (E3). `walk-path.json` is deferred with the walk.
- **Not in the spec, added here:** `Where` and `thingIn` (a sim must know its levels to read a value), `facts` as a
  command, `Arrive`, `progressFields`, `heroLevels`, the legend. Each is the least that makes a spec sentence true.
- **Away from the spec's words, each listed above:** tiles only for open stretches; flat ground and no backdrop in
  pictures; numbered badges and a legend, and no "level done" screen at a door (both the Owner's, 2026-11-15, and the
  spec is changed to say so); the demo's page follows doors itself; a `words` value must be a key the source language
  has (call 15, stricter than the spec's "a key no language has"). Carried from the spec, not departures: a switch
  is tagged only when it is not the default; a door is a tag in a level and an arrow on the world sheet.
- **Types.** `Arrive`, `SimLevel`, `PlaceLevel`, `Join`, `Way`, `ThingValue` and `ValueDeclaration` are each defined in
  one task and used by the same name after it.
- **Proportion.** The spec is 535 lines; this plan carries signatures, sentences and test names, and no function body.

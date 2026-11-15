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
   so a floor that runs across an edge is one box and nothing catches on the seam.
3. **`doorTaken` lives in `level`, not `flow`.** It is pure and needs no page, so the flow calls it and so can a game
   whose page is its own (the test game today). The flow still owns what happens next.
4. **Pictures carry numbers, and the words are in a list beside them.** A tag, an arrow's end and a door's target are
   each a small numbered badge; the command prints what each number means, with the source language's words. A picture
   then needs only ten digits (no font for six languages), and badges are small enough to be moved apart. The spec's
   "small labels in the source language" are the list.
5. **A door opens its level at once, with no "level done" screen between.** The project's `done` event still ends a
   level as it does today.
6. **The world file leaves the sim; what it joins goes in.** The sim is given `places` (each joined level's offset from
   its place's corner), never the map itself, so dragging a level or a whole place around the map moves no hash unless a
   join appears, moves or breaks.
7. **A thing's id has its level in front only in a place of two or more levels** (`room-2.crate-1`). A level that
   touches no other is spawned exactly as today.
8. **A switch may link only to a thing whose character says `opens`.** Anything else is a `check` sentence.
9. **A place is "big" past 8 levels or 16,384 tiles** (a note from `automata world` and `check`, never a failure).
10. **Facts reach a sim as a command at tick 0** (`facts`, source 0), so a recording carries them and replays with no
    new field.
11. **The save gains two optional fields,** `last` (the level the player was last in and where they came in) and
    `facts`. `level` keeps its meaning (the furthest level reached), so a save written today still reads.
12. **Online play gets a place for free in the sim and on screen, and no doors**: doors are the flow's, and an online
    game is not started by the flow today.

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

## File structure

```
src/features/content/values.ts          new   the declarations a character makes, their Zod shapes, shownOf, withDefaults
src/features/content/value-checks.ts    new   a level's values against its characters; one-per-level
src/features/content/world.ts           new   the world file: its type, schema, row of the table
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
src/features/level/entered.ts           new   In, level.entered, the place plugin
src/features/level/doors.ts             new   doorTaken
src/features/game/stage.ts              new   what the renderer is given for a level or a place
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
| `door` | fixed, 1 by 2, kind `door`, `touch: "sense"` | `values`: `to` (leads-to) |
| `goal` | fixed, 1 by 1, kind `goal`, `touch: "sense"` | `one-per-level: true` |
| `critter` | dynamic, upright, 1 by 1, kind `critter`, `behaviour: "patrol"` | `values`: `walk` (path), `reach` (number, least 1, most 8, step 0.5, default 3, shown `reach`) |

`patrol` (behaviour): one rule, `when: []`, `do: { act: "walk-path", path: "walk", speed: 2 }`.

| Level | Rows 0 to 7 | Things (`x`, `y`) | Starts |
|---|---|---|---|
| `room-1` | `#..............#` | `crate-1` crate (5.5, 7.5); `plate-1` plate (8.5, 7.875) `opens: ["gate-1"]`; `gate-1` gate (11.25, 4); `exit` door (13.5, 7) `to: { level: "room-2", thing: "door-in" }` | 1 (2.5, 7.5), 2 (3.5, 7.5) |
| `room-2` | rows 0 to 4 `#..............#`; rows 5 to 7 `#...............` | `door-in` door (2.5, 7); `crate-1` crate (5.5, 7.5); `critter-1` critter (6, 7.5) `walk: [{4, 7.5}, {7, 7.5}]`; `button-1` button (8.5, 7.875) `opens: ["gate-1"], stays: true`; `gate-1` gate (11.25, 4) | 1 (2.5, 7.5), 2 (3.5, 7.5) |
| `room-3` | rows 0 to 4 `#..............#`; rows 5 to 7 `...............#` | `goal-1` goal (13.5, 7.5) | 1 (2.5, 7.5), 2 (3.5, 7.5) |

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
/** How the level view draws it: its own `shown`, else number, switch, choice, words 'tag'; thing 'arrow'; path 'path'; leads-to 'arrow'. */
export function shownOf(declaration: ValueDeclaration): ValueShown
/** What a declaration's `shown` may be: number tag|reach|none; switch, choice, words tag|none; thing arrow|none; path path|none; leads-to arrow|none. */
export const SHOWN_FOR: Readonly<Record<ValueDeclaration['type'], readonly ValueShown[]>>
// content/character.ts: `Character` and `CharacterInput` gain
readonly values?: readonly ValueDeclaration[] | undefined              // at most 16
readonly switch?: { readonly opens: string; readonly stays?: string } | undefined
readonly opens?: 'walk-through' | undefined
readonly 'one-per-level'?: boolean | undefined
```

Limits: `name` 1 to 40 letters; `about` at most 200; `from` 1 to 16; a thing's `most` 1 to 16; a path's `least` and
`most` 2 to 64 (left out: 2 and 64); `step` above 0. A `words` default is a `MessageKey`.

- [ ] **Step 1: Write the failing tests.** One accepted example per type, and one per sentence below (each sentence is
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
- [ ] **Step 2: Push; the Node job fails on the new tests.**
- [ ] **Step 3: Implement.** A step is checked as `Math.abs(n - Math.round(n)) < 1e-9` for `n = (value - least) / step`
  (export it as `onStep(value, least, step)`: Task 2 uses it).
- [ ] **Step 4: Push; green.** `schemas/character.schema.json` is taken from `pnpm schemas --check`'s log.
- [ ] **Step 5: Commit** `feat(content): a character declares the values its things hold`

### Task 2: Values on a thing, checked against its character

**Files:**
- Create: `src/features/content/value-checks.ts`, `tests/fixtures/links-game/` (the table above), `tests/fixtures/links-game/read.ts`
- Modify: `src/features/content/level.ts` (the thing's shape; `levelInfo.check` calls `checkThingValues`),
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

The thing's schema: `values` is `z.record(Id, …)` of a number, a boolean, a string of at most 96, a list of 1 to 16
ids, a list of 2 to 64 places, or `{ level, thing? }`. Which of them a value must be is the character's to say, so
`checkThingValues` checks it (the published level schema cannot know).

- [ ] **Step 1: Write the failing tests** on the links game with one file overridden per test. Each sentence whole, at
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
| a switch's link to a thing that cannot open (call 8) | `"crate-1" is a crate, which cannot be opened. Give its character "opens": "walk-through", or link something else.` |
| a path with too few or too many points | `"walk" needs from 2 to 64 places. This has 1.` |
| a path point outside the level | the level's own `outside` sentence, at `…values.walk[j].x` or `.y` |
| `leads-to` a level the game does not list | `noSuch('level', id, game.ids('level'))` |
| `leads-to` a thing not in that level | `noSuch('thing', id, ids, 'The level "room-2"')` |
| a `needed` value left out (at `things[i].values`) | `Every "door" needs "to". Add it to this thing's "values".` |
| two of a `one-per-level` character (at the second, `things[i].character`) | `This level already has a "goal", and there can be only one. Move that one, or take this one out.` |
| a `walk-path` act whose `path` the character does not declare as a path (in the character file, at `behaviour`) | `The behaviour "patrol" walks the path "walk", and this character has no "path" value called "walk". It has: (list, or nothing).` |

  And: the links game loads with no problem; `withDefaults` on `button-1` gives `{ opens: ['gate-1'], stays: true }`,
  on `critter-1` `{ walk: [...], reach: 3 }`, on `plate-1` `{ opens: ['gate-1'] }`; a value equal to its default
  survives `writeContent` as written; a level with no `values` anywhere parses to the value it did (same keys).
- [ ] **Step 2: Push; fails.**
- [ ] **Step 3: Implement.** A check skips what it cannot see (a character or level that did not read), as the loader's
  other checks do. `level.ts` gains only the thing's field and one call.
- [ ] **Step 4: Push; green.** `schemas/level.schema.json` and `behaviour.schema.json` from the log.
- [ ] **Step 5: Commit** `feat(content): a thing's values, checked against its character`

### Task 3: The world file, and which levels join

**Files:**
- Create: `src/features/content/world.ts`, `src/features/content/places.ts`
- Modify: `content-types.ts` (a `world` row, after `level`), `type-info.ts` (nothing: `editor: 'world'`, `part: 'map'`),
  `load.ts`, `content.ts`, `src/features/level/sim-content.ts`
- Test: `tests/features/content/world.test.ts`, `places.test.ts`, `load.test.ts`, `tests/features/level/sim-content.test.ts`

**Interfaces (produces):**

```ts
// content/world.ts
export interface WorldFile { readonly format: 1; readonly id: string; readonly levels: readonly { readonly level: string; readonly at: LevelPoint }[] }   // at most 1024
export const WorldSchema: z.ZodType<WorldFile, WorldFile>
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
file still gets the very same object back.

- [ ] **Step 1: Write the failing tests.** `layoutWorld` on small made-up levels: side by side joined (one `Join`,
  `along: 'y'`, the right `from` and `to`); stacked (`along: 'x'`); corner to corner (nothing); a gap of one tile
  (nothing); both solid (no join, no problem, two places of one, so `places` is `{}`); each problem above, whole; three
  in a row make one place of three; the place's offsets are from its top left corner whatever the map's numbers are
  (moving all three by (100, -7) gives the same `places`). The links game: `content.places` deep-equals
  `{ 'room-2': [{ level: 'room-2', x: 0, y: 0 }, { level: 'room-3', x: 16, y: 0 }] }`, and a game with no world file,
  or one whose levels do not touch, has no `places` key. `simContent` of the links game has `places`, no `worlds`, and
  no `world` entry in `project.content`; moving `room-1` on the map gives a `simContent` that is deep-equal.
- [ ] **Step 2: Push; fails.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Push; green**, with `schemas/world.schema.json` from the log; every existing golden unmoved.
- [ ] **Step 5: Commit** `feat(content): the world file, and levels that join where they touch`

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

- [ ] **Step 1: Write the failing test:** for every `schemas/*.schema.json` but `replay`, the newest entry of that kind
  ends with the file's hash; else it fails with
  `schemas/level.schema.json changed and docs/formats/changes.md has no entry for it. Add one, newest first, ending with: **Schema:** \`<hash>\``.
  An entry whose kind has no schema fails too. The packed package holds the page (`tests/package.test.ts`).
- [ ] **Step 2: Write the page with every hash as sixteen zeros; push; the test fails and prints each hash.**
- [ ] **Step 3: Put the printed hashes in; push; green.**
- [ ] **Step 4: Commit** `docs(formats): the public list of format changes, held to the schemas`
- [ ] **Step 5: Tick this pull request's tasks here and in `progress.md`, mark it ready, report to the coordinator.**

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

- [ ] **Step 1: Write the failing tests** on the links game opened at `room-2`: `valuesOf(…button-1).switch('stays')`
  is true and `.things('opens')` is `[sid of gate-1]`; `critter-1`'s `number('reach')` is 3 (the default) and
  `path('walk')` is the two places; the two throws; a game with no `values` has no `Where` (asking for it throws) and
  ends sixty idle ticks on `push-crate.json`'s `idleHash60`.
- [ ] **Step 2: Push; fails.** **Step 3: Implement.** **Step 4: Push; green; every golden unmoved.**
- [ ] **Step 5: Commit** `feat(level): a thing's values, read from game code`

### Task 6: Two boxes that overlap

**Files:** Create `src/features/level/overlap.ts`; test `tests/features/level/overlap.test.ts`.

```ts
/** A box by its middle, its half sizes and its turn in radians. */
export interface TurnedBox { readonly x: number; readonly y: number; readonly hw: number; readonly hh: number; readonly rotation: number }
/** True when the two overlap by more than `SLOP` (0.01 tile) on every axis: boxes that only touch do not. Separating axes, with dmath's sin and cos. */
export function boxesOverlap(a: TurnedBox, b: TurnedBox): boolean
```

- [ ] **Step 1: Tests:** apart; touching edges (false); overlapping by 0.02 (true); one inside the other; a 1 by 1 box
  turned 45 degrees whose corner reaches into a plate (true) and whose corner is 0.05 short (false); the same answer
  with `a` and `b` swapped, for each.
- [ ] **Step 2 to 4: push red, implement, push green.** **Step 5: Commit** `feat(level): a pure overlap test for boxes`

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
/** Tells the sim what was done for good before this play: sent once, at tick 0, with source 0. */
export const FactsCommand: CommandDef  // id 'facts', payload { facts: string[] } (at most 1024, each at most 200 letters)
export function factsCommand(facts: readonly string[]): Command        // { tick: 0, source: 0, seq: 0, type: 'facts', … }
export function switchPlugin(): PluginDef   // name 'switches', dependsOn ['level', 'where']
```

A fact is `<level>.<thing>.open`, the level and the thing's id as the files write them, whatever the sim's ids are.

`level.switches` runs once a tick, in `gameplay`, lowest sid first within each pass:

1. **Facts** (tick 0 only matters): for each fact of each `FactsCommand`, the thing it names, if it is in this sim and
   has `Open`, gets `kept: true`. A fact that names nothing here is ignored.
2. **Presses:** a switch is pressed when any other entity with a `Thing` and a body that is not `fixed` overlaps its
   box (`boxesOverlap`, from each one's `Transform` and `Collider`). On the tick it becomes pressed, if its `stays`
   value is true, each thing it links that has `Open` and not `kept` gets `kept: true` and `FactKept` is raised for it.
3. **Open or shut:** a thing with `Open` should be open when it is `kept` or any pressed switch links it. Opening:
   `on` true, its `Collider.sensor` true, `<kind>.opened`, and its `open` clip when the game has sprites (`setClip`).
   Closing: only when nothing that is not `fixed` overlaps its box; then `on` false, `sensor` false, `<kind>.closed`
   and the `shut` clip. A field is written only when it changes.

`switchPlugin` joins only when `usesSwitches(content)`, after `touch`, and brings `wherePlugin` with it.

- [ ] **Step 1: Write the failing tests** (Node; the links game, with `room-1`'s things moved by an override where a
  test needs a start position; every sim disposed):

```ts
test('a crate on the plate opens the gate, and off it the gate shuts')            // crate-1 placed at (8.5, 7.5): gate.opened in the first 3 ticks, Collider.sensor true; crate despawned: gate.closed next tick
test('a hero on the plate holds the gate open only while standing there')
test('two switches on one gate: it is open while either is pressed')
test('a gate does not shut on a hero standing in it; it shuts the tick after they leave')    // Review Focus 2
test('a thing taken away, or a hero who leaves, lets the plate up')                // Review Focus 1: despawn, and LeaveCommand in a two-player sim
test('a button that stays opens its gate for good and raises fact.kept once')      // payload { fact: 'room-2.gate-1.open' }; pressed again: no second event
test('facts at tick 0 open the gate before anyone moves; a fact about a missing thing is ignored')   // Review Focus 5
test('straight, and restored at tick 45, a switch run agrees')
test('a game with no switch has no Pressed, no Open, no facts command')            // and ends on push-crate.json's idleHash60
```

  The parity test (`switch.json`): the links game at `room-1`, player 1 holds right for 300 ticks, then nothing for 60;
  recorded and replayed; the golden's hashes in Node and the three browsers.
- [ ] **Step 2: Push; fails, and the Node job prints `switch.json`.**
- [ ] **Step 3: Implement; commit the printed golden.**
- [ ] **Step 4: Push; all four engines match; every existing golden unmoved.**
- [ ] **Step 5: Commit** `feat(level): switches open gates, with no game code`, then tick, mark ready, report.

---

## Pull request 3: a place

### Task 8: Several levels built into one world

**Files:**
- Create: `src/features/level/place.ts`, `src/features/level/spawn-place.ts`
- Modify: `game-sim.ts`, `hero.ts` (`heroParts` takes a spot), `join.ts`, `where.ts` callers, `level.ts`
- Test: `tests/features/level/place.test.ts`, `spawn-place.test.ts`

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
// level/spawn-place.ts
export function spawnPlace(sim: Sim, content: GameContent, opened: string, players: readonly number[], arrive?: Arrive): void
```

`spawnPlace`, for a level alone with no `arrive`, calls `spawnLevel` and nothing else. For a place of two or more, in
this fixed order: the boxes of `tileBoxes(solidGrid(…))`; then for each level in id order, its things in the file's
order (ids `<level>.<id>`), its anchor if a joint needs one, its joints; then the heroes, lowest number first. A ground
box inside one level is one entity as today, with that level's ground colour; a box that crosses an edge is one body
with no `Look`, and one `Look`-only entity (a transform and a look, no body) for each level's part of it, in level
order.

Heroes: with no `arrive`, at the opened level's starts. With one, player `n` is at the spot plus
(`start n` minus `start 1`) of that level, so they are spread as the starts are. A hero whose spot is outside the
opened level's box or in a solid tile takes the arriving spot itself. `arrive.thing` that the level does not have is
ignored (the starts). `joinPlugin`'s late joiner comes in the same way, so `heroParts(content, level, number, at?)`
takes the spot.

`createGameSim` calls `spawnPlace`, gives `wherePlugin` `levelsOf(content, level)` when there is more than one, and
gives `joinPlugin` the same `arrive`.

- [ ] **Step 1: Write the failing tests:**

```ts
test('levelsOf: a lone level is itself at (0, 0); room-2 and room-3 give both, with room-3 at (16, 0)')
test('levelAt: (15.99, 5) is room-2, (16, 5) is room-3, (40, 5) is none')
test('shiftLevel moves things, starts, joints and path points, and nothing else')
test('solidGrid: the floor of the place is one unbroken row of 32, and rows 5 to 7 are open at columns 15 and 16')
test('the place of room-2 and room-3: the floor is one body 32 wide, with one Look for each level')
test('things keep their level in front: room-2.crate-1 and room-3.goal-1; heroes are player-1')
test('room-1 alone is spawned exactly as spawnLevel spawns it')          // the same entity list, ids and order
test('arriving beside door-in, two heroes stand at (2.5, 7) and (3.5, 7)')
test('arriving beside a door one tile from a wall, a hero whose spot is solid takes the door\'s own spot')   // Review Focus 3
test('arriving at a thing the level no longer has opens its starts')     // Review Focus 5
test('a game with no place: every golden, and idleHash60, unmoved')
```

- [ ] **Step 2 to 4: push red, implement, push green; every golden unmoved.**
- [ ] **Step 5: Commit** `feat(level): joined levels are built into one world`

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

- [ ] **Step 1: Write the failing tests:** a hero walking right from `room-2` raises `level.entered` once, with
  `level: 'room-3'`, `from: 'room-2'` and an `x` under 1; walking back raises it once more the other way; standing on
  the edge for 120 ticks raises nothing more; two heroes are tracked apart; a lone level has no `In` and no event;
  `meta.arrive` round-trips both forms through `automata replay`.
- [ ] **Step 2 to 4: push red, implement, push green.**
- [ ] **Step 5: Commit** `feat(level): a hero's level is known every tick, and crossing is an event`

### Task 10: A place on the page, and its proof in four engines

**Files:**
- Create: `src/features/game/stage.ts`, `tests/golden/place.json`
- Modify: `src/features/render/render.ts`, `art.ts`, `stage.ts`, `src/features/game/game.ts`, `watch.ts`, `online.ts`, `art.ts`
- Test: `tests/features/level/place.parity.test.ts`, `tests/features/render/camera.test.ts`,
  `tests/features/game/place.browser.test.ts`

**Interfaces (produces):**

```ts
// game/stage.ts: one place that decides what the renderer is given, for startGame, watchReplay and startOnlineGame
export interface StageLevel extends SimLevel { readonly sky: number; readonly view: LevelView | undefined }
export function stageOf(content: GameContent, opened: string): { readonly world: { w: number; h: number }; readonly levels: readonly StageLevel[] }
// render/render.ts: createRenderer's options gain `levels?: readonly StageLevel[]` and `at?: string` (the level shown first); Renderer gains
/** The sky, the backdrop and the view become this level's, from the next step on. Nothing for a level it was not given. */
enter(level: string): void
// render/art.ts: loadArt takes `levels: readonly SimLevel[]` in place of `level`; its tiles and ground are placed at each level's offset; Art gains
backdropOf(level: string): BackdropArt | undefined
```

The camera's limits are `world`, the place's outline (`frameHeroes` already takes the level's size: it is now given the
place's). `startGame` calls `renderer.enter` when the lowest-numbered hero raises `level.entered`, and sends
`factsCommand(options.facts)` with tick 0's commands when `GameOptions.facts` (new, `readonly string[]`) is not empty.

- [ ] **Step 1: Write the failing tests.**
  - Parity, `place.json` (the spec's proof): the links game opened at `room-2`, with `facts: ['room-2.gate-1.open']`
    and `crate-1` moved to (12.5, 7.5) by an override; player 1 holds right for 420 ticks. Asserted before the hashes:
    `level.entered` was raised exactly once, for player 1 (a crate raises none); the crate's `x` ends above 16 (it
    crossed with the hero); between the tick before and the tick after the hero's crossing its `Body.vx` differs by
    less than 0.01 (no break in speed). Recorded, replayed, restored at tick 200, in Node and the three browsers. The
    hero also pushes the critter, which stands still this cycle; if the crate has not crossed by tick 420, raise the
    ticks and say so in the report.
  - `camera.test.ts`: `frameHeroes({ w: 32, h: 9 }, view, [hero at x 30])` keeps the shot inside 0 to 32.
  - Browser: `startGame` on the links game at `room-2` draws both levels (the canvas is as wide as 32 tiles fitted);
    after the crossing the renderer's sky is `room-3`'s (give `room-3` its own `sky` in the test).
- [ ] **Step 2: Push; fails; the Node job prints `place.json`.**
- [ ] **Step 3: Implement; commit the golden.**
- [ ] **Step 4: Push; all engines match; every existing golden and every existing browser test unmoved.**
- [ ] **Step 5: Commit** `feat(game): a place is drawn and followed as one world`, then tick, mark ready, report.

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
// FlowState gains `arrive?: Arrive` (kept in `playing` and `paused`); FlowEvent gains
| { readonly type: 'door'; readonly level: string; readonly arrive?: Arrive }
// and 'play' gains an optional `arrive`, so Continue can come in where the player left
```

In `playing`, `door` answers a new `playing` state with that level and `arrive` (call 5: no `done` screen). Anywhere
else it answers the same object. `pause` and `resume` carry `arrive` unchanged.

- [ ] **Step 1: Write the failing tests:** `doorTaken` on real events from a sim (a hero walked into `exit` in `room-1`
  gives `{ level: 'room-2', thing: 'door-in', through: { level: 'room-1', thing: 'exit' } }`); a crate pushed into the
  door gives undefined; a door with no `to` gives undefined; in a place the prefixed id is read
  (`room-3.back` to `room-1`); two heroes through two doors in one step gives the first event's. `advance`: `door` in
  `playing` gives `playing` at the new level with `arrive`; in `paused`, `menu` and `done` the same object; a second
  identical `door` event after the first gives a state that is deep-equal (the flow starts a level once per state
  object it has not seen: Task 12).
- [ ] **Step 2 to 4: push red, implement, push green.**
- [ ] **Step 5: Commit** `feat(level): which door a hero went through, as one pure answer`

### Task 12: The flow follows doors and remembers

**Files:**
- Create: `src/features/flow/ways.ts`, `tests/fixtures/flow/links.ts` (the links game for the flow's browser tests)
- Modify: `src/features/flow/progress.ts`, `places.ts`, `flow.ts` (at most 10 lines: it calls `ways.ts`), `types.ts`
- Test: `tests/features/flow/progress.test.ts`, `tests/features/flow/doors.browser.test.ts`

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
On a door: `places.cameIn({ level, thing })`, `places.reach(level, …)` as `done` does today, then
`dispatch({ type: 'door', … })`. On player 1's `level.entered`: `places.cameIn({ level, x, y })`. On `fact.kept`:
`places.remember(fact)`. A save that cannot be kept says what `done` says today (`automata.done.not-kept`) and the
visit goes on from memory.

- [ ] **Step 1: Write the failing tests.**
  - `progress.test.ts`: `cameIn`, `remembered` (sorted, once, same object when known), `continueAt` (a `last` level the
    game dropped falls back to `level`, then to the start: Review Focus 5); a version 1 save `{ level: 'room-1' }`
    loads under version 2.
  - `doors.browser.test.ts`, the spec's journey, in the three browsers on the links game through `startFlow`: Play; the
    hero pushes the crate onto the plate, walks through the gate and into `exit`; the state is `playing` at `room-2`
    with no screen between, and the hero is beside `door-in`. Then: the hero presses `button-1`, crosses into `room-3`;
    leave to the menu; Continue; the hero is in `room-3` near where it crossed, and `gate-1` is open on the first tick
    (the save holds `facts: ['room-2.gate-1.open']`), while `crate-1` is back at (5.5, 7.5). With two players, the
    first hero through the door takes both, and both stand beside `door-in`.
  - A world file edited so `room-3` no longer touches `room-2`, then Continue from that save: `room-3` opens alone at
    its starts, and nothing throws (Review Focus 4).
- [ ] **Step 2 to 4: push red, implement, push green** (`flow.ts` stays under 600 lines; if it would not, move
  `startLevel`'s listeners into `ways.ts`).
- [ ] **Step 5: Commit** `feat(flow): a door opens its level, and the save remembers where and what`, then tick, mark
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

- [ ] **Step 1: Write the failing tests** on the links game in a temporary folder, as `art.test.ts` does: the report
  deep-equals the expected one; the words; each note; a game with no world file lists its levels with `at: null` and
  no joins; a game that does not load answers `ok: false` with one sentence.
- [ ] **Step 2 to 4: push red, implement, push green.**
- [ ] **Step 5: Commit** `feat(cli): automata world lists levels, doors and joins`

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
/** The world file's sheet: each level small at its `at`, a numbered badge at each door and where it leads, a bar across each join. Undefined when no level fits (see below). */
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
  on each; `reach` a `ring` of that many tiles; `tag` a badge at the thing's top right; `leads-to` a badge on the door.
  A badge that would cover an earlier one moves down by its own height until it is clear. Each badge's `LegendLine`
  says it in the source language: `says` is the number, `yes` or `no` (the framework's own words for them), the
  choice's `name`, the `words` value's text in the source language, the linked thing's id, or `to room-2, beside door-in`.
- **Colours:** the palette is every colour in first-used order; past 255 the nearest earlier one is used (whole-number
  distance on red, green and blue).

`automata picture [level…] [--what-it-is] [--world] [--json]` writes `.automata/pictures/<level>.png` (or
`<level>.what.png`, or `world.png`), prints each path and then the legend, one line a badge
(`3  room-2 button-1  opens  gate-1`); `--json` gives `{ ok, pictures: [{ level, path, legend }] }`. The MCP tool
`picture` takes `{ folder, levels?, whatItIs?, world? }` and returns the same.

- [ ] **Step 1: Write the failing tests:** `line`, `ring` and `badge` on a small picture, pixel for pixel (a
  horizontal, a vertical and a steep line; a ring of radius 3; the digits 0 to 9; the number 12). `paintLevel` of
  `room-2`: 256 by 144; the pixel in the middle of `crate-1` is the crate's colour; with `whatItIs`, the legend is
  exactly `opens` (arrow to `gate-1`), `stays` (tag, `yes`), `walk` (path), `reach` (reach, `3`) and `to`'s line for
  `door-in` is absent (it gives no value); two tags on one thing do not overlap. `paintWorld`: one bar and one door
  badge pair. Parity (`level-picture.json`): the xxhash64 of the PNG bytes of `room-2` as it plays, with `whatItIs`,
  and of the world, the same in Node and the three browsers. The command writes the files, prints the legend, and
  writes nothing for a game that does not load.
- [ ] **Step 2: Push; fails; the Node job prints the three hashes.**
- [ ] **Step 3: Implement; commit the golden.**
- [ ] **Step 4: Push; green in all four engines.**
- [ ] **Step 5: Commit** `feat(cli): automata picture paints a level, what it is, and the world`

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

- [ ] **Step 1: Write the failing tests:** every JSON block of the skill page loads as a game with no problem; the
  README's command table names `world` and `picture`; the public surface lists the new exports of `src/index.ts` and
  `src/headless.ts` (`valuesOf`, `doorTaken`, `levelsOf`, `heroLevels`, `LevelEntered`, `FactKept`, `factsCommand`,
  `openEvent`, `Pressed`, `Open`, `paintLevel`, `paintWorld`, `layoutWorld`, the types).
- [ ] **Step 2 to 4: push red, write, push green.**
- [ ] **Step 5: Commit** `docs: links, paths and doors, for agents and for the README`
- [ ] **Step 6:** Run the implementation prompt's last look over the five pull requests, tick everything here and in
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

- **Level 1:** today's room, with a plate at (8.5, 7.875) linked to a gate at (11.25, 4), and the exit door at
  (13.5, 7) leading to `level-2`, beside `door-in`. The crate moves from (9.5, 7.5) to (5.5, 7.5), so it must be
  pushed onto the plate.
- **Level 2:** `door-in`, a crate, the critter with its path (it stands still until Characters), a button with
  `stays: true` and its gate; rows 5 to 7 of its right edge open.
- **Level 3:** rows 5 to 7 of its left edge open; the goal at (13.5, 7.5).
- **`world.json`:** `level-1` at (0, 0), `level-2` at (20, 0), `level-3` at (36, 0).
- **`automata.toml`:** the new files; `levels = ["level-1", "level-2", "level-3"]`.
- **Words,** in six languages, English as `source` saying what each is for: `level.level-1.goal`
  ("Push the crate onto the plate"), `level.level-2.goal` ("Press the button, then run right"), `level.level-3.goal`
  ("Reach the goal"), and the names of the three levels. The five other languages are drafts until a native speaker
  reads them (`automata.translations.toml` marks none).
- The new characters are boxes in the demo's colours (the palette's five, nothing else; `blueprint.test.ts` holds it).
- Every content file is written by `pnpm content:write`.

- [ ] **Step 1: Tests:** the game loads; `automata world --json` (through the framework's headless entry) gives three
  levels, one door and one join; every new key is in all six languages.
- [ ] **Step 2 to 4: push red, write, push green** (CI says "the content changed" for `replays/level-1.json`: expected).
- [ ] **Step 5: Commit** `feat: three levels, joined by a door and by an edge`

### Task E3: The page follows doors, the plays are recorded, the journeys

**Files:** `src/features/play/play.ts`, a new `src/features/play/ways.ts`, `replays/level-1.json`, `replays/level-2.json`,
`tests/fixtures/level-1-play.ts`, a new `tests/fixtures/level-2-play.ts`, `tests/replay/level-2.parity.test.ts`,
`tests/journeys/door.journey.test.ts`, `README.md`, `CLAUDE.md` (the goldens are now three).

The page keeps calling `startGame` (it moves onto `startFlow` with plan D's Part 8). After each step it asks the
framework's `doorTaken`; on a door it stops the game and starts it again at the door's level with `arrive`, keeping the
player's devices and language, and it calls nothing else new: the place, the crossing and the camera are the
framework's. Facts live for the visit only (the demo has no saves until plan D's Part 8): the page keeps the `fact.kept`
facts in memory and hands them to the next `startGame`. The strip says the goal of the level player 1 is in, changing on
`level.entered`.

- [ ] **Step 1: Tests:** the journey, in the three browsers on the real levels: push the crate onto the plate, go
  through the gate and the door, come out beside `door-in`, press the button, run right into level 3 with no break,
  touch the goal, read "well done". `level-2.parity.test.ts` plays `replays/level-2.json` (the place of levels 2 and 3,
  the crate pushed across the edge) in Node and the three browsers. `tests/fixtures/pinned-level.ts` is untouched.
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

## Handoffs

- **The plan audit (next, Opus medium)** should try hardest to break: call 1 (overlap in place of Rapier's events),
  call 2 (one ground grid) against "every existing golden unmoved", the facts command at source 0 against the recorder
  and the room server (if either refuses source 0, the plan needs another carrier), and whether `places` in the sim
  (call 6) can move a hash for a game that only arranges its map.
- **The Scenes plan,** when it returns: `openTile` is the one function to widen for ledges and scene ground, and
  `paintLevel` then draws the scene's own picture and the backdrop.
- **Plan Q,** when it returns: the goal line and the level name read `heroLevels`; the template's level with a door
  uses a `leads-to` value in place of `done`.
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
  pictures; numbered badges and a legend; no "level done" screen at a door; the demo's page follows doors itself.
- **Types.** `Arrive`, `SimLevel`, `PlaceLevel`, `Join`, `Way`, `ThingValue` and `ValueDeclaration` are each defined in
  one task and used by the same name after it.
- **Proportion.** The spec is 535 lines; this plan carries signatures, sentences and test names, and no function body.

# Plan W: plan audit

Stage 3 of cycle 13, written 2026-11-15. It audits
[`plans/2026-11-15-level-links-and-world-map.md`](../plans/2026-11-15-level-links-and-world-map.md) (pull request
#167, `cf1319e`) against the spec
[`specs/2026-11-15-level-links-and-world-map-design.md`](../specs/2026-11-15-level-links-and-world-map-design.md)
(second version, #165) and the code on `main` at `127b4d7`. It finds and reports only: nothing in the plan is changed
here. The fix round fixes every finding below, low ones included, except the two questions for the Owner, which wait
for the Owner's answer.

Nothing was run. Every claim below was read from the files named, on `main` (and, for the test game and the site, on
the `main` of AutomataFrameworkExamples and AutomataFrameworkSite).

## Verdict

The plan is sound in shape and close to the code: every helper it names exists where it says (`variants`, `unique`,
`noSuch`, `Listed`, `Report`, `tileBoxes`, `touchEvent`, `setClip`, `heroParts`, `characterParts`, `joinPlugin`,
`LeaveCommand`, `frameHeroes`, `paintFigure`, `paintBackdrop`, `IndexedPicture`, `xxhash64`, `progressDef`, the saves'
`upgrades`, `startLevel`, `automata.done.not-kept`, `push-crate.json`'s `idleHash60`, `tests/fixtures/golden.ts`), the
line counts it quotes are right (`flow.ts` 589, `content/level.ts` 442), and its table of what the slice cut took off
`main` is true. Two findings are high (a hero who comes out of a two-way door is sent straight back; a `facts` command
from a player is believed), six are medium, and fourteen are low. Two of the plan's calls go against the spec's words
and are the Owner's to settle.

**22 findings: 2 high, 6 medium, 14 low. 2 questions for the Owner.**

## The four calls the plan writer asked about

### Call 1: a press worked out from boxes, not Rapier's events. Sound, with one gap (L2)

- Every character's collider is a cuboid (`level/hero.ts:30`, `collider.cuboid(w / 2, h / 2, …)`), and `Collider`
  holds `hx`, `hy` and `sensor` (`physics/components.ts:26`), so a box test from `Transform` and `Collider` reads the
  true shape of every thing and hero, a hero whose box changes size included.
- Turning a gate into a sensor works with no new physics code: sync-in compares the Rapier collider with the entity
  (`colliderMatches`, `physics/rapier.ts:202`, checks `isSensor() === c.sensor`) and rebuilds it when they differ.
- An open gate raises Rapier's sensor events with a hero, but `touch.ts`'s `sidesOf` needs one side with `touch`, and
  a gate may not have one (Task 1's own sentence), so no `gate.touched` is made.
- Rapier's resting overlap is far under the 0.01 tile `SLOP`, so a hero leaning on a shut gate does not hold it.
- The gap: the order of `level.switches` against `level.moves` (both in `gameplay`) is left to registration order.
  See L2.

### Call 2: a place's ground as one grid. Sound for the goldens, one difference to write down (L1)

A level alone goes to `spawnLevel` unchanged (Task 8), so no golden can move, and joining solid tiles across an edge
before making boxes is the right way to stop a seam. The plan does not say that `spawnLevel` chooses between one box a
row (`tileRuns`) and `tileBoxes` by the game (`level/spawn-level.ts:66`), while `spawnPlace` always uses `tileBoxes`
(L1). The anchor of a level's joints is not moved into the place (M6).

### Call 10: facts as a command at tick 0, source 0. The carrier works; who may send it does not (H2)

The recorder and the replay file take source 0 (`commands/replay.ts:47`, `Int.max(255)`; the sim's `intake` checks
`isU(c.source, 255)`, `sim/create-sim.ts:366`), a tick 0 command is taken on the first `step` (`c.tick !== tick` is
the only tick rule), nothing on `main` sends source 0 today, and the room server never makes one (every player command
gets `source: seat`, seats start at 1, `net/room-engine.ts:194`). So the plan writer's worry, that the recorder or the
room refuses source 0, does not hold. The real gap is the other way round: the plan never says the sim believes only
source 0 at tick 0 (H2).

### Call 4: numbered badges and a list in place of written labels. A good call, but it is the Owner's (question 1)

A badge needs ten digits drawn as whole pixels, so the painter stays inside the painter rule
(`tests/architecture/rules.ts:55`) with no font in six languages, and the bytes match in every engine. It still
replaces the spec's words ("tags as small labels in the source language, doors' targets as a label") with something
else, and the spec's calls were the Owner's to approve, so it goes to the Owner (question 1).

### Call 6, asked about in the handoff: can `places` move a hash for a game that only arranges its map?

No. `places` holds offsets from each place's own corner, so moving a level that joins nothing, or a whole place, gives
the same `places` (Task 3's test says so), and the world file's entry leaves `project.content` with the `world` kind.
The plan must also add `content.worlds === undefined` to `simContent`'s "the very same object" test
(`level/sim-content.ts:37`), which the plan's sentence implies but does not say (folded into L13).

## High

### H1. A hero who comes out of a door stands inside it, so a door that leads back sends them straight back

- **Where:** Task 8 (`arrive`), Task 11 (`doorTaken`), Task 12, E2 and E3.
- **What:** with `arrive: { thing }`, player 1 is put at the door's own spot: Task 8's test says two heroes arriving
  "beside door-in" stand at (2.5, 7) and (3.5, 7), and `door-in` is at (2.5, 7). A door is `touch: "sense"`, so its
  collider is a sensor, and a body made inside a sensor raises a sensor start on the first step, which `touch.ts` turns
  into `door.touched` for player 1. If that door has a `to` (any two-way door, which is what a real game has), Task 11's
  `doorTaken` reads it and the flow opens the level the hero just left, which puts them inside that door, and so on.
  The fixture's `door-in` has no `to`, so no test in the plan sees it.
- **The spec:** "Every hero comes out **beside** the door's `thing`."
- **Fix:** put the arriving spot outside the door's box, on its floor (for example the door's middle moved sideways by
  half the door, half the hero and a small gap, toward the level's first start, falling back to the other side and then
  the starts when solid), and keep Review Focus 3's rule for a solid spot. Give the fixture a door that leads back
  (see M5) and test that coming through it raises no door on the next ticks.

### H2. A `facts` command is believed from anyone, at any tick

- **Where:** Task 7, step 1 of `level.switches` ("for each fact of each `FactsCommand` …").
- **What:** the system takes every `facts` command, whatever its source and tick. Online, the room passes on any command
  a player sends with `source: seat` (`net/room-engine.ts:191` to `199`, no check on `type`), so a player of a game with
  switches can open every gate for good by sending `facts` at any tick, and so can a stray game plugin. "(tick 0 only
  matters)" is a note, not a rule.
- **Fix:** honour a `facts` command only with `source === 0` and only on tick 0; ignore the rest (they are not
  rejected, so a replay still reads). Tests: a `facts` from source 1, and one from source 0 at tick 5, open nothing.

## Medium

### M1. A second door before the first one has finished starts the level twice

- **Where:** Task 11's `advance` test and Task 12's `watchWays`.
- **What:** in `playing`, a `door` answers a **new** `playing` state, and the flow starts a level whenever it gets a new
  `playing` state from `playing` (`flow/flow.ts:339` to `347`). Task 12 awaits `places.cameIn` and `places.reach`
  before it dispatches, and the game keeps stepping meanwhile, so player 2 walking into the door a tick later (or
  another door) is a second `door` event and a second `startLevel`. The plan's answer, that the second state is
  "deep-equal", does not help: `advance`'s own rule is that "nothing happened" is the very same object
  (`flow/steps.ts`, the comment on `advance`).
- **Fix:** on the first door, `watchWays` stops listening (and the flow pauses the game, as `done` does with
  `game.pause()`) before anything is awaited; test two heroes through the door one tick apart start the level once.

### M2. The fixture puts the critter inside the crate

- **Where:** "The fixture game", `room-2`.
- **What:** `crate-1` is 1 by 1 at (5.5, 7.5), from x 5 to 6; `critter-1` is 1 by 1 at (6, 7.5), from x 5.5 to 6.5.
  Two dynamic bodies made half inside each other are pushed apart on the first step, so every test on `room-2` starts
  with a jolt, and the critter's path, from x 4 to 7, runs through the crate.
- **Fix:** move them apart (for example the critter to x 7 with its path from 7 to 10, clear of the button at 8.5 only
  as a sensor), and add a fixture test that no two bodies in any level overlap at spawn (Task 6's `boxesOverlap` does
  it).

### M3. The test game's level 1 puts the crate on player 3's start

- **Where:** Task E2, level 1.
- **What:** the crate moves to (5.5, 7.5). Level 1 on AutomataFrameworkExamples `main` has four starts, at x 2.5, 4, 5.5
  and 7, all at y 7.5 (`content/levels/level-1.json`), so the crate sits exactly on player 3's start, and player 4's
  start is between it and the plate.
- **Fix:** put the crate where no start is (or move the starts), and say which in E2.

### M4. The test game's "well done" is about the crate today, and the plan does not say what replaces it

- **Where:** Tasks E2 and E3.
- **What:** the page says "well done" when the crate has moved from where the start level put it
  (`src/features/play/play.ts:279` to `287`, `goal.push` and `goal.pushed`). E3's journey ends "touch the goal, read
  'well done'", and E2 adds `level.<id>.goal` words, but neither says that the page's rule changes to the goal's touch,
  what happens to `goal.push` and `goal.pushed`, or that in level 2's place the crate's id is `level-2.crate-1` (the page
  finds it by `crate-1`).
- **Fix:** name in E3 the new rule (the strip says the level's goal; "well done" on `goal.touched` by a hero), the words
  that go and the words that come, and that the page reads ids through `heroLevels` or the framework's helper, never by a
  bare `crate-1`.

### M5. A test names a door the fixture does not have

- **Where:** Task 11, step 1: "in a place the prefixed id is read (`room-3.back` to `room-1`)".
- **What:** the fixture's `room-3` holds only `goal-1`.
- **Fix:** add a `back` door to `room-3` (leading to `room-1`, beside `exit`), in the fixture table, so Task 11's test
  and H1's test have it.

### M6. Joints held by the level hold to the wrong place inside a place

- **Where:** Task 8, `shiftLevel` and `spawnPlace`.
- **What:** `spawnLevel` makes a joint's anchor at the level's corner, `transform()` at (0, 0), and records it as
  `{ x: 0, y: 0 }` (`level/spawn-level.ts:95`). `shiftLevel` moves the joints' places but nothing moves the anchor, so a
  level at offset (16, 0) in a place has its pins and ropes held 16 tiles to the left.
- **Fix:** in a place, each level's anchor is at its offset; add a test with a pinned thing in `room-3`.

## Low

### L1. A place's ground boxes follow a different rule from a level's

`spawnLevel` makes one box a row for a `#` level in a game whose hero has no `moves`, and joined boxes otherwise
(`level/spawn-level.ts:66` to `70`); `spawnPlace` always uses `tileBoxes`. A place is new, so no golden moves, but the
plan should say so and why (the seam reason holds for any place).

### L2. Where `level.switches` runs against the hero's moves is not said

Both are in `gameplay`; the plan says "after `touch`" for the plugin, which is a `postPhysics` system and says nothing
about this order. Name `after` (for example after `level.moves`, so a press reads the boxes the hero is about to move
from) so the order does not hang on the plugin list.

### L3. The switch golden's run proves nothing it names

In `switch.json`, player 1 holds right for 300 ticks in `room-1`: the hero pushes the crate onto the plate and then past
it, toward the gate. The plan does not say what the run is meant to show. Assert before the hashes what happens
(`gate.opened` once, then the crate goes through the open gate or stops at it, and the gate's state at the end), or
script the run so the crate stops on the plate.

### L4. The place golden measures a pushed stack, not a crossing

In `place.json` the hero walks from x 2.5 and must push the critter, which pushes the crate. "`Body.vx` differs by
less than 0.01 between the tick before and after the crossing" then measures contacts in a stack, which can change
speed for reasons that are not the seam. Move the critter out of the run by the override, as the crate is moved.

### L5. The level's "outside" sentence lives inside its schema

The `outside` helper is a local inside the level schema's refine (`content/level.ts:224`), and `checkThingValues` runs
in `levelInfo.check`. Say that it is lifted into a shared function (with `content/level.ts` at 442 lines).

### L6. The painter's palette is given up front

`createPicture(width, height, palette)` takes the palette first (`content/pixels.ts:20`), so "every colour in
first-used order" needs a first pass over what will be drawn. Say so in Task 14.

### L7. Changing `loadArt` breaks a public export

`loadArt` is public (`render/render.ts:17`, `src/index.ts:19` exports the render feature whole). Task 10 swaps its
`level` for `levels`. Keep `level` working beside `levels`, or name the break and the API report change in Task 10.

### L8. A late joiner in a place comes in at the opened level

`joinPlugin` spawns a new hero at its configured `level`'s start (`level/join.ts:72`). In a place where player 1 has
crossed into another level, player 2 then appears a level away. The spec says nothing; the plan should say this is
what happens (or bring the joiner in beside player 1), and test it.

### L9. Two `stage.ts` files

Task 10 adds `game/stage.ts` beside the existing `render/stage.ts`. Give the new one a name of its own (for example
`game/stage-of.ts`), since both are about what is drawn.

### L10. An empty list of links fails with the schema's words

A thing's `values` allows "a list of 1 to 16 ids", so `"opens": []` fails in the schema with Zod's sentence instead of a
`check` sentence that says what to fix. Allow 0 to 16 in the schema and let `checkThingValues` hold the character's
`most` and `needed`.

### L11. Two of the spec's "shown" rules are not carried

The spec says a switch is shown as a tag **when it is not the default**, and a `leads-to` as an arrow on the world map
but a tag in the level. The plan's `shownOf` shows a switch always, and `SHOWN_FOR['leads-to']` is `arrow | none` while
Task 14 draws a badge on the door. Carry both rules, or list them under "Away from the spec's words".

### L12. Stricter than the spec, not listed as such

The plan fails a `words` value whose key the **source** language lacks; the spec says "a message key no language has".
Stricter is fine, but list it under "Away from the spec's words".

### L13. The world kind is missing pieces

`world.ts` must also export the kind's row (`worldInfo`, a `ContentTypeInfo`, as every kind in
`content/content-types.ts` has), and `simContent`'s early return must check `content.worlds === undefined`. Putting the
row "after `level`" moves every later kind one place in any listing made in the table's order; check what reads that
order (the schemas script, the MCP library) or put the row last.

### L14. The site reads the test game's start level

The site's `facts` takes the start level's **first** thing and `replays/<start>.json` (AutomataFrameworkSite
`src/features/facts/parse.ts:134` and `143`). E2 adds things to level 1; keep `crate-1` first, or tell the site's next
cycle that its home page's facts change.

### Also noted, no fix needed in the plan

- The spec says both "A replay is still one level" (doors) and "A replay is of a place" (edges). The plan follows the
  second, which is right; the spec's sentence under doors is older. Worth one line in the next spec touch.
- Entities with a `Transform` and a `Look` and no body (Task 8's ground pictures across an edge) are new; the joint
  anchor is the nearest thing on `main` (it has a body). Task 8's test that the floor is one body with one `Look` for
  each level covers them if it also steps the sim.

## Questions for the Owner

1. **Level pictures: numbers with a list, or words on the picture?** The spec said the "what it is" picture writes small
   labels in the team's language. The plan draws a small number instead and prints what each number means beside it.
   - **Numbers and a list (recommended):** the picture is the same in every browser, it needs no letters for six
     languages, and an agent reads the list as text anyway.
   - **Words on the picture:** closer to the editor's view, but the picture command then needs a font drawn by hand.
2. **Going through a door: straight into the next level, or a "level done" screen first?** The spec said a door ends
   the level "the way done ends it today", which shows the "level done" screen. The plan opens the next level at once.
   - **Straight in (recommended):** a door feels like a door, the same as walking over an edge.
   - **"Level done" screen first:** the player is told they finished, then presses Next.

## Spec coverage

Every goal and every `check` sentence of the spec has a task, with goal 3 (a path that walks) split by the Owner's
answer ("B, one thing at a time"). The spec's tests each have a home but `walk-path.json`, deferred with the walk. The
plan's "Not in the spec, added here" and "Away from the spec's words" lists are complete apart from L11 and L12, and the
two questions above.

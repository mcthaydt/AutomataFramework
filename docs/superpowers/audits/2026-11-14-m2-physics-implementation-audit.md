# M2 plan P (joints and touch): implementation audit

Stage 5 of the workflow, for the code of [`plans/2026-11-14-m2-physics.md`](../plans/2026-11-14-m2-physics.md) as
merged in PR 46 (`facdcfb`, branch head `1c46ad8`; `src/` and `tests/` on `main` are byte for byte the branch head),
against that plan, its [plan audit](2026-11-14-m2-physics-plan-audit.md) (PR 45), the
[M2 spec](../specs/2026-11-14-m2-design.md) ("Physics: joints and touch (plan P)") and the build's report of seven
rulings. Written 2026-11-14.

**Verdict:** the build is sound and very close to the plan. All twelve tasks are there; every finding of the plan
audit is in the code (C1 the rope's length through `dmath`'s `hypot`, I2 a pair ended and started in one tick makes no
event, I3 a `turn` must hold 0, I4 a joint to an alive entity with no body is an Error, I5 a kind in both lists, I7 the
joint count rather than the byte length, I8 the raw body handles, M3 `new PhysicsWorld(adapter)` unchanged, M5 the
spawn order). The order of work in sync-in is the contract's six steps exactly. The joint bytes row is 62 bytes and
version 2 is untouched. `git diff df3ea6f facdcfb -- tests/golden` is the two new files and nothing else;
`tests/fixtures/game/` is unchanged; no file in `src/` is over 600 lines. Every check was green on `1c46ad8`
(`check`, the three `engines`, `package`, `online`, `screens`, `commit-authors`). There is nothing critical. One
finding is important: the journey's name says the hero goes through the door, and nothing in it checks the door.
Seven minor findings and five notes follow, then the fixes. Every one of the seven rulings is accepted. There is no
Owner question.

**How it was checked.** Every file the PR changed under `src/` was read in full (`sim/context.ts` and
`create-sim.ts`; `physics/` `joint-table`, `physics-world`, `rapier`, `checks`, `components`, `kinds`, `spawn`,
`handle-bits`, `physics`; `content/level.ts`, `character.ts`, `content.ts`; `level/touch`, `uses`, `joints`,
`spawn-level`, `game-sim`, `hero`; `render/scene`, `stage`, `render`), with `sim/entity-store.ts` and `sim/fields.ts`
for how a query is ordered and how a field is written. The tests were read against the plan's list of test names, and
the fixtures (`tests/fixtures/physics/joints-scene.ts`, `tests/fixtures/playground/`, `tests/fixtures/game/extra.ts`),
the README section, `smoke.mjs` and the `package` job's copy step. The playground's pictures were looked at on the
`ci-screens` branch (`1c46ad8/chromium/playground-1280x720.png`, `webkit/playground-390x844.png`). The checks were read
with `gh api`. Nothing was run locally: no install, no typecheck, no test, no probe.

## Critical

None.

## Important

**I1. The journey says the hero goes through the door, and nothing checks the door.**
`tests/features/game/playground.browser.test.ts:88` is named "holding the right key takes the spark and goes through
the door", and `expectPlayed` (line 67) checks the spark (taken, `Score.sparks` is 1), the seesaw (turned past 0.1)
and that the replay verifies. Nothing looks at `door.touched` or `door.left`. `Score.inDoor` cannot stand in: it is
`false` before the door and after it, so a run that never reached the door would pass. The same holds for the thumb
test, which calls the same helper. The headless test (`playground.parity.test.ts:80`) does check all four touch
events, but the plan's Task 10 is the proof that a person, by key and by thumb, in a real browser, gets the whole
playground, and at five sizes the door is the half of touch that is not checked. Fix 1 adds the check without moving
the golden: `Score` is in the hash, so the fix must not add a field to it.

## Minor

**M1. A fixed thing held by another fixed thing is told it "cannot be joined to the level".**
`levelInfo.check` (`content/level.ts:349`) reports one sentence for both cases it finds: a `fixed` thing held by the
level, and a `fixed` thing held by another `fixed` thing. In the second the joint names a holder, and the sentence
says "to the level", which is not what the file says. The advice ("Make it dynamic, or remove this joint") is still
right, but a person reading it looks for a joint to the level that is not there. Fix 2.

**M2. A pinned thing that is `upright` can never turn, and nothing says so.**
`upright` becomes the body's `fixedRotation` (`level/hero.ts:15`). A pin on such a thing holds it still: a seesaw made
from an `upright` plank, with or without `turn`, never tips, and the file loads with no word. The plan did not ask for
a sentence here, but the plan's Review Focus 4 is "a level file that joins what cannot be joined: one plain sentence
each", and this is one more such file. A rope on an `upright` thing works, so only a pin is refused. Fix 3.

**M3. A pin is too small to see on a phone.**
`PIN_RADIUS` is 0.1 tile (`render/stage.ts:21`). At 390 by 844 the playground's 24 tiles fit into 390 pixels, so a
tile is about 16 CSS pixels and the pin's dot is about 3 pixels across, dark on a brown plank: in
`webkit/playground-390x844.png` it can hardly be made out. A rope already has a width in CSS pixels
(`ROPE_WIDTH / fit.scale`) for this reason. Fix 4 gives the dot a smallest size in CSS pixels, as the rope has.

**M4. The README's game code does not run as written.**
The "Joints and touch" snippet uses `Score`, which it never defines, and does not say how its system hears the touch:
it works because `defineSystem(name, run)` puts it in `gameplay`, which runs after `postPhysics`. A system a reader
moves into `postPhysics` sees nothing unless it runs `after: ['level.touch']`, and a plugin that reads the events
must list `touch` in `dependsOn` (as the playground's does). Onboarding comes first: a first-time developer copies
this block. Fix 5.

**M5. The touch "no body" error is wrong for an entity that has a body and no transform.**
`JointTable.createMissing` throws `entity 3 has no physics.body, so nothing can be joined to it`
(`physics/joint-table.ts:116`) whenever the end is alive and has no body row. A row needs a `Transform` too, so an
entity with a `physics.body` and no `transform` is told it has no `physics.body`. Fix 6 names whichever is missing.

**M6. `ctx.events.of` hands systems the step's own payload objects.**
`events.of` returns `events[i].payload` (`sim/create-sim.ts:321`), the same objects later systems read and the step
result returns. A system that changes one (say, `payload.player = 0` to mark a touch as handled) changes what every
later system and the game see, with no error. Events are not hashed, so no hash moves, but the plan's words are "the
payloads of this event emitted so far", not a shared, writable list. Fix 7 freezes each payload when it is emitted.

**M7. `create-sim.ts` is 586 lines, 14 under the cap.**
Plan P's Task 1 added seven lines and stayed under 600, as the plan allowed. Plans S and T, both open, also touch the
sim. The plan's own way out (move `describeSchemas` and `register` to `src/features/sim/schema-hash.ts`) is ready for
whichever needs it. No fix here; Fix 8 is a line in the tracker so the next plan does it first rather than at 601.

## Notes

- **N1. A joint whose end is taken waits for ever.** A level that ropes a `take` thing (a spark on a rope) leaves the
  joint's entity alive once the spark is taken: the contract says a joint to an end that is not alive waits, and
  StableIds are never reused, so it waits in every snapshot from then on, drawn as nothing. Harmless today and in the
  contract; plan D's levels should not rope a spark, or a later plan can despawn a level's joint whose end is gone.
- **N2. A restore does not hold the joint table to the `Joint` components.** `checkTable` proves the table's joints
  are Rapier's and hold the right bodies, but not that each row's fields equal its entity's `Joint`. Snapshots come
  only from the sim, so the two always agree; if they ever did not, the first sync-in would rebuild that joint rather
  than refuse the bytes. Recorded, not a fix.
- **N3. `a` and `b` are `u32`, not the sim's `entity` field type.** As the plan's contract says. If `entity` gains
  meaning later (a check that the id is alive), `Joint` is a candidate.
- **N4. The content check measures a rope's gap with `Math.hypot`.** Only the check that the ends are 0.01 tiles
  apart (`content/level.ts`), which never reaches the sim's state; the length the sim keeps uses `dmath`'s `hypot`,
  as plan audit C1 asked.
- **N5. The pictures look right.** At 1280 by 720 the swing hangs on two dark ropes with the crate on it, the seesaw
  has tipped right on a visible pin, the door stands on the floor and the hero has run to the wall beside the
  fallen crate.

## The build's rulings

All accepted.

1. **The render type is `RopeLine`, not the plan's `Link`.** `main` already exports `Link` from `net`; two exports of
   one name would not build. The README and the API report use the new name.
2. **`tests/fixtures/game/extra.ts`.** A new helper beside the M1 fixture that writes extra files with `writeContent`;
   no file of the M1 fixture changed, as the plan's constraint asks.
3. **NaN and Infinity in a joint field are refused when written.** True of every `f32` field already
   (`sim/fields.ts:27`), so the plan's "ax NaN" case cannot reach `checkJoint` through `entity.set`; the build tests
   `checkJoint` directly for it ("a number that is not a number is refused by name too") and keeps the check as a
   second line. Right.
4. **The order of spark events.** Ended pairs first, then started, each in the order physics emitted them, and a
   thing is taken by the first started pair. That is the plan's words and Review Focus 2 ("by the pair that sorts
   first"), and the two-heroes test holds it.
5. **A thing with a `Transform` and no `Look` is not drawn** but can be a joint's end (the level's anchor), as the
   plan's Task 8 says.
6. **Tasks 10 and 11 in one commit** (`a79d4cd`). A history matter only; both tasks' tests are there.
7. **The only review was a self-review**, as the plan's Task 12 says (no subagents). This audit is the second look.

## The fixes (for stage 6)

None moves a golden. Each is one commit, test first.

1. **I1.** In `playground.browser.test.ts`, `expectPlayed` also steps a second fresh playground through
   `g.replay()`'s commands, collects the `type` of every event whose type ends in `.touched`, `.left` or `.taken`, and
   expects exactly `['spark.touched', 'spark.taken', 'door.touched', 'door.left']`, the parity test's list. `Score`
   is not changed (it is in the hash).
2. **M1.** Two sentences in `levelInfo.check`: with no holder, today's; with a fixed holder,
   `The characters "<thing>" and "<holder>" are both "fixed", so neither moves and this joint holds nothing. Make one
   of them "dynamic", or remove this joint.` A test for each, as the whole `file: path: sentence` line.
3. **M2.** In `levelInfo.check`, a `pin` whose thing's character is `upright`, at `joints[i].thing`:
   `The character "<id>" is "upright", so it cannot turn on a pin. Set "upright" to false, or hold it with a rope.`
   A test, as the whole `file: path: sentence` line.
4. **M3.** In `stage.ts`, the dot's radius is `Math.max(PIN_RADIUS, PIN_MIN_PX / fit.scale)` with `PIN_MIN_PX = 4`
   CSS pixels; `links.browser.test.ts` gains the phone's scale (a 390-pixel-wide mount), where the pin's centre and a
   point 3 CSS pixels from it are both dark.
5. **M4.** The README snippet defines `Score` (two lines, as the playground's plugin does), wraps the system in a
   plugin with `dependsOn: ['level', 'touch']`, and says in one sentence that a `gameplay` system hears this tick's
   touches and a `postPhysics` one must run `after: ['level.touch']`. `readme.test.ts` still finds `touchEvent(`.
6. **M5.** `createMissing` says what the end lacks: `... entity 3 has no transform, so nothing can be joined to it`
   when the end has a `physics.body` and no `transform`, and today's sentence otherwise. A test for the new case
   beside "a joint to an entity with no body is refused by name".
7. **M6.** `emit` stores `Object.freeze(parsed.data)`; a test in `events-of.test.ts` that a system writing to a
   payload from `ctx.events.of` throws (ES modules are strict) and the step result's payload is unchanged.
8. **M7.** The tracker's plan P line names the 586 lines and the split, so plans S and T read it.

## What other plans rely on

Unchanged from the plan's own list, and true on `main`: `ctx.events.of` (plans S, T, N), `spark.taken`,
`door.touched` and `door.left` as ordinary events (S and the feel runtime), `Scene.links` now typed `RopeLine`
(plan A), the plugin order physics, commands, level, join, touch, the game's (`game-sim.ts`; plan I), and the spawn
order tiles, things, anchor, joints, heroes (plans I and N). Plan D's step (the demo's seesaw, swing, sparks and door,
its golden shown to the Owner) waits for the Examples pin to move past `facdcfb`.

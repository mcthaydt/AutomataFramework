# M2 plan P (joints and touch): plan audit

Stage 3 of the workflow, for [`plans/2026-11-14-m2-physics.md`](../plans/2026-11-14-m2-physics.md) as merged in
`38bd2ac`, against the [M2 spec](../specs/2026-11-14-m2-design.md)'s "Physics: joints and touch (plan P)", the code
on `main` at `065f773`, and the other M2 plans: C (content, its audit merged as PR 38), I (input, its audit merged as
PR 39) and N (networking, PR 35; its audit is PR 41). Written 2026-11-14.

**Verdict:** sound. The plan's central call (joints and touch switched on by content, so the schema hash of every
game without them is unchanged) holds against `create-sim.ts`, and its order of work keeps the table and the Rapier
world in step. One critical fault (a value in the sim's state computed with `Math.hypot`) and eight important ones
were found; all are fixed in the plan. No question is the Owner's.

How it was checked: every file the plan names under `src/features/physics/`, `src/features/sim/` (`context.ts`,
`create-sim.ts`, `definitions.ts`, `schedule.ts`, `errors.ts`, `entity-store.ts`'s deltas, `dmath.ts`),
`src/features/level/`, `src/features/render/` and `src/features/content/` was read whole, with the physics fixtures,
`physics-world.test.ts`'s pretend adapter, the goldens, the CI `package` job and the smoke. The pinned
`@dimforge/rapier2d-deterministic-compat` 0.21.0 was fetched with `npm pack` and its `.d.ts` files and its built
`rapier.mjs` were read for every call the plan makes. Plans C, I and N were read where they touch `level`,
`content`, `create-sim.ts` and snapshots. No test was run.

## Critical

**C1. A rope's length used `Math.hypot`.** Task 6 computed `Math.fround(Math.hypot(...) + slack)` and wrote it into
`Joint.max`, which is sim state and so in every hash. `Math.hypot` is not required to be correctly rounded, and
engines differ in its last place; `Math.fround` hides most such differences but not one that falls on an f32
rounding boundary. That is a hash mismatch waiting in one engine (law 3). The framework already has the cure,
`hypot` in `src/features/sim/dmath.ts`. *Fixed:* Task 6 uses `dmath`'s `hypot` and says why. (The degree to radian
turn is `*` and `/`, which IEEE rounds the same everywhere; `Math.hypot` stays in test assertions, which hash nothing.)

## Important

**I1. The joint table's row is 62 bytes, not 54.** `u32 sid`, three `f64`, `u8 kind`, two `u32`, four `f32`,
`u8 limited` and two `f32` add to 4 + 24 + 1 + 8 + 16 + 1 + 8. A truncation test written from 54 would cut in the
wrong place. *Fixed* in "The physics bytes", with the sum written out.

**I2. A rebuilt collider would say a hero left the door and came back.** `physics-world.ts` ends a contact when
sync-in rebuilds a collider and starts it again in the same tick ("ended then started, leaving it touching"). The
touch system walked ended then started, so a hero whose box changes size inside a door (a crouch, a power-up) would
make `door.left` and `door.touched` in one tick, and a game counting players in the door would count wrong for a
tick. *Fixed:* a pair with both an ended and a started this tick makes no event, with a test.

**I3. A pin's turn range could leave out where the thing starts.** Things are placed unturned, so a `turn` of
`{ min: 10, max: 30 }` is broken from tick 0 and Rapier snaps the thing into range on the first step: a jolt nobody
asked for. *Fixed:* Task 5 refuses it with `The thing starts level, so "min" must be 0 or less and "max" 0 or more.`

**I4. A joint to a body-less entity waited for ever, silently.** The order of work let a joint wait "with no error"
whenever an end had no body row. That is right for an end that is not alive yet (it may be spawned later), but an end
that is alive and has no `Body` (the joints scene's own floor is a lone collider) never gets a row, so game code
would see a thing that is simply not held, with nothing to say why (principle 1: no hidden state). *Fixed:* step 6
waits only for an end that is not alive; an alive end with no body row is an `Error` naming the field, with its
sentence and a test.

**I5. Two characters of one kind could crash the touch plugin.** `touchKinds` listed kinds per character; two
characters with kind `spark` (one taken, one sensed) would put `spark` in both lists, and registering
`spark.touched` twice makes `createSim` throw `duplicate event`. *Fixed:* the lists have no repeats, each event is
registered once (`touched` and `left` for every kind, `taken` for kinds in `take`), and whether a touch takes is the
touched character's own `touch`, with a test.

**I6. Task 2's "rebuilt row" log was wrong.** An entity that loses its `Collider` is rebuilt as a body alone, so
there is no `createCollider 1`; and the setup gave entity 1 two joints (4 and 5), so the log would hold both. *Fixed:*
the test uses a world with only joint 4 and the right log.

**I7. "Back to its size" cannot be measured in bytes.** Task 3 proved a removed joint gone by the physics bytes
returning to their earlier length. Rapier's arenas keep a freed slot in their serialised form, so the length does not
shrink back even when the joint is gone, and the test would fail on correct code. *Fixed:* the joint table's count is
0 and `restore(snapshot())` succeeds, which `checkTable` allows only when Rapier holds no joint either. The "when its
sim is disposed" half is dropped: nothing can be read from a disposed sim, and `dispose` frees the world whole.

**I8. `jointBodies` should read raw handles.** `ImpulseJoint.body1()` goes through the body set's map; the lesson
`colliderParent` records in `rapier.ts` is that a wrapper's lookup can resolve a malformed handle to a live object,
while `checkTable` compares exact bits. *Fixed:* `jointBodies` reads `world.impulseJoints.raw.jointBodyHandle1/2`, and
the world's joint handles come from `raw.forEachJointHandle`. Checked in the package: a restored world's joint
wrappers are made with no body set and filled in by `finalizeDeserialization`, so `body1()` would also work after a
restore, but raw handles are what the table must agree with. Also checked: `JointData.limitsEnabled` is read only for
prismatic joints, so the plan's `setLimits` on the made revolute joint is the right call; written into Task 3 with
the anchor order (`b` first with `(bx, by)`).

## Minor

- **M1.** The level's "no such thing" sentence did not match plan C's shape for a name inside one file
  (`There is no layer called "far". This backdrop has: hills, sky.`). *Fixed:* `There is no thing called "plnk".
  This level has: crate-1, plank-1.` And since plan C refuses a thing named `player-N`, the hero sentence is now
  checked first and alone, or `thing: "player-1"` would read as "no thing called".
- **M2.** "No `slack`" now says "left out or 0".
- **M3.** `new PhysicsWorld(adapter, { joints })` takes its options as optional (default no joints), so
  `physics-world.test.ts`'s existing `new PhysicsWorld(adapter)` is unchanged.
- **M4.** Task 10 holds right for 260 frames; at the hero's 6 tiles a second from x 1.5 that passes x 24 after about
  225 ticks and the hero runs off the 24-wide map. *Fixed:* the playground has a wall up its rightmost column.
- **M5.** Joints and their anchor were spawned after the heroes, so a level's own entity ids depended on how many
  people play. With plan I's heroes coming and going and plan N's rooms starting with none, *fixed:* tiles, things,
  the anchor, the joints, then the heroes. A game without joints spawns exactly what it does today.
- **M6.** The two browser picture checks read one pixel on a 2-pixel line, which smoothing may leave pale. *Fixed:*
  the darkest pixel in a 5 by 5 square.
- **M7.** Task 11 exported `LevelJoint` and `Touch` only implicitly, and not `Link`, which `Scene.links` returns.
  *Fixed:* named.
- **M8.** Task 9 edited `biome.json` to skip the playground's content; the M1 fixture's content needed no such entry.
  *Fixed:* only if `pnpm lint` would reformat them.
- **M9 (not changed).** `ctx.events.of` returns the payload objects the step result also carries; a system that
  mutated one would change what later systems and the recorder see. Deterministic either way, and the type is
  `ReadonlyArray` of parsed payloads; the executor may freeze payloads in `emit` if it costs nothing.

## Checked and found right

- **The schema hash.** `createSim` hashes plugin names, configs, components (id, fields, render), events and the
  system list (`create-sim.ts:248-263`). `physics()` with no `joints` keeps today's config `{ gravity }` and
  components, and `createGameSim` adds neither `joints: true` nor the touch plugin for a game that uses neither, so
  `push-crate.json`, `physics-scene.json`, `bounce.json`, plan I's `co-op.json` and Examples' two goldens are
  untouched. Joint's `render: true` is hashed too, but only exists in joint games.
- **The content hash (plan C's C1).** Both new keys are optional with no default, so a parsed M1 file has no key for
  them and the canonical JSON `createSim` hashes is unchanged. `joints` last in `level` sits after plan C's
  `tileset` and `backdrop`; `touch` after plan C's `tuning`. Plan C's `variants`, `unique`, `Listed`, `Report` and
  `levelInfo.check(value, game, report)` are what the plan uses.
- **Event names.** `defineEvent`'s id pattern allows dots and dashes, and a content `Id` is dashed lower-case words,
  so `big-door.touched` is a valid id. Systems run in phase order (`input, prePhysics, physics, postPhysics,
  gameplay, cleanup`), so `level.touch` (postPhysics, after `physics.events`) runs before every gameplay system, and
  a game reads a touch in the tick it happens. `ctx.despawn` is deferred to `entities.flush`, so a taken spark is
  still there for gameplay systems that tick; its contact is then ended by sync-in with the spark gone, which the
  plan correctly turns into no `spark.left`.
- **Rapier.** Every call the plan names exists in 0.21.0 with the signatures given; `World.takeSnapshot` carries the
  impulse joint set; `removeRigidBody` unmaps a body's joints by itself, which step 2 makes moot by removing them
  first; `setContactsEnabled` is per joint and serialised. `ActiveCollisionTypes.DEFAULT` gives sensor events
  between a fixed sensor and a dynamic hero or crate, and none against fixed tiles.
- **The order of work.** It extends sync-in's removals, creations, updates, each lowest sid first, with joints
  removed before any body they hold and created after every body: the table and the world agree after every
  sync-in, and Rapier's slot reuse stays the same in every engine. Joint fields in the bytes answer "did it change"
  after a restore without asking Rapier, the `rotationLocked` lesson.
- **Plan I.** Its `heroParts` in `hero.ts` is where the sensor collider goes once it merges, as the plan says; its
  `join` system spawns heroes in `input`, which physics gives bodies in the same tick's sync-in, so a late hero
  touches like any other. `playersIn(sim)` is what plan D counts the door against.
- **Plan N.** Rollback restores the physics bytes and re-steps; touch events come again on a re-step and plan N
  hands out only first-predicted ticks' events, as the plan says. No layer change: `level` already sits above
  `physics`, `commands` and `content`, and `render` above `physics`, in plan N's `LAYERS`.
- **The render side.** Render rows carry every render component, so the scene can keep the anchor's pose (a
  `Transform` with no `Look`) and the `Joint` rows; `Renderer.draw(alpha)` keeps its signature, and only the internal
  `Stage.draw` gains the links.
- **The playground.** With `RUN = 6` and right held from tick 10 to 200, the hero reaches about x 20.5, through the
  spark at 4.5 and the door at 13 to 14, and stays under the platform (its bottom at about 6.1) and the seesaw (at
  4); the hero's top is at 8.
- **Sizes.** `physics-world.ts` 411 lines, `create-sim.ts` 578, `rapier.ts` 218: the plan's split keeps each under
  600, and it already says what to move if `create-sim.ts` would pass it.

## For other plans, not fixed here

- **Plan D.** A hero who leaves the game (plan I's `leave`) while in the door sends no `door.left`, because the
  payload names a hero that is gone. "Everyone is through the door" is counted among `playersIn(sim)`. Written into
  the plan's step for plan D and its "What other plans rely on".
- **Plan N's audit (PR 41)** was open while this was written; nothing in it was relied on.

# Plan H (the built-in hero): plan audit

Stage 3 of the workflow, for [`plans/2026-11-14-built-in-hero.md`](../plans/2026-11-14-built-in-hero.md) as merged in
`3cdb8d0` (PR 93), against the [built-in hero spec](../specs/2026-11-14-content-hero-controls-design.md), the code on
`main` at `3cdb8d0`, and the Editors redesign plan's Task 19 (Play) as merged in AutomataFrameworkEditors `583ebca`
(PR 17). Written 2026-11-14.

**Verdict:** sound, and ready for stage 4. The central calls hold against the code: the `moves` plugin joins a sim
only when the hero has `moves`, as `joints`, `sprites` and `touch` already do, so no framework golden moves; `Touching`
filled in `physics.sync-out` (postPhysics) is read by `level.moves` in `gameplay` of the same tick, and what it writes
reaches Rapier in the next tick's `physics.sync-in`, so the dash's `hover` works as planned; every new file sits in a
layer that may import what it needs (`tests/architecture/rules.ts`: `input` is below `host` and `locale`, so
`locale/hints.ts` may take `DeviceKind` and `game/buzz.ts` may take `Host`). No critical fault was found. Nine
important ones were, the worst a walk that ground friction would never let reach its own speed; all nine are fixed in
the plan or, for plan T, in its plan. Five minor ones are fixed.

How it was checked: the plan and the spec were read whole. On `main`: `src/features/content/` (`character.ts`,
`tuning.ts`, `feel.ts`, `type-info.ts`, `diagnostics.ts`, `project.ts`), `src/features/commands/pad-names.ts` and
`players.ts`, `src/features/physics/` (`physics.ts`, `systems.ts`, `physics-world.ts`'s `syncOut`, `spawn.ts` and
`kinds.ts`'s friction), `src/features/level/` (`game-sim.ts`, `uses.ts`, `hero.ts`, `components.ts`, `spawn-level.ts`,
`join.ts`), `src/features/sim/definitions.ts`' phases and `fields.ts`, `src/features/input/input.ts`' `poll` and
`touch.ts`' `Touch`, `src/features/game/game.ts`, `src/features/host/host.ts`, `src/features/web/web.ts`,
`src/features/render/stage.ts`' inset, `src/features/saves/settings.ts`, `tests/architecture/rules.ts`, the template
(`automata.toml`, `hero.json`, `level-1.json`, `move.ts`, `controls.ts`, `page.ts`), plan T's builder's call 8, plan W's
tracker row, and the Editors plan's Task 19 and Appendix A. Nothing was run (the Owner, 2026-11-14: nothing runs
locally, GitHub CI only).

## The coordinator's questions

**The Handoffs against the Editors plan's Task 19.** Task 19 waits on three things: this cycle merged, an amendment,
and the pin. Its two gaps close as follows, and the plan's Handoffs now say so (I6):

- **G1** holds: `canPlay` is `usesMoves(content)`, the project's hero has `moves`, the name the spec chose.
- **G2:** `startGame({ content, mount, host, locale, readPicture, level })` with no `controls` and no `plugins`.
  Three things the Handoffs had wrong or left out are fixed: a game without `moves` gets Task 19's notice
  (`playNeedsCode`), not "the physics-only picture" the Handoffs promised; `startPlay` takes a loaded `Art`, which
  `startGame` cannot take (it loads its own through `readPicture`), so the amendment passes the reader and drops
  `art`; and Stop must sit outside the mount, stacked above it, which a new Task 12 test proves takes its own touch
  (I5). Play passes no `settings`, so nothing reaches the device's storage, which the editors' list of device keys
  requires.
- **Language** (the Owner, 2026-11-14, the Editors audit's Q2, answer A): the editors' language when the game has
  it, else the game's flags once. Nothing in plan H changes for it; the Handoffs say how Play passes it.
- The spec's "a Tuner change to `jump-speed` felt in the next Play" has no home in Task 19, which has no Tuner. It
  belongs to the Feel editor's journeys (M4, minor).

**The feel runtime: where it should live.** Nothing draws a feel file today (`feel.ts` reads and checks them; no
feature hears them), no plan owns it, and the spec's showcase table promises "dust on landing, a shake when a crate
drops, a freeze on a spark". My answer:

- **In this repo, as its own plan, plan F (the feel runtime),** not inside plan H and not in Examples. Plan H is
  fifteen tasks already, and feel is not about the hero: the crate's shake and the spark's freeze have nothing to do
  with `moves`. Examples may import only the published package, so the demo cannot draw it itself; the editors' Feel
  editor (M3) will preview the same effects and must use the framework's.
- **Its shape, so the planner starts from the code:** presentation only, so no sim state and no golden moves. A
  `game/feel.ts` that hears each step's events the way `audio.hear` does (and takes `game/buzz.ts` in, which plan H
  builds to that shape); dust drawn by the renderer (`render/dust.ts`, specks in tiles and ticks, in the level's
  layer); shake as an offset of the stage, never of the sim; freeze as a hold of the loop's steps on a page playing
  alone, and of the picture only in an online game, where the room's ticks cannot wait. A watched replay shows dust
  and shake but never buzzes. Reduced motion turns shake off.
- **Order:** after plan H (it needs `hero.landed` and the other events with `{ player, sid }`) and before plan D's
  demo step. The M2 spec's feel rows say what, not how freeze meets online play or reduced motion, so per the
  workflow it starts with a short addendum spec (coordinator and Owner), then the plan.
- Until it lands, the template's `land.json` buzzes and its dust is not drawn. The spec says a buzz is never the only
  sign; on Android it is, besides the landing itself, for as long as plan F is not built. The plan's Handoffs say so.

## Important

- **I1. Friction eats the walk.** Step 5 moved `vx` toward the target from `input.vx`, the speed physics left after
  the step. Every collider has friction 0.5 (`kinds.ts`), so a hero on a floor loses about `0.5 × 30 / 60 = 0.25`
  tiles a second each tick: with grip 3 it goes 2, 1.75, 3.75, 3.5, 5.5, 5.25, 6, 5.75, 6, … and never holds 6. The
  pure test ("walk reaches 6 in 3 ticks") would pass while the real hero walks slower than its number says, which
  is the number a person slides in Tuner. Fixed: `MoveState.run`, the speed the step last asked for, is where the walk
  starts; `vx = run`. Today's hero sets its speed outright every tick, so pushing a crate behaves as it does now. A
  dash ends at walk speed (or nothing at a wall), and a wall jump sets `run`. Two pure tests and one real-physics test
  (60 ticks held right covers walk-speed tiles within 2%) are added.
- **I2. "The game still plays" with a check that refuses.** Review Focus 4 said a number outside the framework's
  limits leaves the game playing while the check names it, and Task 2 made the check a `loadGame` diagnostic.
  Diagnostics have no warnings (`diagnostics.ts`), so `loadGame` fails and the game does not play. Fixed by saying
  what the plan builds: the check is a refusal, as every content check is, and the clamp in `moveNumbers` is for
  content that never went through `loadGame` (an editor's draft mid-slide, a test's game in memory). A file's own
  range can then never take a slider past the framework's limits, which is what the spec's "the framework holds it
  inside its own limits" wants.
- **I3. A tuning file with no controls threw away the code's.** `heroControls(content) ?? options.controls` with the
  framework's defaults inside `heroControls` meant a moves game passing `controls` in code always got the framework's
  keys when its tuning file had no list. The spec's "when both are given, the tuning file wins" is about a file that
  has a list. Fixed: the file's list, else the code's, else the framework's; the console note only when a list and
  code are both there; one test added. The thumb scheme now follows `usesMoves(content)`, as the spec says ("when the
  game's hero has `moves`"), not where the controls came from.
- **I4. A level with no view puts the floor under the thumbs.** On a sideways phone and a tablet the halves cover the
  game and `setThumbRoom` moves the camera to keep the hero clear, but only "in a level with a `view`". The template's
  level has none (16 by 9 tiles, fitted whole, its floor at the bottom of the screen), so its hero walks under the
  player's thumbs: the spec's anti-goal "a thumb that hides the hero". Fixed: with no view, the room goes to
  `setInset` and the level is fitted above it. Task 14 plays the fixture's level copied without its view as well.
- **I5. Something stacked over a half.** The halves cover the mount; the editors' Stop (Task 19) and plan U's Pause
  sit over the left half. Nothing in the plan proved a touch on them never walks. Fixed: a Task 12 test, an element
  the page stacks over a half, outside the mount, takes its own touch and the half sees none.
- **I6. The Editors handoff did not match the merged Editors plan.** See the coordinator's questions above; fixed in
  the Handoffs.
- **I7. Two places for the hero's tuning file.** Characters already have a top-level `tuning` ("the tuning file whose
  numbers decide how it moves"), which nothing in `src/` reads. With `moves.tuning` beside it a hero could name two
  files, and an agent could change the wrong one. Fixed: Task 1 refuses a top-level `tuning` that names another file
  than `moves.tuning`, in words that say which to keep.
- **I8. A buzz that is the only sign.** The template's `land.json` has dust and a buzz, and the dust is not drawn
  until the feel runtime exists. Kept (the spec asks for the landing buzz, and the landing is visible), and written
  into the Handoffs as what plan F closes. See "The feel runtime".
- **I9. Plan T's executor never reads plan H's Handoffs.** Plan H said plan T's `on-ground` reads `Touching.below`,
  but plan T's plan still builds it from how the body moved, and whichever is built first decides. Fixed: plan T's
  builder's call 8 now carries a note: use `Touching` if Task 4 is on `main` when plan T builds its senses, else build
  as written, and a later move is plan T's own change with its golden named. **For the coordinator:** if both are
  queued, building plan H's Task 4 before plan T's senses saves plan T a golden move later.

## Minor

- **M1.** Rapier keeps a contact manifold with no points (a zero normal) for two boxes whose bounds overlap;
  `contactsOf` now skips it, so `felt` never sees a zero normal.
- **M2.** `hover` is written out: `-gravity.y * dt`.
- **M3.** Builder's calls 10 (the template lists eight numbers, not the spec's "every number") and 11 (the template's
  journey ends at the spark, not a door) depart from the spec's words, each with its reason. Both reasons hold; the
  stage 4 summary reports them as deviations.
- **M4.** The spec's Tuner journey belongs to the Feel editor, not Task 19; said in the Handoffs.
- **M5.** Task 14's pictures go into the review artifact at the five sizes in the Owner's format, saying plainly that
  the halves are the final look and the game's art is still boxes, not only onto `ci-screens`.

## Checked and found right

- `createGameSim`'s plugin order: `movesPlugin` after `touchPlugin` and before the game's own fits `game-sim.ts`, and
  `create-sim.ts` (587 lines) is untouched.
- The phases: `physics.sync-out` (postPhysics) before `level.moves` (gameplay), so `Touching` and `Body` are this
  tick's; what the step writes reaches Rapier in the next `physics.sync-in`.
- The step's tick counts: ledge grace (`canStand` before the decrement) jumps 6 ticks after the ground and not 7;
  early press (`earlyPress + 1`) jumps on a landing 6 ticks after the press and not 7; a press and lift inside one
  tick jumps and is cut on the next, a short jump (Review Focus 1).
- `poll` sends a command only when what is held changes, so a `drain`-only press (a flick's `dash`, a tap inside one
  tick) is held for one tick and `wasPressed` sees it once.
- `DEFAULT_HERO_CONTROLS` passes today's `checkControls`: no reserved key (`Escape`, `Tab`) or button (`start`,
  `home`), no key or button on two actions, every action with `shared` keys, `west` and `r2` are known names.
- `heroParts` is what both `spawnLevel` and `join` use, so adding the move state there gives a joining hero the same
  parts.
- `Listed.hero` exists for Task 1's "only the hero" check; `ticks()` exists for Task 3's buzz.
- No new dependency; no file goes over 600 lines on the plan's own counts.

## For other plans, not fixed here

- **Plan F (the feel runtime):** to be specced and planned; see above.
- **Editors Task 19's amendment:** takes the Handoffs as they now read.
- **Plan U:** the two toggles in a `touch` section, and Pause stacked over the halves outside the mount (I5's test is
  its proof).

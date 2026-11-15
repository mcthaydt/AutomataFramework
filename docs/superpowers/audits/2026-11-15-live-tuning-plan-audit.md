# Plan G (live move numbers and the jump's path): plan audit

Stage 3 of Cycle 9, 2026-11-15. The plan is
[`plans/2026-11-15-live-tuning.md`](../plans/2026-11-15-live-tuning.md) (pull request 107); its spec is the Feel editor's,
in AutomataFrameworkEditors (pull request 30, with its Q4 amendment in pull request 35), "What Feel needs from the
framework", F1 to F3. Done with the project's audit prompt: "Audit all of your work for completeness, consistency,
cohesion, and harmony, both within itself and relative to the spec and relative to the codebase. Assume nothing.
Verify everything. Investigate any incomplete implementations or incomplete integrations. Do your best work."

Plan H is not on `main` yet, so the plan's every name was checked against plan H's branch as it stands
(`claude/project-thread-wgynlp`, pull request 101, head `fb4ad08`). Nothing was run: this stage reads documents and
code.

**Verdict: sound, with three important fixes and seven small ones, all made in the plan in this pull request.** The
plan's central call, a tune as a command and a resource joined only to a sim made `tunable`, is the right one: it keeps
every golden, keeps the one-owner law (the sim alone changes the hero), and is the only shape under which a tuned play
can still be recorded and restored. No Owner question is open.

## Findings

| # | Weight | Finding | Fix (made in the plan) |
|---|---|---|---|
| I1 | Important | The plan says a tuned play "is still recorded, saved, restored and replayed like any other", but only tests a replay checked inside the test. `automata replay` (`src/features/cli/replay.ts:126`) and `watchReplay` (`src/features/game/watch.ts:66`) make their sim from the content and the replay's `meta` (level and players only, `game.ts`'s recorder), with no `tunable`. A recording with a `tune` would then have another schema hash ("the rules changed") and its command would be dropped as `unknown-command`. | `startGame` writes `meta.tunable = "true"` when started with `tunable`; `cli/replay.ts` and `watch.ts` pass it on to `createGameSim`. Two tests in Task 4 and one under `tests/features/cli/`. A replay without the key plays as before. |
| I2 | Important | Task 3's test "has the schema hash of `tests/golden/moves.json`": that golden holds `ticks`, `finalHash` and `checks`, not a schema hash, and on plan H's branch it is still the empty placeholder `{ "ticks": 0, "finalHash": "", "checks": [] }` until plan H's CI records it. | The test now says the plain sim refuses the command as `unknown-command` and its `schemaHash` differs from the tunable sim's; that the plain sim did not change is plan H's `moves.parity.test.ts`, untouched and green. |
| I3 | Important | Task 1's list of names the headless entry must export includes `heroControls`. It lives in `src/features/input/hero-controls.ts`, the `input` feature, which `src/headless.ts` does not re-export because it needs a page. The names test would fail, or tempt the builder to pull `input` into the headless entry. Feel does not use it (it builds its list from `DEFAULT_HERO_CONTROLS`). | Taken off the list, with the reason. Every other name on the list was found on plan H's branch (`tuningNumbers` in `content/tuning.ts`, `usesMoves` in `level/uses.ts`, `RESERVED_KEYS`, `RESERVED_PAD`, `PAD_BUTTONS`, `PAD_STICKS` in `commands/pad-names.ts`, `MAX_ACTIONS` in `commands/players.ts`, `stepMoves`, `MOVE_START`, `MoveInput`, `MoveSwitches` in `level/move-step.ts`, `MOVE_EVENTS` and `Moves` in `level/moves.ts`). `stepMoves`, `MoveInput` and `MoveSwitches` are not yet re-exported by `level.ts`, as Task 1 Step 4 expects. |
| I4 | Minor | The tracker section is "Cycle 8", "the sound formats took Cycle 7". On `main` Cycle 7 is plan U; plan F's branch (pull request 111) also names itself Cycle 8; plan M (112) and plan R (109) both name themselves Cycle 7. | Plan G is Cycle 9 here and in the plan. The clash among the other branches is reported to the coordinator for the merge session; this pull request cannot settle another branch's number. |
| I5 | Minor | The parity test was to use the moves fixture's `level-2`, "if its floor is too short, a level made in the test". `level-2` is 16 tiles wide with the start at x 5.5 (`tests/fixtures/moves/level.ts`). The plan's own case, `walk-speed` 10 with `jump-speed` 20, is about 1.33 seconds in the air, about 13 tiles across, so it hits the wall. | The parity test always uses a level made in the test: a flat floor 48 tiles long, walls at both ends, the start at x 3. |
| I6 | Minor | The order inside a tick: `level.moves` runs in the `gameplay` phase, after `physics` (`sim/definitions.ts` `PHASES`), so the speed it sets is moved by the next tick's physics. The plan's loop (the step, then gravity, then the place) is that order seen from the step, so it agrees, but the unit test's exact numbers (2.3 up, 4.7 across, 48 points) are sums made by the plan, not measurements. | When the parity test is green and a unit number differs from it in the second decimal, the unit test takes the parity test's number and says so. Not a stop. |
| I7 | Minor | The likeliest parity gap is the dash: `move-step.ts` notes that ground friction takes about a quarter of a tile a second off each tick, and a dash along the floor meets it, while `jumpPaths` has none. Ten ticks of it is about 0.04 tiles, close to the 0.05 allowed. | Named in Task 2 so the builder looks there first; the stop rule stands. |
| I8 | Checked | `level.tune` in the `input` phase: `createSim` puts every input system after `commands.apply` itself (`create-sim.ts:232`), and `ctx.commands.of(...)` hands commands over by source, then `seq` (`commands/players.ts:66`), so "the last of the tick wins" is the highest `seq`. A command with `source` 0 is ignored by the controls system (`players.ts:71`). `GameOptions` extends `GameSimOptions`, so `tunable` reaches `startGame` with no new option type. `'tune'` is a valid command id. A plugin's `config` is in the schema hash (`definitions.ts`), so `{ tunable: true }` keeps a tunable snapshot out of a plain sim. | None needed. |
| I9 | Minor | Plan F (pull request 111) changes the same loop `step` in `game.ts` (its `hold`, `held` and `draw(alpha, ms)`), and a freeze holds steps the way a pause does. The plan said what a tune does while paused, not while frozen. | A tune during a freeze lands on the first step after it; the plan built second is rebased on the first. |
| I10 | Minor | `jumpPaths` takes `gravity`, and the editors play with the framework's default (30) because they never see a game's code. A game whose code passes its own `gravity` to `startGame` would see its jump drawn and tuned for 30. | The README paragraph says so. A gravity in content is not asked for and is not added. |
| I11 | Note | AutomataFrameworkEditors also has a "plan G" (the 2D figure builder, its pull request 36). Plan letters are per repo; in reports, say "the framework's plan G". | None in the plan. |

## Checked against the spec

- **F1** (numbers changed while playing, from the next tick, offline only, nothing reset, a game never calls it, no
  golden moves): Tasks 3 and 4; the online exclusion is now in the type as well as in the call.
- **F2** (the jump's path from `stepMoves`, never its own maths, in tiles, with the reach up and across, an air jump and
  a dash's length): Task 2. The only sums beside `stepMoves` are one tick of gravity and the place, held to the real
  sim by the parity test. The wall jump's height and the air jump's `rise` are beyond the spec, and the Feel spec's
  slider table uses them ("with its height").
- **F3** (`MOVE_NUMBERS` and the hero's actions exported from the headless entry): Task 1. `MOVE_NUMBERS`'s values
  agree with the Feel spec's table (walk 6 tiles a second; `walk-grip` 3 ticks; `air-grip` 6; `jump-speed` 12, 4 to
  30; `jump-cut` 0.5, 0.1 to 1, step 0.05; `ledge-grace` and `early-press` 6; `dash-ticks` 10; `wall-jump-lock` 8;
  `dash-rest` 30). The predicted reach agrees with the sums: 12² / (2 × 30) is 2.4 tiles up before the tick's rounding,
  0.8 seconds in the air is 48 ticks and 4.8 tiles at 6 a second, a dash of 18 for 10 ticks is 3 tiles.
- **F4** stays plan F's, as the spec says.

## Progress

Stage 3 done: Cycle 9 is at 12%. Stage 4 waits for plan H (pull request 101) to be merged, as the plan says.

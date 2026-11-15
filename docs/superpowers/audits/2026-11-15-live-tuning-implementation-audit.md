# Plan G (live move numbers and the jump's path): implementation audit

Stage 5 of Cycle 11, 2026-11-15. The build is pull request 122 (branch `claude/project-thread-nhh28u`, head `5a71d51`),
against [`plans/2026-11-15-live-tuning.md`](../plans/2026-11-15-live-tuning.md), its
[plan audit](2026-11-15-live-tuning-plan-audit.md), and the Feel editor's spec in AutomataFrameworkEditors
([`2026-11-15-feel-editor-design.md`](https://github.com/mcthaydt/AutomataFrameworkEditors/blob/main/docs/superpowers/specs/2026-11-15-feel-editor-design.md),
F1 to F3). Done with the project's audit prompt: "Audit all of your work for completeness, consistency, cohesion, and
harmony, both within itself and relative to the spec and relative to the codebase. Assume nothing. Verify everything.
Investigate any incomplete implementations or incomplete integrations. Do your best work."

Nothing was run here: this stage read the diff, the code it touches and the CI run of `5a71d51` (run 43669959375).
Every required check on that head is green: `check`, `package`, `engines` (Chromium, WebKit, Firefox), `online`,
`create-pack`, `create-play`, `create` on three systems and `commit-authors`. `screens` was cancelled; it is not a
required check and waits on the `ci-screens` group.

**Verdict: sound, and ready to merge once the two important findings are fixed.** The central shape is as planned and
as the plan audit checked: a tune is a `tune` command with `source` 0 that a `level.tune` system writes into the
`level.tuned` resource, and all three join the `moves` plugin only when the sim is made `tunable`, with
`config: { tunable: true }` putting it in the schema hash. A plain sim is byte for byte the one it was, no golden is in
the diff, and the online game is kept out both in the type (`OnlineOptions` omits `tunable`) and in the call
(`tunable: false`). Two important findings are tests the plan asked for and the build does not have; the rest are small.
No Owner question.

## Findings

| # | Weight | Finding | Fix |
|---|---|---|---|
| I1 | Important | The plan audit's I1 fix is in the code but held by nothing. `cli/replay.ts:133` and `watch.ts:74` pass `tunable` on when `replay.meta.tunable === 'true'`, but no test plays a tuned recording through either. Plan Task 4 names "the `automata replay` test under `tests/features/cli/` (a recording with a `tune` and `meta.tunable` verifies)"; `git grep tunable tests/` finds only `tune.test.ts`, `tune.browser.test.ts` and `readme.test.ts`. If either line were lost, the Feel editor's recorded plays would read as "the rules changed" and drop every tune, and CI would stay green. | Add the CLI test the plan names (a recording made by a tunable sim, with a `tune` and `meta.tunable`, verifies through `automata replay`; the same recording without the key does not). Add one `watchReplay` browser test: a tuned recording plays to the recording's last hash. |
| I2 | Important | `jumpPaths().wallJump.up` is not held to the real sim. The parity test covers the jump, the air jump and the dash; the wall jump's height comes from `wallRise` (`jump-path.ts`), which starts beside a wall for one tick with `dir` 0, and nothing checks that the real hero leaving a real wall rises that far. The Feel spec's slider table shows it beside `wall-jump-up` ("with its height"), so a wrong number would reach a person as fact. The spec's F2 is "uses `stepMoves`, never its own maths", held to the sim. | One more case in `jump-path.parity.test.ts`: on the flat level, the hero falls against the left wall with `wallJump` on, presses jump, and its highest feet above where it left the wall are within 0.05 of `wallJump.up`. If it cannot agree, stop and report, as the plan's builder's call 5 says. |
| M1 | Minor | "A tune resets nothing" (`tune.test.ts`) tunes to the numbers the file already has (the moves fixture's tuning is the framework's values), so it shows that an identical tune is a no-op, not that a tune which changes numbers leaves the hero's place, speed and memory alone on the tick it lands. The browser test "tune keeps the hero where it is" checks only a standing hero's place over two frames. | Tune to different numbers (`jump-speed` 20, `walk-speed` 9) at a tick where the hero is walking in the air, and check on that tick that its `Transform` equals the untuned sim's (physics runs before the step) and that its `Moves` memory that numbers do not set (`face`, `airJumps`, `dash`, `lock`, `rest`) is unchanged. |
| M2 | Minor | `airJump.rise` differs from the plan's words. The plan: "How much higher one air jump takes it than the jump alone". The code and its doc: every air jump (`air.up - jump.up`, with all `airJumps` pressed). With `air-jumps` 3 the Feel note would say the total. | Either is defensible; the total matches `airJump.up`. Keep the code, and say in the handoff to the Feel plan that `rise` is all the air jumps together, so its note does not read it as one. |
| M3 | Minor | `SUBSTEP_PULL = 5/8` rests on Rapier taking four substeps a tick, which is Rapier's default and nowhere set in `src/features/physics/`. A Rapier version that changed the default would move the drawn jump; the parity test would catch it, but the comment reads as if the framework chose it. | Say in the comment that four is Rapier's default (`numSolverIterations`), not ours, and that `jump-path.parity.test.ts` is what holds it. |
| M4 | Minor | The air-jump parity case hard-codes its let-go and press at `T + 23` and `T + 24`, which are right only for the framework's numbers, and checks only the height, not where it lands. | Take the press tick from the path itself (the first point after the top), and also check `airJump.across`. |
| M5 | Note | The air-jump path lets go on the last tick the hero is still rising, so `jump-cut` applies to a speed under one tick's pull. It costs under 0.005 tiles of height, inside the parity allowance; the doc's "a hero that does everything right" is a hair generous. Recorded as the build's ruling in the tracker; no change asked. | None. |
| M6 | Note | A recording whose `meta.tunable` is `"true"` on a game whose hero has no `moves` (only possible by hand) makes `createGameSim` throw. `automata replay` reports it as that recording's problem; `watchReplay` throws a plain `Error`, not a `WatchSetupError`. The game repo's watch mode already treats any failure as "no recording", so nobody sees it. | None now. |

## Checked, and right

- **No golden moves.** No file under `tests/golden/` or `template/replays/` is in the diff. The plain sim's plugin has no
  `config`, commands or resources it did not have (`moves.ts:138-140`), so its schema hash is unchanged, and
  `moves.parity.test.ts` is untouched and green in four engines.
- **Determinism.** A tune is input: recorded, in snapshots (`level.tuned` is a resource), and checked by schema. The
  last tune of a tick is the highest `seq` (`ctx.commands.of(...).at(-1)`; the sim hands commands over by source, then
  `seq`). `level.tune` is in the `input` phase, before `level.moves` in `gameplay`, so a tune on a jump's tick is the
  numbers that jump leaves with (tested, with `hero.jumped` said once). Every value is held again by `moveNumbersOf`
  inside the sim, so a hand-made `jump-speed` 99 plays as 30 (tested). Zod 4.6.6's `z.number()` refuses `NaN` and
  `Infinity`, and seventeen values are refused as `invalid-payload` (tested). `tunedNumbers` keeps its answer by the
  resource's array; a restore makes a new array, so the answer is worked out again from the same values.
- **The page's half.** `game.tune` keeps only the latest values and the loop's next step sends one command, numbered
  from the game's one `createSequence`, before the players' commands; while paused the loop does not step, so a tune
  waits for `resume` (tested). Not tunable, it throws the plan's sentence; after `stop` it does nothing (tested).
  `meta.tunable` is written only when tunable (tested both ways).
- **`jumpPaths`.** Pure, frozen, over `stepMoves` with one tick of gravity: the speed gains the whole pull, the place
  the speed it began with plus 5/8 of the pull (four substeps), which the parity test showed to within 0.05 tiles in
  four engines. The corrected numbers (2.375 up, 4.8 across, 49 points with the press) are the parity test's, as the
  plan audit's I6 allowed, and the tracker says so. Every number at both limits, all switches on, ends inside 1200
  ticks on the floor (tested), as do `jump-speed` 30 with three air jumps and `fall-speed` 5 (Review Focus 5).
- **F3, the names.** The headless entry exports every name on the plan's list (`tests/public-surface.test.ts`, values by
  `toHaveProperty`, types by a typed tuple the compiler checks), and `heroControls` is rightly left off.
- **The API.** `docs/api/framework.api.md` gains exactly the new names (`moveNumbersOf`, `jumpPaths` and its four types,
  `DEFAULT_GRAVITY`, `stepMoves` and its four types, `TuneCommand`, `Tuned`, `tuneCommand`, `tunedNumbers`,
  `Game.tune`, `GameSimOptions.tunable`, `OnlineOptions`' omit), and `TuneCommand`'s `typeof tunePayload` is the same
  form as `ControlsCommand`'s. A `patch` changeset. The README paragraph names `tunable` once, with the editors' use,
  the tuning file and the gravity note (plan audit I10), held by `readme.test.ts`; the skill has the plan's line.
- **Deviations the build reported,** all with reasons in the tracker: the browser tests are in `tune.browser.test.ts`
  (their game is the moves fixture); the air jump is pressed after a one-tick let-go (a press is an up-to-down change);
  the substep correction and its numbers. The first test uses `jump-speed` 16, not the plan's 20; it tests the same
  thing.

## Progress

Stage 5 done: two important fixes and four small ones for stage 6. The tracker row is left to the fixes commit on pull
request 122, which already rewrites Cycle 11's rows, so the two pull requests do not collide.

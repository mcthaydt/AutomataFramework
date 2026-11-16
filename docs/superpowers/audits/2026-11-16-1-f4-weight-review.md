# F4 weight: lane 2 review, cycle 1

- Pull request: AutomataFramework #205, branch `claude/project-thread-n9k62h`
- Commit examined: `9f30f9077511b5338bacc2f933d0bc016f2593cd` (base `ef2e624`)
- Written: 2026-11-16 20:44 UTC
- Brief: the owner's 2026-11-16 handoff ("F4, a character's weight is the thing's Rapier mass") and Task F4 of the World
  editor plan.
- Result: **1 red, 4 notes.**

## What was checked, and how

| Criterion | Result | Evidence |
|---|---|---|
| A game that names no weight hashes exactly as before | Holds | No file under `tests/golden/` or `template/replays/` changed except the new `weight.json`. `pnpm test:node` at 9f30f90: 262 files, 2688 tests passed, every existing golden included. `Mass` is registered only when `usesWeights` is true, and no existing component gained a field. |
| No new dependency | Holds | `package.json` and `pnpm-lock.yaml` are untouched; `setMass` is Rapier 0.21.0's own. |
| The API report comes from the `package` job | See red 1 | The report's content is right: `pnpm build && pnpm schemas --check && pnpm api-report` (the `package` job's steps) pass locally at 9f30f90. No `package` job has run on this branch yet. |
| The check refuses a missing value, a switch, a `least` of 0, a fixed body | Holds | `tests/features/content/character.test.ts`, one plain sentence each. A thing's own value below `least`, off the step or 0 is already refused by the level check (probed: 0, -1, 0.25 and 0.7 each refused with a sentence). |
| Each thing weighs its own value or the default; two crates differ | Holds | `tests/features/level/weight.test.ts`. |
| Snapshot then restore mid-push equals an uninterrupted run | Holds | The parity test covers 4 kg. Probed further: 0.5, 1.5, 2.5, 3 and 7.5 kg are also hash-equal after a restore at tick 60. |
| `colliderMatches` compares `collider.mass()` with `===` | Safe | Probed every step value from 0.5 to 20 and 0.1, 0.3, 0.7, 1.1, 1.2, 2.3, 3.3, 9.9 on three box sizes: Rapier's `mass()` returns the f32 given to `setMass` exactly, so no weighed collider is rebuilt each tick. |
| Hashes equal in Node, Chromium, WebKit and Firefox | Not yet known | `weight.parity.test.ts` is in the browser include list (`vitest.config.ts`). The `ci` runs for 7bb3fbd and 9f30f90 were still queued or pending at 20:42 UTC, so no browser has run it. |
| Typecheck, lint | Pass | `pnpm typecheck` 0 errors; `pnpm lint` has 2 warnings, both in `tests/workflows/` files this change does not touch. |

Graphify (index at `f8780ee`): `characterParts` has two callers, `spawnContents` (level things, which carry `values`)
and `heroParts` (a hero, whose start carries none, so a weighed hero gets its default; correct). `colliderMatches` is
called only from `PhysicsWorld.syncIn`, where a mismatch rebuilds the collider. `rapier.ts` has no directly linked
tests; the new level tests and the parity test reach it through `createGameSim`.

## The plan number the implementer changed

The plan asked that a 4 kg crate move less than half as far as a 1 kg one over 120 ticks. The implementer tests 1, 4
and 8 kg at 60 ticks, with 8 kg under half of 1 kg. Measured here, the crate's distance from its start (room 1):

| Weight | tick 40 | tick 60 | tick 80 | tick 100 | tick 120 |
|---|---|---|---|---|---|
| 0.5 kg | 1.48 | 3.38 | 5.00 | 5.01 | 5.01 |
| 1 kg | 1.38 | 3.22 | 5.07 | 5.00 | 5.00 |
| 2 kg | 1.19 | 2.93 | 4.67 | 5.00 | 5.00 |
| 4 kg | 0.88 | 2.39 | 3.92 | 5.00 | 5.00 |
| 8 kg | 0.47 | 1.49 | 2.59 | 3.70 | 4.82 |

The change is sound and disclosed in the pull request. At 120 ticks every weight up to 4 kg has reached the gate 5
tiles on, so no weight could pass the plan's test there; that is the fixture's room, not the physics. At 60 ticks the
order is strict (heavier is always pushed less far) and 8 kg moves 46% as far as 1 kg, so the test still holds the
"less than half" bar the plan set, at a weight that reaches it. What the numbers also show is note 1.

## Findings

### Red 1: the API report's source is stated as the package job, which has not run

UNIT: commit 9f30f90's message and the pull request description.
VERDICT: red
REQUIREMENT: the brief ("the API report comes from the package job"); CLAUDE.md "Report honestly" (say what ran).
REASON: the commit says "the diff is the one the package job printed", but no `package` job has run on this branch,
and the description still lists the API report under "Still to do on this PR" after 9f30f90 added it.
EVIDENCE: `gh api .../actions/runs?branch=claude/project-thread-n9k62h` lists two `ci` runs, for 7bb3fbd (queued) and
9f30f90 (pending), and neither has a `package` job result. Run locally, the `package` job's commands pass at 9f30f90, so
the report's content is very likely right; its claimed source is not.
EXPECTED: the report is confirmed by the `package` job on this branch, and the description says what ran.
FIX: once `ci` runs, confirm `package` is green on the fix commit (if it prints a different report, commit that one);
then edit the description: drop the "Still to do" item and say the report was written with `pnpm api-report --update`
and matched by the `package` job at commit <sha>. No force-push to reword the commit. Files: the pull request
description, and `docs/api/framework.api.md` only if the job's output differs.

### Note 1 (carry to E4): weight changes the push only mildly below 8 kg

The hero sets its own speed each tick, so the crate's weight only slows the push. Over one second, 4 kg is pushed 74%
as far as 1 kg, and everything up to 4 kg reaches the gate within about 1.7 seconds. E4 finds the crate's `most` by
trying 4 first, so `most` will very likely stay 4, and "How heavy" from 0.5 to 4 will feel like a small change to a
player. Not a defect of F4; E4's brief should know this before it picks its numbers.

### Note 2: the parity golden is mostly a crate at rest

`tests/golden/weight.json` runs 4 kg for 120 ticks, and the crate reaches the gate at about tick 90, so the last 30
ticks record a stopped crate. The checkpoint at tick 60 is mid-push, so the test still covers the moving case. Fine as
it is; 8 kg would keep it moving the whole way if the golden is ever re-recorded.

### Note 3: `commit-authors` fails on the description's footer

The check fails at 9f30f90 because the description ends with the tool's "Generated by Claude Code" line rather than
"Requested by **McThayDT**". Known: the owner's local session strips that footer. Not a finding against the code.

### Note 4: the plan's file list named `src/index.ts` and `src/headless.ts`

Neither changed. `Mass`, `mass` and `usesWeights` reach both surfaces through the existing re-exports of `physics.ts`
and `level.ts`, as the API report shows. Nothing to fix.

## Not reviewed here

The four-engine parity result and the rest of the full run, pending in CI. The Editors' character editor writing
`weight` back is out of this change's scope.

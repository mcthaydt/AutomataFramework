---
name: stage-workflow
description: Use only for big or risky work (a new feature or format, the public surface, the sim's determinism, a slice's editor work, a closed-lane change), when it is split into stages (spec, plan, build, review, fixes). Small, easy-to-undo work skips this and follows docs/rules.md "How to work".
---

# Stages, for big or risky work

Most work never comes here: the default in `docs/rules.md` is one session that keeps working until there is
something to approve. Split work into stages only when a wrong guess would be expensive to undo. Models and effort
are in `docs/rules.md`; never above high.

| # | Stage | Writes | Done when |
| --- | --- | --- | --- |
| 1 | Spec, with the Owner (superpowers brainstorming) | `docs/superpowers/specs/<date>-<topic>-design.md` in AutomataFramework | it names the principle it serves; the Owner agreed to the product choices in it |
| 2 | Plan (writing-plans), the current slice only | `docs/superpowers/plans/<date>-<topic>.md` | every task lists its files, the check that proves it, and what it reads from the tasks it waits for |
| 3 | Plan audit, only when the plan touches a format, the public surface, the sim or a closed-lane file | `docs/superpowers/audits/<date>-<cycle>-plan-audit.md` | its findings are fixed in the plan |
| 4 | Build (executing-plans) | code and tests, one draft pull request per plan part | every task's check passes in CI |
| 5 | Review, only when `lane.mjs` prints `audit: needed`: lenses side by side, then one fix session | see the `review-graph` skill | CI green, no open finding but stuck or `owner choice` ones |
| 6 | The Owner sees the finished result | | the Owner's yes; tweaks are targeted fixes, no new cycle |

## Handoffs

- Each stage's doc is a docs pull request that merges on green, with no Owner step, so the next stage reads it from
  `main`. A stage may start from an open stage branch when it reads that branch's file and says so; nothing waits on
  a merge it doesn't need.
- `docs/superpowers/progress.md` holds one line per open task; finished work moves to `history.md`.
- A stage that hits a decision only the Owner can make asks on a decision card and keeps working on the rest.

## Planning

The plan decides which tasks exist and which wait. Read `docs/constraints.md` first and put each line that applies
into the tasks it shapes.

- **A task waits for another only if it reads that task's output**, and the plan names the thing that passes (a
  function, a format, a file). Tasks with nothing to name run side by side.
- **Gate first.** A task that makes a job that will repeat writes its failing check before the job.
- **Fixed steps are scripts.** Merging, ranking, deduplicating and before-and-after compares are code, never a step a
  model judges.

## Building

- Write the failing test first and see it fail for the right reason (run that one test locally), then make it pass.
  `node .claude/tools/scope.mjs start <task> <files...>` can hold the session to the task's files.
- Open the pull request as a draft, batch pushes, and mark it ready when the work is done. Only a green full run
  merges.

## The audit prompt

"Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the
spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or
incomplete integrations. Do your best work."

A review lens uses it with its own lens, writes only the findings table the `review-graph` skill describes, and
changes nothing.

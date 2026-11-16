---
name: stage-workflow
description: Use when starting or running a stage of a feature or editor slice (spec, plan, plan audit, build, review, fixes): which model and effort, what to read, what to write, and the prompts each stage uses.
---

# The stages of a piece of work

Each stage is a fresh session on its own branch, and its handoff is committed docs. Every stage reads the spec, the
plan, the audits and its repo's `docs/superpowers/progress.md`, updates its line there with a percentage, and ends by
committing and pushing. Models and effort are in `docs/rules.md`; never above high.

| # | Stage | Writes | Done when |
| --- | --- | --- | --- |
| 1 | Spec, with the Owner (superpowers brainstorming) | `docs/superpowers/specs/<date>-<topic>-design.md` in AutomataFramework | it names the principle it serves; the Owner agreed in the thread |
| 2 | Plan (writing-plans), the current slice only | `docs/superpowers/plans/<date>-<topic>.md` | every task lists its files and the check that proves it |
| 3 | Plan audit (the audit prompt; skipped under five tasks) | `docs/superpowers/audits/<date>-<cycle>-plan-audit.md` | its findings are fixed in the plan |
| 4 | Build (executing-plans, the implementation prompt) | code and tests, one draft pull request per plan part | every task's check passes in CI |
| 5 | Review: lenses side by side, then one fix session | see the `review-graph` skill | CI green, no open finding but stuck or `owner choice` ones |
| 6 | Owner review of the finished result | | the Owner's yes; tweaks are targeted fixes, no new cycle |

## Building (stage 4)

- Write the failing test first and see it fail for the right reason, then make it pass. The task's listed files are its
  scope: `node .claude/tools/scope.mjs start <task> <files...>` holds the session to them.
- Open the pull request as a draft, batch pushes, and mark it ready for review when the work is done. Only a green
  full run is merged.
- A task that took twice what was planned, or a third failed fix for the same failure, stops: report it.

## The prompts

**Implementation prompt:** "Now implement precisely as planned, in full. Implementation Requirements: - Write elegant,
minimal, modular code. - Adhere strictly to existing code patterns, conventions, and best practices. - Include
thorough, clear comments/documentation within the code. - As you implement each step: - Update the markdown tracking
document and overall progress percentage dynamically."

**Audit prompt:** "Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and
relative to the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete
implementations or incomplete integrations. Do your best work."

A review lens uses the audit prompt with its own lens, writes only the findings table the `review-graph` skill
describes, and changes nothing.

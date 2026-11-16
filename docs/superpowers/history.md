# History

Finished milestones and their decision records, setup, rule changes, standing permissions, approved screens and lessons.

## Setup

- 2026-11-16: the workflow in `CLAUDE.md` and `.claude/skills/` (`review`, `release`, `visual-check`) installed
  from the Owner's rules text. Superpowers **7.0.2** (https://github.com/obra/superpowers, the version its
  `plugin.json` gives). Where its skills differ from these rules, these rules win:
  - `writing-plans` saves a separate plan in `docs/superpowers/plans/`; here the plan is part of the spec.
  - `writing-plans` and `executing-plans` offer subagent-driven development and a subagent final review; here there
    are no subagents unless the Owner says so, and the implementation audit is a fresh session (`review`).
  - `executing-plans` defers minor final-review findings; here the fix round fixes every in-scope finding.
  - `executing-plans` sets up a worktree and ledger; here a thread works on its own branch.
- Session tools (the coordinator, 2026-11-16): start a thread, message it, choose its model and effort: found. Archive: by resolving a thread (hidden, can be reopened).
- The earlier workflow's records were removed on 2026-11-16 (see "Archive" below); `git show <commit>:<path>` brings
  any of them back.

## Rule changes

- 2026-11-16, the Owner: a blind-judge round (step 4) at the end of each slice's design review in `visual-check`.
  Approved in the project thread ("add that"). Scope: this change only, made the same in all five repos, as
  AutomataFramework `docs/superpowers/specs/2026-11-16-blind-judge-design.md` describes. Later rule changes are lane 3
  as usual.
- 2026-11-16, the Owner: a slice retro at the end of every slice (`review`), the `commit-authors` check restored, and
  the first retro's rule edits. Approved in the project thread ("yes", then "lets do self improving after every slice
  actually"). Scope: this change only, made the same in all five repos, as AutomataFramework
  `docs/superpowers/specs/2026-11-16-slice-retro-design.md` describes. Later rule changes are lane 3 as usual.

## Standing permissions

- 2026-11-16, the Owner: the setup check, including first-time setup of these rules and the CI gate (lane 2). Scope:
  this repo's first install of this workflow. Later changes to the rules or CI are lane 3.
- 2026-11-16, the Owner: a deletion the plan called for that git can restore merges on green, with a before-and-after
  note.

## Approved screens

None yet.

## Lessons

None yet.

## Archive

- Before 2026-11-16: the earlier workflow's specs, plans, audits, tracker and history were removed in #196. They are at
  `d497868`: `git show d497868:docs/superpowers/<path>`.

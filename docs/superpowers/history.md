# History

Finished milestones and their decision records, setup, rule changes, standing permissions, approved screens and lessons.

## Setup

- 2026-11-18: superpowers **7.0.2**'s `test-driven-development`, `verification-before-completion`, `executing-plans` and
  `subagent-driven-development` read against the new verification rules (AutomataFramework
  `docs/superpowers/specs/2026-11-18-verification-design.md`, section 7). Where they differ, these rules win, and the
  differences are listed in `build` under "Superpowers' testing skills". `subagent-driven-development` is not used here
  (writers are threads); if it ever is, its task reviewer does not replace the implementation audit.
- 2026-11-17 03:58 UTC: restart. The apps kit (CLAUDE.md, skills `review`, `release`, `build`, `visual-check`, `staged-path`,
  `owner-updates`, `this-repo`, the compaction hook) installed again from the Owner's rules text; superpowers still
  **7.0.2**.
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
- 2026-11-16, the Owner: a layout sketch in the spec instead of pixel mockups before a screen is built (`visual-check`,
  "Before the build"). Approved in the project chat on 2026-11-16 at 19:57 UTC ("yes"). Scope: this change only, made
  the same in all five repos, as AutomataFramework `docs/superpowers/specs/2026-11-16-layout-sketch-design.md`
  describes. Later rule changes are lane 3 as usual.
- 2026-11-16, the Owner: a reminder after compaction that the rules file beats the summary (a `SessionStart` hook
  with the matcher `compact`), live state in a file, a fresh session per big job and spec writing in its own session.
  Approved in the project thread at 20:28 and 20:29 UTC, and on decision cards at 20:46 UTC. Scope: this change
  only, made the same in all five repos, as AutomataFramework
  `docs/superpowers/specs/2026-11-16-compaction-hook-design.md` describes. Later rule changes are lane 3 as usual.
- 2026-11-18, the Owner: verification. `CLAUDE.md` gets a short Verification section in place of the Tests and Lessons
  bullets, and `build` gets the full rules: run the change like a person through a new per-repo `verify` skill; journeys
  first, then property tests, then old-versus-new tests; test first, from the outside in, with superpowers' testing
  skills read under these rules; a flaky test fixed at its root in its own thread, or deleted with the reason written
  down; a change does not quietly edit its own check; lessons carry a trigger read from the diff; each retrospective
  prunes. A repo's own `verify` and `this-repo` skills take the lane of the code they describe. One edited alone is lane
  1, unless it changes what needs the owner. Asked for in the project thread ("Let's rethink how we do tests", with the
  Claude Code team's article on verification, and "We also need to evaluate how superpowers comes into the picture
  because that's tdd") and approved on decision cards on 2026-11-18 at 00:30 UTC ("Core rewrite" only; a property-test
  library and a commit verification stamp or gate declined) and at about 00:52 UTC ("Kits + 5 repos"; "Same lane as the
  code") and at about 01:52 UTC ("Lane 1, with a guard"). Scope: this change only, made the same in the two kits in
  McThayDT-Website and in RukenApp, AutomataFramework, AutomataFrameworkEditors, AutomataFrameworkExamples and
  AutomataFrameworkSite, as AutomataFramework `docs/superpowers/specs/2026-11-18-verification-design.md` describes.
  Later rule changes are lane 3 as usual.
- 2026-11-18, the Owner: the shared Verification text says the full suite runs in CI where `release` sets the gate,
  so a games kit gate that runs the smoke set is a stated case. Chosen on a decision card ("Merge now, reword later").
- 2026-11-18, the Owner: a plan's order is a claim that one unit waits on another, not a queue; independent units run side by side up to the writer limit (`staged-path`). Asked for in the coordinator thread.

## Standing permissions

- 2026-11-16, the Owner: the setup check, including first-time setup of these rules and the CI gate (lane 2). Scope:
  this repo's first install of this workflow. Later changes to the rules or CI are lane 3.
- 2026-11-16, the Owner: a deletion the plan called for that git can restore merges on green, with a before-and-after
  note.

- 2026-11-18, the Owner ("merge now, then fix all 12 after; then we do the test cleanup", then "man just finish this"):
  the verification change's follow-up round and the test cleanup merge on green and their required reviews without
  asking again. Scope: that job only (done 2026-11-18). Later work asks as usual.

## Approved screens

None yet.

## Flaky tests

None yet.

## Lessons

- TRIGGER: an audit, a fresh run or a change of a `verify` skill. CHECK: every step that reads or presses something
  waits for it first (a readiness signal, never a sleep); a step with no wait is red, however many runs it passed.
  BEHIND IT: AutomataFramework's verify took its first screenshot before the picker drew; six runs passed, the audit
  called it a note, and the next round failed 2 of 3 (fixed in d65db0c, 2026-11-18).

## Archive

- Before 2026-11-16: the earlier workflow's specs, plans, audits, tracker and history were removed in #196. They are at
  `d497868`: `git show d497868:docs/superpowers/<path>`.

# Plan audit, cycle 2: a reminder after compaction, live state in a file, a fresh session per big job

- Examined: AutomataFramework #204 at `96a8b84`, `docs/superpowers/specs/2026-11-16-compaction-hook-design.md`, and
  its diff from `c48a1ec` (the commit cycle 1 examined).
- Against: cycle 1 (`docs/superpowers/audits/2026-11-16-1-compaction-hook-plan-audit.md`), `CLAUDE.md` and the
  `review` skill, and `main` of all five repos as fetched at 2026-11-16 20:39 UTC (Framework `8fedc6c`, Editors
  `7239ba3`, Examples `9e0a954`, Site `138ee04`, Private `a4ffe8e`).
- Verdict: **not ready, 1 red, 4 notes.** Cycle 1's three reds are fixed. The one new red is a stale word left by the
  R2 fix; its fix is one word in this spec.

## Cycle 1 reds

- **R1, fixed.** The `.claude/settings.json` block, copied out of the spec and placed at `.claude/settings.json` on
  each CI repo's `main`, passes `npx @biomejs/biome@2.5.15 check .claude/settings.json` (exit 0, "No fixes applied")
  in Framework, Editors, Examples and Site; 2.5.15 is the version every `biome.json` names. It parses as JSON, and its
  command, run with `CLAUDE_PROJECT_DIR` set to the repo root, prints `.claude/after-compaction.md` unchanged. No repo
  has a `.claude/settings.json` on `main` yet, and no `.gitignore` excludes `.claude/`. Criterion 2 now checks it.
- **R2, fixed.** "The live-state heading" section is gone, Boundaries no longer lists `progress.md`, and criterion 6
  now says no pull request edits it. One leftover word remains: see R4.
- **R3, fixed.** Live state is one file per branch, `docs/superpowers/live/<branch>.md` with "/" written as "-",
  deleted in the pull request's last commit before the merge. The **Live state in a file.** bullet, the reminder's
  item 3, Boundaries, the Writing-bullet edit, check 4 of the test and criterion 6 all name the same place. The new
  files match the CI docs-only filter `docs/.+\.md`, so they add no test runs.

## Cycle 1 notes

All eight are handled: Plan 2 lists only what is still open (Editors #99, spec #203 and Private #14 are open now;
Framework #202 and Examples #67 merged) and says the Framework build waits for a slot (#203, #204 and #205 are open,
the limit of 3); criterion 9 names criterion 4 as AutomataPrivate's stand-in; section 3 says the test imports only
`vitest` and Node's modules; "Who writes the spec" is open product decision 1; decision 2 says the coordinator is
asking; the history fallback is dropped. Note 8 needed nothing. Every phrase that section 2 rewrites still appears
exactly once in each repo's `CLAUDE.md` on `main`, and "Rule changes" exists in every `history.md`.

## Red

### R4. Plan step 3 still tells the build to add "the heading"

UNIT: "Plan", step 3.
VERDICT: red.
REQUIREMENT: acceptance criteria 6 ("no pull request edits `progress.md`") and 7 (the diff touches only the files in
Boundaries).
REASON: the step lists "the hook, the reminder, the rules, the heading and the history entry"; "the heading" was the
`progress.md` "Live state" heading that the R2 fix removed, so a build following the plan as written adds an edit
the criteria forbid.
EVIDENCE: `grep -n heading` on the spec at `96a8b84` finds only line 190, in Plan step 3; "The change" has no heading
section any more (its sections are 1 the hook, 2 the rules, 3 the check, 4 the history record).
EXPECTED: the plan's build steps match "The change" exactly.
FIX: in this spec only, delete "the heading" from Plan step 3 ("then the hook, the reminder, the rules and the
history entry").

## Notes

1. **The deletion commit comes after the audit and the approval.** The live file is deleted in "the pull request's
   last commit before the merge", but `CLAUDE.md` says every review, check and approval names its commit and "a push
   that changes what it covered makes it stale". If the build session deletes the file only at the very end, the
   implementation audit and the Owner's approval name an earlier commit. Say when it happens, for example: the build
   session deletes it in its last commit before handing the branch to the implementation audit, and a fix session
   recreates and deletes it again in the same way, so the commit the audit and the Owner see is the one that merges.
2. **The reminder does not cover the coordinator.** Item 3 sends every compacted session to
   `docs/superpowers/live/<your branch>.md`, but the bullet says the coordinator "keeps `progress.md` and needs no such
   file". A compacted coordinator reading the reminder would look for a file that does not exist. One clause in item 3
   ("the coordinator's live state is `progress.md`") would close it; the test's check 3 still passes.
3. **The Writing-bullet edit names no place.** "gains 'apart from each session's own live-state file in
   `docs/superpowers/live/`'" does not say where the clause goes, and since those files are neither `progress.md` nor
   `history.md`, "apart from" reads oddly. Since all five `CLAUDE.md` files must match, say the exact resulting
   sentence, for example "... while active; each session's own live-state file in `docs/superpowers/live/` is the
   exception, written only by that session".
4. **The audit file name.** As in cycle 1, this file follows the coordinator's `<date>-<cycle>-<topic>-plan-audit.md`.

# Plan audit, cycle 3: a reminder after compaction, live state in a file, a fresh session per big job

- Examined: AutomataFramework #204 at `90f8888`, `docs/superpowers/specs/2026-11-16-compaction-hook-design.md`, and
  its diff from `96a8b84` (the commit cycle 2 examined).
- Against: cycle 2 (`docs/superpowers/audits/2026-11-16-2-compaction-hook-plan-audit.md`), cycle 1, `CLAUDE.md` and
  the `review` skill, and `main` of all five repos as fetched at 2026-11-16 20:43 UTC (Framework `8fedc6c`, Editors
  `7239ba3`, Examples `9e0a954`, Site `138ee04`, Private `a4ffe8e`, the same commits cycle 2 used).
- Verdict: **ready, 0 red, 3 notes.** R4 and cycle 2's notes 1 to 3 are fixed, and the fix commit adds no new defect.

## Cycle 2 red

- **R4, fixed.** Plan step 3 now reads "then the hook, the reminder, the rules and the history entry", which matches
  "The change" (1 the hook and reminder, 2 the rules, 3 the check, 4 the history record). `grep -n heading` on the spec
  finds nothing.

## Cycle 2 notes

1. **Deletion timing, fixed.** The **Live state in a file.** bullet now says the session deletes the file "in its last
   commit before it hands the branch to the audit (or, with no audit, before the merge), so the commit the audit and
   the owner's approval name is the one that merges", and that a fix session writes it again and deletes it the same
   way. That agrees with the `CLAUDE.md` rule that a push changing what an audit covered makes it stale.
2. **The coordinator after compaction, fixed.** Reminder item 3 ends "The coordinator's live state is progress.md.",
   which agrees with the bullet's "The coordinator keeps `progress.md` and needs no such file". The test's check 3
   still passes (the reminder still names `CLAUDE.md`, `docs/superpowers/progress.md`, "beats the summary" and "fresh
   session"), and the longest reminder line is 118 columns.
3. **The Writing-bullet placement, fixed.** The edit now gives the whole old sentence and the whole new one. The old
   sentence ("The coordinator is the only writer of `progress.md` and `history.md` while active, including for
   delegated short-path work.") appears exactly once in each of the five `CLAUDE.md` files on `main`, so the edit lands
   the same everywhere.

Rechecked as well: every other phrase section 2 rewrites still appears exactly once in each repo's `CLAUDE.md` on
`main`; every `history.md` has "Rule changes"; no repo has `.claude/settings.json` on `main`; no line of the spec is
over 120 columns; Plan step 2's open pull requests (Framework #203, #204 and #205, Editors #99, Private #14) are still
the open ones.

## Notes

1. **Two paragraphs are not refilled.** In the **Live state in a file.** bullet, the line ending "A reviewer, which"
   (spec line 107) is short, and so is Plan step 3's line ending "bodies" (line 194): the R4 and note 1 fixes were
   edited in place without rewrapping. The spec says every edited `CLAUDE.md` paragraph is rewrapped to 120 columns,
   so the build should refill that bullet rather than copy the ragged line; the md5 check (criterion 1) still holds
   either way, since all five copies come from the same text. Not blocking; refill the spec's two paragraphs if it is
   touched again.
2. **The follow-up repo has an open rules pull request.** `McThayDT-Website` #67, "Games kit: rule changes from the
   game experiment", is open. When Plan step 7 runs, check whether it edits the games and apps prompts and wait for it
   as step 2 waits for #203 and #99. Outside this change; recorded for the follow-up.
3. **The audit file name.** As in cycles 1 and 2, this file follows the coordinator's
   `<date>-<cycle>-<topic>-plan-audit.md`.

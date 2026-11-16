# Plan audit, cycle 5: a reminder after compaction, live state in a file, a fresh session per big job

- Examined: AutomataFramework #204 at `14d6e89`, `docs/superpowers/specs/2026-11-16-compaction-hook-design.md`, and
  its diff from `ba1b61e` (`466f965` adds the cycle 4 audit; `1d6d741` and `14d6e89` change only the spec).
- Against: the cycle 4 audit (`docs/superpowers/audits/2026-11-16-4-compaction-hook-plan-audit.md`, reds R5 and R6
  and notes 1 to 5); the Owner's 20:28, 20:29 and 20:46 UTC answers as the spec records them; `CLAUDE.md` and the
  `review` skill. Audited at 2026-11-16T20:52Z.
- Verdict: **ready, 0 red, 1 note.** Both reds and all five notes are fixed; nothing new blocks.

## Cycle 4 findings, checked

- **R5, fixed.** Section 4's entry now lists "spec writing in its own session" with the other three changes and says
  "Approved in the project thread at 20:28 and 20:29 UTC, and on decision cards at 20:46 UTC", matching "Owner
  approval" (a).
- **R6, fixed.** Criterion 9 names its pieces: the three bullets and the Lane 3, table row 1, Writing and coordinator
  replacements of section 2 (section 2 has exactly those four replacements), the settings block against
  `.claude/settings.json`, and the reminder against `.claude/after-compaction.md` except the games kit's line 2 (5 B).
  It passes when the plan is followed and fails otherwise.
- **Note 1, fixed.** "Outcome" now names the five repos and the two kits; Plan step 5 says "six pull requests"; step 7
  says "as in 3 to 5". The remaining "five repos" uses (sections 1 to 4, criteria 1 and 9, Boundaries) mean the five
  repos and are right.
- **Note 2, fixed.** Expected duration is "about three hours", waiting on #67 named.
- **Note 3, fixed.** `McThayDT-Website` no longer appears; `mcthaydt-website` throughout.
- **Note 4, fixed.** 5 E says the test's name, ending `_under_360_lines`, changes with the limit.
- **Note 5, fixed.** Boundaries says the setup-check line (5 D) sits inside the two `body.md` files and is the
  exception to "not the three skills", which is about the five repos.

## Other checks

- No line of the spec is over 120 columns (`awk 'length>120'` finds none); `git diff --check ba1b61e 14d6e89` is clean.
- All three commits are authored and committed by McThayDT <107786093+mcthaydt@users.noreply.github.com>, with no
  Claude co-author or session trailer.
- The diff touches only the spec and the cycle 4 audit.

## Red

None.

## Notes (recorded, not blocking)

1. **The kits' folder picture.** 5 A adds `live/` to each kit's `docs/superpowers/` line in the folder picture, but
   section 2 does not make the same edit in the five repos' `CLAUDE.md`, so "their `CLAUDE.md` blocks follow the
   repos' text exactly" (5, first paragraph) is not quite true there. Criterion 9 does not cover the picture, so it
   still passes. Either add the same `live/` edit to section 2 (and criterion 2's "only the edits in 2" then allows
   it), or drop it from 5 A. This text predates `ba1b61e`; earlier cycles did not flag it.

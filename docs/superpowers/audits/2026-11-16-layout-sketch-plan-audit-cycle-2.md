# Layout sketch: plan audit, cycle 2

Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or incomplete integrations. Do your best work.

- Spec at `a04bafb` (pull request #203), against cycle 1 (`2026-11-16-layout-sketch-plan-audit.md`, commit
  `d70df63`). Three commits since then (`55ed28f`, `ebd318d`, `a04bafb`), all in the spec.
- Audited 2026-11-16 20:02 UTC.

## Verdict

Ready to implement: 0 red, 1 new note. The cycle 1 red and all four notes are fixed.

## Cycle 1 findings

| # | Verdict | Status at `a04bafb` | Evidence |
|---|---|---|---|
| 1 | red | Fixed | Roadmap edit 3 now rewrites rule 7's heading to "...after the shell and World mockups were approved.", which is history. Criterion 2 now allows rule 7, the slice 3 table row and section, and the Characters note, and still forbids any line that asks for a new mockup. Against `docs/roadmap.md` on `main`, every remaining mockup line (14 and 15 rewritten; 28, 39, 41, 48 and 82 edited; 81, 117 to 142 slice 3; 158 Characters; 160, 171, 182, 194 and 209 rewritten) is either edited or allowed, so the criterion can pass. |
| 2 | note | Fixed | A "Plan" section: the spec merges first, then the implementation branches start from `main` after #202, #99, #67, #51 and #13 merge. `CLAUDE.md` edit 3 says "as it reads once the slice-retro change has merged", and the history entry goes "after the slice-retro entry". |
| 3 | note | Fixed | The section says "in the spec, or on the short path in the pull request description". |
| 4 | note | Fixed | "A named difference also goes into the next update to the owner, with pictures of the sketch and the built screen, as 'Expose decisions' in `CLAUDE.md` asks; it is not a new approval gate." |
| 5 | note | Fixed | "Owner approval" gives 19:56 UTC and 19:57 UTC, and the history entry gives 19:57 UTC. |

## New findings

### 1

UNIT: spec, the quoted `history.md` entry.
VERDICT: note
REQUIREMENT: the spec's "Each edited paragraph is rewrapped to 120 columns."
REASON: The quoted entry wraps early ("...on 2026-11-16 at 19:57" / "UTC ("yes")..."). It's harmless, since the
implementer rewraps when writing it, but copying the quote line for line would carry the short line into five repos.
EXPECTED: The entry is written rewrapped to 120 columns in each `history.md`.
FIX: none in the spec. A note for the implementer and the implementation audit.

## Checked, no finding

- Every spec line outside the tables is within 120 columns.
- "Boundaries" is unchanged and still covers every file the change names. Plan step 4 checks criteria 1, 2 and 4 with
  `md5sum`, `grep` and `awk`, which can each fail on their own.

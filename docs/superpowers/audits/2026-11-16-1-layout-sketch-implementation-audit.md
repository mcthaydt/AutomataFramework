# Layout sketch: implementation audit, cycle 1

Written 2026-11-16 20:58 UTC by a fresh audit session, against the merged spec
`docs/superpowers/specs/2026-11-16-layout-sketch-design.md` (#203, merge `b9646f7`). Lane 3. Findings only; nothing
else on these branches was changed.

Commits examined (each is the head of its pull request and branches from its repo's current `main`):

| Repo | Pull request | Commit | Base (`main`) |
|---|---|---|---|
| AutomataFramework | #206 | `44233fb` | `b9646f7` |
| AutomataFrameworkEditors | #102 | `dd11d8a` | `eb60142` |
| AutomataFrameworkExamples | #68 | `53e92de` | `9e0a954` |
| AutomataFrameworkSite | #52 | `e9cf312` | `138ee04` |
| AutomataPrivate | #14 | `dfbadba` | `a4ffe8e` |

**Result: 2 red, 1 pending, 4 notes.** The text of every change matches the spec word for word; the reds are one
line-length gap the spec's own wording forces, and the missing criteria lists in the pull request bodies.

## Acceptance criteria

1. **Pass.** `md5sum` of `.claude/skills/visual-check/SKILL.md` at the five commits gives one hash,
   `572a86bd329b611be46c3acf46a2b248`. On all five `main`s the file was already one hash
   (`6321e7f1274870fa132caa4ec7a9dc81`), and each diff is the same 11 added lines: the new section, placed after the
   opening paragraphs and before "Before the next slice", word for word as the spec gives it.
2. **Pass, with note N1.** `grep -niE 'mock-?up'` over the five `CLAUDE.md` files, the five `.claude/skills/` folders
   and `docs/roadmap.md` finds the allowed lines (Editors' "Sketch first" bullet, its `docs/mockups/` and CI lines; the
   roadmap's rule 7, the slice 3 row and section, and the Characters "reference only" note) plus three lines the list
   does not name: "No pixel mockups" in the skill, "never a pixel mockup" in each `CLAUDE.md`, and "no pixel mockups" in
   roadmap step 2. No line asks for a new mockup to be drawn or approved before a build.
3. **Pass.** `git diff --stat` against each base: Framework touches the skill, `CLAUDE.md`, `docs/roadmap.md` and
   `history.md`; the other four touch the skill, `CLAUDE.md` and `history.md`. Nothing else.
4. **Fail, R1.** One added line is over 120 columns.
5. **Pending.** At 20:58 UTC the checks on Framework, Editors, Examples and Site were still queued or running (Private
   has no CI, by its rules). Not judged here; the merge session reads them at merge time.

The other edits were checked line by line against "The change": "Label layout sketches", "approving designs", the new
bullet after "Slices" (which already reads as the slice-retro change left it), Editors' "Sketch first", the roadmap's
steps 2 and 3, its "each later editor", rule 7, "Who does what", the table's row 3 and the four later-slice lines, and
the `history.md` entry under "Rule changes" after the slice-retro entry. All match.

## Findings

### R1

UNIT: AutomataFramework `docs/roadmap.md`, the table's row 3 (line 84 at `44233fb`).
VERDICT: red.
REQUIREMENT: the spec's acceptance criterion 4, "No edited line is over 120 columns."
REASON: the edited table row is 157 columns.
EVIDENCE: `git diff b9646f7 44233fb | grep '^+[^+]' | awk 'length($0)-1>120'` prints only `| 3 | Slices 4 to 8: ... |
the owner approves each finished editor | ...` at 157. A Markdown table row cannot wrap; it was already 148 columns
before the change, and the spec's own replacement wording makes it 157.
EXPECTED: the criterion holds, or the gap is named in the pull request so the Owner's yes covers it.
FIX: name it in #206's body: "Criterion 4: one edited line, the roadmap table's row 3, is 157 columns; a Markdown
table row cannot wrap, and it was 148 before." No file changes. Touches only #206's body.

### R2

UNIT: the five pull request bodies (Framework #206, Editors #102, Examples #68, Site #52, Private #14).
VERDICT: red.
REQUIREMENT: the `review` skill, "Checks and reviews": "Before a branch goes to an audit, its pull request lists each
acceptance criterion with the test that checks it, or says 'no test' and why."
REASON: no body lists the spec's five criteria or the command that checks each.
EVIDENCE: the bodies at the commits above have "What" and "Lane" sections only.
EXPECTED: each body lists criteria 1 to 5 with the check and its result (`md5sum`, `grep -niE 'mock-?up'`,
`git diff --stat`, the `awk` line-length check, the GitHub checks; Private: "no CI, by its rules").
FIX: add a short "Checks" section to each of the five bodies. Bodies only; keep the attribution lines first and
"Requested by **McThayDT**" last.

## Notes (not fixed here)

- **N1, the three lines that forbid mockups are acceptable.** Each is the spec's own required wording (the skill
  section, `CLAUDE.md` change 3, roadmap step 2), and each says not to draw one. Criterion 2's list left them out, but
  its test, "no line asks for a new mockup to be drawn or approved before a build", holds. No change.
- **N2.** Roadmap rule 7 now reads "comes after the shell and World mockups were approved" in its heading but "It is
  written once the shell and World mockups are approved" in its body. The spec changed only the heading and the last
  phrase, so this is as specified; a later edit could put the body in the past tense too.
- **N3, outside this change.** Roadmap step 6 names "the `visual-review` skill"; the repos' skill is `visual-check`.
  It was like that before this change.
- **N4, outside this change.** Roadmap step 6's third line is over 120 columns on `main`, unedited here.

# Layout sketch: plan audit

Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or incomplete integrations. Do your best work.

- Spec: `docs/superpowers/specs/2026-11-16-layout-sketch-design.md` at `f6ea002` (pull request #203, branch
  `claude/project-thread-s78w3i`, on `main` at `ef2e624`).
- The ask, read in the project chat: the Owner's "should we just skip the mockup moving forward? Just build it out then
  fix it with the review cycle or? Because we're not using figma or anything" (19:56:41 UTC), the coordinator's proposal
  to keep a quick layout sketch in each spec and drop polished mockups (19:56:45), and the Owner's "yes" (19:57:00).
- Read against `main` in all five repos: `CLAUDE.md`, `.claude/` and `docs/superpowers/history.md`; Framework's
  `docs/roadmap.md`; Editors' `.github/workflows/ci.yml`; and the open slice-retro pull requests (#202, #99, #67, #51,
  #13), which the Owner approved at 19:55 UTC.
- Audited 2026-11-16 20:00 UTC.

## Verdict

Not ready to implement: 1 red, 4 notes. The change matches the ask: a sketch in the spec, no pixel mockups, the look
settled by the review loop and the blind judge. Every text the spec replaces in `CLAUDE.md` and `visual-check`
exists. The red is the roadmap, where the spec's edits leave lines that its own acceptance criterion 2 forbids.

## What checks out

- "Label mockups, incomplete work and known defects clearly." and "approving designs or mockups" are in all five
  `CLAUDE.md` files. "- **Mockups first.** No editor code until the Owner approves that editor's mockups." is in
  Editors' only (line 349), as the spec says. The Slices bullet is in all five.
- `git grep -i mock-?up` over `.claude/` on `main` finds nothing in any repo, so `visual-check` gains the section
  and loses nothing. All five `visual-check/SKILL.md` files are identical on `main` (md5 `6321e7f1...`).
- Editors' other mockup lines (`CLAUDE.md:348`, `:361`, `:366` and the `mockups` CI job) concern the approved mockups
  that stay as reference, so leaving them is consistent with "Boundaries".
- Every roadmap string the spec replaces exists in `docs/roadmap.md` on `main`: the six steps (lines 14 and 15), "so
  each later mockup also follows", "every later mockup reads it first", "A mockup also goes through the visual review
  process.", "the owner approves each mockup", the Characters line, "is built when World's mockups cover it", and the
  four "Later: the ... mockups, through the visual review process." lines.
- No new tools, dependencies or spend. Lane 3 is right (rules files).

## Findings

### 1

UNIT: spec, "The change", `docs/roadmap.md`; acceptance criterion 2.
VERDICT: red
REQUIREMENT: acceptance criterion 2: `grep -niE 'mock-?up'` over the roadmap finds only "the roadmap's Done and Now
items for slice 3, and the 'reference only' note for Characters".
REASON: After the spec's edits, the roadmap still has mockup lines outside that list, so criterion 2 can't pass as
written. One of them is still a rule.
EVIDENCE: `docs/roadmap.md` on `main`:
- line 39, rule 7's heading: "**The design language comes after the mockups are approved.**" (only the end of rule 7
  is edited);
- line 81, the table's slice 3 row, "Who": "Agents; the owner approves the mockups";
- line 117, the slice 3 introduction: "Mockups of all five editors were drawn in three rounds; ...";
- lines 140 to 142, a **Next** item (not Done or Now): "the design review loop on every screen built in this slice, as a
  drift check against the approved mockups" and "`Scope: drift check against approved mockups`".
EXPECTED: Each line is either edited or allowed by name. Rule 7's heading is a standing rule, so it should be edited,
for example "**The design language comes after the shell and World mockups were approved.**", which is now history.
The rest describe slice 3, whose approved mockups stay the reference. Criterion 2's allowed list becomes "the slice 3
row of the table and the slice 3 section (World's approved mockups stay its reference)".
FIX: add the line-39 edit to "The change" and widen criterion 2's allowed list. Spec only.

### 2

UNIT: spec, "Plan" (there is no plan section) and "Lane and path"; overlap with the slice-retro pull requests.
VERDICT: note
REQUIREMENT: consistency with #202, #99, #67, #51 and #13, which are approved and about to merge. They edit the
same Slices bullet, the Settings "Rule edits" line and the "Rule changes" section of `history.md`.
REASON: Implementation branches cut from today's `main` will conflict on those lines. The spec also has no "Plan"
section, unlike the two rule-change specs before it.
EXPECTED: A short plan: merge this spec with its audit, then branch each repo from `main` after the five slice-retro
pull requests merge. The new "Screens start from a layout sketch" bullet goes after the Slices bullet as it then reads
("..., then a slice retro (see `review`)."), and the history entry goes after the slice-retro entry.
FIX: add a "Plan" section. Spec only.

### 3

UNIT: spec, the new `visual-check` section ("A brief or spec that adds or changes a screen carries a layout sketch").
VERDICT: note
REQUIREMENT: `CLAUDE.md` "The brief": on the short path, the brief is the Owner's request plus the acceptance criteria
written in the pull request.
REASON: On the short path there is no spec document, so it's unclear where the sketch goes.
EXPECTED: One clause: "on the short path, in the pull request description".
FIX: wording in the quoted section and its `CLAUDE.md` bullet. Spec only.

### 4

UNIT: spec, the new `visual-check` section ("a difference is a defect unless the pull request names it with a
reason").
VERDICT: note
REQUIREMENT: `CLAUDE.md` "Expose decisions": choices that affect the user experience are disclosed to the Owner.
REASON: With no mockup approval before the build, a built screen that departs from its sketch is decided by the
implementer, with only a reason in the pull request. Today's "Whole world" case went to the Owner, who chose the
build's place.
EXPECTED: A difference named in the pull request also appears in the coordinator's update to the Owner, with the
pictures, as "Expose decisions" asks. No new approval gate.
FIX: one clause in the section. Spec only.

### 5

UNIT: spec, "Owner approval".
VERDICT: note
REQUIREMENT: `CLAUDE.md` "Each approval is recorded with its scope".
REASON: The quotes are right, but the approval has no times. The two earlier rule-change specs gave them.
EXPECTED: "2026-11-16 19:56 UTC" for the question and "19:57 UTC" for the "yes".
FIX: wording. Spec only.

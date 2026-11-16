# Blind judge: plan audit

Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or incomplete integrations. Do your best work.

- Spec: `docs/superpowers/specs/2026-11-16-blind-judge-design.md` at `e49eaa1` (branch `claude/project-thread-1ffh06`,
  pull request #199). `7a7cb0d` was read too; `e49eaa1` only rewraps step 4 and says "the judge's brief".
- The ask: the Owner's "add that" (2026-11-16 19:13 UTC), replying to the coordinator's suggestion: "a single
  blind-judge round at the end of a slice would cover it without a full gauntlet". The coordinator's note adds: the
  judge compares our screens with a polished commercial product without being told which is ours, and the biggest gap
  it names becomes a fix.
- Read against: `.claude/skills/visual-check/SKILL.md`, `.claude/skills/review/SKILL.md`, `CLAUDE.md` and
  `docs/superpowers/history.md` on `main` in all five repos: AutomataFramework `f8780ee`, AutomataFrameworkEditors
  `e8693a7`, AutomataFrameworkExamples `c8dce50`, AutomataFrameworkSite `b47a38a`, AutomataPrivate `47a7637`.
- Audited 2026-11-16 19:17 UTC.

## Verdict

Not ready to implement: 4 red, 4 notes. The direction matches the ask (one round, after the loop passes, not a capped
gauntlet), and every text the spec replaces exists word for word. The reds are about how the step would actually run
and how it fits the rest of the rules.

## What checks out

- All five `visual-check/SKILL.md` files are identical on `main` (md5 `582fe46e147d97d136ea1194ea28e863` in each), so
  acceptance criterion 1 is reachable with one edit applied five times.
- Edit 1's old text ("then the fixes, then step 3, on each device in the device matrix in Settings.") is on line 22 of
  each file, and edit 3's old text ("The order is initial reviews, then the fixes, then the final look.") is on line 46.
  Both match exactly.
- The lane is right: `CLAUDE.md` lane 3 covers "CLAUDE.md and the skills, even though they are `.md` files", and the
  Owner's message is approval of this exact change. Lane 3 audits (plan and implementation) are both planned.
- The scope matches the ask: one round, end of a slice only, after step 3 passes, the judge does not run again, the gap
  becomes one fix. Nothing here turns it into a multi-round gauntlet.
- Each repo's `history.md` has "Setup" as its first section, so "after Setup" is a definite place in all five.

## Findings

### 1

UNIT: spec, "The change", step 4 ("names it in the judge's brief").
VERDICT: red
REQUIREMENT: the ask: the judge compares the screens "without being told which is ours"; acceptance criterion 3.
REASON: Naming the commercial product in the judge's brief tells the judge which set is not ours, so it is no longer
blind.
EVIDENCE: spec line 43, "names it in the judge's brief" (`7a7cb0d` said "in the brief", which was ambiguous; `e49eaa1`
made it explicit). The judge would know "B is Product X", so A is ours. The step also says nothing about logos, product
names or window titles visible in the commercial screenshots, or about the order the two sets are shown in.
EXPECTED: The judge's brief names neither product. The two sets are labelled only "A" and "B", in an order the
coordinator picks at random, with visible product names and logos cropped or covered where that is possible. The
coordinator records which is which outside the judge's brief.
FIX: rewrite step 4's second sentence in the spec, and acceptance criterion 3 to require it. Spec only.

### 2

UNIT: spec, "The change", step 4 ("sees the slice's screens next to that product's, on the same devices").
VERDICT: red
REQUIREMENT: spec "Boundaries" ("No new tools, dependencies, environments or spend"); `review` skill (a step must be
something a session can carry out).
REASON: The step does not say where the commercial product's screens come from, so it cannot be run as written, and
the obvious ways to get them (buying, installing or signing up for the product) would break the spec's own no-spend
boundary.
EVIDENCE: step 4 requires the other product's screens "on the same devices" as ours, which in Settings means small
phone, tablet and computer. Most commercial products have no screen at each of those sizes, and nothing says which of
its screens to pair with which of ours.
EXPECTED: The step names the source: public screenshots or pages of the product (its site, store page or docs), taken
by the coordinator with no purchase or sign-up. They are matched to our screens by kind (for example, a main editing
screen next to a main editing screen), at the closest size available on each device in the matrix. If no fair
comparison exists at a size, that size is left out and the judge's brief says so.
FIX: add one sentence on the source and pairing to step 4 in the spec. Spec only.

### 3

UNIT: spec, "The change", and `.claude/skills/visual-check/SKILL.md` lines 34-35 in all five repos.
VERDICT: red
REQUIREMENT: consistency within `visual-check`; `review` skill ("A gap against a criterion is red; an improvement is a
note, kept apart from the blocking defects"); acceptance criterion 2 ("only the three edits above").
REASON: The intro to "The steps" says every step judges against the brief's acceptance criteria and an improvement is
only a note, but step 4 is fixed "even when no acceptance criterion names it". The spec leaves that intro unchanged, so
the file would contradict itself.
EVIDENCE: `visual-check/SKILL.md:34-35`: "Each step judges the screens against the brief's acceptance criteria. A gap
against one is a defect; an idea that would make it better is a note." Step 4 in the spec: "That gap becomes one fix
brief, fixed even when no acceptance criterion names it".
EXPECTED: The intro names step 4 as the one exception, for example "Steps 1 to 3 judge the screens against the brief's
acceptance criteria. ... Step 4 is the one exception: its gap is fixed even when no criterion names it."
FIX: add this as a fourth edit in "The change", and update acceptance criterion 2 to "the four edits". Spec only.

### 4

UNIT: spec, "The change", step 4 ("That gap becomes one fix brief, fixed even when no acceptance criterion names it").
VERDICT: red
REQUIREMENT: `CLAUDE.md` "Three different yeses" and the owner-approval rules ("Choices outside that scope require
approval before dependent work proceeds"); `review` skill (a fix that needs the owner's choice is asked as a decision
card); Settings "Tries per problem: 3".
REASON: Nothing bounds the one fix. The judge's biggest gap may well be a product choice (a new visual direction, new
art, a new dependency or spend), and the step as written tells the implementer to fix it anyway.
EVIDENCE: step 4 in the spec has no limit on what the fix may change and does not mention the tries in Settings or the
decision card the `review` skill uses for fixes that need the Owner.
EXPECTED: The fix brief is bounded like any other fix: within the slice's approved scope and the tries in Settings. A
gap that needs a product choice, a new dependency or spend goes to the Owner as one decision card with a
recommendation, and the slice closes on the rest.
FIX: add one sentence to step 4 in the spec. Spec only.

### 5

UNIT: spec, "The change", the `history.md` entry and acceptance criterion 4.
VERDICT: note
REQUIREMENT: `CLAUDE.md` "Three different yeses" ("Each approval is recorded with its scope: what it covers, and the
document or commit"); `history.md` line 3.
REASON: The entry has the scope but not the document, and the new "Rule changes" section is not in the list of sections
that `history.md` line 3 describes.
EVIDENCE: the entry names the Owner's words but not this spec or a commit. `history.md:3` in all five repos: "Finished
milestones and their decision records, setup, standing permissions, approved screens and lessons."
EXPECTED: The entry names the spec (`AutomataFramework docs/superpowers/specs/2026-11-16-blind-judge-design.md`), and
line 3 gains "rule changes".
FIX: extend the entry text and add a line-3 edit to the `history.md` part of "The change". Spec only.

### 6

UNIT: spec, "The change", step 4 ("on the same devices").
VERDICT: note
REQUIREMENT: consistency with steps 1 to 3, which each say "on each device in the device matrix in Settings".
REASON: "the same devices" is looser than the wording every other step uses.
EVIDENCE: `visual-check/SKILL.md` lines 37, 40, 42.
EXPECTED: "on each device in the device matrix in Settings", subject to the pairing rule in finding 2.
FIX: wording in step 4. Spec only.

### 7

UNIT: spec, step 4, the judge's answer.
VERDICT: note
REQUIREMENT: the ask ("the biggest gap it names becomes a fix").
REASON: The step does not say what happens when the judge picks the commercial product as the amateur one, or names a
gap where ours is the stronger side.
EVIDENCE: step 4: "It says which one looks amateur and names the single biggest gap between them."
EXPECTED: The judge names the biggest gap where ours falls short, whichever it picks as amateur, so there is always a
fix that moves ours toward the stronger product. Its pick is recorded in the slice's notes either way.
FIX: one clause in step 4. Spec only.

### 8

UNIT: pull request #199 body; acceptance criterion 5; spec "Lane and path".
VERDICT: note
REQUIREMENT: Owner's rule: no Claude credit, and each pull request body's last line is "Requested by **McThayDT**".
REASON: #199's body ends with a "Generated by Claude Code" footer after "Requested by **McThayDT**", and the five
implementation pull requests will get the same footer if opened with the same tool. Separately, the first edit
lengthens line 22 past 120 characters, so the paragraph will be rewrapped and the diff will touch more lines than the
words changed.
EVIDENCE: `gh api repos/mcthaydt/AutomataFramework/pulls/199` at head `e49eaa1`. This audit did not edit the body.
EXPECTED: the footer is stripped before merge by the Owner's local session, as for earlier pull requests, and the
implementation audit reads acceptance criterion 2 as "only these edits, rewrapped to 120".
FIX: none in the spec; the coordinator has the local session strip the footer on #199 and each implementation pull
request.

## Follow-ups outside this change

- The blind-judge session's model is not named, so it runs on the Settings default (Opus, medium). If the Owner wants
  the harsher look at high effort, that belongs in Settings in `CLAUDE.md`, which is a separate lane 3 rule change.

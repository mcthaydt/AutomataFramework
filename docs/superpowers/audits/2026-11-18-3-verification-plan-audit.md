# Verification spec: plan audit, cycle 3

Audited: AutomataFramework draft pull request #213, commit `f7b82c7`, `docs/superpowers/specs/2026-11-18-verification-design.md`.
Auditor: a fresh plan audit session (Opus 5.5, medium), with `review` and `staged-path` loaded. Lane 3.

**Result: 2 red, 4 notes.** Every finding from cycles 1 and 2 is settled, and every acceptance check this audit could
run passes. Both red findings are about one sentence, the one fix round 2 added to the Risk line: "An edit to one alone,
with no code change, is lane 1". It is the agent's wording, not the Owner's, and the spec does not send it to the
Owner (R1). As written, it also lets a `this-repo` edit change what needs the owner at lane 1 (R2). Both are fixed by
one decision card and a few words. The row limit still holds after the fix.

## What was checked, and how

Each check below was run by this audit. None of it was taken from the spec's own tables.

- **Sources.** AutomataFramework `f7b82c7`, base `9073d87` = `origin/main`. RukenApp `43df79c`, Editors `fd1f3b1`,
  Examples `ca78632` and Site `6fc74c6` were cloned from `main`, read only. Each `main` is still at the base the spec
  names. McThayDT-Website was added read only. Its `e3d1078` was checked out as a scratch worktree, and nothing was
  pushed to it.
- **`blk` and the two hashes.** All 15 blocks were extracted with the criteria's `blk`. `{ blk claude-section; echo; }
  | md5sum` gives `ca1c58dcf739ee9150a820514f86ce05`. `blk build-section | md5sum` gives
  `c540d4a49548a3289f795826f098f81f`. Both match the spec.
- **The edits, applied by a program.** A script in the scratchpad applied sections 1 to 5 to scratch copies of all five
  repos' `CLAUDE.md` and `.claude/skills/`, and to both kits. It copied only `blk` output. In the kits, each edit was
  scoped to its own block. Every anchor was found exactly once.
- **Criteria 2 to 4, all five repos.**
  - `sect CLAUDE.md` gives `ca1c58dc` and `sect build` gives `c540d4a4` in every repo.
  - `grep '^## '` lists Stack and checks, How work goes, Owner visibility and early steering, Rules that never bend,
    Verification, Risk, The staged path and Settings, in that order.
  - "fails once and passes on retry" appears once in `CLAUDE.md` and once in `build`.
  - No line starts with "- **Tests.**" or "- **Lessons become tests first.**". The line after **Lane 3** equals
    `blk risk-line`, and `review` ends with `blk review-lessons`.
  - `review`, `build`, `staged-path`, `owner-updates` and `visual-check` each give one hash across the five. `release`
    gives two hashes, and `diff` shows only the `commit-authors` line in RukenApp.
- **Criterion 1, the kits**, on the scratch website under Node 24.22.3 (`npm ci`, then `npx svelte-kit sync`):
  - `git apply` of `blk kit-test` is clean.
  - The tests fail on the old kits: 7 failed, 102 passed. These are the 7 tests the spec names.
  - On the new kits: `kit-content.test.ts` passes 109 of 109, `--project unit` passes 275, `--project components`
    passes 52, `content:check` gives "0 errors, 0 warnings", and `git diff --check` is clean.
  - Rows, counted with the test's own `wrapped` on the parsed CLAUDE.md block: apps went from 196 to 197, and games
    from 199 to 199. The test diff does not touch the `toBeLessThan(200)` line or any pinned phrase.
  - The "fill in" list (`kitPlaceholders`) has 15 entries in apps and 17 in games, both before and after.
  - Each kit's CLAUDE.md and `build` blocks give `ca1c58dc` and `c540d4a4`. Each verify block equals `blk verify-kit`,
    and each note equals `blk verify-note`.
  - The kits' `review`, `staged-path`, `owner-updates`, `visual-check` and apps `build` equal the edited repo files
    (`{ cat block; echo; } | cmp`). `release` differs only in the `[COMMIT AUTHOR]` line.
- **Criterion 5, `verify-check`.**
  - It prints `ok` on a filled copy, and on a copy whose gaps hold several lines.
  - It fails on the unfilled kit ("blanks left"), with the six gap-only lines deleted ("empty: the part before ## Start
    it"), with those lines left blank, with the last gap empty, with one gap left, with an inline gap empty, without
    "## Stop it", and with two sections out of order.
  - It passes a gap filled only with spaces (note N4).
- **Criterion 7's places.** The four repos have Setup, then Rule changes, then Standing permissions. RukenApp has no
  Rule changes section. Editors and RukenApp have Flaky tests, before Lessons. `history-ruken` matches the four repos'
  2026-11-16 bullets word for word. No `history` block line is longer than 120 columns.
- **Cycle 2's N2 claim.** Adding "Never loosen, skip or re-record a test to hide a defect." to the section takes its
  paragraph from 4 rows to 5, so the games kit would reach 200. The claim holds.
- **Identity.** All 16 commits in `origin/main..433b3fb` (including this audit's live-state commit) are authored and
  committed by McThayDT <107786093+mcthaydt@users.noreply.github.com>. `git log --format=%B` has no co-author,
  Claude-Session or "Generated" line. The pull request body's last line is `Requested by **McThayDT**`. `git diff
  --check origin/main...HEAD` prints nothing.
- **This-repo skills**, read in all five repos for R2. Their "rules" include Owner decisions:
  - Site: "Dependencies the Owner approved for this repo".
  - Examples: a golden "moves on green under the Owner's standing yes (2026-11-16)".
  - Editors and Examples: "A draft runs Chromium only (the Owner, 2026-11-16)".
  - RukenApp: what may never go in the public repository.

## Cycle 1 and cycle 2 findings, one by one

| Finding | Settled? | Evidence |
|---|---|---|
| C1 R1 heavy checks | Yes | **Quick and steady** and section 7's row both say: before a push, the journeys the change reaches; the full suite in CI. |
| C1 R2 flaky test owner, rerun | Yes | One rerun, both results reported; root cause in its own thread unless it blocks; "Fix now" is a listed difference. |
| C1 R3 lane of `verify` edits | Yes | The Owner's line is in Risk, `release` and the kit test. The added lane 1 sentence is R1 and R2 below. |
| C1 R4 "their own pull requests" | Yes | Defined in **A change does not quietly edit its own check.** |
| C1 R5, N10 reviewer | Yes | `review` "Checks and reviews" ends with `blk review-bullet` (checked in all five repos and both kits). |
| C1 R6 "the check to run" | Yes | LOOK FOR, and the example is the CI wait. |
| C1 R7 retrospective deletes lessons | Yes | "keeps the rest in `history.md`". |
| C1 R8 Tests bullet | Yes | Replaced, and the reason is in section 1. |
| C1 R9 screenshots | Yes | Criterion 6: a private Artifact page or the coordinator. |
| C1 N1 to N9, N11 | Yes | RukenApp's history entries, Node 24, the stand-ins, the setup line, the heading order, bounds, configuration, wording. |
| C2 R1 empty gaps pass | Yes | Each gap must hold a line; see Criterion 5 above. |
| C2 R2 two of six points | Yes | All six are in the section; rows 197 and 199. |
| C2 R3 reviewer steps in `build` | Yes | In `review` too, and pinned by the kit test. |
| C2 R4 `release` lanes | Partly | `release` matches the Risk line. But the lane 1 sentence used for it is not the Owner's (R1) and is too wide (R2). |
| C2 R5 blanks the person cannot fill | Yes | `<lower case>` gaps; the fill-in list stays at 15 and 17. |
| C2 R6 order of audits | Yes | "Lane and path" and Plan steps 2, 5 and 6 agree. The estimate leaves out the wait for the Owner. |
| C2 N1 to N9 | Yes | The `build` description passes the frontmatter pin. N2 was left out with a measured reason. N3 to N8 are in the text. N9: `git diff --check` is clean. |

## Red findings

**R1**
- UNIT: spec section 1 (the `risk-line` block and the paragraph after it), "Open decisions", `history-rule`, and the
  pull request body.
- VERDICT: red
- REQUIREMENT: the brief, which says the sentence must be marked as the agent's choice for the Owner's final approval.
  CLAUDE.md: "The owner approves ... product choices", and "Each approval is recorded with its scope". `staged-path`:
  "Separate ... owner instructions from agent-selected choices", and "the spec lists any open product decisions".
- REASON: the spec treats "An edit to one alone, with no code change, is lane 1" as settled. It does not send this
  sentence to the Owner, and it says the sentence "does not widen the Owner's line". It does widen it. Before, an edit
  to `verify` or `this-repo` alone was lane 3 ("the skills"). The Owner's line covers only an edit that describes a
  code change.
- EVIDENCE:
  - Spec lines 156 to 158: "it does not widen the Owner's line".
  - "Open decisions": "None".
  - `history-rule` credits the Risk change to the 00:52 cards ("Same lane as the code") and does not mention the
    lane 1 sentence.
  - The pull request body says "a fix that touches only ... is lane 1 (R4)" and "Open decisions: none".
  - The Outcome (line 18) lists the sentence with no mark.
- EXPECTED: the spec says that this sentence is the agent's addition and is waiting for the Owner. "Open decisions"
  holds it as a decision card with options and a recommendation, and the build waits for that answer only.
  `history-rule` names the sentence and its approval only after the Owner says yes. The options:
  - (a) Recommended: R2's narrower wording.
  - (b) Keep it as written.
  - (c) Drop it, so an edit to one alone stays lane 3.
- FIX: in the spec only: the paragraph after `risk-line`, "Open decisions", the Outcome bullet, `history-rule` (with a
  note that its wording depends on the card), and the pull request body. Only the spec and the body change.

**R2**
- UNIT: spec section 1 (`risk-line`), section 4 (`release-docs`), and the kit test's pinned phrase "An edit to one
  alone, with no code change, is lane 1".
- VERDICT: red
- REQUIREMENT: CLAUDE.md Risk, Lane 3: "a change to the rules that decide what needs the owner". `release` Docs only:
  rules files are "anything else that decides what needs the owner". The Skills line: "A repo's own layout, CI and
  rules go in its `this-repo` skill". The spec must agree with itself and with the codebase.
- REASON: `this-repo` records Owner decisions and standing permissions. As written, an edit to `this-repo` alone is
  lane 1, so it merges on green with no review and no Owner. One example is adding a package to Site's approved list.
  Another is widening Examples' standing yes on goldens. `release-docs` also says plainly that `this-repo` is "not
  rules files". The same sentence defines rules files as anything that decides what needs the owner.
- EVIDENCE:
  - Site `this-repo` line 34: "Dependencies the Owner approved for this repo (2026-11-13)".
  - Examples `this-repo` lines 32 to 33: a golden "moves on green under the Owner's standing yes (2026-11-16)".
  - Editors line 45 and Examples line 71: "the Owner, 2026-11-16".
  - The edited `release` Docs only: "...anything else that decides what needs the owner) are `.md` files too, but a
    change to them requires lane 3 ... A repo's own `verify` and `this-repo` skills are not rules files".
- EXPECTED: an edit to one of these skills alone is lane 1 only when it does not change what needs the owner. An
  edit that adds, changes or removes an Owner approval, a standing permission or an approved dependency stays lane 3.
  `release-docs` says the same.
- FIX, if the Owner picks R1's option (a):
  - `risk-line`: "One edited alone is lane 1, unless it changes what needs the owner." This audit measured it at 3
    rows, the same as now, so the games kit stays at 199.
  - `release-docs`: "...and one edited alone is lane 1, unless it changes what needs the owner (Risk in CLAUDE.md)."
    Drop "are not rules files".
  - The kit test's two phrases (`An edit to one alone, with no code change, is lane 1` and `an edit to one alone is
    lane 1`) change to match.
  - Re-run criterion 1. The two section hashes do not change, since `risk-line` and `release-docs` are outside them.

  Only the spec changes.

## Notes (recorded, not blocking)

**N1**
- UNIT: spec Plan, Unit 0 ("Waits on: the plan audit (cycle 2)") and step 1 ("plan audit, cycle 2 ... this spec
  merges on green with it").
- VERDICT: note
- REASON: both are stale. Cycle 2 had 6 red findings, and this is cycle 3. "Lane and path" already says "with the
  last one".
- FIX: "the last plan audit" in both places. Only the spec changes.

**N2**
- UNIT: `review-bullet` against `build`'s **A change does not quietly edit its own check.**
- VERDICT: note
- REASON: `build` says that a pull request names each changed test, golden or `verify` step "and why". The `review`
  bullet says only "names each one in its body". A reviewer reading only `review` will not ask for the reason.
- FIX: in `review-bullet`, change "names each one in its body" to "names each one and why in its body". It is not in
  `CLAUDE.md`, so the row count does not change.

**N3**
- UNIT: CLAUDE.md Risk, the **Lane 3** bullet ("CLAUDE.md and the skills, even though they are `.md` files").
- VERDICT: note
- REASON: the Risk section says "The highest lane wins". Read literally, the Lane 3 bullet still puts any skill edit
  in lane 3, and the next line carves an exception out of it. `release` now says "the shared skills", but `CLAUDE.md`
  does not.
- FIX (optional): "CLAUDE.md and the shared skills". It is one anchor, the same in all five repos and both kits. This
  audit measured the change in both kits: the bullet stays at 6 rows, so the games kit stays at 199. Add it to
  criterion 4.

**N4**
- UNIT: spec section 5, `verify-check`.
- VERDICT: note
- REASON: a gap filled only with spaces passes (`any(repo[start:i])`). Criterion 9's `git diff --check` flags
  whitespace-only lines, so in practice it is caught.
- FIX (optional): `any(l.strip() for l in ...)` in the two `any` calls.

## Drunk-grandma test

The `CLAUDE.md` section, the `review` bullet and the `verify` note line read plainly. `build`'s section is long but
plain, and each bullet has a bold name. "Old-versus-new tests", "twins" and "round trips" are each explained where
they appear. "deviceScaleFactor" stays, for the reason the spec gives. The one unclear phrase is the Risk line's "An
edit to one alone", where "one" is vague. R2's wording ("One edited alone") reads no better on its own, but it sits
right after the sentence that names the two skills.

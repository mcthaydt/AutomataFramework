# Verification spec: plan audit, cycle 4 (narrow check)

Audited: AutomataFramework draft pull request #213, the diff `f7b82c7..0af7d61`, in
`docs/superpowers/specs/2026-11-18-verification-design.md`. This is the fix round for
`docs/superpowers/audits/2026-11-18-3-verification-plan-audit.md` (2 red, 4 notes).
Auditor: a fresh plan audit session (Opus 5.5, medium), with `review` loaded. Lane 3. The rest of the spec was not
audited again.

**Result: 1 red, 1 note.** Cycle 3's R1, R2 and its four notes are all settled. The Owner's 01:52 sentence appears word
for word in every place that states the rule. Every check this audit ran passes. The one red finding is new, in a
sentence this diff rewrote: criterion 1 says the kit test changes one pinned phrase. It changes two. The second one is
not loosened, but it is not named.

## What was checked, and how

Each check below was run by this audit. None of it was taken from the spec's own tables.

- **The two section hashes.** With the criteria's `blk`, `{ blk claude-section; echo; } | md5sum` gives
  `ca1c58dcf739ee9150a820514f86ce05`, and `blk build-section | md5sum` gives `c540d4a49548a3289f795826f098f81f`. Both
  are unchanged. The blocks this diff changed, compared with `f7b82c7` by a program: `risk-line`, `review-bullet`,
  `release-docs`, `verify-check`, `history-rule` and `kit-test`. No others.
- **`verify-check`**, from `blk verify-check` and `blk verify-kit`, run with `python3 -I`:
  - It prints `ok` on a filled copy, with exit 0.
  - It fails on a copy whose `<start commands>` gap holds only spaces ("empty: the part before It is ready when ..."),
    one whose last gap holds only spaces ("empty: the last part"), and one whose `<main screen>` gap holds only a tab
    and a space ("empty: the part before ## The journeys").
  - It fails on a copy with the gap lines deleted ("empty: the part before ## Start it"), on one without "## Stop it"
    ("missing or out of order: ## Stop it"), and on the unfilled kit ("blanks left").
- **The kits**, on a scratch worktree of McThayDT-Website at `e3d1078` under Node 24.22.3 (`/opt/node24/bin`), after
  `npm ci` and `npx svelte-kit sync`. Nothing was pushed to it.
  - A program in the scratchpad applied sections 1 to 5 to both kits, using only `blk` output. Each edit was scoped to
    its own block, and every anchor was found exactly once.
  - `git apply --check` of `blk kit-test` is clean.
  - On the old kits, the new test fails 9 and passes 100, as criterion 1 says. The 9 are the skill list (2), the
    **Lane 3** pin (2), the `review` retrospective pin (2), the new Verification test (2), and the shared workflow (1).
  - On the new kits, `kit-content.test.ts` passes 109 of 109. `--project unit` passes 275 and `--project components`
    passes 52. `content:check` gives "0 errors, 0 warnings". `git diff --check` is clean.
  - Rows, counted with the test's own `wrapped` on the parsed CLAUDE.md block: apps 196 to 197, games 199 to 199. Both
    are under 200, and the `toBeLessThan(200)` line is not in the test diff. The fill-in list (`kitPlaceholders`) stays
    at 15 (apps) and 17 (games).
  - In both kits: the CLAUDE.md and `build` sections give `ca1c58dc` and `c540d4a4`. The verify block equals
    `blk verify-kit`. The line after the **Lane 3** bullet equals `blk risk-line`. That bullet says "CLAUDE.md and the
    shared skills, even though they are `.md` files". The Owner's sentence appears once in CLAUDE.md and once in
    `release`. "are not rules files" is gone. `review` has "names each one and why in its body".
- **Changes to pinned phrases.** The test diff removes four lines. Each one is replaced:
  - The `SKILLS` list gains `verify`.
  - The headings list gains `## Verification`.
  - The **Lane 3** pin becomes "CLAUDE.md and the shared skills, even though they are `.md` files". It is named in
    criterion 1, with its reason (cycle 3's N3).
  - The `review` retrospective pin, "The retrospective after the slice moves each lesson that no test can capture into
    CLAUDE.md", becomes "moves into CLAUDE.md, through its rule-change pull request, only a lesson that holds for every
    change". It was already in the test diff at `f7b82c7`. It follows `review-lessons`, and it is no looser. But
    criterion 1 does not name it (R1).

  The two new lone-edit pins are the Owner's sentence in full, so they are no looser than the phrases they replace.
- **The Owner's sentence, word for word.** "One edited alone is lane 1, unless it changes what needs the owner." is
  on one line in the following places: Owner decisions (line 71), `risk-line` (156), `release-docs` (290), the cycle 3
  table (571), and both kit-test pins (640 and 646). It is wrapped, but word for word, in the Outcome bullet (lines 18
  and 19) and in `history-rule` (lines 439 and 440). It is also in the pull request body. The only other statement of
  the rule is a paraphrase in the cycle 2 table (N1).
- **Cycle 3's findings, in the text.** The paragraph after `risk-line` now says that the sentence widens the 00:52 line.
  "Open decisions" credits the 01:52 card. Unit 0 and Plan step 1 say "the last plan audit". Criterion 4 checks the
  **Lane 3** wording. Criterion 5 lists the whitespace cases.
- **Identity.** All 5 commits in `f7b82c7..0af7d61` are authored and committed by McThayDT
  <107786093+mcthaydt@users.noreply.github.com>. Their messages have no co-author, Claude-Session or "Generated" line.
  `git diff --check f7b82c7..0af7d61` prints nothing. `0af7d61` deletes the spec session's live-state file. The pull
  request body (read with `gh api`) ends with the line `Requested by **McThayDT**`. The pull request is still a draft.

## Cycle 3 findings, one by one

| Finding | Settled? | Evidence |
|---|---|---|
| R1, the lone-edit sentence treated as settled | Yes | The Owner's 01:52 card is in Owner decisions word for word. The paragraph after `risk-line` says the sentence widens the 00:52 line and is the Owner's. `history-rule` and "Open decisions" credit "Lane 1, with a guard". The pull request body says so too. |
| R2, a lone `this-repo` edit could change what needs the owner | Yes | The guard is in `risk-line`, `release-docs`, both kits (applied and measured) and both kit-test pins. "are not rules files" is gone. The games kit stays at 199 rows. |
| N1, stale "cycle 2" in the Plan | Yes | Unit 0: "the last plan audit". Step 1: "merges on green with the last plan audit". |
| N2, the reviewer is not asked why | Yes | `review-bullet`: "names each one and why in its body", found in both applied kits. |
| N3, the **Lane 3** bullet says "the skills" | Yes | The edit is in section 1, criterion 4 and the kit test, and both kits pass it at the same row counts. Its pin change is named in criterion 1. |
| N4, a gap holding only spaces | Yes | `l.strip()` in both `any` calls. Three whitespace-only cases fail (see above). |

## Red findings

**R1**
- UNIT: spec, acceptance criterion 1 (lines 591 to 594).
- VERDICT: red
- REQUIREMENT: the brief for this check: each pinned-phrase change in the kit test is named and justified. The spec
  must also agree with itself, since criterion 1 is the check that the unit 1 build session and its audit run against.
- REASON: the rewritten sentence says "so is every pinned phrase but one", but the `kit-test` block changes two pinned
  phrases.
- EVIDENCE: the `kit-test` block's hunk `@@ -348,7 +348,7 @@` replaces the pin "The retrospective after the slice
  moves each lesson that no test can capture into CLAUDE.md" with "moves into CLAUDE.md, through its rule-change pull
  request, only a lesson that holds for every change". On the old kits, it is one of the 9 failures
  (`..._closes_each_slice_with_a_retro_...`, in both kits). Criterion 1 names only the **Lane 3** pin. The earlier
  wording, "every pinned phrase ... unchanged", was wrong about this pin too, and cycle 3 missed it.
- EXPECTED: criterion 1 names both pin changes and the reason for each. The second follows `review-lessons` (cycle 1's
  R7). The wording is no looser.
- FIX: in criterion 1 only, change "so is every pinned phrase but one:" to name two changes. Keep the **Lane 3** one
  as it is, and add: "and `review`'s retrospective pin, 'The retrospective after the slice moves each lesson that no
  test can capture into CLAUDE.md', becomes 'moves into CLAUDE.md, through its rule-change pull request, only a lesson
  that holds for every change', for the new Lessons text (`review-lessons`, cycle 1's R7)". Optionally, also say that
  the skill list gains `verify` and the headings list gains `## Verification`. Only the spec changes. No block changes,
  so neither hash moves.

## Notes (recorded, not blocking)

**N1**
- UNIT: spec, "What changed after plan audit cycle 2", row R4 (line 551).
- VERDICT: note
- REASON: the row paraphrases the rule: "an edit to a repo's own skill alone is lane 1 (cycle 3 adds the Owner's guard:
  'unless it changes what needs the owner')". It is a record of how a finding was settled, not a rule that ships. But
  the Owner asked for the exact sentence wherever the lone-edit rule appears.
- FIX (optional): "the Risk line and `release` say 'One edited alone is lane 1, unless it changes what needs the
  owner.' (the Owner's 01:52 wording, cycle 3)". Only the spec changes.

## Drunk-grandma test

The new Risk line, "One edited alone is lane 1, unless it changes what needs the owner.", reads plainly right after the
sentence that names the two skills. The new `release-docs` sentence reads plainly. The paragraph after `risk-line` is
long, but it says one thing: the sentence widens the earlier line, and the Owner chose it.

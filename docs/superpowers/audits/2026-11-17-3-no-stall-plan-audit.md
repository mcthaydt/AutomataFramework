# Plan audit (cycle 3): the no-stall rule

Written 2026-11-17 00:56 UTC (from `date`). Lane 3 plan audit, cycle 3, `review` skill, by a fresh session that wrote
neither the spec nor cycles 1 and 2. Read only: no repo was changed.

Examined:

- Spec: project files `specs/2026-11-17-no-stall-rule-design.md` (modified 00:55 UTC, md5 `191dd18d...f0cfa4f553bc`).
- Cycles 1 and 2: project files `audits/2026-11-17-1-no-stall-plan-audit.md` and `audits/2026-11-17-2-...`.
- Proposal: `proposals/2026-11-17-no-stall-rule-proposal.md`.
- The repos at `origin/main`, fetched 00:56 UTC: AutomataFramework `9a9b625` (#208 still open, head `0a6361e`),
  Editors `61369fd`, Examples `56e7499`, Site `d4e077b`, Private `04a021e`, mcthaydt-website `b040e73` (moved since
  cycle 2's `cfdec8f`: website #70 merged).

## Result

**0 red, 3 notes.** R3 is closed, every line of the spec is 120 columns or less, the approved rule text is unchanged,
and nothing regressed. The spec can go to the docs pull request in step 2 with all three cycles.

## Cycle-2 red

### R3. Step 2 lands every audit cycle: closed

Step 2 now reads: "... at `docs/superpowers/audits/2026-11-17-1-no-stall-plan-audit.md`, together with
`2026-11-17-2-no-stall-plan-audit.md` and any later rounds, the last with no reds, and merges it on green before step
3." That is cycle 2's EXPECTED: the spec and every cycle of its plan audit, the last with no reds. This file is that
last round. Held (see N1 for the short path).

## What else was checked, and held

1. **Line length.** `awk 'length>120'` over the spec finds no line. Cycle 2's N7 (the 141-column line) is fixed; step 4
   now wraps at 120.
2. **Stale numbers (cycle 2's N2).** Section 6 reads "364 becomes 372 in the games kit, 340 becomes 348 in the apps kit,
   counted at #68's head `c32d313`"; step 1 names `c32d313` as the website head. No `6e35765`, `363` or `371` is left.
3. **Rule text unchanged.** The fenced blocks of edits 1 to 5 against the proposal's (`diff` of the extracted blocks):
   the only difference is still the history entry's "as AutomataFramework `docs/...` describes" (cycle 1's N1). Edits
   1 to 4 are byte for byte the approved text.
4. **Anchors still there.** At the fetched heads, Editors, Examples, Site and Private each have "sessions wait for CI
   results" once and the "Fresh session per big job" anchor in `CLAUDE.md`; AutomataFramework gets the anchor from
   #208, which step 1 waits for. At website `b040e73` both kits still have the two old sentences (games lines 356 and
   552, apps 336 and 528), and no "20 minutes" before Settings in either "CLAUDE.md" block.
5. **Website #70 does not touch the edited paragraphs.** It adds "Slice end", "End-to-end walk" and "Screens page"
   bullets in "The staged path" (above "Retro", so "Each session's prompt ..." is still the last bullet), two skill
   sections, and one test. Edits 2 and 4 still have exactly one target each.
6. **No new contradiction.** The top line, "Lane and path", Boundaries, step 2 and step 4 agree.

## Notes (not blocking)

- **N1. Step 2's cycle-2 path is a bare file name.** It follows the full cycle-1 path, so the same folder is the
  natural reading. The build session puts all three cycles in `docs/superpowers/audits/`.
- **N2. The website's games kit is now 370 lines, not 364.** Website #70 merged after cycle 2 and added 6 lines to the
  "CLAUDE.md" block (fences at lines 21 and 392 of `content/prompts/claude-md-games/body.md` at `b040e73`); apps went
  from 340 to 346. With this change's 8 lines, games becomes 378 and apps 354. The test's limit (under 380) still
  holds, by one line in games. Not red: criterion 4 is judged by the test. But any other kit change that merges before
  step 3 and adds two or more lines would make the games kit fail it; the build session should count again on `main`
  at step 3 and report to the coordinator instead of trimming text if the limit no longer holds, since trimming
  approved words is the Owner's call. Section 6's numbers are correctly labelled as counted at `c32d313`.
- **N3. Cycle 2's N3 to N6 are unchanged.** #208 is still open (head `0a6361e`); the builder's brief should say to
  rerun a foreground watch cut off by the 10-minute tool cap in the same turn, and to poll checks with GitHub tools
  where there is no `gh`.

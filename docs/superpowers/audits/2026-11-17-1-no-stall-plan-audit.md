# Plan audit (cycle 1): the no-stall rule

Written 2026-11-17 00:52 UTC (from `date`). Lane 3 plan audit, `review` skill, by a fresh session that did not write the
spec. Read only: no repo was changed.

Examined:

- Spec: project files `specs/2026-11-17-no-stall-rule-design.md`; proposal: `proposals/2026-11-17-no-stall-rule-proposal.md`.
- The approval as the coordinator passed it on (00:47 UTC, "Approve, with the extra").
- The repos at:

| Repo | Compaction-hook PR | State | Commit read |
|---|---|---|---|
| AutomataFramework | #208 | still open (head `0a6361e`, the spec's head) | `pr/208` at `0a6361e`; `main` is `9a9b625` |
| AutomataFrameworkEditors | #104 | merged | `main` `ddd3751` (merges `bd394e0`, the spec's head) |
| AutomataFrameworkExamples | #70 | merged | `main` `56e7499` (merges `2ebdf1d`) |
| AutomataFrameworkSite | #53 | merged | `main` `d4e077b` (merges `08f2a3c`) |
| AutomataPrivate | #15 | merged | `main` `04a021e` (merges `1715521`) |
| mcthaydt-website | #68 | merged | `main` `cfdec8f` (merges `c32d313`, not `6e35765`: #68 took in #69 first) |

## Result

**2 red, 6 notes.** Neither red touches the approved rule text; both are one-sentence fixes to the spec's plan. The
spec matches the approval, every quoted old sentence exists, and the existing tests will pass.

## What was checked, and held

1. **The approval.** All six approved items are in the spec: the "No stalls" bullet (foreground watch with
   `gh pr checks --watch` / `gh run watch`), the 20-minute check-in and nudge by the coordinator or a lead, reporting
   a session still silent at the next check-in to the owner and handing its work to a fresh session, the Settings line,
   the two old sentences replaced (CLAUDE.md and the `release` skill), and a history entry. All five repos and both
   kits. The fenced text of edits 1 to 4 is byte for byte the proposal's (checked with `diff` of the fenced blocks); the
   only difference is the history entry (note N1).
2. **Old sentences exist.** "sessions wait for CI results instead of repeatedly watching logs." / "Waiting does not
   suspend the owner update interval." are the last bullet of "The staged path" in all five `CLAUDE.md` (lines 307–311)
   and both kits (games 350–351, apps 330–331). "Wait for the result instead of watching logs. Read a log only when a
   check fails." is the last bullet of "Fast CI (public repos on GitHub's runners)" in all five `release/SKILL.md` (line
   58) and both kits' "Skill: release" (games 530, apps 506). No other place in `CLAUDE.md` or `.claude/` of the five
   repos says to wait for CI or end a turn.
3. **Same text everywhere.** `md5sum` over "The staged path"'s last bullet, "Settings", "How work goes", the "Fast CI"
   section and history's "Rule changes" gives one hash per part across the five repos; the "Fresh session per big job"
   bullet, the "Fast CI" section and the staged-path bullet hash the same in both kits as in the repos. So one text,
   used seven times, holds at the current heads.
4. **Anchors.** "Fresh session per big job" is followed by "A check is a test that fails by itself" everywhere;
   "Owner update interval" is followed by a blank line and "Tries per problem" everywhere; the compaction-hook entry is
   the last one under "Rule changes", before "Standing permissions", in all five histories.
5. **Line widths.** Every new line in edits 1 to 5 is at most 117 columns once the diff marker is dropped (`awk`).
6. **Tests.** In the five repos nothing reads these sentences: the CLAUDE.md-reading tests are
   `tests/workflows/compaction-hook.test.ts` (reads the hook's reminder, not CLAUDE.md's text) and
   `tests/workflows/docs-only.test.ts` (a change to only `CLAUDE.md`, `docs/**.md` and `.claude/skills/**.md` takes the
   docs-only path). In the website, no existing test names either old sentence. "both_kits_share_one_workflow_word_for_word"
   still passes (same text in both kits). "keeps_every_number_and_model_pick_in_the_one_settings_section" still passes:
   neither kit has "20 minutes", "check-in", "nudge" or "No stalls" anywhere today, and the new rule text before
   Settings carries no number.
7. **The 380-line limit holds**: the "CLAUDE.md" block (the parser's text between the fences) is 364 lines in games and
   340 in apps at `main`; +8 gives 372 and 348 (see N2 for the spec's stale numbers).
8. **No contradiction with the hook.** `.claude/after-compaction.md` says nothing about waiting; edit 2 keeps "waiting
   does not suspend the owner update interval"; "If waiting on CI ... say what is waiting" in "Owner visibility" still
   fits a session that watches.
9. **Limits.** AutomataFramework has one open PR (#208); one PR per repo stays inside 3.

## Red findings

### R1. The implementer writes `history.md` but the plan never says so in the commit

UNIT: spec, "Plan" step 4 (and "The change", 5).
VERDICT: red.
REQUIREMENT: CLAUDE.md "The staged path", Writing: "The coordinator is the only writer of `progress.md` and `history.md`
while active ... If the coordinator cannot write to the repo, the implementer writes them for it and says so in the
commit." The project instructions say the same.
REASON: the build session is told to add the history entry in all five repos, but not to say in the commit that it
writes it for the coordinator.
EVIDENCE: step 4 says only "make edits 1 to 5". The last three rule-change commits (`bd394e0`, `dd11d8a`, `7d740d4` in
Editors) also left it out, so a builder copying them repeats the gap.
EXPECTED: each commit that touches `docs/superpowers/history.md` says it writes the record for the coordinator.
FIX: add to step 4: "The commit that adds the history entry says it writes `history.md` for the coordinator." Spec only.

### R2. Step 2 leaves who lands the spec and this audit, and where, unsaid

UNIT: spec, top line and "Plan" step 2.
VERDICT: red.
REQUIREMENT: the brief must be buildable without guessing (this audit's brief); CLAUDE.md "One working brief": the
spec merges on green with its plan audit, and the build starts from `main`; `review`: audit files are
`docs/superpowers/audits/<date>-<cycle>-plan-audit.md`.
REASON: the top line says "the build session commits this file", but step 2 (merge the spec with its plan audit) comes
before the build (steps 3–4) and names no session, branch, or audit path in the repo. This audit lives in project files.
EVIDENCE: spec line 3 vs. "Plan" 2; the audit path asked of this session is `/mnt/project-files/audits/...`, not the repo.
EXPECTED: one named session opens one AutomataFramework docs PR with the spec at
`docs/superpowers/specs/2026-11-17-no-stall-rule-design.md` and this audit at
`docs/superpowers/audits/2026-11-17-1-no-stall-plan-audit.md` (after its reds are fixed, with a cycle-2 audit if one is
run), lane 1, merged on green; only then do steps 3–4 branch from `main`.
FIX: rewrite step 2 to say that, and drop or match the top line. Spec only.

## Notes (not blocking; recorded, not fixed here)

- **N1. History entry differs from the proposal.** The spec adds "as AutomataFramework
  `docs/superpowers/specs/2026-11-17-no-stall-rule-design.md` describes" to the proposal's entry. It matches the three
  earlier entries' form and is a record, not a rule, so it is within the approval of "a history entry". Say so in the
  PR body.
- **N2. Stale counts and head.** #68 merged as `c32d313`, which took in #69 ("count the slice lead as reading only"); the
  games block grew by one line. The spec's "363 becomes 371" should read "364 becomes 372" (apps 340 → 348 is right).
  The four edited paragraphs did not change, so step 1's re-read finds no difference in the text. Fix the numbers when
  fixing R1/R2.
- **N3. AutomataFramework #208 is still open** at 00:52 UTC; step 1 still waits on it. Its head is still `0a6361e`.
- **N4. Foreground watches hit the tool's time cap.** A foreground shell call in these sessions stops at 10 minutes;
  the full run is longer. "With a long timeout" works only if the session runs the watch again when it is cut off.
  Builders' briefs should say so. A wording change to the rule would need the owner, so this stays a brief-level note.
- **N5. The runtime's own guidance says the opposite.** The project-thread runtime tells sessions to end the turn and
  let a PR event wake them, and to use `gh` only for search. The rule (owner instruction) wins, and the example
  commands are examples; a session without `gh` can poll the checks with its GitHub tools in the same turn. Worth one
  line in builder briefs.
- **N6. Who reports and who hands off.** "Is reported to the owner, and its work is handed to a fresh session": in the
  kits only the coordinator starts sessions (a games slice lead "asks the coordinator" for threads), and "When a
  coordinator is active, it consolidates worker reports". A lead that is not the coordinator would report to the
  coordinator and ask it for the fresh session. Also, the silent session should be stopped before the fresh one takes
  its branch, or "one writer per branch" can break. The approved wording allows this reading; a clarifying edit would
  be a new rule change for the owner.

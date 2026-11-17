# Plan audit (cycle 2): the no-stall rule

Written 2026-11-17 00:54 UTC (from `date`). Lane 3 plan audit, cycle 2, `review` skill, by a fresh session that wrote
neither the spec nor cycle 1. Read only: no repo was changed.

Examined:

- Spec: project files `specs/2026-11-17-no-stall-rule-design.md` (modified 00:53 UTC, after cycle 1).
- Cycle 1: project files `audits/2026-11-17-1-no-stall-plan-audit.md`.
- Proposal: `proposals/2026-11-17-no-stall-rule-proposal.md`.
- The repos at `origin/main`, fetched 00:54 UTC: AutomataFramework `9a9b625` (#208 still open, head `0a6361e`),
  Editors `61369fd`, Examples `56e7499`, Site `d4e077b`, Private `04a021e`, mcthaydt-website `cfdec8f`.

## Result

**1 red, 7 notes.** R1 is fixed. R2 is fixed for the spec's path and who opens the pull request, but the fix lands only
the cycle-1 audit, whose two reds this cycle closes, so `main` would record a spec merged past open reds (R3). One
phrase in step 2 fixes it. The approved rule text is unchanged since cycle 1.

## Cycle-1 reds

### R1. History entry credit in the commit: fixed

Step 4 now says: "The commit that adds the history entry says in its message that the build session wrote it for the
coordinator, as CLAUDE.md requires." That is the requirement in CLAUDE.md, "The staged path", Writing ("the implementer
writes them for it and says so in the commit"). Held. One line of the fix is 141 columns (N7).

### R2. Who lands the spec and the audit, and where: fixed, with one gap (R3)

Step 2 now names the build session, one AutomataFramework pull request, the spec's path
(`docs/superpowers/specs/2026-11-17-no-stall-rule-design.md`), the audit's path
(`docs/superpowers/audits/2026-11-17-1-no-stall-plan-audit.md`), that the audit is by a fresh session, and "merges it
on green before step 3". The top line ("The build session commits this file as ...") now agrees with step 2. The spec
is written by the coordinator, so the build session opening it does not break "never by the session that wrote this
spec". Lane 1 (a doc), so it merges on green without the Owner, as "One working brief" allows. Held, except R3.

## What else was checked, and held

1. **Rule text unchanged.** The fenced blocks of edits 1 to 5 against the proposal's (`diff` of the extracted blocks):
   the only difference is still the history entry's "as AutomataFramework `docs/...` describes" (cycle 1's N1). Edits
   1 to 4 are byte for byte the approved text.
2. **No new contradiction.** The top line, "Lane and path", Boundaries (the spec and its audits in AutomataFramework),
   step 2 and step 4 now agree. "Six in all" in step 4 counts the website pull request from step 3; consistent.
3. **The old sentences are still there to replace.** At the fetched heads, each of the four repos merged so far has
   "sessions wait for CI results" once in `CLAUDE.md`, and both kits have the two old sentences and the "Fresh session
   per big job" anchor (3 hits each).
4. **Editors moved** from `ddd3751` to `61369fd` since cycle 1. Of the files this change touches, only
   `docs/superpowers/history.md` changed: one entry about splitting plan PR 12, under the earlier-work section, not
   under "Rule changes". The compaction-hook entry is still the last under "Rule changes" in Editors, Examples, Site and
   Private, so the anchor for edit 5 holds. `CLAUDE.md` and `.claude/` did not change.
5. **The 380-line limit** still holds: the games "CLAUDE.md" block is 364 lines at `cfdec8f` (fence at lines 21 and
   386), so 372 after the change; apps 348.
6. **Open pull requests.** AutomataFramework has one open (#208). With the spec pull request and later the
   implementation one, it stays at 3 or fewer, and step 1 waits for #208 anyway.

## Red findings

### R3. Step 2 lands the cycle-1 audit but not the cycle-2 audit that closes its reds

UNIT: spec, "Plan" step 2.
VERDICT: red.
REQUIREMENT: CLAUDE.md "One working brief": "the spec merges on green without the owner, with its plan audit when it
has one". Cycle 1's R2 EXPECTED: the spec and "this audit ... (after its reds are fixed, with a cycle-2 audit if one is
run)". "Findings carry evidence": a fix is checked by a second session, and that check is the record.
REASON: the plan audit for this spec is two files. Step 2 names only cycle 1, which ends "2 red". Merged alone, `main`
holds a lane 3 spec beside an audit with two open reds and nothing showing they were fixed and checked.
EVIDENCE: step 2 names one path, `docs/superpowers/audits/2026-11-17-1-no-stall-plan-audit.md`; this cycle exists at
project files `audits/2026-11-17-2-no-stall-plan-audit.md`.
EXPECTED: the docs pull request adds the spec and every cycle of its plan audit, the last one with no reds.
FIX: in step 2, after the cycle-1 path add "and each later cycle (`docs/superpowers/audits/2026-11-17-2-no-stall-plan-audit.md`
and on), the last with no reds". Spec only. A cycle 3 that checks only this phrase is enough.

## Notes (not blocking)

Cycle 1's notes, weighed again:

- **N1. History entry differs from the proposal.** Still true and still fine: a record, not a rule, and the same form
  as the three earlier entries. Say so in the pull request body.
- **N2. Stale counts and head: not fixed.** "363 becomes 371" should read "364 becomes 372"; step 1 and section 6
  still name the website's head as `6e35765`, but #68 merged as `c32d313` (in `main` `cfdec8f`). Not red: criterion 4
  is judged by the test (under 380), which holds, and step 1 already says to re-read on `main`. Fix with R3.
- **N3. AutomataFramework #208 is still open** at 00:54 UTC, head `0a6361e`. Step 1 waits on it.
- **N4. Foreground watches hit the 10-minute tool cap.** Unchanged; the builder's brief should say to run the watch
  again when it is cut off, in the same turn.
- **N5. The runtime says to end the turn and wait for a PR event.** Unchanged; the rule wins. One line in the builder's
  brief: a session without `gh` polls checks with its GitHub tools in the same turn.
- **N6. Who reports and who hands off.** Unchanged; the approved wording allows a lead to report to the coordinator and
  ask it for the fresh session, and the silent session should be stopped before another takes its branch. A wording
  change would be a new rule change for the Owner.

New:

- **N7. The R1 fix is a 141-column line** (spec line 150), against the spec's own "wrapped to 120 columns" habit. Nothing
  in AutomataFramework checks spec width (9 lines over 120 already in `docs/superpowers/specs/`), and criterion 3 is
  about `CLAUDE.md` and the skill only, so not red. Rewrap it when fixing R3.

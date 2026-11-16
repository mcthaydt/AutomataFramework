# Blind judge at the end of a slice

## Outcome

The end-of-slice design review in the `visual-check` skill gets one more step: after the last look passes, a fresh
session compares the slice's screens with a polished commercial product of the same kind, without being told which is
ours, and the single biggest gap it names becomes one fix. One round, not a capped multi-round gauntlet.

## Why

The design review loop judges screens against the approved designs and the drunk-grandma test. It cannot catch "this
matches the mockup but still feels amateur". One blind comparison at the end of each slice covers that without a full
gauntlet.

## Owner approval

The Owner asked for exactly this change on 2026-11-16 ("add that", in the project thread, replying to the suggestion of
a single blind-judge round at the end of a slice). It changes the rules files, so it is lane 3; that message is the
approval for this change only.

## Lane and path

Lane 3 (a change to `.claude/skills/`), staged path: this spec and its plan audit, then one implementation pull request
per repo with an implementation audit across all five, then merge with a merge commit.

## Boundaries

- Files: `.claude/skills/visual-check/SKILL.md` and `docs/superpowers/history.md` in AutomataFramework,
  AutomataFrameworkEditors, AutomataFrameworkExamples, AutomataFrameworkSite and AutomataPrivate. Nothing else, apart
  from this spec and its audits here.
- No new tools, dependencies, environments or spend. Expected duration: under two hours, most of it waiting on audits.

## The change

In `.claude/skills/visual-check/SKILL.md`:

1. "Before the next slice": the loop ends with step 4. Replace "then the fixes, then step 3, on each device in the
   device matrix in Settings." with "then the fixes, then step 3, on each device in the device matrix in Settings, and
   last, step 4 once."
2. "The steps": add step 4 after step 3:

   > 4. **Blind judge:** one round, at the end of a slice only, after step 3 passes. The coordinator picks a polished
   >    commercial product of the same kind and names it in the brief. A fresh session sees the slice's screens next to
   >    that product's, on the same devices, with nothing saying which is ours. It says which one looks amateur and
   >    names the single biggest gap between them. That gap becomes one fix brief, fixed even when no acceptance
   >    criterion names it, and step 3 runs again on the screens the fix changed. The blind judge does not run again.

3. The order paragraph: replace "The order is initial reviews, then the fixes, then the final look." with "The order
   is initial reviews, then the fixes, then the final look, then at the end of a slice the blind judge."

In `docs/superpowers/history.md`, a new section "Rule changes" after "Setup", with one entry:

> - 2026-11-16, the Owner: a blind-judge round (step 4) at the end of each slice's design review in `visual-check`.
>   Approved in the project thread ("add that"). Scope: this change only, made the same in all five repos. Later rule
>   changes are lane 3 as usual.

## Acceptance criteria

1. The five `visual-check/SKILL.md` files are byte-identical after the change (`md5sum` gives one hash).
2. Each `SKILL.md` diff against `main` contains only the three edits above.
3. Step 4 says: end of a slice only; after step 3 passes; a fresh session; shown both products' screens without being
   told which is ours; names which looks amateur and the single biggest gap; that gap becomes one fix brief; one
   round, not repeated.
4. Each `history.md` records the Owner's approval with its scope, under "Rule changes".
5. Every commit is authored and committed by McThayDT with no Claude credit; each pull request body's last line is
   "Requested by **McThayDT**"; each merges with a merge commit.
6. CI is green on each pull request.

## Plan

1. Merge this spec with its plan audit (`docs/superpowers/audits/2026-11-16-blind-judge-plan-audit.md`).
2. In each repo, on its own branch, make the edits above and open one pull request.
3. A fresh session runs the implementation audit across the five pull requests and writes
   `docs/superpowers/audits/2026-11-16-blind-judge-implementation-audit.md` here.
4. Fix every in-scope finding, then merge each pull request with a merge commit once green.

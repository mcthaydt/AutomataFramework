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
- No new tools, dependencies, environments or spend; the blind judge uses public screenshots only. Expected duration:
  under two hours, most of it waiting on audits.

## The change

In `.claude/skills/visual-check/SKILL.md`, four edits, each paragraph rewrapped to 120 columns:

1. "Before the next slice": the loop ends with step 4. Replace "then the fixes, then step 3, on each device in the
   device matrix in Settings." with "then the fixes, then step 3, on each device in the device matrix in Settings, and
   last, step 4 once."
2. "The steps", the intro: name step 4 as the one exception to judging against the acceptance criteria. Replace it
   with the following (quoted exactly as the skill wraps it):

   > Steps 1 to 3 judge the screens against the brief's acceptance criteria. A gap against one is a defect; an idea that
   > would make it better is a note. Step 4 is the one exception: the gap it names is fixed even when no criterion names it.

3. "The steps": add step 4 after step 3:

   > 4. **Blind judge:** one round, at the end of a slice only, after step 3 passes. The coordinator picks a polished
   >    commercial product of the same kind and takes public screenshots of it (its site, store page or docs), with no
   >    purchase or sign-up. It pairs each with our screen of the same kind, at the closest size, on each device in the
   >    device matrix in Settings, and leaves out a size with no fair match. It covers product names and logos, labels
   >    the two sets A and B in a random order, and keeps which is which out of the judge's brief. A fresh session says
   >    which set looks amateur and names the single biggest gap where ours falls short. That gap becomes one fix brief,
   >    within the slice's scope and the tries in Settings; a gap that needs a product choice, a new dependency or spend
   >    goes to the owner as a decision card with a recommendation instead. Step 3 then runs again on the screens the
   >    fix changed. The blind judge does not run again, and its pick is recorded in `docs/superpowers/progress.md`.

4. The order paragraph: replace "The order is initial reviews, then the fixes, then the final look." with "The order
   is initial reviews, then the fixes, then the final look, then at the end of a slice the blind judge."

In `docs/superpowers/history.md`, two edits:

1. Line 3 gains "rule changes" after "setup".
2. A new section "Rule changes" after "Setup", with one entry:

   > - 2026-11-16, the Owner: a blind-judge round (step 4) at the end of each slice's design review in `visual-check`.
   >   Approved in the project thread ("add that"). Scope: this change only, made the same in all five repos, as
   >   AutomataFramework `docs/superpowers/specs/2026-11-16-blind-judge-design.md` describes. Later rule changes are
   >   lane 3 as usual.

## Acceptance criteria

1. The five `visual-check/SKILL.md` files are byte-identical after the change (`md5sum` gives one hash).
2. Each `SKILL.md` diff against `main` contains only the four edits above, rewrapped to 120 columns.
3. Step 4 says: end of a slice only; after step 3 passes; a fresh session; the commercial screens come from public
   screenshots with no purchase or sign-up, paired with ours by kind at the closest size on each device in the matrix,
   with unmatched sizes left out; names and logos covered, the sets labelled A and B in a random order, and which is
   which kept out of the judge's brief; the judge names which set looks amateur and the single biggest gap where ours
   falls short; that gap becomes one fix brief within the slice's scope and the tries in Settings, or a decision card
   for the owner when it needs a product choice, a dependency or spend; step 3 runs again on what the fix changed; one
   round, not repeated, with the pick recorded in `progress.md`.
4. The intro to "The steps" names step 4 as the one exception to judging against the acceptance criteria.
5. Each `history.md` records the Owner's approval with its scope and this spec, under "Rule changes", and line 3 lists
   rule changes.
6. Every commit is authored and committed by McThayDT with no Claude credit; each pull request body's last line is
   "Requested by **McThayDT**"; each merges with a merge commit.
7. CI is green on each pull request.

## Plan

1. Merge this spec with its plan audit (`docs/superpowers/audits/2026-11-16-blind-judge-plan-audit.md`).
2. In each repo, on its own branch, make the edits above and open one pull request.
3. A fresh session runs the implementation audit across the five pull requests and writes
   `docs/superpowers/audits/2026-11-16-blind-judge-implementation-audit.md` here.
4. Fix every in-scope finding, then merge each pull request with a merge commit once green.

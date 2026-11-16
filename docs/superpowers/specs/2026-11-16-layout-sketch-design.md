# A layout sketch instead of mockups

## Outcome

Screens stop being drawn as pixel mockups before they are built. A brief or spec that adds or changes a screen carries
a quick layout sketch instead: an ASCII or simple box diagram in the document that shows what goes where. The look is
settled after the build, by the design review loop and the blind judge that `visual-check` already runs.

## Why

The project uses no drawing tool, so a mockup is a hand-built HTML page that takes as long as a screen and then has to
be approved before the real screen starts. What caught the "Whole world" mismatch on the World map was the
layout: which panel goes where and which button is the main one. A sketch in the spec shows that in minutes. Polish
is what the design review loop and the blind judge are for.

## Owner approval

The Owner asked for this on 2026-11-16 at 19:56 UTC in the project chat ("should we just skip the mockup moving forward?
Just build it out then fix it with the review cycle"), and at 19:57 UTC said "yes" to the coordinator's proposal to keep
a quick layout sketch in each spec and drop polished mockups. It changes the rules files, so it is lane 3; that message
is the approval for this change only, and the finished change still comes back to the Owner before it merges.

## Lane and path

Lane 3 (`CLAUDE.md` and `.claude/skills/`), staged path: this spec and its plan audit, then one implementation pull
request per repo with one implementation audit across all five, then the Owner's yes, then merge with a merge commit.

## Boundaries

- Files: `CLAUDE.md`, `.claude/skills/visual-check/SKILL.md` and `docs/superpowers/history.md` in AutomataFramework,
  AutomataFrameworkEditors, AutomataFrameworkExamples, AutomataFrameworkSite and AutomataPrivate, plus
  `docs/roadmap.md` in AutomataFramework. Nothing else, apart from this spec and its audits here.
- Left as they are: the approved mockups in Editors' `docs/mockups/`, the CI job that photographs them and the tests
  that read them (they stay the reference for the shell and World screens they cover); `docs/design-language.md`;
  dated records (specs, audits, handoffs, progress notes, the roadmap's Done items).
- No new tools, dependencies, environments or spend. Expected duration: under two hours, most of it waiting on audits.

## The change

Each edited paragraph is rewrapped to 120 columns.

### `.claude/skills/visual-check/SKILL.md` (all five repos, the same text)

Add a section after the opening paragraphs, before "Before the next slice":

> ## Before the build: a layout sketch
>
> A brief or spec that adds or changes a screen carries a layout sketch of it: an ASCII or simple box diagram in the
> spec, or on the short path in the pull request description, that shows what goes where, meaning the main action,
> the panels and the way back. Where the smallest and largest devices in the matrix in Settings lay the screen out
> differently, it sketches both. It takes minutes. No pixel mockups, no drawing tools and no round of approving the
> look before the build: the sketch catches a wrong layout early, and the steps below settle the look after the build.
> Steps 1 to 3 check the built screens against the sketch's layout; a difference is a defect unless the pull request
> names it with a reason. A named difference also goes into the next update to the owner, with pictures of the sketch
> and the built screen, as "Expose decisions" in `CLAUDE.md` asks; it is not a new approval gate.

### `CLAUDE.md` (all five repos)

1. "Show work early": replace "Label mockups, incomplete work and known defects clearly." with "Label layout
   sketches, incomplete work and known defects clearly."
2. "The advisor": replace "approving designs or mockups" with "approving designs".
3. After the "**Slices.**" bullet, as it reads once the slice-retro change has merged, add:

   > - **Screens start from a layout sketch,** never a pixel mockup (`visual-check`, "Before the build").

4. Editors only, under "This repo": replace "- **Mockups first.** No editor code until the Owner approves that
   editor's mockups." with:

   > - **Sketch first.** No editor code until that editor's spec has a layout sketch of each of its screens
   >   (`visual-check`). No new mockups are drawn; the approved ones in `docs/mockups/` stay the reference for the
   >   shell and World screens they cover.

### `docs/roadmap.md` (AutomataFramework)

1. The six steps: step 2 becomes "**Layout sketch.** In the editor's spec, a quick sketch of each screen that shows
   what goes where; no pixel mockups." Step 3 becomes "**Build the editor.** From its spec and sketches, in the
   editors' repo; the look is settled by the design review loop in step 6."
2. "so each later mockup also follows the design language" becomes "so each later editor also follows the design
   language".
3. Rule 7: its heading "**The design language comes after the mockups are approved.**" becomes "**The design
   language comes after the shell and World mockups were approved.**", and "every later mockup reads it first"
   becomes "every later sketch and build reads it first".
4. "Who does what": drop "A mockup also goes through the visual review process."
5. The table, row 3: "the owner approves each mockup" becomes "the owner approves each finished editor".
6. Later slices: "Later: the Characters mockups (drawn in Editors #34), reviewed the same way as slice 3." becomes
   "Later: the Characters layout sketches, in its spec (the mockups drawn in Editors #34 are reference only)."; "is
   built when World's mockups cover it" becomes "is built when World's spec sketches it"; each "Later: the <Feel,
   Sound, Story, Screens> mockups, through the visual review process." becomes "Later: the <...> layout sketches, in
   its spec."

### `docs/superpowers/history.md` (all five repos)

Under "Rule changes", after the slice-retro entry, add:

> - 2026-11-16, the Owner: a layout sketch in the spec instead of pixel mockups before a screen is built
>   (`visual-check`, "Before the build"). Approved in the project chat on 2026-11-16 at 19:57
>   UTC ("yes"). Scope: this change only, made the same in all five repos, as AutomataFramework
>   `docs/superpowers/specs/2026-11-16-layout-sketch-design.md` describes. Later rule changes are lane 3 as usual.

## Acceptance criteria

1. The five `visual-check/SKILL.md` files are byte-identical after the change (`md5sum` gives one hash), and each
   differs from `main` only by the new section.
2. `grep -niE 'mock-?up'` over the five `CLAUDE.md` files, the five `.claude/skills/` folders and
   `docs/roadmap.md` finds only: the "Sketch first" bullet and the existing `docs/mockups/` and CI lines in Editors'
   `CLAUDE.md`; in the roadmap, rule 7 (now history), the slice 3 row of the table and the slice 3 section (World's
   approved mockups stay its reference), and the "reference only" note for Characters. No line anywhere asks for a
   new mockup to be drawn or approved before a build.
3. Each pull request's diff touches only the files in "Boundaries".
4. No edited line is over 120 columns.
5. Every pull request's checks are green on GitHub's runners; nothing runs on the Owner's computer.

## Plan

1. Merge this spec with its plan audits on green.
2. Wait for the five slice-retro pull requests (AutomataFramework #202, Editors #99, Examples #67, Site #51, Private
   #13) to merge, since they edit the same Slices bullet and the "Rule changes" section.
3. Branch each repo from that `main` and make the edits above, one pull request per repo, authored McThayDT.
4. Check the acceptance criteria with `md5sum`, `grep` and `awk` (line length), and wait for green on GitHub.
5. One implementation audit across all five pull requests by a fresh session; fixes on the same branches.
6. The Owner's yes, then merge each with a merge commit.

## Open product decisions

None. The Owner's approval of how screens look moves from a mockup before the build to the finished result after the
design review loop, as the request asked.

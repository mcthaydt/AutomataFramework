# Verification, implementation audit, cycle 1

Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or incomplete integrations. Do your best work.

Lane 3, staged path. One audit across all six pull requests, as the Owner allowed ("yes allow 6, go"). Run by a fresh session (Opus 5.5, medium) that wrote none of the six. Started 2026-11-18 02:27 UTC, written 02:32 UTC.

## What was examined

| Pull request | Head examined | Base (`origin/main`) |
|---|---|---|
| mcthaydt/McThayDT-Website#77 (the two kits) | `5d53e78` | `e3d1078` |
| mcthaydt/AutomataFramework#214 | `d76655a` | `186e3f2` |
| mcthaydt/AutomataFrameworkExamples#75 | `1959b32` | `ca78632` |
| mcthaydt/AutomataFrameworkSite#57 | `e379aea` | `6fc74c6` |
| mcthaydt/RukenApp#197 | `fce4668` | `43df79c` |
| mcthaydt/AutomataFrameworkEditors#114 | `a0806fb`, all but the `verify` skill's clone and stop steps | `fd1f3b1` |

The brief: `docs/superpowers/specs/2026-11-18-verification-design.md` on AutomataFramework `main` at `186e3f2`, with plan audits 1 to 4. Every base above equals the spec's Boundaries base, so plan step 7 (re-read a touched line that changed on `main`) did not apply. The PR bodies cite the spec at `0af7d61`; `git diff 0af7d61 186e3f2` changes only criterion 1's prose, no `blk` block.

Editors' head has since moved (`fddd4e6` when fetched). Its clone and stop steps, its criterion 6 record and its CI are audited on the final head the coordinator names, as a later section of this file.

## Checks a program judged

Run under Node 24 (`/opt/node24/bin`), with `SPEC` the spec at `186e3f2` and the spec's own `blk` and `sect`.

| Criterion | Kits (5d53e78) | AF (d76655a) | Examples (1959b32) | Site (e379aea) | RukenApp (fce4668) | Editors (a0806fb) |
|---|---|---|---|---|---|---|
| 1. Kit tests | test diff equals `blk kit-test` (index line aside); old kits with new test: 9 failed, 100 passed; new: 109 of 109; `--project unit` 275 passed; `--project components` 52 passed; `content:check` 0 errors, 0 warnings | – | – | – | – | – |
| 2. `sect CLAUDE.md` / `sect build` | `ca1c58dc…` / `c540d4a4…`, both kits | same | same | same | same | same |
| 3. Heading order | kit test | ok | ok | ok | ok | ok |
| 4. Edited lines (all phrases, places and blocks, by program) | ok, both kits | ok | ok | ok | ok | ok |
| 4. Shared-skill hashes | `review`, `staged-path`, `release`, `verify`, `owner-updates`, `visual-check` equal across kits | `review`, `build`, `staged-path`, `owner-updates`, `visual-check`: one hash across the five; `release` differs only in RukenApp's `commit-authors` line (`diff`: line 19); `review` and `staged-path` equal the apps kit byte for byte; `build` equals the kit; `release` equals the kit but for the `[COMMIT AUTHOR]` blank | | | | |
| 5. `verify-check` | each kit's `verify` block equals `blk verify-kit`; note line equals `blk verify-note`; block sits before "## Hook: settings.json" in a four-backtick fence; fill-in blanks 15 (apps) and 17 (games), before and after | `ok` | `ok` | `ok` | `ok` | `ok` |
| 7. History | – | ok | ok | ok | ok, plus `history-ruken` right under the setup entry; Setup, Rule changes, Standing permissions in order; Rule changes holds only the new entry | ok |
| 9. `git diff --check` | empty | empty | empty | empty | empty | empty |
| 9. Boundaries | 3 files, all allowed | 7 files, all allowed | 7, allowed | 7, allowed | 7, allowed | 7, allowed |
| 9. Live-state file gone | yes | yes | yes | yes | yes | yes at `a0806fb` |
| 10. Identity | 3 commits | 7 (one is a merge of `main`) | 6 | 5 | 8 | 8 |
| 10. No trailers | none | none | none | none | none | none |
| 10. Body ends "Requested by **McThayDT**" | yes | yes | yes | yes | yes | yes |
| 11. CI on the named head | Netlify's three checks: success, neutral, neutral (the website has no GitHub workflow) | `ci` and `commit-authors` success on `d76655a` | green, per the coordinator | green, per the coordinator | green, per the coordinator | green on `3369165`, per the coordinator |

Identity: every commit is McThayDT <107786093+mcthaydt@users.noreply.github.com> as author and committer; `git log --format=%B origin/main..HEAD | grep -i -E 'co-authored|claude-session|generated (with|by)'` printed nothing in all six.

Not checked here: CI for Examples, Site and RukenApp. This session has git read access to those three repos but no GitHub API access, and the search API's `status:` filter is no help (it reads "pending" even for AutomataFramework#214, whose runs are green). The coordinator checked them with `gh api` (reported 02:34 UTC), and every one is green: Examples `1959b32` has 13 success and 1 skipped. Site `e379aea` has 17 success, 4 skipped and 1 cancelled; the cancelled run is an older `commit-authors` run, replaced by a later success. RukenApp `fce4668` has 8 success and 1 skipped. Editors `3369165` has 12 success and 2 skipped. This is the coordinator's evidence, not this session's.

Criterion 8, read: each repo's and kit's two sections hash to the spec's blocks, so the six points, the absent property-test library, stamp and gate, and section 7's settlements are as the spec wrote them. The Risk line and `release-docs` carry the Owner's two cards word for word (criterion 4). The Owner's "yes allow 6, go" replaces the spec's "kits merge first" order for this job; the repos match the kit blocks byte for byte anyway, so nothing drifted.

Criterion 6 was not rerun, as told. Its record in each body is judged below.

## The five `verify` skills side by side

All five keep the kit's shape: `verify-check` prints `ok`, every kit line is there in order, each gap is filled. Where they differ:

| | AF | Examples | Site | RukenApp | Editors |
|---|---|---|---|---|---|
| Clean start | fresh clone of local HEAD in `$SCRATCH` | fresh clone of local HEAD in `${TMPDIR:-/tmp}`; "commit first" | in place; `git clean -xfd` in Stop | in place; Stop removes what it wrote | fresh clone of the pushed branch (under fix) |
| Uncommitted change shown? | no, and not said | no, said ("commit first") | yes | yes | no, said ("commit and push first") |
| Scratch place | `$SCRATCH`, must be set | `/tmp` here (`TMPDIR` is unset); screenshots to the scratchpad | log to `${SCRATCH:-/tmp}` | `/tmp/verify-ruken`; screenshots to `$SHOTS` | `$SCRATCH` |
| Ready wait | bounded, 60 s, prints "not ready" | bounded, 30 s | unbounded `until` | unbounded, "past 4 minutes read the logs" | unbounded |
| Sizes | 390×844, 820×1180, 1280×720 | same | 390×844, 820×1180, 1440×900 (`tests/journeys/sizes.ts`) | 412×915, 1024×768, 1280×720 (`playwright.config.ts`) | 390×844, 834×1210, 1280×800 (`tests/fixtures/journey.ts`, not named) |
| Waits for the screen before the screenshot | no | yes | yes (`h1`) | yes | yes (`[data-bar]`) |

Each repo's sizes come from its own tests, which the kit allows ("at each size in the device matrix"; the device matrix names profiles, not pixels). The one difference that changes what a builder sees is the clean start: AF runs the last commit without saying so (R1).

## Findings

### Red

**R1.** UNIT: mcthaydt/AutomataFramework, `.claude/skills/verify/SKILL.md`. VERDICT: red. REQUIREMENT: `build`, Verification, **Run it like a person.** ("its builder runs it … loads [verify] before every commit that changes behavior") and the skill's own description ("before each commit that changes behavior"). REASON: the start step clones the current HEAD, so a builder who runs it before committing, as the rules say, plays the last commit and not the change, and the skill never says so. EVIDENCE: line 17, `git clone -q . "$SCRATCH/repo"`; line 30 says only "the clone is of the directory it runs in". Examples (line 33, "only the committed files are used, so commit first") and Editors (line 17, "commit and push first") say it; Site and RukenApp run in place. EXPECTED: a builder knows the run shows only what is committed, or the run includes the working tree. FIX: add to the sentence after the block, at line 30, that the clone holds only committed files, so commit the change first (a local commit is enough). Only `.claude/skills/verify/SKILL.md`. It changes the head, so the PR body says criterion 6's runs were on `d76655a` and the edit is wording only; the coordinator decides whether one fresh run on the new head is needed.

**R2.** UNIT: mcthaydt/AutomataFramework#214, the pull request body. VERDICT: red. REQUIREMENT: criterion 6 ("The pull request body … lists each run's start and end times from `date` and the commit, and says what each screenshot shows"). REASON: the body gives durations, not start and end times, and does not say what the final round's screenshots show. EVIDENCE: "On the final head d76655a the run passed 3 of 3 with every step as written (47.5 s cold, then 26.8 s and 27.2 s, identical screenshots)". EXPECTED: three lines, each with start and end time (UTC, from `date`), the commit and what the screenshot shows (for example the language picker with the Go button). FIX: edit the body only, from the coordinator's report of that round; check the last line is still "Requested by **McThayDT**".

**R3.** UNIT: mcthaydt/AutomataFrameworkExamples#75, the pull request body. VERDICT: red. REQUIREMENT: criterion 6, as R2. REASON: durations only, and nothing on what the screenshots show. EVIDENCE: "passed 3 of 3 runs with every step as written: 21.5 s, 14.0 s and 13.2 s". EXPECTED and FIX: as R2, for `1959b32`; body only.

**R4.** UNIT: mcthaydt/AutomataFrameworkSite#57, the pull request body. VERDICT: red. REQUIREMENT: criterion 6, as R2. REASON: durations only; the screenshots are described only as matching the skill. EVIDENCE: "Round 2, on `e379aea`: 3 of 3 passed (23.1 s cold, then 11.9 s and 12.9 s)". EXPECTED and FIX: as R2, for `e379aea`; body only.

**R5.** UNIT: mcthaydt/RukenApp#197, the pull request body. VERDICT: red. REQUIREMENT: criterion 6, as R2. REASON: the times are left to the coordinator's report; the criterion puts them in the body. EVIDENCE: "Run start and end times are in the coordinator's report." EXPECTED and FIX: as R2, for `fce4668` (the screenshot is already described: the "Coming soon" home page); body only.

### Notes (recorded, not required here)

**N1.** UNIT: AutomataFramework, `.claude/skills/verify/SKILL.md` line 32. The timing record is stale and does not hold together: "29 to 43 seconds" sits next to "the author's own run took 46", on `d3f6530`; the latest runs on `d76655a` took 47.5 s cold, then 26.8 s and 27.2 s. If R1's fix touches the file, refresh it: the newest measured times and their commit.

**N2.** UNIT: AutomataFramework, `.claude/skills/verify/SKILL.md` line 47. The first screenshot (the main screen) is taken straight after `goto`, with no wait for the Go button; Examples waits (`getByRole('button', { name: 'Go' }).waitFor()`). Six runs gave identical screenshots, so no flake is shown; one `waitFor` line would close the gap.

**N3.** UNIT: AutomataFramework, `docs/superpowers/history.md`. The new Setup entry is followed by a blank line, and the new Rule changes entry is preceded by one, unlike the entries around them and unlike the other four repos. The text of both blocks is exact (criterion 7 passes).

**N4.** UNIT: AutomataFrameworkExamples, `.claude/skills/verify/SKILL.md` line 35. Stale timing: "measured 02:09:44 to 02:09:58 UTC … on commit 075225a", while the body reports 02:10:29 to 02:10:43 on `a8e92f3` and the final round 21.5 s cold.

**N5.** UNIT: AutomataFrameworkExamples, `.claude/skills/verify/SKILL.md` lines 82 to 84. Run in the shell the start left in `$WORK/repo`, Stop deletes that folder and then runs `git status --short` in it, which fails; line 87 says to run it "in your own checkout", but the block has no `cd` back.

**N6.** UNIT: AutomataFrameworkExamples, `.claude/skills/verify/SKILL.md` lines 17 to 27. `|| exit 1` ends an interactive shell. In an agent's one-command shell it only stops the block, which is what it is for; harmless here.

**N7.** UNIT: AutomataFrameworkExamples, `.claude/skills/verify/SKILL.md` line 33. It says the clone is "under the scratchpad", but `WORK` is `${TMPDIR:-/tmp}/examples-verify`, and `TMPDIR` is unset in this container, so it is `/tmp`. The screenshots do go to the scratchpad. Say `/tmp`, or use the scratchpad.

**N8.** UNIT: AutomataFrameworkSite, `.claude/skills/verify/SKILL.md` line 24. The record gives 11 s and 13 to 14 s on `2fc87ac`; the fresh session measured a cold first start of about 21 to 23 s on `e379aea`. Record the cold time too.

**N9.** UNIT: AutomataFrameworkSite, `.claude/skills/verify/SKILL.md` line 30. Decided, no change: a one-off screenshot of the main screen is taken at all three sizes, because the kit's own text says "at each size in the device matrix in Settings", which the repos cannot change.

**N10.** UNIT: AutomataFrameworkSite, RukenApp and Editors, `.claude/skills/verify/SKILL.md`, the ready wait (Site line 21, RukenApp line 37, Editors line 54). Each `until` loop has no limit, so a server that never comes up holds the session until the tool's own timeout. AutomataFramework and Examples stop after 60 and 30 seconds and say so. Site's `curl -s` also accepts any answer, not only the 200 its ready line names.

**N11.** UNIT: AutomataFrameworkSite, `.claude/skills/verify/SKILL.md` lines 45 to 50. Stop runs `git clean -xfd` in the builder's own checkout, which deletes every untracked file (new files of an uncommitted change, an uncommitted live-state file) beyond what git can restore. Line 50 warns about it. AutomataFramework, Examples and Editors avoid it with a fresh clone. A fresh clone, or `git clean -xfd` limited to build output, would remove the risk.

**N12.** UNIT: RukenApp, `.claude/skills/verify/SKILL.md` line 40. The warm time "about 25 seconds" reads high against the 21.3 to 21.7 s measured on `fce4668`.

**N13.** UNIT: RukenApp, `.claude/skills/verify/SKILL.md`, "When it breaks". The harmless pnpm warnings "Ignored build scripts" and "Proxy environment variables" are not listed, as AutomataFramework lists its msgpackr one. A stranger may stop to chase them.

**N14.** UNIT: AutomataFramework, Examples and Editors, `.claude/skills/verify/SKILL.md`, the sizes. Site and RukenApp name the file their sizes come from; these three do not (Examples' match `tests/journeys/open.ts`, Editors' match `tests/fixtures/journey.ts`). Naming it keeps "the file wins" checkable.

## The drunk-grandma test

The new rule text is the spec's, approved through its plan audits, and every repo carries it byte for byte. The one new line a person reads in the kits, the `verify` note ("Claude fills in the parts in angle brackets the first time it starts the app or game; you leave them as they are"), is plain and asks nothing of them. The five `verify` skills are read by Claude, not a person; their prose is short and plain, with commands where commands belong. Nothing failed the test.

## Not in scope, recorded

- The Owner's "We can remove the tests that no longer belong after" is a later job.
- The spec's "Found on the way" items (`--passWithNoTests`, Editors' Firefox flaky test, the kits' `meta.json` skill counts) stay their own threads; none was touched.

## Counts at the named heads

| Pull request | Red | Notes |
|---|---|---|
| McThayDT-Website#77 | 0 | 0 |
| AutomataFramework#214 | 2 (R1, R2) | 3 (N1, N2, N3), plus its part of N14 |
| AutomataFrameworkExamples#75 | 1 (R3) | 4 (N4 to N7), plus its part of N14 |
| AutomataFrameworkSite#57 | 1 (R4) | 4 (N8 to N11), N9 decided with no change |
| RukenApp#197 | 1 (R5) | 2 (N12, N13), plus its part of N10 |
| AutomataFrameworkEditors#114 at `3369165` | 1 (R6) | 4 (N15 to N18), plus its parts of N10 and N14 |

## Editors' final head, `3369165`

The coordinator named `3369165` as Editors' final head (skill md5 `4bea5f4e0bb7d55f47940b5866f613bd`, matched). `git diff a0806fb 3369165` touches only `.claude/skills/verify/SKILL.md` (fixes F1 to F4) and removes the live-state file. On `3369165`: `verify-check` prints `ok`; the criterion 4 and 7 checks still pass; `git diff --check origin/main...HEAD` is empty; the diff is still the 7 allowed files; both new commits (`fddd4e6`, `3369165`) are McThayDT as author and committer, with no trailers.

- F1, the clone: `R=$(git rev-parse HEAD)`, a fresh clone of `origin`, then `git checkout -q $R`. It now works on a detached checkout and on a branch. It says plainly to commit and push first, since the clone holds only what is pushed, which settles for Editors the problem R1 names for AutomataFramework. A separate fresh session ran the start and stop steps on `3369165`, once on a detached checkout and once on the branch. Both passed with every step as written (69 s and 79 s), the screenshots survived the stop step, and `$S` was gone afterwards (as the coordinator reported).
- F2: the screenshots go to `$SCRATCH` as `verify-main-<width>.png`, so the stop step keeps them.
- F3: says what each size shows.
- F4: says to run "Start it" and "Drive it" as one script, or to set the variables again in each new shell.

**R6.** UNIT: mcthaydt/AutomataFrameworkEditors#114, the pull request body. VERDICT: red. REQUIREMENT: criterion 6 (the body links or names the report, lists each run's start and end times and the commit, and says what each screenshot shows) and criterion 11 (CI green on the head). REASON: the body is still the one from before the runs. EVIDENCE: "Checks (on 6a0a6fe …)", "Criterion 6 (three fresh-session runs): not done yet", "Criterion 11: CI not watched yet". EXPECTED: the checks restated on `3369165`; three fresh runs in a row on the head commit, each with start and end times, the commit and what the screenshot shows; CI's result on `3369165`. The coordinator reported a targeted check of two runs on `3369165`. If no three-in-a-row round has run on this head, criterion 6 is not yet met. FIX: run what criterion 6 still lacks, then edit the body only. Check that its last line is still "Requested by **McThayDT**".

**N15.** UNIT: AutomataFrameworkEditors, `.claude/skills/verify/SKILL.md`, "Stop it". The comment still says "the fresh clone, the loader and the screenshots all live in $S". Since F2, the screenshots are in `$SCRATCH`.

**N16.** UNIT: AutomataFrameworkEditors, `.claude/skills/verify/SKILL.md` line 87. "At 834 and 1280 … the tool bar is at the bottom", but at 1280, List and Add sit in a left side rail, not on the bottom bar (the fresh session's note).

**N17.** UNIT: AutomataFrameworkEditors, `.claude/skills/verify/SKILL.md` line 58. The time record says 52 and 58 seconds, and its commit changed from `afafe43` to `fa7e558`, which is the "first draft with times to measure", older than the skill it times. The fresh session measured 69 and 79 s on `3369165`. Record those with `3369165`.

**N18.** UNIT: AutomataFrameworkEditors, `.claude/skills/verify/SKILL.md` lines 16 and 77. `drive.js` reads `process.env.SCRATCH`, but line 16 says "set SCRATCH", not export it. Set without `export`, it saves `undefined/verify-main-….png` under `$S/repo`, and the stop step deletes it. Say `export SCRATCH=…`.

**Follow-up, outside this change (product, not the skill):** at 390 wide the editor's top bar drops the game's name ("Levels · Level 1", "Play", "Up to date"), and the welcome card covers the tool bar until it is closed. Both were seen by F3's runs. This is its own thread, for the Owner to weigh.

CI for Editors on `3369165` is green per the coordinator's `gh api` check (12 success, 2 skipped); not checked by this session.

Counts for Editors#114 at `3369165`: 1 red (R6) and 6 notes (N15 to N18, plus its parts of N10 and N14 = 6). The other five pull requests' counts above are unchanged.

Each red is a fix on its own branch by that repo's build session, checked afterwards by this session or a program: R1 by reading the new sentence and rerunning `verify-check`; R2 to R5 by reading the edited body and its last line.

## Fix checks

Each fix was checked by this session, reading the commit or the body. The heads stay as named above unless a row says otherwise.

| Finding | Fix | Checked | Result |
|---|---|---|---|
| R1 | AutomataFramework `39cf051` adds one sentence to `verify`: "The clone holds only committed files, so commit the change first (a local commit is enough), or the run shows the old code." | `git diff 9042c97 39cf051` changes that one line only; `verify-check` prints `ok` | closed |
| R3 | Examples#75 body, head still `1959b32` | each of the three runs has a start and an end from `date` (02:16:02.84 to 02:16:24.34, 02:16:40.38 to 02:16:54.34, 02:16:55.00 to 02:17:08.25), the commit, and what the screenshots showed; last line "Requested by **McThayDT**" | closed |
| R4 | Site#57 body, head still `e379aea` | each run has a start from `date` (02:24:35, 02:25:13, 02:25:26), the commit, and what the screenshots showed at each size. The ends are worked out as start plus measured time and marked "about", and the body says so; both parts come from measurements, and nothing is made up. Last line correct | closed |
| R5 | RukenApp#197 body, head still `fce4668` | three runs in a row with start and end from `date` (02:21:49 to 02:22:11, 02:22:22 to 02:22:43, 02:22:51 to 02:23:12), plus a cold run whose time was not measured, said plainly; the screenshot is described, with one md5 each time; last line correct | closed |

Still open: R2 (AutomataFramework's body, waiting on a fresh three-run round on `39cf051`) and R6 (Editors' body, waiting on a new head and its three-run round). The notes N15 to N18 are fixed or not at the builder's choice.

### N2 proved real

The fresh round on `39cf051` failed 2 of 3, as the coordinator reported. In runs 1 and 3, `main.png` showed only the loading bar: the race N2 named. N2 is now red (a broken `verify` step; `build`, **Run it like a person.**: "a step in it that breaks or flakes is fixed first"). The fix is `d65db0c`, merged into the branch as `3e9c42a` (skill md5 `4752864cb66a68a563d6338dbc4de19b`, matched). It adds `getByRole('button', { name: 'Go' }).waitFor()` before the first screenshot, a "When it breaks" line ("`main.png` shows only a loading bar: wait for the Go button before the screenshot") and a new timing line (about 22 s warm and 42 s cold, on `39cf051`). Checked: that diff, nothing else in the skill changed, `verify-check` prints `ok`, `git diff --check` is empty, both commits are McThayDT with no trailers, and no live-state file is left. The fix reads right. It closes when the fresh three-run round on `3e9c42a` passes, and that round's times go into R2. The timing line also closes N1. The other four skills already wait for their main screen before the screenshot (Examples the Go button, Site the `h1`, RukenApp the heading and the Sign in link, Editors `[data-bar]`).

### Lesson for the retrospective

ACCEPTED: AutomataFramework's `verify` took its first screenshot right after `goto`. A fresh run's report and this audit both saw that it did not wait. The audit marked it a note because six runs had passed, and the next round failed 2 of 3 on it. DERIVED: a step in `verify` that does not wait for what it is about to look at or press is red, however many runs it has passed. TRIGGER: an audit or fresh run of a `verify` skill, or a change to `.claude/skills/verify/SKILL.md`. LOOK FOR: a screenshot, read or press with no wait on its element just before it. LANDS IN: the brief of any plan that writes or changes a `verify` skill. The coordinator adds it under "Lessons" in `history.md` when the work is archived, unless the retrospective turns it into a check.

### Editors' R6 and N15 to N18, head `62a75b7`

Checked on `62a75b7` (skill md5 `546f4975f98e95af1231a9225ab82e52`, matched). `git diff 3369165 62a75b7` touches only `.claude/skills/verify/SKILL.md`:
- `export SCRATCH=…` is now a line of its own, before `S` is made, so the screenshots `drive.js` writes go to the scratchpad. This closes N18.
- The stop comment says the screenshots stay in `$SCRATCH`. This closes N15.
- At 1280, List and Add sit in a left side rail. This closes N16.
- The timing line reads 69 s and 79 s, on `3369165`. This closes N17.

`verify-check` prints `ok`. `git diff --check origin/main...HEAD` is empty. The whole diff is still the 7 allowed files. The new commit is McThayDT as author and committer, with no trailers.

R6: the body is rewritten for `62a75b7`. It restates criteria 2 to 5, 7, 9, 10 and 11 on that head. Its criterion 6 table gives three runs in a row, each with a start and an end from `date` (02:38:41 to 02:40:13, 02:40:25 to 02:41:22, 02:41:28 to 02:42:38 UTC), the skill's md5 and what the screenshots show at each size. It names the product follow-up, and its last line is "Requested by **McThayDT**". CI on `62a75b7` is green per the body and the coordinator (`ci` and `commit-authors`); this session did not check it. Closed.

### Where it stands

Closed: R1, R3, R4, R5, R6; notes N1, N15, N16, N17 and N18 fixed. Open: R2 (AutomataFramework's body) and N2, re-marked red; both wait for the fresh three-run round on `3e9c42a`. The other notes (N3 to N14) were left as notes, at the builders' choice.

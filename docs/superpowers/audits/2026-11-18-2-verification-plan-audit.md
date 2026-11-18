# Verification spec: plan audit, cycle 2

Audited: AutomataFramework draft pull request #213, commit `426f50c`, `docs/superpowers/specs/2026-11-18-verification-design.md`.
Auditor: a fresh plan audit session (Opus 5.5, medium), with `review` and `staged-path` loaded. Lane 3.

**Result: 6 red, 9 notes.** The spec is not ready to merge yet. Every cycle 1 finding is settled except one: the fix
for R5 and N10 put the reviewer's steps in `build`, and the reviewer never loads `build` (R3 below). Every red finding
has a small fix inside the spec. None needs the Owner.

## What was checked, and how

Each check below was run by this audit. None of it was taken from the spec's own table.

- **Sources.** AutomataFramework `426f50c` (base `9073d87` = `origin/main`). RukenApp `43df79c`, Editors `fd1f3b1`,
  Examples `ca78632` and Site `6fc74c6` were cloned from `main`. Each `main` is still at the base the spec names.
  McThayDT-Website was added read only; its `e3d1078` was checked out as a scratch worktree, and nothing was pushed
  to it.
- **`blk` extraction.** All 11 blocks were extracted with the criteria's `blk` function: `claude-section` (3 lines),
  `risk-line` (1), `build-section` (13), `review-lessons` (5), `release-line` (1), `verify-kit` (40), `verify-check`
  (16), `history-rule` (13), `history-setup` (5), `history-ruken` (7) and `kit-test` (59). `{ blk claude-section;
  echo; } | md5sum` gives `2364effa340d2680f8f35a3e22154f8f`. `blk build-section | md5sum` gives
  `1cc3afc09f7804c5e089f84d8e41bf75`.
- **The edits applied by a program.** A script in the scratchpad applied sections 1 to 5, copied only from `blk`
  output, to scratch copies of all five repos' `CLAUDE.md` and `.claude/` and to both kits. Every anchor was found
  exactly once, within its own block. In the games kit, the `staged-path` Retrospective anchor also appears once more,
  in `vertical-slice` (line 467). Scoped to the `staged-path` block, it is unique. That line points to `staged-path`,
  so it needs no edit.
- **Criteria 2 to 4, all five repos.** `sect CLAUDE.md` gives `2364effa` and `sect build` gives `1cc3afc0` in every
  repo. `grep -n '^## '` gives Stack and checks, How work goes, Owner visibility and early steering, Rules that never
  bend, Verification, Risk, The staged path, Settings. Each of `review`, `build`, `staged-path`, `owner-updates` and
  `visual-check` gives one hash across the five. `release` gives two hashes, and `diff` shows only line 19
  (`commit-authors`) in RukenApp. "fails once and passes on retry" appears once in `CLAUDE.md` and once in `build`.
  No line starts with "- **Tests.**" or "- **Lessons become tests first.**". The risk line sits right after **Lane 3**,
  `review` ends with `blk review-lessons`, and the release line sits right after the compaction-hook item.
- **Criterion 1, the kits**, on the scratch website under Node 24.22.3 (`npm ci`, then `npx svelte-kit sync`):
  - `git apply` of `blk kit-test` is clean.
  - The new test fails on the old kits: 7 failed, 102 passed (the 7 tests the spec names).
  - On the new kits: `kit-content.test.ts` passes 109 of 109, `--project unit` passes 275, `--project components`
    passes 52, and `content:check` gives "0 errors, 0 warnings". `git diff --check` is clean.
  - Rows, counted with the test's own `wrapped`: apps went from 196 to 195 and games from 199 to 197. The 200 limit
    and every pinned phrase are untouched.
  - Kit hashes: each kit's CLAUDE.md block gives `2364effa` and its build block gives `1cc3afc0`. Each kit's verify
    block equals `blk verify-kit`. The kits' `review` and `staged-path` blocks equal the repos' files once a final
    newline is added (note N7).
- **Criterion 5, `verify-check.py`.** It prints `ok` on a filled copy. It fails on the unfilled kit ("blanks left")
  and on a copy missing "## Stop it". It **also prints `ok` on a copy whose six blank-only lines were deleted** (R1).
- **History** (criterion 7's places). The four repos have "## Setup", then "## Rule changes", newest first. RukenApp
  has neither the 2026-11-16 entry nor "## Rule changes". Editors and RukenApp have "## Flaky tests". The four bullets
  in `history-ruken` match the other repos' 2026-11-16 entry word for word.
- **RukenApp `playwright.config.ts`.** The stand-ins on 12111 to 12114 and the app command are as section 5 says, and
  `TEST_DATABASE_URL` is used. The game gate on 8788 waits on `when-up.ts`.
- **Superpowers 7.0.2** at `~/.claude/plugins/cache/superpowers-marketplace/superpowers/7.0.2/skills/`. Every
  quote in section 7 was found in `test-driven-development/SKILL.md`, `verification-before-completion/SKILL.md` or
  `executing-plans/SKILL.md`. They differ only in markdown and line wrapping.
- **Website kit page.** `PromptDetail.svelte` line 65 shows every `kitPlaceholders` blank as a "fill in" list. On the
  new kits, that list grows from 15 to 24 entries (R5).
- **Identity.** All 10 commits in `origin/main..426f50c` are authored and committed by McThayDT
  <107786093+mcthaydt@users.noreply.github.com>, with no trailers. The pull request body ends with
  `Requested by **McThayDT**`. `git diff --check origin/main...426f50c` flags one line, in the cycle 1 audit (N9).

## Cycle 1 findings, one by one

| Finding | Settled? | Evidence |
|---|---|---|
| R1 heavy checks | Yes | **Quick and steady** and section 7's row both say: before a push, the journeys the change reaches; the full suite in CI. |
| R2 flaky owner, rerun, "Fix now" | Yes | One rerun, both results reported, root cause in its own thread unless it blocks; "Other tests fail? Fix now" is a listed difference. How a green rerun meets `release` is N3. |
| R3 lane of `verify` edits | In `CLAUDE.md` only | The Risk line is the Owner's words and sits right after **Lane 3**. But `release` still says every skill is lane 3 (R4). |
| R4 "their own pull requests" | Yes | Defined: no product code and no tests; first-time setup and rule changes; the root `CLAUDE.md`; workflow first. |
| R5 title promised "never" | Partly | Retitled honestly. The step "its reviewer reads those first" is in `build`, which the reviewer does not load (R3). |
| R6 "the check to run" | Yes | LOOK FOR; the new example (waiting on CI) is one no test can catch. |
| R7 retrospective deleting lessons | Yes | "keeps the rest in `history.md`, pruning them". |
| R8 Tests bullet kept | Yes | It is replaced. But the new section names only two of the six points (R2). |
| R9 screenshots | Yes | Criterion 6: a private Artifact page or the coordinator. |
| N1 to N9, N11 | Yes | Checked in the files above. For N8, a few rough spots remain (N8 below). |
| N10 reviewer runs `verify` on `main` | No | It is written in `build`, where the reviewer does not see it (R3). |

## Red findings

**R1**
- UNIT: spec section 5, the `verify-check` program; criterion 5.
- VERDICT: red
- REQUIREMENT: criterion 5 ("every blank filled in ... no `[UPPER CASE]` blank is left"), and CLAUDE.md "A check is a
  test that fails by itself".
- REASON: the program skips any kit line that is only a blank, so a skill with those lines deleted passes.
- EVIDENCE: from the kit text, delete the six blank-only lines (`[WHAT IT IS]`, `[START COMMANDS]`, `[MAIN SCREEN]`,
  `[JOURNEYS]`, `[STOP COMMANDS]` and `[KNOWN FAILURES]`) and fill the three inline blanks with `x`.
  `python3 -I check.py kit.md emptied.md` prints `ok`. Such a skill has no start commands, no journeys and no stop
  steps. Criterion 6 might catch the start commands, but nothing catches empty journeys, stop steps or known
  failures.
- EXPECTED: for a blank-only kit line, the program needs at least one non-empty repo line between the match before it
  and the match after it. The spec's test list adds the emptied copy as a case that must fail.
- FIX: edit the `verify-check` block and criterion 5's "tried" sentence in the spec. Nothing else changes.

**R2**
- UNIT: spec section 1, the `claude-section` block, and the paragraph after it.
- VERDICT: red
- REQUIREMENT: the brief. The Owner chose "Core rewrite" as offered: "replace the Tests bullet with a Verification
  section holding the six points", and the request was to add it "to our games and apps claude.md".
- REASON: the `CLAUDE.md` section names only two of the six points: run it like a person, and flaky tests. The other
  four (the hardest test first, no change edits its own check, lessons with a trigger, prune) appear only in `build`.
  The spec says this is forced by the games kit's 200-row limit. It is not: one more sentence fits.
- EVIDENCE: spec line 135. Measured with the kit test's own `wrapped`: the current paragraph is 3 rows. This
  paragraph is 4 rows:

  > Checks let work be handed off; the owner reads the evidence. A change that alters the product is run like a
  > person, through the `verify` skill, before it is called done. The test hardest to fool comes first. A test that
  > fails once and passes on retry is a defect: record it under "Flaky tests" in `docs/superpowers/history.md`. A
  > change does not quietly edit its own check. Lessons carry a trigger, and each retrospective prunes. The full rules
  > are in `build`.

  With it, the games kit has 198 rows and the apps kit 196, both under 200, and no limit changes. The full rules
  still live in `build`.
- EXPECTED: the `CLAUDE.md` section names all six points in one short sentence each and points to `build` for the
  rules.
- FIX: in the spec, change the `claude-section` block, recompute criterion 2's first hash, update the row counts in
  section 1, criterion 1 and the pull request body, and reword the "Why the bullets move" paragraph. Only the spec
  changes.

**R3**
- UNIT: spec section 2, **A change does not quietly edit its own check.** (its last two sentences); section 3, the
  `review` edit.
- VERDICT: red
- REQUIREMENT: cycle 1's R5 and N10, as the spec's table says they are settled. Also the coordinator's question:
  does a session that needs these rules load `build`?
- REASON: the steps written for the reviewer live only in `build`, and the reviewer never loads it:
  - "Its reviewer ... reads those first, and when it edits `verify` also runs the `verify` on `main`."
  - `build`'s description is "Use when writing a brief's acceptance criteria, or writing or changing code or tests".
  - An audit or lane 2 review is a fresh session that loads `review`, and `review` has no pointer to Verification in
    `build`. The spec's only edit to `review` is its Lessons section.
- EVIDENCE: spec line 169. `build` frontmatter. `review/SKILL.md` "## Checks and reviews" and "## Audits" contain
  neither instruction after the edits (`grep -c 'verify' review/SKILL.md` on the edited copy gives 0).
- EXPECTED: `review` itself tells the reviewer to read every changed or deleted test, golden or `verify` step first,
  and, when the pull request edits `verify`, to also run the `verify` from `main`.
- FIX: add one bullet to `review` "## Checks and reviews", as a new spec block with criterion 4 checking it. It could
  read: "A pull request that changes or deletes an existing test, golden or `verify` step names each one in its body.
  Read those first. When it edits `verify`, also run the `verify` from `main` (Verification in `build`)." It is the same
  text in the kits and the repos. Optionally add a pinned phrase to the new kit test. Only the spec changes.

**R4**
- UNIT: spec section 4, the `release` edits; the Outcome claim "`review`, `staged-path` and `release` get small edits
  so they agree".
- VERDICT: red
- REQUIREMENT: the Owner's decision "Same lane as the code" (the Risk line). Consistency between `CLAUDE.md` and the
  skills.
- REASON: `release` still makes every skill lane 3, so a session that classifies from `release` puts a `verify` edit
  in lane 3, against the Owner's line. A `verify`-only fix ("a step in it that breaks or flakes is fixed first") also
  has no code change to take its lane from.
- EVIDENCE: `release` "## Docs only": "rules files (CLAUDE.md, the skills, and anything else that decides what needs
  the owner) are `.md` files too, but a change to them requires lane 3 checks and reviews plus the owner's approval".
  `release` "## Lanes and merging": "lane 3 (the rules files included)". Neither is edited by the spec, and both are
  the same in all five repos and both kits.
- EXPECTED: `release` "Docs only" says "the shared skills", followed by "(a repo's own `verify` and `this-repo` skills
  take the lane of the code change they describe, and an edit to one alone is lane 1: Risk in CLAUDE.md)". Or the
  spec says plainly which lane a `verify`-only edit takes, and puts it in `release`.
- FIX: one more `release` edit in section 4, as a block with a check in criterion 4. No kit test pins that sentence
  (checked with `grep`). Only the spec changes.

**R5**
- UNIT: spec section 5, "In the kits" (the blanks), and the kits' page on the website.
- VERDICT: red
- REQUIREMENT: the drunk-grandma test ("nothing that needs explaining"). The spec's own claim that the blanks
  "pick them up with no other change".
- REASON: on the kit page, the website lists every blank under "fill in". The nine `verify` blanks join that list, but
  the person cannot fill them in. A session fills them in "the first time the app or game starts": the start time and
  commit are measured, and the known failures are found. `[WHAT IT IS]` also sits next to `[WHAT IT IS FOR]`.
- EVIDENCE: `src/lib/components/prompts/PromptDetail.svelte` lines 44 and 65 (`kitPlaceholders` becomes the
  `fill-in` list). `kitPlaceholders` on the new apps kit gives 24 entries, up from 15. The new ones are `WHAT IT IS`,
  `START COMMANDS`, `READY SIGNAL`, `START TIME`, `COMMIT`, `MAIN SCREEN`, `JOURNEYS`, `STOP COMMANDS` and
  `KNOWN FAILURES`. "Start here" step 1 asks the person to fill in only the `CLAUDE.md` block.
- EXPECTED: a person reading the kit page sees only the blanks they fill in. The `verify` blanks read as the session's
  job.
- FIX: choose one, inside the spec and the kit boundaries:
  - (a) Write the `verify` blanks so `placeholders` does not match them. For example, use lowercase angle-bracket
    blanks like `<start commands>`, and change `verify-check`'s `blank` pattern and the new kit test's
    `kitPlaceholders` assertion to match.
  - (b) Keep `[UPPER CASE]` blanks, rename `[WHAT IT IS]` to `[THE PRODUCT IN ONE LINE]`, and make the note line say
    "Claude fills these in the first time it starts the app or game; you do not".

  (a) is recommended, because it keeps the person's list as it is. Only the spec changes.

**R6**
- UNIT: spec "Lane and path" against "Plan" steps 2 and 5.
- VERDICT: red
- REQUIREMENT: the spec agrees with itself. The coordinator starts sessions from it.
- REASON: the two parts give a different number of audits and approvals.
  - "Lane and path" says "one implementation audit across all six, the Owner's approval".
  - Plan step 2 says the kits get "Its implementation audit and the Owner's approval ... before units 2 to 6 start".
  - Plan step 5 says "One implementation audit across the five repo pull requests".
- EVIDENCE: spec lines 71 to 73, 604 to 606 and 612.
- EXPECTED: one sequence: the kits' audit and the Owner's approval, then the five repos, then one audit across the
  five, then the Owner's approval. The duration estimate says whether the Owner's first approval is inside the "about
  one working day".
- FIX: reword "Lane and path" (and the estimate if needed). Only the spec changes.

## Notes (recorded, not blocking)

**N1**
- UNIT: `build` description; the Skills line ("`build` for acceptance criteria and code").
- VERDICT: note
- REASON: sessions pick a skill by its description (`.claude/after-compaction.md` step 2). The rules a CI-watching or
  retrospective session needs are now in `build`: a flaky rerun and pruning. Neither the description nor the Skills
  line says so. `CLAUDE.md`'s "The rules for tests, lessons and checks are in `build`" does say it.
- FIX (optional): the build description adds "or when a test fails, flakes or is pruned". Since it is frontmatter,
  check that the kit test's frontmatter pin still passes.

**N2**
- UNIT: section 1, deleting the **Tests.** bullet.
- VERDICT: note
- REASON: "Never loosen, skip or re-record a test to hide a defect" leaves "Rules that never bend" for a skill that is
  loaded only when writing code or tests. With R2's paragraph, adding that sentence makes it 5 rows (games 199, still
  under 200).
- FIX (optional): keep that one sentence in the `CLAUDE.md` section.

**N3**
- UNIT: **Quick and steady** against `release` lane 2 ("a clean run: unchanged code is never retried into green").
- VERDICT: note
- REASON: the allowed diagnostic rerun can turn a lane 2 pull request green on unchanged code. Nothing says whether
  that green counts for the merge.
- FIX (optional): one clause: "a rerun that finds a flaky test does not count as the clean run lane 2 needs".

**N4**
- UNIT: **Run it like a person** ("loads before every commit that changes behavior") and the `verify` kit's "From a
  clean checkout".
- VERDICT: note
- REASON: in RukenApp a clean start is Postgres, migrations, a build and six servers. Superpowers' `executing-plans`
  commits after every task. The text does not say whether one session may keep the app running between its own
  commits.
- FIX (optional): "a clean start once per session; later runs in the same session may reuse the running app".

**N5**
- UNIT: **Lessons become tests first, and carry a trigger.** against `review` "## Lessons".
- VERDICT: note
- REASON: the two give different routes. `build`: "Before it pushes, a session reads the lessons and acts only on
  those whose trigger its diff matches". `review`: "A lesson lands in the plan's brief when its trigger matches ... not
  in a worker's instructions".
- FIX (optional): keep one route, or say that both apply.

**N6**
- UNIT: section 7, the exceptions row.
- VERDICT: note
- REASON: superpowers exempts throwaway prototypes and generated code. These rules now exempt only docs, purely
  visual changes and configuration. So generated output (the API report, compiled messages, a Prisma client) reads as
  needing a failing test first.
- FIX (optional): "generated code is verified through its source and the tool that makes it".

**N7**
- UNIT: criterion 4 ("equal the apps kit's blocks byte for byte"); section 3 ("from the line after '## Lessons'").
- VERDICT: note
- REASON:
  - `parseKitPrompt` drops the final newline, so a plain `cmp` of a saved block against the repo file fails by one
    byte. This audit appended a newline first.
  - Section 3 can be read as dropping the blank line after "## Lessons". This audit kept it. The kit-to-repo equality
    catches a mismatch, but the text should not leave it to chance.
- FIX (optional): give the command (`{ cat block; echo; } | cmp - file`) and say that the blank line stays.

**N8**
- UNIT: section 2 wording (the drunk-grandma test).
- VERDICT: note
- REASON: the text is mostly plain now. A few rough spots remain:
  - **Test first, from the outside in.** is six sentences in one bullet.
  - "also runs the `verify` on `main`" is awkward; "runs `verify` from `main`" reads better.
  - "run inside every build" can be read as the `build` skill or every change.
  - `verify`'s "deviceScaleFactor 1" is jargon, though it is the container's own term.
- FIX (optional): reword, then recompute the hash.

**N9**
- UNIT: the pull request, not the spec.
- VERDICT: note
- REASON: `git diff --check origin/main...426f50c` flags trailing whitespace at the cycle 1 audit's line 112 (a
  blank line holding two spaces). It is harmless. Criterion 9 applies only to the implementation pull requests.
- FIX: none needed. The next spec commit may strip it.

## The coordinator's three questions

1. **Moving the rules into `build`.** The Tests bullet is replaced (deleted), as the Owner asked. A session that writes
   code loads `build` ("How work goes" says so, and so does the section's last sentence). What the move costs:
   - The reviewer's steps sit in `build`, out of the reviewer's sight (R3).
   - The `CLAUDE.md` section names only two of the Owner's six points, though all six fit (R2).
   - A CI-watching session may not think to open `build` (N1).
2. **Superpowers.** Section 7 reads 7.0.2 accurately, and every quote was found. The nesting (the hardest test first,
   unit tests under it), "break it on purpose", the rewrite yardstick and "Other tests fail? Fix now" are settled, and
   the differences are in `build` for the kits too. Left: generated code (N6), and a diagnostic rerun against lane 2's
   clean run (N3).
3. **Plain words.** The `CLAUDE.md` section is plain. The `build` section mostly is (N8). The one real problem for a
   person is on the website: nine blanks they cannot fill in (R5).

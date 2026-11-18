# Verification: run it like a person, the hardest test first, checks kept like the product

## Outcome

Every session, in the two master kits and in the five code repos, proves a change the way a person would see it working,
not only by passing tests. The two kits in mcthaydt-website (`claude-md-apps` and `claude-md-games`) change first, since
they are the source; then the five repos install the same text, word for word, so they do not drift from the kit.

- `CLAUDE.md` gets a short Verification section, in place of the **Tests.** and **Lessons become tests first.**
  bullets: checks let work be handed off, a change is run like a person through the `verify` skill before it is called
  done, a flaky test is recorded, and the full rules are in `build`.
- `build` gets those full rules, as a "## Verification" section at its end: run it like a person; the test hardest to
  fool comes first (journeys, then property tests, then old-versus-new tests); test first, from the outside in; the
  Tests rules, kept; quick and steady checks, with a flaky test fixed at its root in its own thread or deleted with the
  reason written down; a change does not quietly edit its own check; lessons carry a trigger read from the diff; each
  retrospective prunes; and how superpowers' testing skills are read under these rules.
- Risk gets one line: an edit to a repo's own `verify` or `this-repo` skill takes the lane of the code change it
  describes, and is named in the pull request body. `CLAUDE.md` and the shared skills stay lane 3.
- A new skill, `verify`, says how to start this repo's app or game from a clean checkout and drive it like a person.
  The kits carry it with blanks; each repo fills them in. A fresh session that has only that skill starts the app or
  game in a cloud container and shows its main screen, three times in a row.
- `review`, `staged-path` and `release` get small edits so they agree.

## Why

The Owner asked to rethink how tests are done, after the Claude Code team's article "How the Claude Code team thinks
about verification" (claude.dev/blog/how-the-claude-code-team-thinks-about-verification). Its points that this change
takes up, read by this session on 2026-11-18:

- Checks are what let work be handed off: the engineer's job moves "from reading every diff to defining what 'done'
  looks like and reviewing the evidence".
- "Running the app end to end matters more than tests." The start and run steps live in a `verify` skill in
  `.claude/skills/`, used before committing: "It's your smoke test harness, so you want it rock solid."
- "If you have to focus on one test type, pick end-to-end": they are hard to fool, while a unit test can pass when
  "both the agent and the test don't understand the full task". Then property tests (round trips, invariants, doing it
  twice is the same as once, a fast version that agrees with a plain one) and differential tests ("the old system is
  the oracle", with irrelevant differences normalised and a list of approved changes).
- Flaky tests train an agent "to run them again rather than fixing the failing code"; slow tests get run less. Flaky
  tests are never skipped, slept or retried into green; with no root cause, delete the test and record why.
- "If a change can modify the check that judges it, the check is broken."
- Their reliability checklist gives each item "a trigger readable from a diff, a check, and the incidents or PRs behind
  it", and only the items whose trigger matches run.
- "Test suites, verification steps and .md files only grow if you let them": prune them on a routine.

## Owner decisions

- 2026-11-18, about 00:30 UTC, project thread: "Let's rethink how we do tests:
  https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification/ and add it to our games and apps
  claude.md".
- 2026-11-18, 00:30 UTC, decision card, as the coordinator passed it on:
  - Repos: RukenApp, AutomataFramework, AutomataFrameworkEditors, AutomataFrameworkExamples and AutomataFrameworkSite.
  - Ideas: "Core rewrite" only, as offered: replace the Tests bullet with a Verification section holding the six points
    (run it like a person, the hardest test first, flaky tests, no change edits its own check, lessons with a trigger,
    prune).
  - Declined: a property-test library (fast-check) as a new dependency; a commit verification stamp and commit gate
    hooks. Neither is in this change, and the new text says a property-test library still needs the owner's yes.
- 2026-11-18, about 00:35 UTC, coordinator thread, word for word as the coordinator passed it on: "We also need to
  evaluate how superpowers comes into the picture because that's tdd". Section 7 is that evaluation.
- 2026-11-18, about 00:52 UTC, decision card, word for word as the coordinator passed it on. Asked "By 'our games and
  apps claude.md', did you mean the two master kits...?", the Owner chose "Kits + 5 repos": "Change the two kits first,
  since they're the source, then install the same text in the five repos so they don't drift from the kit."
- 2026-11-18, about 00:52 UTC, decision card on the plan audit's R3, word for word as the coordinator passed it on. The
  Owner chose "Same lane as the code": "One line in Risk: an edit to a repo's own verify or this-repo skill takes the
  lane of the code change it describes, and is named in the PR body. The shared skills and CLAUDE.md stay lane 3."

These cover this change only. The implementation pull requests are lane 3 and wait for the Owner's approval of the
finished result before they merge.

## Lane and path

Lane 3 (`CLAUDE.md` and skills, the rules that decide what needs the owner), staged path: this spec and its plan audits,
then the kits' pull request first, then one pull request per repo, one implementation audit across all six, the
Owner's approval, then a merge commit each. In mcthaydt-website the kits are content, but they carry these rules, so
their pull request is treated as lane 3 too.

## Boundaries

- **The kits** (mcthaydt-website, base `e3d1078`): `content/prompts/claude-md-apps/body.md`,
  `content/prompts/claude-md-games/body.md` and `tests/unit/kit-content.test.ts`, and the build session's own
  live-state file while it works. Not `meta.json`, not the website's other files.
- **The repos**: RukenApp (base `43df79c`), AutomataFramework (`9073d87`), AutomataFrameworkEditors (`fd1f3b1`),
  AutomataFrameworkExamples (`ca78632`) and AutomataFrameworkSite (`6fc74c6`). In each: `CLAUDE.md`;
  `.claude/skills/build/SKILL.md`, `review/SKILL.md`, `release/SKILL.md` and `staged-path/SKILL.md`;
  `.claude/skills/verify/SKILL.md` (new); `docs/superpowers/history.md`; and the build session's own live-state file
  while it works. Nothing else, apart from this spec and its audits in AutomataFramework.
- Not changed: `owner-updates`, `visual-check`, `this-repo` (nothing in them contradicts the new rules); CI workflows;
  tests in the five repos; `package.json`; AutomataFramework's `template/` and `skills/` (they ship to a person's game,
  a product choice nobody asked for); AutomataPrivate; superpowers itself (a plugin at 7.0.2).
- The `verify` skill is a single `SKILL.md` with the commands inline: no helper script, no new test file, no new
  dependency. It drives the browser with the Playwright and Chromium the cloud container already has, and starts the
  product with each repo's own scripts and tools. RukenApp's Postgres 16 is already in the container (`psql`,
  `pg_ctlcluster`). Node 24 is at `/opt/node24/bin` (the default `node` is 22).
- No new tools, dependencies, environments or spend. Nothing runs on the Owner's computer.
- Expected duration (estimates): the kits 2 hours; AutomataFramework 3¼ hours, Editors 3¼ hours, Examples 2¼ hours,
  Site 2¼ hours, RukenApp 4½ hours (a database, four stand-ins and two local Workers to start). About one working day
  from the spec's merge to the last pull request ready for the Owner, most of it the fresh-session runs, audits and CI.

## Where the touched lines stand today

- **The repos**, on the bases above. The Skills line, the **Tests.** and **Lessons become tests first.** bullets and
  the Risk section's first lines are byte for byte the same in all five `CLAUDE.md` files (the Lane 2 and Lane 3 path
  lists differ, and each **Lane 3** bullet is one line); in every one "## Rules that never
  bend" is followed by "## Risk". `CLAUDE.md` is one paragraph or bullet per line, not wrapped. The shared skills
  `review`, `build`, `staged-path`, `owner-updates` and `visual-check` are byte for byte the same in all five; `release`
  is the same in four, and RukenApp's differs only in its `commit-authors` line.
- **The kits**, at `e3d1078`. Each kit's blocks hold the same `CLAUDE.md` text as the repos, with blanks such as
  `[TEST COMMAND]`, and the same `review`, `staged-path` and `build` text; `release` differs from the repos only in its
  commit-authors line (the `[COMMIT AUTHOR]` blank). Each block is "## <Label>", a note line and a fenced block, read by
  `parseKitPrompt`. `tests/unit/kit-content.test.ts` pins the kits: the CLAUDE.md block, wrapped at 120 columns, must
  stay under 200 rows (the apps kit is at 196, the games kit at 199); each skill's frontmatter and note line; the skill
  list and order; both kits share their workflow word for word; and a list of pinned phrases. No test limit is
  loosened here; the change fits by moving the long rules out of `CLAUDE.md` into `build`.
- **`docs/superpowers/history.md`**. Framework, Editors, Examples and Site have "## Rule changes", and a 2026-11-16
  "Setup" entry listing four places superpowers 7.0.2 differs from these rules. RukenApp has neither: its "Setup" is
  one-line entries. Editors and RukenApp have "## Flaky tests"; Framework, Examples and Site have none. No repo has a
  lesson line yet, so no existing lesson needs a trigger.

## The change

Each block below is the exact text, between two marker lines. Copy it with the `blk` command in Acceptance criteria;
never retype it.

### 1. `CLAUDE.md` (kits and repos)

- The Skills line in "Stack and checks": after "`visual-check` for screens, " add "`verify` for running the app or game
  like a person, ".
- "Rules that never bend": delete the **Tests.** bullet and the **Lessons become tests first.** bullet. Their rules
  move, kept, into `build` (section 2).
- After the last bullet of "Rules that never bend" and its blank line, before "## Risk", this section and a blank line:

<!-- spec:claude-section:start -->
```markdown
## Verification

Checks let work be handed off; the owner reads the evidence. A change that alters the product is run like a person, through the `verify` skill, before it is called done. A test that fails once and passes on retry is a defect: record it under "Flaky tests" in `docs/superpowers/history.md`. The rules for tests, lessons and checks are in `build`.
```
<!-- spec:claude-section:end -->

- "## Risk": right after the **Lane 3** bullet, this line (from the Owner's R3 decision):

<!-- spec:risk-line:start -->
```markdown
- **A repo's own skills.** An edit to a repo's own `verify` or `this-repo` skill takes the lane of the code change it describes, and is named in the pull request body. `CLAUDE.md` and the shared skills stay lane 3.
```
<!-- spec:risk-line:end -->

Why the bullets move rather than the Tests bullet being replaced by a section in `CLAUDE.md` (plan audit R8): the Owner
picked "replace the Tests bullet with a Verification section". The Tests bullet also holds rules that are not among the
six points (CI is the merge gate, an unrelated failure gets its own thread, no `--pass-with-no-tests`, goldens), and
the games kit's `CLAUDE.md` has one row to spare under its 200-row test. So `CLAUDE.md` keeps a three-row section that
names the rule and points to `build`, and the Tests bullet, trimmed of what the Verification rules now say, sits in
`build`'s section with them. Measured: the apps kit goes from 196 rows to 195, the games kit from 199 to 197.

### 2. `build`, the new Verification section (kits and repos)

At the end of `build`, after a blank line. It ends the file.

<!-- spec:build-section:start -->
```markdown
## Verification

Checks are what let work be handed off: what a program can judge, nobody has to read line by line. The owner says what done looks like and looks at the evidence; the checks do the rest, so they are built and kept like any other part of the product.

- **Run it like a person.** Before a change that alters what the product does is called done, its builder runs it: starts the app or game, goes through the changed journey with real taps, clicks, keys and typing, and looks at what happens. Passing tests are not this. How to start and drive this repo is in its `verify` skill, which the builder loads before every commit that changes behavior. Every session leans on it, so it stays quick and steady: a step in it that breaks or flakes is fixed first, and a change to how the product starts or what its first screen shows updates it in the same pull request.
- **The test that is hardest to fool comes first.** A unit test can pass while the feature is broken, because the test and the code share the same misunderstanding. So, in this order: 1. **Journeys**: a person's path through the running product, from the first screen to done; a failure names the step, with a screenshot; a changed journey gets a journey test. 2. **Property tests**, for the cases people and agents both miss: state something that must always hold and let many generated inputs, from a fixed seed, try to break it: round trips (save then load gives back the same thing), invariants (a count never goes below zero), repeats (doing it twice is the same as doing it once: migrations, retries, clean-ups) and twins (a fast version agrees with a plain, correct one). A property-test library is a new dependency and needs the owner's yes first. 3. **Old-versus-new tests**, for a rewrite or a move that should not change behavior: run the old and the new on the same inputs, set aside differences that do not matter (spacing, order), and treat every other difference as a bug unless it is on the change's written list of intended differences. Unit tests cover the small pieces underneath.
- **Test first, from the outside in.** Write the failing test first and confirm it fails for the right reason. The first one is the hardest-to-fool test the change reaches: a journey test when the change alters a journey, a property test when a rule must always hold. It stays failing while small unit tests build the pieces under it, each in a quick loop: a failing test, the least code that passes it, then a tidy-up with every test still passing. A test that pins what the code does today, before a refactor or a rewrite, passes at once on purpose: show that it can fail by breaking the code on purpose, then put the code back. Code written before its test is thrown away and written again from the test, except the old code in a rewrite, which stays as the yardstick until the old-versus-new test passes on the new.
- **Tests.** Quick targeted tests run locally whenever they help; CI is the merge gate. A failing test blocks only the change that touches it: report an unrelated failure, and give a failure on `main` its own thread. A merge still needs every required check green, unless the owner authorizes an exception named in the pull request. Never loosen, skip or re-record a test to hide a defect. No `--pass-with-no-tests` or similar flag that lets an empty suite pass in CI. Updating a golden for an approved behavior change is fine, with its before and after shown. A docs change or a purely visual change is verified by what fits (a link or build check, the approved look), and a configuration change by lint, typecheck, the build and the CI run, not by an invented unit test.
- **Quick and steady, or it gets skipped.** A slow check gets run less, and a flaky one teaches a session to rerun instead of fix. Cheap checks first (lint, typecheck, the tests the change reaches); before a push, the journeys the change reaches; the full suite in CI. A test that fails once and passes on retry is a defect. One rerun to find out whether a failure is flaky is allowed, and both results are reported. Report the flaky test with its text and record it under "Flaky tests" in `docs/superpowers/history.md`; its root cause is fixed in its own thread, unless it blocks this change. Never rerun it until it passes, slow it with a sleep, or skip it. If the root cause is not found within the tries in Settings, delete the test, put a steady check of the same thing in its place where one can be written, and record why, and the gap it leaves, under "Flaky tests".
- **A change does not quietly edit its own check.** If a change can edit the check that judges it, the check proves little. So CI workflow files, the repo's own root `CLAUDE.md` and the shared skills (every skill in `.claude/skills/` but `verify` and `this-repo`) change only in a pull request that changes no product code and no tests: a rule change, or the first-time setup, which may change several of them together. A code change that needs a CI workflow change lands the workflow change first, in its own pull request. A pull request that changes or deletes an existing test, golden or `verify` step names each one and why in its body. Its reviewer, where its lane has one, reads those first, and when it edits `verify` also runs the `verify` on `main`.
- **Lessons become tests first, and carry a trigger.** A confirmed failure gets a regression test. It becomes a lesson only when no test can catch it: one line under "Lessons" in `docs/superpowers/history.md` naming its trigger (the paths, or the kind of change, a diff shows), what to look for, and the failure behind it. Before it pushes, a session reads the lessons and acts only on those whose trigger its diff matches.
- **Prune.** Tests, `verify` steps, lessons and rules only grow unless someone trims them. Each retrospective removes the ones that no longer catch anything or that another check already covers, naming each one and why: rules and lessons in its rule-change pull request, tests in their own.
- **Superpowers' testing skills.** Its `test-driven-development` and `verification-before-completion` run inside every build, and where they differ these rules win: the first failing test is the hardest-to-fool one the change reaches, not only a small unit test; a test that pins today's behavior passes at once on purpose; the old code in a rewrite stays until the old-versus-new test passes; an unrelated failing test is reported and gets its own thread, not fixed in this change; an existing test that changes is named in the pull request body; the exceptions to test-first are the ones above (docs, purely visual, configuration), not a question for the owner; before a push the session runs the cheap checks and the journeys the change reaches, and the full suite runs in CI; and passing tests are not done until the change has been run through `verify`.
```
<!-- spec:build-section:end -->

What changed from the coordinator's draft and from cycle 1, keeping its meaning:

- "Cheap checks first" says one rule, the same as section 7: before a push, the journeys the change reaches; the full
  suite in CI (R1).
- A flaky test: one rerun to find out is allowed, with both results reported; its root cause is fixed in its own
  thread unless it blocks this change; reruns are bounded by the tries in Settings, then it is deleted with the reason
  and the gap written down (R2, N6).
- "A change does not quietly edit its own check" says what the rule really does: an edit to a check is named, and read
  first where the lane has a reviewer (R5). "Their own pull requests" is defined: a pull request that changes no product
  code and no tests; a rule change or the first-time setup may change several of these together; `CLAUDE.md` is the
  repo's own root file (a game's `template/CLAUDE.md` is product); a code change that needs a workflow edit lands the
  workflow edit first (R4). A reviewer of a pull request that edits `verify` also runs the `verify` on `main` (N10).
- A lesson names "what to look for", not "the check to run", since a check here is a test and a lesson exists only
  where no test can catch it (R6).
- The **Tests.** bullet keeps its rules apart from "Write the failing test first", which is now in **Test first, from
  the outside in.**, and adds that a configuration change is verified by lint, typecheck, the build and the CI run
  (N7).
- Plainer words: "only grow unless someone trims them"; no "red-green-refactor"; the test-first loop said in full
  (N8).
- The **Superpowers' testing skills.** bullet is new, from section 7, so the kits carry it too.

### 3. `review`, "## Lessons" (kits and repos)

The section's body, from the line after "## Lessons" to the end of the file, becomes:

<!-- spec:review-lessons:start -->
```markdown
A confirmed failure gets a regression test first. A lesson is written down only when no test can catch it: one line under "Lessons" in `docs/superpowers/history.md` naming its trigger (the paths, or the kind of change, a diff shows), what to look for and the failure behind it, which the coordinator (or short-path implementer) adds when the work is archived. A merge with nothing to learn leaves none.

ACCEPTED: a pull request sat green and unmerged for hours because the wake that says CI is done never came. DERIVED: watch CI in the foreground. TRIGGER: a session that waits on CI. LOOK FOR: it never ends its turn only to wait. LANDS IN: the plan's brief when its trigger matches.

A lesson lands in the plan's brief when its trigger matches the plan's work, not in a worker's instructions. The retrospective after the slice moves into CLAUDE.md, through its rule-change pull request, only a lesson that holds for every change (one with no narrower trigger), and keeps the rest in `history.md`, pruning them as Verification in `build` says.
```
<!-- spec:review-lessons:end -->

It keeps the ACCEPTED, DERIVED and LANDS IN form the kit test pins, adds TRIGGER and LOOK FOR, and swaps the example
for one no test can catch (R6). The retrospective keeps the narrower lessons in `history.md` rather than deleting them
(R7).

### 4. `staged-path` and `release` (kits and repos)

`staged-path`, three edits:

- The **Superpowers.** bullet: after "where they differ from these rules, these rules win." add " Its
  `test-driven-development` and `verification-before-completion` are read with Verification in `build`."
- The **Handoff.** bullet: "the plan also reads Lessons in `history.md`" becomes "the plan also reads Lessons in
  `history.md` and carries those whose trigger its work matches".
- The **Retrospective.** bullet: after "and proposes the rest as one rule-change pull request for the owner to
  approve." add " It also prunes, as Prune under Verification in `build` says."

`release`, after the setup check's item that starts "- The compaction hook:", this item (N4: a repo with nothing to
start yet):

<!-- spec:release-line:start -->
```markdown
- The `verify` skill: `.claude/skills/verify/SKILL.md` is there, and a fresh session that follows it from a clean checkout starts this repo's app or game in a cloud container and gets a screenshot of its main screen. In a repo with nothing to start yet, it is reported as missing until the first screen exists.
```
<!-- spec:release-line:end -->

### 5. The `verify` skill

**In the kits**: a new block "## Skill: verify", the same in both kits, just before "## Hook: settings.json", with the
note line "Save this as .claude/skills/verify/SKILL.md in your repo, and fill in its blanks the first time the app or
game starts." and this text in a four-backtick fence. The games kit gets no separate games form: the steps are the
same for an app and a game (start it, open it in a browser, drive it with keys and taps, look), and the words "app or
game" cover both. The blanks are the kit's usual `[UPPER CASE]` blanks, so the kit's "Start here" and its blank list
pick them up with no other change.

<!-- spec:verify-kit:start -->
````markdown
---
name: verify
description: Use when a change alters what the product does, before calling it done and before each commit that changes behavior: starts this repo's app or game from a clean checkout and drives it the way a person would.
---

# Verify

[WHAT IT IS]

## Start it

From a clean checkout in a cloud container, in order. First pick the Node version (or other runtime) that `engines` in `package.json` asks for. Then install, build, and start every stand-in for an outside service (a database, payments, mail, sign-in), never the real one.

[START COMMANDS]

It is ready when [READY SIGNAL]. Last clean start, timed with `date` before and after: [START TIME], on commit [COMMIT].

## Drive it

Open it in a real browser: the Chromium and Playwright the container already has (`require('playwright')`, then `chromium.launch()`), at each size in the device matrix in Settings. Tap, click, type and press keys the way a person would, and find things by their label or role. Take a screenshot at deviceScaleFactor 1 for your own check, and save it in the scratchpad, never in the repo. The main screen, what it shows and how to use it:

[MAIN SCREEN]

## The journeys

One line each, from a person's side: where it starts, the steps, and what they see at the end.

[JOURNEYS]

## Stop it

Stop every server it started and clear what it wrote, so the next run starts clean.

[STOP COMMANDS]

## When it breaks

A step that breaks or flakes is fixed in this skill first. Each known way a start or a step fails, what it looks like, and the fix:

[KNOWN FAILURES]
````
<!-- spec:verify-kit:end -->

**In each repo**: `.claude/skills/verify/SKILL.md` is the kit's text with every blank filled in, and nothing else
changed: every line of the kit's text is there, in order, and no `[UPPER CASE]` blank is left. This program checks
that (acceptance criterion 5):

<!-- spec:verify-check:start -->
```python
import re, sys
kit = open(sys.argv[1]).read().split('\n')
repo = open(sys.argv[2]).read().split('\n')
blank = r'\[[A-Z ]+\]'
i = 0
for line in filter(None, kit):
    if re.fullmatch(blank, line):
        continue
    pattern = re.compile('.+'.join(map(re.escape, re.split(blank, line))) + '$')
    while i < len(repo) and not pattern.match(repo[i]):
        i += 1
    assert i < len(repo), 'missing or out of order: ' + line
    i += 1
left = re.findall(blank, '\n'.join(repo))
assert not left, 'blanks left: ' + ', '.join(left)
print('ok')
```
<!-- spec:verify-check:end -->

What each repo's blanks hold, from its `this-repo` skill, `package.json` and test setup on the bases above. Each
repo's skill reads those files for the exact commands rather than copying this list; where a file and this list
differ, the file wins and the skill says so.

- **AutomataFramework** (the runtime; a person's product is a game made from it). Start: Node 24, `pnpm install
  --frozen-lockfile`, `pnpm build`, pack the package, make a game from the tarball with `automata create`, install it
  and run its `npm run dev` (`automata play`), as `tests/create/made-game.ts` does. Main screen: the made game's first
  screen. Journeys: make a game and play it; the online room (`src/server.ts`, as
  `tests/journeys/online.journey.test.ts` plays it).
- **AutomataFrameworkEditors** (the editors suite). Start: Node 24, `pnpm install --frozen-lockfile`,
  `pnpm build:journeys`, then serve the built suite with the real API code against the pretend GitHub, as
  `tests/fixtures/serve.ts`, `tests/fixtures/fake-github/` and `tests/fixtures/journey.ts` do. Never the real GitHub.
  Main screen: Welcome, then the suite with the example game open. Journeys: from `tests/journeys/`.
- **AutomataFrameworkExamples** (the test game). Start: Node 24, `pnpm install --frozen-lockfile`, `pnpm build` and
  `pnpm preview` (or `pnpm dev`); `node server.ts` for the room server. Main screen: the game's first screen. Journeys:
  from `tests/journeys/` (play, language, words, look, pictures).
- **AutomataFrameworkSite** (the website). Start: Node 24, `pnpm install --frozen-lockfile`, `pnpm build` (the
  stand-in game in `tests/fixtures/game` unless `GAME_SOURCE` is set), then `pnpm exec wrangler pages dev dist --ip
  127.0.0.1 --port 8788`, as `playwright.config.ts` does. The plan audit timed install and build at 15 seconds and
  wrangler answering 4 seconds later. Main screen: the home page. Journeys: from `tests/journeys/`.
- **RukenApp** (the app). Start: Node 24; Postgres 16 (`pg_ctlcluster 16 main start`, a throwaway database,
  `TEST_DATABASE_URL` pointing at it); then every `webServer` entry in `playwright.config.ts`, with the settings it
  gives: the stand-in Stripe on 12111, GitHub on 12112, Resend on 12113 and Twilio on 12114; the app
  (`pnpm exec prisma migrate deploy && pnpm build && pnpm exec wrangler dev cloudflare/worker.js --port 4173`); and the
  game gate Worker on 8788, started after `when-up.ts` says the app is up. Never the real Stripe, GitHub, Resend or
  Twilio, and never the test site's database. Main screen: the feed. Journeys: from `tests/browser/`.

### 6. The record, `docs/superpowers/history.md` (repos)

The kits have no `history.md`; mcthaydt-website records the kit change in its own "Prompt updates" table, which its
coordinator fills in at merge, as it does for every kit change.

In all five repos, the same rule-change entry, wrapped at 120 like the entries around it:

<!-- spec:history-rule:start -->
```markdown
- 2026-11-18, the Owner: verification. `CLAUDE.md` gets a short Verification section in place of the Tests and Lessons
  bullets, and `build` gets the full rules: run the change like a person through a new per-repo `verify` skill; journeys
  first, then property tests, then old-versus-new tests; test first, from the outside in, with superpowers' testing
  skills read under these rules; a flaky test fixed at its root in its own thread, or deleted with the reason written
  down; a change does not quietly edit its own check; lessons carry a trigger read from the diff; each retrospective
  prunes. A repo's own `verify` and `this-repo` skills take the lane of the code they describe. Asked for in the project
  thread ("Let's rethink how we do tests", with the Claude Code team's article on verification, and "We also need to
  evaluate how superpowers comes into the picture because that's tdd") and approved on decision cards on 2026-11-18 at
  00:30 UTC ("Core rewrite" only; a property-test library and a commit verification stamp or gate declined) and at about
  00:52 UTC ("Kits + 5 repos"; "Same lane as the code"). Scope: this change only, made the same in the two kits in
  McThayDT-Website and in RukenApp, AutomataFramework, AutomataFrameworkEditors, AutomataFrameworkExamples and
  AutomataFrameworkSite, as AutomataFramework `docs/superpowers/specs/2026-11-18-verification-design.md` describes.
  Later rule changes are lane 3 as usual.
```
<!-- spec:history-rule:end -->

- Framework, Editors, Examples, Site: at the end of "## Rule changes".
- RukenApp: a new "## Rule changes" section holding only this entry, after "## Setup" and before "## Standing
  permissions", the order the other four use.
- Framework, Examples and Site get a "## Flaky tests" section with "None yet.", just before "## Lessons", where Editors
  and RukenApp have theirs.

In all five, a new entry at the top of "## Setup" (the newest comes first there), from section 7:

<!-- spec:history-setup:start -->
```markdown
- 2026-11-18: superpowers **7.0.2**'s `test-driven-development`, `verification-before-completion`, `executing-plans` and
  `subagent-driven-development` read against the new verification rules (AutomataFramework
  `docs/superpowers/specs/2026-11-18-verification-design.md`, section 7). Where they differ, these rules win, and the
  differences are listed in `build` under "Superpowers' testing skills". `subagent-driven-development` is not used here
  (writers are threads); if it ever is, its task reviewer does not replace the implementation audit.
```
<!-- spec:history-setup:end -->

In RukenApp only, right under that one, the four earlier differences the other four repos record on 2026-11-16, word
for word (N1):

<!-- spec:history-ruken:start -->
```markdown
- 2026-11-18, copied from the other four repos' 2026-11-16 entry, which this repo's setup did not record. Where
  superpowers 7.0.2's skills differ from these rules, these rules win:
  - `writing-plans` saves a separate plan in `docs/superpowers/plans/`; here the plan is part of the spec.
  - `writing-plans` and `executing-plans` offer subagent-driven development and a subagent final review; here there
    are no subagents unless the Owner says so, and the implementation audit is a fresh session (`review`).
  - `executing-plans` defers minor final-review findings; here the fix round fixes every in-scope finding.
  - `executing-plans` sets up a worktree and ledger; here a thread works on its own branch.
```
<!-- spec:history-ruken:end -->

### 7. Superpowers 7.0.2 and the Verification rules

Read on 2026-11-18 from the installed plugin, version 7.0.2, the version every repo's "Setup" records:
`test-driven-development` (with `writing-good-tests.md`), `verification-before-completion`, `executing-plans` and
`subagent-driven-development`.

**How they fit.** Superpowers says how code gets written: the test first, seen to fail, then the least code that passes,
then a tidy-up (`test-driven-development`), and no claim without fresh evidence (`verification-before-completion`).
The Verification rules say which test, what else counts as evidence, and how the checks are kept. They mostly agree.
The overlaps:

| Superpowers says | Verification says | Settled by |
|---|---|---|
| The Iron Law: "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST"; write one minimal test of one behavior. | The test hardest to fool comes first: journeys, then property tests, then old-versus-new. | They nest. The first failing test is the hardest-to-fool one the change reaches; small unit tests build the pieces under it while it stays failing. **Test first, from the outside in.** |
| "Test passes? You're testing existing behavior. Fix test." (`executing-plans`: "a test that passes before the implementation exists is a finding about the test"). | Old-versus-new tests, and tests that pin today's behavior before a refactor. | Those pass at once on purpose; they show they can fail by a deliberate break that is then put back. Same bullet. |
| "Test fails? Fix code, not test." | A change does not quietly edit its own check. | Agree. A brand-new test of this change may be fixed before it has ever passed (it judges nothing yet). An existing test, golden or `verify` step that is changed or deleted is named, with why, in the pull request body. |
| "Other tests fail? Fix now." | Tests: an unrelated failure is reported and gets its own thread. A flaky test's root cause is fixed in its own thread unless it blocks this change. | A difference: these rules win. The unrelated failure is reported, not fixed in this change. Listed in **Superpowers' testing skills.** |
| REFACTOR: "Keep tests green. Don't add behavior." | The same, and a move that should not change behavior gets an old-versus-new test. | Agree. |
| "Write code before the test? Delete it. Start over." | Old-versus-new: the old code is the yardstick. | Agree for code written before its test. In a rewrite, the old code stays until the old-versus-new test passes on the new. **Test first, from the outside in.** |
| Exceptions (throwaway prototypes, generated code, configuration files): "ask your human partner". | The owner approves results, not steps; docs, purely visual and configuration changes are verified by what fits. | A difference: these rules win; the exceptions are the ones the Tests bullet names, not a question for the owner. |
| "Before you call the change done, run the project's test command." | Cheap checks first; before a push, the journeys the change reaches; the full suite in CI; done means merged to `main` and green there. | A difference: before a push the session runs the cheap checks and the journeys the change reaches; the full suite runs in CI. The same words as **Quick and steady** (R1). |
| `verification-before-completion`: "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE". | Run it like a person; passing tests are not this. | Agree, and Verification adds a kind of evidence: a claim that the product works also needs the `verify` run. |
| `executing-plans`: per task, `task-done` records the test command's result. | `verify` before every commit that changes behavior. | Agree: **Run it like a person.** says so. |
| `subagent-driven-development`: a subagent implements each task and a subagent reviewer checks it. | Findings carry evidence; a fix is checked by a program or a second session. | Not used here (Limits: writers are threads, subagents only read). If it ever is, its task reviewer does not replace the implementation audit. Setup entry. |

**Where the text goes.** The differences are in `build`'s **Superpowers' testing skills.** bullet (section 2), so the
kits carry them too. `staged-path`'s **Superpowers.** bullet points to it (section 4). The "Setup" entry in
`history.md` (section 6) records the reading and points to `build`, instead of repeating the list. The four earlier
differences (a separate plan file, subagents, deferred minor findings, a worktree and ledger) are not about tests and
do not change.

## What changed after plan audit cycle 1

The audit is `docs/superpowers/audits/2026-11-18-1-verification-plan-audit.md` (at `c67260a`, audited `f699358`).

| Finding | How it is settled |
|---|---|
| R1, heavy checks before a push or in CI | One rule in **Quick and steady** and section 7: before a push, the journeys the change reaches; the full suite in CI. |
| R2, who fixes a flaky test, the diagnostic rerun, "Other tests fail? Fix now" | One rerun allowed and both results reported; root cause in its own thread unless it blocks; "Fix now" listed as a difference. |
| R3, the lane of `verify` edits | The Owner's decision "Same lane as the code": the Risk line in section 1, checked by criterion 4. |
| R4, "their own pull requests" | Defined in **A change does not quietly edit its own check.**, with first-time setup, the root `CLAUDE.md` and workflow-first. |
| R5, the title promises "never" | Retitled **A change does not quietly edit its own check.**: an edit is named, and read first where the lane has a reviewer. |
| R6, "the check to run" in a lesson | "What to look for" and LOOK FOR; the example is one no test can catch (a session waiting on CI). |
| R7, the retrospective deleting lessons | "keeps the rest in `history.md`, pruning them as Verification in `build` says". |
| R8, the Tests bullet kept | Said in section 1, with the reason; the bullet moves, trimmed, into `build`. |
| R9, screenshots on a pull request | Criterion 6: a private Artifact page, or files sent to the coordinator; the body links it, with times and the commit. |
| N1, RukenApp's record | The four differences copied in (section 6); every entry has a `blk` command; wrapping at 120 kept. |
| N2, Node 24 | In the `verify` kit text ("the Node version that `engines` asks for") and Boundaries (`/opt/node24/bin`). |
| N3, RukenApp's stand-ins | All five named in section 5: Stripe, GitHub, Resend, Twilio and the game gate after `when-up.ts`. |
| N4, a repo with nothing to start yet | The `release` line says it is reported as missing until the first screen exists. |
| N5, section order | Criterion 3 runs `grep -n '^## '` with the expected order. |
| N6, bounded reruns | Flaky reruns and criterion 6's runs are bounded by the tries in Settings, then reassessed as Limits says. |
| N7, configuration changes | The Tests bullet: lint, typecheck, the build and the CI run. |
| N8, plain wording | Reworded (section 2's list). |
| N9, the kits | The Owner's decision "Kits + 5 repos": the kits' pull request comes first. |
| N10, reviewing a `verify` edit | The reviewer also runs the `verify` on `main`. |
| N11, practices left out | None needed, as the audit says; left for a later spec if the Owner asks. |

## Acceptance criteria

Each is checked on each pull request's head commit, and the pull request body shows the command and its output. Run
everything under Node 24 (`export PATH=/opt/node24/bin:$PATH`). `SPEC` is this file, read from AutomataFramework's
`main` once it merges. `blk` prints one block of this spec, without its fence lines:

```sh
blk() { awk -v n="$1" '$0=="<!-- spec:" n ":start -->"{f=1;next} $0=="<!-- spec:" n ":end -->"{f=0} f' "$SPEC" | sed '1d;$d'; }
sect() { awk '/^## Verification$/{f=1} /^## /&&!/^## Verification$/{f=0} f' "$1"; }
```

1. **The kits change first, and their tests catch it.** In mcthaydt-website, the test edits below go in first and fail
   on the old kits (seen: 7 failing), then pass on the new ones. `npx svelte-kit sync`, then `npx vitest run --project
   unit` (seen: 275 passed) and `npx vitest run --project components` (52 passed) pass; `npm run -s content:check`
   reports 0 errors. The 200-row limit and every pinned phrase in the test file are unchanged; the CLAUDE.md block
   wraps to 195 rows (apps) and 197 (games). The test edits, exactly:

<!-- spec:kit-test:start -->
```diff
diff --git a/tests/unit/kit-content.test.ts b/tests/unit/kit-content.test.ts
index 574ca32..a80746e 100644
--- a/tests/unit/kit-content.test.ts
+++ b/tests/unit/kit-content.test.ts
@@ -8,7 +8,7 @@ const kit = (slug: string) => parseKitPrompt(read(`content/prompts/${slug}/body.
 const text = (slug: string, label: string) => kit(slug).blocks.find(b => b.label === label)!.text;
 const rulesText = (slug: string) => ['CLAUDE.md', 'Skill: build', 'Skill: staged-path', 'Skill: owner-updates', ...(slug === 'claude-md-games' ? ['Skill: vertical-slice'] : [])].map(l => text(slug, l)).join('\n');
 const KITS = ['claude-md-apps', 'claude-md-games'];
-const SKILLS = { 'claude-md-apps': ['review', 'release', 'visual-check', 'build', 'staged-path', 'owner-updates'], 'claude-md-games': ['review', 'release', 'visual-check', 'build', 'staged-path', 'owner-updates', 'vertical-slice', 'scene-polish'] };
+const SKILLS = { 'claude-md-apps': ['review', 'release', 'visual-check', 'build', 'staged-path', 'owner-updates', 'verify'], 'claude-md-games': ['review', 'release', 'visual-check', 'build', 'staged-path', 'owner-updates', 'vertical-slice', 'scene-polish', 'verify'] };
 const flat = (t: string) => t.replace(/\s+/g, ' ');
 // Kit text has one line per paragraph or list item; the 200-line limit counts how it reads at 120 columns.
 const wrapped = (t: string) => t.split('\n').reduce((n, line) => {
@@ -348,7 +348,7 @@ for (const slug of KITS) {
     for (const rule of ['**Retrospective.** The last stage of every slice, the first one included', 'reviews every loop the slice ran, not only design review', 'turns each lesson into a test where it can', 'one rule-change pull request for the owner to approve', 'Rule edits the retrospective proposes: batched into one rule-change pull request per slice', 'The owner\'s own rule requests keep their own pull requests', 'The next slice can start once the retrospective\'s pull request is open, or once the retrospective reports nothing to learn'])
       expect(staged, rule).toContain(rule);
     expect(staged).not.toContain('one session a day');
-    expect(flat(text(slug, 'Skill: review'))).toContain('The retrospective after the slice moves each lesson that no test can capture into CLAUDE.md');
+    expect(flat(text(slug, 'Skill: review'))).toContain('moves into CLAUDE.md, through its rule-change pull request, only a lesson that holds for every change');
   });
   test(`${slug}_ends_each_slice_with_a_fresh_end_to_end_walk_and_a_screens_page_before_the_retro`, () => {
     const staged = flat(text(slug, 'Skill: staged-path') + '\n' + text(slug, 'CLAUDE.md').slice(text(slug, 'CLAUDE.md').indexOf('## Settings')));
@@ -448,6 +448,21 @@ for (const slug of KITS) {
     expect(review).toContain('`<topic>` is the spec\'s topic, or the pull request\'s on the short path, and `<cycle>` counts rounds, so two audits never share a name');
     for (const block of kit(slug).blocks) expect(block.text, block.label).not.toContain('<date>-<cycle>-');
   });
+  test(`${slug}_runs_changes_like_a_person_and_keeps_its_checks_honest`, () => {
+    const claude = text(slug, 'CLAUDE.md');
+    const at = ['## Rules that never bend', '## Verification', '## Risk'].map(h => claude.indexOf(`\n${h}\n`));
+    expect(at.every((n, i) => n > 0 && (i === 0 || n > at[i - 1])), 'Verification sits between Rules that never bend and Risk').toBe(true);
+    expect(claude).not.toContain('- **Tests.**');
+    expect(flat(claude)).toContain('run like a person, through the `verify` skill');
+    expect(flat(claude)).toContain('takes the lane of the code change it describes');
+    const build = flat(section(text(slug, 'Skill: build'), '## Verification'));
+    for (const rule of ['**Run it like a person.**', '**The test that is hardest to fool comes first.**', '**Test first, from the outside in.**', '**Tests.**', '**Quick and steady, or it gets skipped.**', '**A change does not quietly edit its own check.**', '**Lessons become tests first, and carry a trigger.**', '**Prune.**', '**Superpowers\' testing skills.**', 'needs the owner\'s yes first', 'unless it blocks this change'])
+      expect(build, rule).toContain(rule);
+    expect(flat(text(slug, 'Skill: review'))).toContain('LOOK FOR:');
+    expect(flat(text(slug, 'Skill: release'))).toContain('The `verify` skill: `.claude/skills/verify/SKILL.md` is there');
+    expect(flat(text(slug, 'Skill: staged-path'))).toContain('It also prunes');
+    expect(kitPlaceholders(kit(slug).blocks)).toEqual(expect.arrayContaining(['START COMMANDS', 'MAIN SCREEN', 'JOURNEYS']));
+  });
   test(`${slug}_lists_its_fill_in_blanks`, () => {
     const blanks = kitPlaceholders(kit(slug).blocks);
     for (const blank of ['PROJECT', 'WHAT IT IS FOR', 'STACK', 'INSTALL COMMAND', 'LINT COMMAND', 'TYPECHECK COMMAND', 'TEST COMMAND', 'BUILD COMMAND']) expect(blanks).toContain(blank);
@@ -508,12 +523,13 @@ test('both_kits_share_one_workflow_word_for_word', () => {
     .replace(/\n- \*\*Delegation\.\*\*[\s\S]*?(?=\n\n|\n- |$)/, '')
     .replace(/\n- Use the runtime's supported sessions[\s\S]*?different label\./, '')
     .replace(/\s+/g, ' ').trim();
-  for (const heading of ['## Owner visibility and early steering', '## How work goes', '## Rules that never bend', '## Risk', '## The staged path']) {
+  for (const heading of ['## Owner visibility and early steering', '## How work goes', '## Rules that never bend', '## Verification', '## Risk', '## The staged path']) {
     const apps = shared(section(text('claude-md-apps', 'CLAUDE.md'), heading));
     expect(apps.length, heading).toBeGreaterThan(100);
     expect(shared(section(text('claude-md-games', 'CLAUDE.md'), heading)), heading).toBe(apps);
   }
   for (const name of SKILLS['claude-md-apps'].filter(n => n !== 'build')) expect(text('claude-md-games', `Skill: ${name}`), name).toBe(text('claude-md-apps', `Skill: ${name}`));
+  expect(section(text('claude-md-games', 'Skill: build'), '## Verification')).toBe(section(text('claude-md-apps', 'Skill: build'), '## Verification'));
 });
 test('scene_polish_uses_the_image_as_an_art_reference_not_a_score', () => {
   const scene = flat(text('claude-md-games', 'Skill: scene-polish'));
```
<!-- spec:kit-test:end -->

2. **One text everywhere.** `sect CLAUDE.md | md5sum` gives `2364effa340d2680f8f35a3e22154f8f` in each of the five
   repos, the same as `{ blk claude-section; echo; } | md5sum` (the section plus the blank line before "## Risk").
   `sect .claude/skills/build/SKILL.md | md5sum` gives `1cc3afc09f7804c5e089f84d8e41bf75` in each repo, the same as
   `blk build-section | md5sum`. In the kits, the same two hashes come from each kit's CLAUDE.md and `build` blocks
   (saved to files first). Tried on a copy of this repo's files with the edits applied, and on the two kits: all give
   these two hashes.
3. **In the right place.** In each repo, `grep -n '^## ' CLAUDE.md` lists "Stack and checks", "How work goes", "Owner
   visibility and early steering", "Rules that never bend", "Verification", "Risk", "The staged path", "Settings", in
   that order (each repo's own headings before "Stack and checks" aside). In the kits, the new kit test checks the same.
4. **The other edited lines match.** In each repo and each kit's CLAUDE.md: the Skills line contains "`verify` for
   running the app or game like a person"; `blk risk-line` is a line of the file, right after the **Lane 3** bullet;
   there is no line starting "- **Tests.**" or "- **Lessons become tests first.**"; "fails once and passes on retry"
   appears once in `CLAUDE.md` and once in `build`. `review` ends with `blk review-lessons`; `staged-path` has "and
   carries those whose trigger its work matches", "are read with Verification in `build`" and "It also prunes";
   `release` has `blk release-line` right after the compaction-hook item. `review`, `build`, `staged-path`,
   `owner-updates` and `visual-check` are one hash across the five repos; `release` differs between RukenApp and the
   others only in its `commit-authors` line (`diff` shows that one line). The repos' `review` and `staged-path` equal
   the apps kit's blocks byte for byte (tried: they do).
5. **The `verify` skill has the kit's shape.** `blk verify-check > check.py; blk verify-kit > kit.md; python3 -I
   check.py kit.md .claude/skills/verify/SKILL.md` prints `ok` in each repo (tried: it prints `ok` on a filled copy,
   and fails on the unfilled kit and on a copy missing "## Stop it"). In the kits, each kit's verify block equals
   `blk verify-kit`, and its blanks are in the kit's blank list. The start time and commit in "Start it" were measured
   with `date` and `git rev-parse --short HEAD`.
6. **The `verify` skill works for a stranger.** For each repo, a fresh cloud session that did not write the skill,
   started with only "Load the `verify` skill and follow it to start this repo's app or game and take a screenshot of
   its main screen", on the pull request's head commit, does so three times in a row, each from a clean start (a fresh
   clone, or `git clean -xfd` after stopping everything the run before started), with no help and no edit to the skill.
   The session publishes its three screenshots on a private Artifact page, or sends them to the coordinator, never in
   the repo or anywhere public. The pull request body links that page (or names the coordinator's report), lists each
   run's start and end times from `date` and the commit, and says what each screenshot shows. A failed run is fixed in
   the skill and the three runs start again, up to the tries in Settings; then the approach is reassessed as Limits
   says.
7. **The record.** In each repo, `history.md` contains `blk history-rule` (under "## Rule changes") and `blk
   history-setup` (at the top of "## Setup"), checked with `python3 -c` and `in` on the two texts; RukenApp's also
   contains `blk history-ruken`; Framework, Examples and Site have a "## Flaky tests" section before "## Lessons".
8. **It reads as the Owner chose.** The rules hold the six points of the first card, no property-test library, no
   commit stamp and no commit gate; the Risk line is the second 00:52 card's; the kits changed first; section 7's
   table is settled by the text in the build (read by the implementation audit).
9. **Clean diffs.** `git diff --check origin/main...HEAD` prints nothing in each repo and in mcthaydt-website. Each
   pull request's diff touches only the files in Boundaries, and the build session's live-state file is gone from its
   last commit. Each body names every test it changes, and why (the kit test).
10. **Identity.** Every commit is authored and committed by McThayDT <107786093+mcthaydt@users.noreply.github.com>
    (`git log --format='%an <%ae> | %cn <%ce>' origin/main..HEAD`), with no Co-Authored-By, Claude-Session or
    "Generated with" line (`git log --format=%B origin/main..HEAD | grep -i -E 'co-authored|claude-session|generated
    (with|by)'` prints nothing). Each pull request body's last line is `Requested by **McThayDT**`, checked after every
    create or edit.
11. **Green and merged the agreed way.** CI is green on each pull request's head; each stays a draft until the
    implementation audit and the Owner's approval, then merges with a merge commit.

## Plan

Unit 1 comes first; units 2 to 6 share no file, wait only on unit 1's merge, and run side by side, three writers at a
time at most (Settings). Each is lane 3.

| Unit | Repo | Waits on | Files it owns | Output | Acceptance check | Estimate |
|---|---|---|---|---|---|---|
| 0 | AutomataFramework | the plan audit (cycle 2) | this spec and its audits | the spec on `main` | the plan audit has no reds | (this session) |
| 1 | mcthaydt-website | 0 | Boundaries, the kits | one draft pull request | criteria 1 to 5 (kit parts), 8 to 11 | 2 hours |
| 2 | AutomataFramework | 1 merged | Boundaries | one draft pull request | criteria 2 to 11 | 3¼ hours |
| 3 | AutomataFrameworkEditors | 1 merged | Boundaries | one draft pull request | criteria 2 to 11 | 3¼ hours |
| 4 | AutomataFrameworkExamples | 1 merged | Boundaries | one draft pull request | criteria 2 to 11 | 2¼ hours |
| 5 | AutomataFrameworkSite | 1 merged | Boundaries | one draft pull request | criteria 2 to 11 | 2¼ hours |
| 6 | RukenApp | 1 merged | Boundaries | one draft pull request | criteria 2 to 11 | 4½ hours |

1. A fresh session audits this spec again (plan audit, cycle 2), never this session, and writes
   `docs/superpowers/audits/2026-11-18-2-verification-plan-audit.md` on this branch; this spec merges on green with it.
2. Unit 1, in mcthaydt-website on its own branch from `main`: the test edits first, seen failing; then the kit edits
   (sections 1 to 5), copied with `blk`, never retyped; then criteria 1 to 5. Its implementation audit and the Owner's
   approval come before units 2 to 6 start, so the repos copy the kit as merged.
3. Units 2 to 6, each in its repo on its own branch from `main`: the `CLAUDE.md` and skill edits (sections 1 to 4) and
   the history entries (section 6), copied with `blk`; then the `verify` skill (section 5), the kit's text with its
   blanks filled by starting and driving the product in the build session's own container until it works from a clean
   start, with the time measured. Check criteria 2 to 5, 7 and 9 to 10.
4. Ask the coordinator for the fresh session of criterion 6; fix the skill until three runs in a row pass.
5. One implementation audit across the five repo pull requests by a fresh session; fixes on the same branches by the
   build sessions.
6. The Owner's approval through the coordinator, then each merges with a merge commit.
7. If any touched line changed on a repo's or the website's `main` since the bases above (another rule change merged
   first), re-read it, keep the other change, and report the difference instead of guessing.

## Found on the way (reported, not fixed here)

- AutomataFramework's `package.json` script `test:engine` passes `--passWithNoTests`, which the Tests rules forbid ("No
  `--pass-with-no-tests` or similar flag"). It predates this change; its own thread.
- Editors' "Flaky tests" holds `settings.browser.test.ts` (Firefox), "Left as it is". Under the new rule, its next
  failure means a root-cause hunt in its own thread within the tries in Settings, then a fix or a deletion with the
  reason. Nothing changes now.
- The kits' `meta.json` summaries already miscount their skills ("three skills" for apps, "five skills" for games);
  the `verify` block adds one more. `meta.json` is outside this change's boundaries; its own thread.

## Open decisions

None. The Owner's choices on 2026-11-18 cover the repos and the kits, the ideas, the two declined ones and the lane of a
repo's own skills. The superpowers evaluation (section 7) needs no choice: every overlap is settled by these rules
winning, as `staged-path` already says, and nothing in superpowers is turned off or replaced.

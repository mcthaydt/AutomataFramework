# Verification: run it like a person, the hardest test first, checks kept like the product

## Outcome

Every session in the five code repos proves a change the way a person would see it working, not only by passing tests.
`CLAUDE.md` gets one Verification section, word for word the same in all five, that says: run the change like a person,
through a new per-repo `verify` skill that starts and drives the app or game; prefer the tests hardest to fool
(journeys, then property tests, then old-versus-new tests); fix a flaky test at its root or delete it and write down
why; never let a change edit the check that judges it; give each lesson a trigger read from the diff; and prune stale
tests and rules at each retrospective. Each repo gets its own `verify` skill, and a fresh session that has only that
skill can start the app or game in a cloud container and show its main screen, three times in a row.

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
  - Repos: the five code repos, RukenApp, AutomataFramework, AutomataFrameworkEditors, AutomataFrameworkExamples and
    AutomataFrameworkSite. Not AutomataPrivate, not `mcthaydt-website` (the website's two kits).
  - Ideas: "Core rewrite" only, as offered: replace the Tests bullet with a Verification section holding the six points
    in Outcome above.
  - Declined: a property-test library (fast-check) as a new dependency; a commit verification stamp and commit gate
    hooks. Neither is in this change, and the new text says a property-test library still needs the owner's yes.

These cover this change only. The implementation pull requests are lane 3 and wait for the Owner's approval of the
finished result before they merge.

## Lane and path

Lane 3 (`CLAUDE.md` and skills, the rules that decide what needs the owner), staged path: this spec and its plan audit,
then one implementation pull request per repo, one implementation audit across all five, the Owner's approval, then a
merge commit each.

## Boundaries

- Repos: RukenApp, AutomataFramework, AutomataFrameworkEditors, AutomataFrameworkExamples, AutomataFrameworkSite.
- Files, in each repo: `CLAUDE.md`; `.claude/skills/verify/SKILL.md` (new); `.claude/skills/review/SKILL.md`,
  `.claude/skills/release/SKILL.md` and `.claude/skills/staged-path/SKILL.md` (the edits in section 4);
  `docs/superpowers/history.md`; and the build session's own live-state file while it works. Nothing else, apart from
  this spec and its audits in AutomataFramework.
- Not changed: `build`, `owner-updates`, `visual-check` and `this-repo` (checked in section 4: nothing in them
  contradicts the new section); CI workflows; tests; `package.json`; `template/` and `skills/` in AutomataFramework
  (they ship to a person's game, a product choice nobody asked for); AutomataPrivate; the website's kits.
- The `verify` skill is a single `SKILL.md` with the commands inline. No helper script, no new test file, no new
  dependency: it drives the browser with the Playwright and Chromium the cloud container already has, and starts the
  product with each repo's own scripts and tools (RukenApp's Postgres 16 is already installed in the container;
  `psql` and `pg_ctlcluster` are on the path).
- No new tools, dependencies, environments or spend. Nothing runs on the Owner's computer.
- Expected duration (estimates): AutomataFramework 3 hours, Editors 3 hours, Examples 2 hours, Site 2 hours, RukenApp 4
  hours (a database and two local Workers to start); about one working day from the spec's merge to the last pull
  request ready for the Owner, most of it the fresh-session runs, audits and CI.

## Where the touched lines stand today

Checked on each repo's `main` on 2026-11-18 (AutomataFramework at `9073d87`; the other four from fresh clones):

- The Skills line, the **Tests.** bullet, the **Lessons become tests first.** bullet, **Limits**, **Report honestly**
  and **Findings carry evidence** are byte for byte the same in all five `CLAUDE.md` files. In every one, "## Rules
  that never bend" is followed by "## Risk", so the new section goes between them in all five. The lines that differ
  between the repos (title, intro, stack, the Lint/Tests/Build commands, the Lane 2 and Lane 3 path lists, and
  RukenApp's Identity bullet, which lacks "(author and committer)") are not touched.
- `CLAUDE.md` is written one paragraph or bullet per line (not wrapped). The new text follows that: every bullet below
  is one line.
- The shared skills `review`, `build`, `staged-path`, `owner-updates` and `visual-check` are byte for byte the same in
  all five. `release` is the same in four; RukenApp's differs in one line only, the `commit-authors` item, which lacks
  "(author and committer)". The edits in section 4 do not touch that line, so each edited skill stays the same
  everywhere apart from it.
- `docs/superpowers/history.md`: Framework, Editors, Examples and Site have "## Rule changes"; RukenApp has none.
  Editors and RukenApp have "## Flaky tests"; Framework, Examples and Site have none. No repo has a lesson line yet
  (each "Lessons" says "None yet." or "None recorded since the restart."), so no existing lesson needs a trigger added.

## The change

### 1. `CLAUDE.md`, "Stack and checks", the Skills line

`visual-check` for screens, then the new skill, in the same list:

```diff
- - Skills, saved in `.claude/skills/`: `review` for audits and fixes, `release` for pull requests and merging, `build` for acceptance criteria and code, `visual-check` for screens, `staged-path` for staged work and starting sessions, `owner-updates` for keeping the owner informed. A repo's own layout, CI and rules go in its `this-repo` skill, not here. Load the one that fits before starting that kind of work. Where work runs and where tests run are in `release`.
+ - Skills, saved in `.claude/skills/`: `review` for audits and fixes, `release` for pull requests and merging, `build` for acceptance criteria and code, `visual-check` for screens, `verify` for starting and driving this repo's app or game the way a person would, `staged-path` for staged work and starting sessions, `owner-updates` for keeping the owner informed. A repo's own layout, CI and rules go in its `this-repo` skill, not here. Load the one that fits before starting that kind of work. Where work runs and where tests run are in `release`.
```

### 2. `CLAUDE.md`, the new Verification section

After the last bullet of "## Rules that never bend" and its blank line, before "## Risk". This block, between the two
markers, is the exact text; acceptance criterion 1 compares each repo's section with it byte for byte.

<!-- verification-section:start -->
```markdown
## Verification

Checks are what let work be handed off: what a program can judge, nobody has to read line by line. The owner says what done looks like and looks at the evidence; the checks do the rest, so they are built and kept like any other part of the product.

- **Run it like a person.** Before a change that alters what the product does is called done, its builder runs it: starts the app or game, goes through the changed journey with real taps, clicks, keys and typing, and looks at what happens. Passing tests are not this. How to start and drive this repo is in its `verify` skill, which the builder loads before every commit that changes behavior. Every session leans on it, so it stays quick and steady: a step in it that breaks or flakes is fixed before other work, and a change to how the product starts or what its first screen shows updates it in the same pull request.
- **The test that is hardest to fool comes first.** A unit test can pass while the feature is broken, because the test and the code share the same misunderstanding. So, in this order: 1. **Journeys**: a person's path through the running product, from the first screen to done; a failure names the step, with a screenshot; a changed journey gets a journey test. 2. **Property tests**, for the cases people and agents both miss: state something that must always hold and let many generated inputs, from a fixed seed, try to break it: round trips (save then load gives back the same thing), invariants (a count never goes below zero), repeats (doing it twice is the same as doing it once: migrations, retries, clean-ups) and twins (a fast version agrees with a plain, correct one). A property-test library is a new dependency and needs the owner's yes first. 3. **Old-versus-new tests**, for a rewrite or a move that should not change behavior: run the old and the new on the same inputs, set aside differences that do not matter (spacing, order), and treat every other difference as a bug unless it is on the change's written list of intended differences. Unit tests cover the small pieces underneath.
- **Quick and steady, or it gets skipped.** A slow check gets run less, and a flaky one teaches a session to rerun instead of fix. Cheap checks first (lint, typecheck, the tests the change reaches); heavy ones (journeys, the full suite) before a push, not after. A test that fails once and passes on retry is a defect: report it with its text, record it under "Flaky tests" in `docs/superpowers/history.md`, and fix its root cause. Never rerun it until it passes, slow it with a sleep, or skip it. If the root cause is not found within the tries in Settings, delete the test, put a steady check of the same thing in its place where one can be written, and record why, and the gap it leaves, under "Flaky tests".
- **A change never edits the check that judges it.** A pull request that changes or deletes an existing test, golden, `verify` step or CI gate names each one and why in its body, and the reviewer reads those first. CI workflow files, `CLAUDE.md` and the shared skills (`review`, `release`, `build`, `staged-path`, `owner-updates`, `visual-check`) change only in their own pull requests.
- **Lessons carry a trigger.** Each line under "Lessons" in `docs/superpowers/history.md` names its trigger (the paths, or the kind of change, a diff shows), the check to run and the failure behind it. Before it pushes, a session reads the lessons and runs only those whose trigger its diff matches.
- **Prune.** Tests, `verify` steps, lessons and rules only grow if let. Each retrospective removes the ones that no longer catch anything or that another check already covers, naming each one and why: rules and lessons in its rule-change pull request, tests in their own.
```
<!-- verification-section:end -->

What changed from the coordinator's draft, keeping its meaning: "it stays fast and reliable" became "quick and steady"
to match the next bullet's title; the `verify` bullet says a change to how the product starts updates the skill in the
same pull request (otherwise the skill goes stale and the next session's smoke test breaks); "Cheap checks first" names
which checks are cheap and which heavy; the "own pull requests" sentence names the shared skills, so a repo's own
`this-repo` and `verify` skills can still change with the code they describe (named in the body, per the same bullet);
"Lessons carry a trigger" says the session reads the lessons before choosing; and "twins" says "a fast version", not
"the fast version".

### 3. `CLAUDE.md`, "Rules that never bend", two bullets

The **Tests.** bullet loses its flaky-test sentence (now under Verification) and gains a pointer:

```diff
- - **Tests.** Write the failing test first and confirm it fails for the right reason. Quick targeted tests run locally whenever they help; CI is the merge gate. A failing test blocks only the change that touches it: report an unrelated failure, and give a failure on `main` its own thread. A merge still needs every required check green, unless the owner authorizes an exception named in the pull request. A test that fails once and passes on retry is a defect: report it with its text and record it under "Flaky tests" in `docs/superpowers/history.md`. Never loosen, skip or re-record a test to hide a defect. No `--pass-with-no-tests` or similar flag that lets an empty suite pass in CI. Updating a golden for an approved behavior change is fine, with its before and after shown. A docs change or a purely visual change is verified by what fits (a link or build check, the approved look), not by an invented unit test.
+ - **Tests.** Write the failing test first and confirm it fails for the right reason. Quick targeted tests run locally whenever they help; CI is the merge gate. A failing test blocks only the change that touches it: report an unrelated failure, and give a failure on `main` its own thread. A merge still needs every required check green, unless the owner authorizes an exception named in the pull request. Never loosen, skip or re-record a test to hide a defect. No `--pass-with-no-tests` or similar flag that lets an empty suite pass in CI. Updating a golden for an approved behavior change is fine, with its before and after shown. A docs change or a purely visual change is verified by what fits (a link or build check, the approved look), not by an invented unit test. Which tests to write, running the change, and flaky tests are under Verification.
```

The **Lessons become tests first.** bullet says the lesson line carries its trigger:

```diff
- - **Lessons become tests first.** A confirmed failure gets a regression test. It becomes a rule only when no test can catch it, as one line under "Lessons" in `docs/superpowers/history.md`.
+ - **Lessons become tests first.** A confirmed failure gets a regression test. It becomes a rule only when no test can catch it, as one line under "Lessons" in `docs/superpowers/history.md` that carries its trigger (see Verification).
```

Nothing else in `CLAUDE.md` changes. The other lines that mention tests or checks were read against the new section
and agree with it: **A check is a test that fails by itself.** (write the check first), **Limits** (tries per problem),
**Findings carry evidence** (a fix is checked by a program or a second session) and Settings (tries per problem: 3,
which "the tries in Settings" in the flaky-test sentence reads; rule edits the retrospective proposes, batched into one
rule-change pull request per slice, which **Prune** uses).

### 4. The shared skills

Each was read for wording the new section contradicts.

- **`build`**: no change. "Use injected clocks and fixed seeds. Browser tests wait on readiness, never on a sleep."
  agrees with the new section; its quality bar already starts from core journeys.
- **`owner-updates`**, **`visual-check`**: no change; nothing about tests, lessons or flaky tests.
- **`release`**: "a clean run: unchanged code is never retried into green (a rerun that validates an actual fix is
  fine)" and "A golden is never re-recorded to hide a defect" agree. One addition, so the setup check finds the new
  skill (as it does the compaction hook). After the setup check's last item, "The compaction hook: ...", add:

  ```
  - The `verify` skill: `.claude/skills/verify/SKILL.md` is there, and a fresh session that follows it from a clean checkout starts this repo's app or game in a cloud container and gets a screenshot of its main screen.
  ```

- **`review`**, "## Lessons": two contradictions. A lesson line has no trigger, and "The retrospective after the slice
  moves each lesson that no test can capture into CLAUDE.md" would put every lesson in front of every session, which
  the trigger rule exists to avoid. The section becomes:

  ```diff
  - A confirmed failure gets a regression test first. A lesson is written down only when no test can catch it: one line under "Lessons" in `docs/superpowers/history.md`, which the coordinator (or short-path implementer) adds when the work is archived. A merge with nothing to learn leaves none.
  + A confirmed failure gets a regression test first. A lesson is written down only when no test can catch it: one line under "Lessons" in `docs/superpowers/history.md` naming its trigger (the paths, or the kind of change, a diff shows), the check to run and the failure behind it, which the coordinator (or short-path implementer) adds when the work is archived. A merge with nothing to learn leaves none.

  - ACCEPTED: utils slice merged, green on the first try. DERIVED: adapters keep keyword arguments exactly. LANDS IN: the plan's brief for every later slice.
  + TRIGGER: a diff that changes an adapter's arguments. CHECK: the adapter still takes the same keyword arguments, by name. BEHIND IT: the pull request or failure that taught it.

  - A lesson lands in the plan's brief, not in a worker's instructions. The retrospective after the slice moves each lesson that no test can capture into CLAUDE.md through its rule-change pull request.
  + A lesson lands in the plan's brief when its trigger matches the plan's work, not in a worker's instructions. The retrospective after the slice moves into CLAUDE.md, through its rule-change pull request, only a lesson that holds for every change (one with no narrower trigger), and prunes the rest as Verification in CLAUDE.md says.
  ```

- **`staged-path`**: the **Handoff.** bullet's "the plan also reads Lessons in `history.md`" becomes "the plan also
  reads the Lessons in `history.md` and carries those whose trigger its work matches". The **Retrospective.** bullet
  gains one sentence after "It turns each lesson into a test where it can, such as a PR-footer check, and proposes the
  rest as one rule-change pull request for the owner to approve.": "It also prunes, as Prune under Verification in
  CLAUDE.md says."

### 5. The `verify` skill (new, one per repo)

`.claude/skills/verify/SKILL.md`. The headings, their order and the frontmatter shape are the same in every repo; what
goes under them is each repo's own.

```markdown
---
name: verify
description: Use before calling a change that alters what the product does done, and before every commit that changes behavior: starts this repo's <app or game> from a clean checkout and drives it the way a person would.
---

# Verify

<one line: what the product is and what "its main screen" is here.>

## Start it

<From a clean checkout in a cloud container: each command in order (install, build, any stand-ins such as a database or
a fake outside service), the address and port it serves on, and what says it is ready (a line it prints, or an
address that answers). The time a clean start took, measured with `date` or `time`, and on which commit.>

## Drive it

<How to open it in a real browser: the Chromium and Playwright already in the container (`require('playwright')`,
`chromium.launch()`), the device profiles in Settings. How to tap, click, type and press keys on it, and the labels or
roles to find the main parts by. How to take a screenshot (at deviceScaleFactor 1 for a session's own check) and where
to save it (the scratchpad, never the repo).>

## The journeys

<The repo's core journeys from a person's side, one line each: where it starts, the steps, what they should see at the
end. This is the map a session follows to "go through the changed journey", and the list the end-to-end walk
starts from.>

## Stop it

<How to stop every server it started and clear what it wrote, so the next run starts clean.>

## When it breaks

<Each known way a start or a step fails, what it looks like and the fix. A step that breaks or flakes is fixed in this
skill before other work.>
```

What each repo's skill covers, from its `this-repo` skill, `package.json` and test setup on 2026-11-18:

- **AutomataFramework** (the runtime; a person's product is a game made from it). Start: `pnpm install
  --frozen-lockfile`, `pnpm build`, pack the package, and make a game from the tarball with `automata create`, then
  install it and run its `npm run dev` (`automata play`), the way `tests/create/made-game.ts` does. Main screen: the
  made game's first screen in Chromium. Drive: the keys that move the hero, and see it move. Journeys: make a game and
  play it; the online room (`src/server.ts`, as `tests/journeys/online.journey.test.ts` plays it); the editors are not
  here.
- **AutomataFrameworkEditors** (the editors suite). Start: `pnpm install --frozen-lockfile`, `pnpm build:journeys`,
  then serve the built suite with the real API code against the pretend GitHub, as `tests/fixtures/serve.ts`,
  `tests/fixtures/fake-github/` and `tests/fixtures/journey.ts` do. Never the real GitHub. Main screen: Welcome, then
  the suite with the example game open. Drive: open the example game, change a value in an editor, see it kept.
  Journeys: from `tests/journeys/` (open a game, sign-in kept and lost, files, settings, the screens).
- **AutomataFrameworkExamples** (the test game). Start: `pnpm install --frozen-lockfile`, then `pnpm build` and `pnpm
  preview` (or `pnpm dev`); `node server.ts` for the room server. Main screen: the game's first screen. Drive: play the
  pinned level with the keys, as `tests/journeys/play.journey.test.ts` does. Journeys: from `tests/journeys/` (play,
  language, words, look, pictures).
- **AutomataFrameworkSite** (the website). Start: `pnpm install --frozen-lockfile`, `pnpm build` (the stand-in game in
  `tests/fixtures/game` unless `GAME_SOURCE` is set), then `pnpm exec wrangler pages dev dist --ip 127.0.0.1 --port
  8788`, as `playwright.config.ts` does. Main screen: the home page. Drive: follow the main links, the keyboard alone
  included. Journeys: from `tests/journeys/`.
- **RukenApp** (the app). Start: Postgres 16 in the container (`pg_ctlcluster 16 main start`, a throwaway database,
  `TEST_DATABASE_URL` pointing at it), the stand-in Stripe (`node tests/browser/support/fake-stripe-server.ts`), then
  `pnpm exec prisma migrate deploy && pnpm build && pnpm exec wrangler dev cloudflare/worker.js --port 4173 ...` and the
  game gate Worker on 8788, with the settings `playwright.config.ts` gives `webServer`. Never the real Stripe, and never
  the test site's database. Main screen: the feed. Drive: sign up, play a game from the feed. Journeys: from
  `tests/browser/` (the design's section 8 journeys).

Each repo's skill reads these files for the exact commands rather than copying the list above; where a file and this
spec differ, the file wins and the skill says so.

### 6. The record

`docs/superpowers/history.md`, the same entry in all five, wrapped at 120 like the entries around it:

```
- 2026-11-18, the Owner: a Verification section in `CLAUDE.md`. Run the change like a person, through a new `verify`
  skill that starts and drives the app or game; journeys first, then property tests, then old-versus-new tests; a flaky
  test fixed at its root, or deleted with the reason written down; a change never edits the check that judges it;
  lessons carry a trigger read from the diff; each retrospective prunes. Asked for in the project thread ("Let's
  rethink how we do tests", with the Claude Code team's article on verification) and approved on a decision card at
  00:30 UTC ("Core rewrite" only; a property-test library and a commit verification stamp or gate declined). Scope:
  this change only, made the same in RukenApp, AutomataFramework, AutomataFrameworkEditors, AutomataFrameworkExamples
  and AutomataFrameworkSite, as AutomataFramework `docs/superpowers/specs/2026-11-18-verification-design.md`
  describes. Later rule changes are lane 3 as usual.
```

- Framework, Editors, Examples, Site: at the end of "## Rule changes".
- RukenApp: a new "## Rule changes" section holding only this entry, after "## Setup" and before "## Standing
  permissions", the order the other four use.
- Framework, Examples and Site have no "## Flaky tests" section, which the new rule writes to: each gets one, with
  "None yet.", just before "## Lessons", where Editors and RukenApp have theirs.

## Acceptance criteria

Each is checked on each pull request's head commit, and the pull request body shows the command and its output.

1. **One Verification section.** In each repo, `awk '/^## Verification$/{f=1} /^## /&&!/^## Verification$/{f=0} f'
   CLAUDE.md` prints the section; `md5sum` over the five outputs gives one hash, and that hash equals the spec's block,
   `{ awk '/verification-section:start/{f=1;next} /verification-section:end/{f=0} f' <this spec> | sed '1d;$d'; echo;
   } | md5sum` (the fence lines removed, plus the blank line before "## Risk"). Tried on a copy of this repo's
   `CLAUDE.md` with the block put in: both give `00cac0b4763d83818549ee9627478811`. The section sits right after "##
   Rules that never bend" and before "## Risk".
2. **The other edited lines match.** The Skills line, the **Tests.** bullet and the **Lessons become tests first.**
   bullet are each one hash across the five `CLAUDE.md` files and equal to the `+` lines in sections 1 and 3.
3. **Nothing left that contradicts it.** In each repo: "fails once and passes on retry" appears exactly once in
   `CLAUDE.md`, inside the Verification section; `grep -r` finds no "moves each lesson that no test can capture into
   CLAUDE.md" and no "ACCEPTED: utils slice" in `.claude/skills/`; `review/SKILL.md` has "TRIGGER:"; `staged-path`
   has "It also prunes"; `release` has the `verify` setup-check line. `review`, `build`, `staged-path`,
   `owner-updates` and `visual-check` are one hash across the five; `release` differs between RukenApp and the others
   only in the `commit-authors` line, as before (`diff` shows that one line).
4. **The `verify` skill has its shape.** In each repo, `.claude/skills/verify/SKILL.md` has `name: verify` in its
   frontmatter and the headings "# Verify", "## Start it", "## Drive it", "## The journeys", "## Stop it" and "## When
   it breaks", in that order (`grep -n '^#'`), and its "Start it" names a measured time and the commit it was measured
   on.
5. **The `verify` skill works for a stranger.** For each repo, a fresh cloud session that did not write the skill,
   started with only "Load the `verify` skill and follow it to start this repo's app or game and take a screenshot of
   its main screen" on the pull request's head commit, does so three times in a row, each from a clean start (a fresh
   clone, or `git clean -xfd` after stopping everything the run before started), with no help and no edit to the
   skill. Each run's screenshot is attached to, or linked from, the pull request, with the run's time measured with
   `date` at start and end, and the commit. A failed run is fixed in the skill and the three runs start again.
6. **It reads as the Owner chose.** The section holds the six points of the decision card and no property-test
   library, no commit stamp and no commit gate (read by the plan audit and the implementation audit).
7. **Clean diffs.** `git diff --check origin/main...HEAD` prints nothing in each repo. Each pull request's diff touches
   only the files in Boundaries, and the build session's live-state file is gone from its last commit.
8. **Identity.** Every commit is authored and committed by McThayDT
   <107786093+mcthaydt@users.noreply.github.com> (`git log --format='%an <%ae> | %cn <%ce>' origin/main..HEAD`), with
   no Co-Authored-By, Claude-Session or "Generated with" line (`git log --format=%B origin/main..HEAD | grep -i -E
   'co-authored|claude-session|generated (with|by)'` prints nothing). Each pull request body's last line is
   `Requested by **McThayDT**`, checked after every create or edit; the `commit-authors` check is green.
9. **Green and merged the agreed way.** CI is green on each pull request's head; each stays a draft until the
   implementation audit and the Owner's approval, then merges with a merge commit.

## Plan

Units, one per repo, each lane 3. They share no file, so they can run side by side, three writers at a time at most
(Settings); each waits only on this spec's merge.

| Unit | Repo | Waits on | Files it owns | Output | Acceptance check | Estimate |
|---|---|---|---|---|---|---|
| 0 | AutomataFramework | the plan audit | this spec and its audits | the spec on `main` | the plan audit has no reds | (this session) |
| 1 | AutomataFramework | 0 | Boundaries | one draft pull request | criteria 1 to 9 | 3 hours |
| 2 | AutomataFrameworkEditors | 0 | Boundaries | one draft pull request | criteria 1 to 9 | 3 hours |
| 3 | AutomataFrameworkExamples | 0 | Boundaries | one draft pull request | criteria 1 to 9 | 2 hours |
| 4 | AutomataFrameworkSite | 0 | Boundaries | one draft pull request | criteria 1 to 9 | 2 hours |
| 5 | RukenApp | 0 | Boundaries | one draft pull request | criteria 1 to 9 | 4 hours |

1. A fresh session audits this spec (plan audit, `review`), never this session, and writes
   `docs/superpowers/audits/2026-11-18-1-verification-plan-audit.md` on this branch; this spec merges on green with it.
2. In each repo, on its own branch from `main`: the `CLAUDE.md` edits (1 to 3), copied from this spec, never retyped;
   the skill edits (4); the history entry and any missing "Flaky tests" section (6); then the `verify` skill (5),
   written by starting and driving the product in the build session's own container until it works from a clean
   start, with the time measured. Check criteria 1 to 4 and 7 to 8 with the commands above.
3. Ask the coordinator for the fresh session of criterion 5; fix the skill until three runs in a row pass.
4. One implementation audit across the five pull requests by a fresh session; fixes on the same branches by the build
   sessions.
5. The Owner's approval through the coordinator, then each merges with a merge commit.
6. If any of the touched lines changed on a repo's `main` since 2026-11-18 (another rule change merged first), re-read
   them, keep the other change, and report the difference instead of guessing.

## Found on the way (reported, not fixed here)

- AutomataFramework's `package.json` script `test:engine` passes `--passWithNoTests`, which the **Tests.** bullet
  forbids ("No `--pass-with-no-tests` or similar flag"). It predates this change; its own thread.
- Editors' "Flaky tests" holds `settings.browser.test.ts` (Firefox), "Left as it is". Under the new rule, its next
  failure means a root-cause hunt within the tries in Settings, then a fix or a deletion with the reason. Nothing
  changes now.

## Open decisions

None. The Owner's choices on 2026-11-18 cover the repos, the ideas and the two declined ones. The reading that a repo's
own `this-repo` and `verify` skills may change with the code they describe (named in the body), while `CLAUDE.md`, CI
workflows and the six shared skills change only in their own pull requests, follows from "a change can't edit the check
that judges it" and is called out for the plan audit; it does not change any lane (a skill edit is still lane 3 under
Risk).

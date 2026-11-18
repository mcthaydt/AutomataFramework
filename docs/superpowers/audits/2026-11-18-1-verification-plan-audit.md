# Verification spec: plan audit, cycle 1

Audited: AutomataFramework draft pull request #213, commit `f699358`, `docs/superpowers/specs/2026-11-18-verification-design.md`.
Auditor: a fresh plan audit session (Opus 5.5, medium), `review` and `staged-path` loaded. Lane 3.

**Result: 9 red, 11 notes.** The spec does not merge as it is. Every red finding has a small fix inside the spec. One
red finding (R3) needs the Owner to make a decision, asked as a decision card.

## What was checked, and how

- **The article** was read on 2026-11-18 (claude.dev, "How the Claude Code team thinks about verification"). The
  spec's quotes match it. The article does not mention TDD.
- **The other four repos** were cloned from `main` (read-only): RukenApp `43df79c`, Editors `fd1f3b1`, Examples
  `ca78632`, Site `6fc74c6`. AutomataFramework's base is `9073d87`.
  - The Skills line, **Tests.**, **Lessons become tests first.**, **Limits**, **Report honestly**, **Findings carry
    evidence** and **A check is a test** each give one `md5sum` across all five. Only **Identity** differs, in
    RukenApp, as the spec says.
  - "## Rules that never bend" is followed by "## Risk" in all five.
  - `review`, `build`, `staged-path`, `owner-updates` and `visual-check` each give one hash across all five. `release`
    differs only in RukenApp's `commit-authors` line (checked with `diff`).
  - The history sections are where the spec says: "Rule changes" is in four repos and missing in RukenApp. "Flaky
    tests" is in Editors and RukenApp only. No repo has a lesson line.
- **The edit anchors.** Every line the spec replaces or adds after was found exactly once in the current files with
  `grep -c -F -x` (or `-F` for a sentence inside a line). That covers the three `CLAUDE.md` lines, the three `review`
  lines, the three `staged-path` anchors and the `release` compaction-hook item.
- **The hash check (criterion 1), run by this audit.** The spec's block gives `abc9008362d9e12a0bc71a54392d8d93`. I
  put the block into a copy of `CLAUDE.md` before "## Risk" and extracted it with the criterion's `awk`. The hash was
  the same, `abc9008362d9e12a0bc71a54392d8d93`. The check passes when the section is correct, and fails if the section
  is duplicated or the text changes.
- **Superpowers 7.0.2** (`plugin.json` says `"version": "7.0.2"`) was read at
  `~/.claude/plugins/cache/superpowers-marketplace/superpowers/7.0.2/skills/`: `test-driven-development` (with
  `writing-good-tests.md`), `verification-before-completion`, `executing-plans` and `subagent-driven-development`. The
  spec's quotes match.
- **The `verify` skill shape in this container.**
  - Site: Node 24, `pnpm install --frozen-lockfile` and `pnpm build` took 15 s in all (00:46:23 to 00:46:38 UTC).
    `wrangler pages dev dist --ip 127.0.0.1 --port 8788` answered after 4 s. Chromium through `require('playwright')`
    opened the home page ("Automata Framework: finish the game your agent started") and took a screenshot. Everything
    was stopped afterwards.
  - RukenApp's Postgres: `pg_ctlcluster 16 main start`, then `psql -c 'select 1'`, then a stop. It worked, as root.
  - Network: `registry.npmjs.org`, `codeload.github.com` (Examples' framework pin) and `binaries.prisma.sh` all answer
    through the proxy.
  - Every file the spec names for each repo exists, and so does every script it names: `build:journeys`, `preview`,
    `server.ts`, `tests/create/made-game.ts`, `tests/fixtures/serve.ts`, `fake-github/`, `fake-stripe-server.ts`,
    `cloudflare/worker.js`, and the Site `playwright.config.ts` web server.
  - No playwright or vitest config retries tests (`retries: 0` in Site and RukenApp; no `retry` anywhere else). So the
    new flaky rule needs no config change.
- **Identity.** All six commits on the branch are authored and committed by McThayDT
  <107786093+mcthaydt@users.noreply.github.com>. None has a co-author, Claude-Session or "Generated" line. The pull
  request body ends with `Requested by **McThayDT**`. `git diff --check main...HEAD` prints nothing.

## Red findings

**R1**
- UNIT: spec section 2, the **Quick and steady, or it gets skipped.** bullet; also section 7's Setup note.
- VERDICT: red
- REQUIREMENT: the spec must agree with itself, with CLAUDE.md "Stack and checks" ("the journeys and `create` run in
  CI") and with `release` "Where tests run" ("CI is the merge gate, and full suites run there").
- REASON: the new rule says heavy checks, "journeys, the full suite", run "before a push, not after". Section 7's table
  and its Setup note say the opposite: "browsers and journeys run in CI".
- EVIDENCE: spec line 129 says "heavy ones (journeys, the full suite) before a push, not after". Lines 324 and 360–362
  say "the session runs the commands in Stack and checks before a push, the browsers and journeys run in CI". In
  AutomataFramework the full run is 18 browser shards over three engines (`this-repo`), which a session never runs
  before a push today.
- EXPECTED: one rule. For example: "heavy ones (the journeys the change reaches) before a push; the full suite in CI".
  Section 7 then repeats the same words.
- FIX: rewrite that one clause in section 2's block, recompute the hash in criterion 1, and make section 7's row and
  Setup note use the same wording. Only the spec changes.

**R2**
- UNIT: spec section 2, the flaky-test sentences in **Quick and steady**; section 7's row for "Other tests fail? Fix
  now."
- VERDICT: red
- REQUIREMENT: **Keep to the request** ("A second problem found on the way is reported, not fixed, unless it blocks the
  task"). **Tests.** ("report an unrelated failure, and give a failure on `main` its own thread"). `release` ("a
  rerun that validates an actual fix is fine"; "A required check that is red on `main` as well is an existing failure
  ... give it its own thread"). Also the Owner's request that section 7 evaluate superpowers.
- REASON: the problem has three parts.
  - The flaky rule says "report it ..., record it ..., and fix its root cause", with no owner. Read as written, any
    session that meets an unrelated flaky test must hunt down its root cause, against Keep to the request.
  - The rule also says "Never rerun it until it passes". It does not say whether one rerun to *find out* that a test
    is flaky is allowed. Yet a test that "fails once and passes on retry" can only be seen by a retry.
  - Section 7 calls superpowers' "Other tests fail? Fix now." an agreement ("Agree for the code"). In fact it clashes
    with "report an unrelated failure, and give a failure on `main` its own thread", and the Setup note does not list
    it.
- EVIDENCE: spec line 129; spec line 320; `test-driven-development/SKILL.md` "**Other tests fail?** Fix now." and
  "Any failure that run shows — including one you didn't cause — goes in your report by name".
- EXPECTED: the flaky sentence says the root-cause fix runs in its own thread unless the test blocks this change. It
  says whether one diagnostic rerun is allowed and how that rerun is reported. Section 7 lists "Other tests fail? Fix
  now" as a difference: here an unrelated failure is reported and gets its own thread. The Setup note gains that line.
- FIX: edit the section 2 block (and recompute criterion 1's hash), section 7's table row, and the Setup note in
  section 7. Only the spec changes.

**R3**
- UNIT: spec section 2, **Run it like a person.** ("a change to how the product starts or what its first screen shows
  updates it in the same pull request"); spec "Open decisions".
- VERDICT: red. It needs the Owner's choice.
- REQUIREMENT: CLAUDE.md Risk, lane 3 ("CLAUDE.md and the skills, even though they are `.md` files"). "Uncertain,
  dependent or hard-to-undo work takes the staged path ... or when it is lane 3." Product choices go to the Owner as
  decision cards.
- REASON: `verify` is a skill, so any pull request that edits it is lane 3. The new rule makes every product change
  that alters the first screen or how the app starts edit `verify` in the same pull request. Such changes are common
  in RukenApp and Editors UI work. Each of them would then need the staged path, a plan audit, an implementation audit
  and the Owner's approval. The spec says this "does not change any lane" and lists "Open decisions: None". So it never
  shows the Owner this cost.
- EVIDENCE: spec line 126 (the rule); line 454 ("a skill edit is still lane 3 under Risk"); line 449 ("None"); CLAUDE.md
  Risk, lane 3 list.
- EXPECTED: the spec lists this as an open decision, with options and a recommendation. For example:
  - (a) An edit to `verify` (or `this-repo`) that only describes how to start, drive or stop the product takes the
    lane of the code change it rides with. This needs one added line in Risk.
  - (b) Keep lane 3, and accept the staged path for those changes.
  - (c) The `verify` update goes in a follow-up pull request, and the skill is stale in between.

  The build waits only for that answer.
- FIX: add the decision card to "Open decisions". If (a) is chosen, add the Risk line to section 3 and to Boundaries,
  and add a matching check to criterion 2. Only the spec changes.

**R4**
- UNIT: spec section 2, **A change never edits the check that judges it.**, the last sentence ("CI workflow files,
  `CLAUDE.md` and the shared skills ... change only in their own pull requests").
- VERDICT: red
- REQUIREMENT: consistency with CLAUDE.md Risk "First-time setup" (CI and rules files created together, lane 2), with
  `release`'s setup check, with this spec's own Plan, and with AutomataFramework's `this-repo` (the template's own
  `CLAUDE.md` "is part of the game a person makes").
- REASON: "their own pull requests" is not defined. It can be read three ways.
  - Each kind needs a separate pull request. That forbids the first-time-setup pull request, which writes CI workflows
    and rules files together. It also forbids this spec's own per-repo pull request, which changes `CLAUDE.md`, three
    shared skills, `history.md` and a new skill together.
  - "`CLAUDE.md`" can be read to include `template/CLAUDE.md`, which is product. A template change that edits the
    template's `CLAUDE.md` would then have to be split.
  - A code change that needs a workflow edit (a new path in the `plan` job's lists, as `release` and `this-repo`
    describe) must now land in two pull requests, CI first. That is a real change in practice, and the spec does not
    say it.
- EVIDENCE: spec line 130; CLAUDE.md Risk "First-time setup"; `release` "Setup check" (it sets up the CI and rules
  together at first-time setup); `this-repo` "Two kinds of skill" and its CI notes.
- EXPECTED: one plain definition. For example: "a pull request that changes no product code and no tests. First-time
  setup and a rule-change pull request may change several of these together. `CLAUDE.md` here means the repo's own
  root file." Also one sentence saying that a code change needing a CI workflow edit lands the workflow change first.
- FIX: edit the section 2 block (and recompute the hash), and the explanation under it. Only the spec changes.

**R5**
- UNIT: spec section 2, the same bullet's title and body.
- VERDICT: red
- REQUIREMENT: the Owner's chosen point, "never let a change edit the check that judges it" (spec Outcome; the
  decision card), and the article: "If a change can modify the check that judges it, the check is broken."
- REASON: the title says "never", but the body allows the edit if the pull request names it, "and the reviewer reads
  those first". Lane 1 ("a test ... an isolated change with coverage") merges on green with no reviewer. So a lane 1
  pull request can change a test and the code that test judges, and nobody but its author reads the change. The rule
  does not do what its title promises.
- EVIDENCE: spec line 130; CLAUDE.md Settings "Audits by lane: lane 1 none"; `release` "Lane 1 ... Green".
- EXPECTED: the title matches the body. Either:
  - name the gap honestly (for example "**A change that edits a check says so.**"); or
  - make a pull request that changes or deletes an existing test, golden, `verify` step or CI gate get a fresh review.
    That lifts it to lane 2 and changes Risk, so it is a decision card for the Owner, which can go with R3's.
- FIX: edit the section 2 block (and recompute the hash), or add the decision to "Open decisions". Only the spec
  changes.

**R6**
- UNIT: spec section 2, **Lessons carry a trigger.**; spec section 4, `review` Lessons (the new example line).
- VERDICT: red
- REQUIREMENT: CLAUDE.md **A check is a test that fails by itself.** and **Lessons become tests first.** ("It becomes a
  rule only when no test can catch it").
- REASON: a lesson exists only when no test can catch it. Yet the new text says each lesson names "the check to run",
  and CLAUDE.md defines a check as a test. The new example ("CHECK: the adapter still takes the same keyword arguments,
  by name") is something a test can catch, so under the existing rule it should never become a lesson.
- EVIDENCE: spec lines 131 and 191; CLAUDE.md line 50.
- EXPECTED: words that do not clash with CLAUDE.md's meaning of "check". For example: "what to look at in the diff",
  or "LOOK FOR:". And an example no test can catch, such as a step in how work runs.
- FIX: edit the section 2 block (and recompute the hash), section 4's `review` example, and section 6's entry if it
  repeats the word. Only the spec changes.

**R7**
- UNIT: spec section 4, the new last paragraph of `review` "## Lessons".
- VERDICT: red
- REQUIREMENT: the spec's own **Prune.** bullet: remove only the lessons "that no longer catch anything or that another
  check already covers".
- REASON: "...moves into CLAUDE.md ... only a lesson that holds for every change ..., and prunes the rest". Read as
  written, the retrospective deletes every lesson that has a narrower trigger. Those are the lessons the trigger rule
  exists to keep in `history.md`.
- EVIDENCE: spec line 194.
- EXPECTED: "...and keeps the rest in `history.md`, pruning them as Prune under Verification in CLAUDE.md says."
- FIX: edit that one `+` line in section 4, and the matching grep in criterion 3 if one is added. Only the spec
  changes.

**R8**
- UNIT: spec "Owner decisions" and section 3 (**Tests.**).
- VERDICT: red
- REQUIREMENT: the brief. The Owner chose "Core rewrite" as offered: "replace the Tests bullet with a Verification
  section holding the six points". Report honestly: deviations are named, with their reasons.
- REASON: the spec does not replace the Tests bullet. It keeps it, trims it and adds a pointer. That is probably the
  right call, because the bullet holds the CI-gate, unrelated-failure, `--pass-with-no-tests` and golden rules, which
  are not among the six points. But nowhere does the spec say it departs from the option the Owner picked, or why.
- EVIDENCE: spec line 44 against lines 147–152; the paragraph "What changed from the coordinator's draft" (lines
  136–143) does not mention it.
- EXPECTED: one sentence in that paragraph (and later in the pull request body): the Tests bullet stays, trimmed,
  because its other rules are not among the six points.
- FIX: add the sentence to the spec. Only the spec changes.

**R9**
- UNIT: spec acceptance criterion 5; section 5, "Drive it" ("where to save it (the scratchpad, never the repo)").
- VERDICT: red
- REQUIREMENT: CLAUDE.md "Acceptance criteria come first ... criteria a program or a person can observe"; CLI first.
- REASON: criterion 5 wants each run's screenshot "attached to, or linked from, the pull request". GitHub has no CLI or
  API way to attach an image to a pull request or a comment. The `verify` skill says screenshots never go in the repo.
  Boundaries forbid any other file in the diff. So the criterion cannot be met as written, and an implementer would
  have to invent a place, possibly a public one.
- EVIDENCE: spec lines 393–398 and 231–232; Boundaries lines 65–68.
- EXPECTED: the criterion names where the evidence lives and who can see it. For example: the fresh session publishes
  its three screenshots as a private Artifact page or sends them to the coordinator. The pull request body links that
  page, lists each run's start and end times from `date` and the commit, and describes what each screenshot shows.
- FIX: edit criterion 5 (and plan step 3). Only the spec changes.

## Notes (recorded, not blocking)

**N1**
- UNIT: spec "Where the touched lines stand today"; section 7, "The 'Setup' entry ... already lists four places";
  criterion 3.
- VERDICT: note
- REQUIREMENT: Report honestly; criteria a program can run.
- REASON: RukenApp's history "## Setup" has no 2026-11-16 superpowers entry and no list of four differences. Its
  entries are also one line each, not wrapped. So "the same in all five" and "wrapped at 120 like the entries around
  it" cannot both hold there. Criterion 3's "one `md5sum` over the extracted entry" gives no command to extract it.
- EVIDENCE: RukenApp `docs/superpowers/history.md` lines 3–6.
- EXPECTED: say that RukenApp lacks the earlier four, choose the wrapping (the same text everywhere, wrapped at 120),
  and give the extraction command (for example `awk '/^- 2026-11-18: superpowers/{f=1} f&&/^- /&&!/^- 2026-11-18:
  superpowers/{f=0} f'`).
- FIX: the spec only.

**N2**
- UNIT: spec section 5, "Start it".
- VERDICT: note
- REQUIREMENT: criterion 5 (a stranger can start it).
- REASON: this container's default `node` is v22.23.5 (`/opt/node22`), but every repo needs Node `>=24.21` (`engines`).
  Node 24 is at `/opt/node24/bin` (`use-node-24`). A `verify` skill that does not say this fails a stranger's first
  run.
- EVIDENCE: `node -v` gives v22.23.5; `/opt/node24/bin/node -v` gives v24.22.3; `engines` in all five `package.json`
  files.
- EXPECTED: the template's "Start it" says to pick the Node version `engines` asks for first.
- FIX: the spec's section 5 template.

**N3**
- UNIT: spec section 5, RukenApp.
- VERDICT: note
- REASON: the stand-ins listed name only Stripe. `playwright.config.ts` also starts a fake GitHub (12112), a fake
  Resend (12113) and a fake Twilio (12114). It starts the game gate only after `when-up.ts` sees the app. Sign-up, the
  spec's "Drive" step, reads its code from the fake mail or text servers. The "the file wins" clause covers this, but
  the list as written undersells the work: the estimate for RukenApp is 4¼ hours.
- EVIDENCE: RukenApp `playwright.config.ts` lines 31–130.
- FIX: list all five stand-ins in the spec, or say "every `webServer` entry".

**N4**
- UNIT: spec section 4, the new `release` setup-check line.
- VERDICT: note
- REASON: the setup check runs "before it builds anything", including in a brand-new repo that has nothing to start
  yet. The new line does not say what is reported then.
- FIX: add "(or 'missing until the first screen exists' in a repo with nothing to start yet)".

**N5**
- UNIT: criterion 1.
- VERDICT: note
- REASON: "The section sits right after ... and before '## Risk'" has no command. The hash does not check where the
  section is.
- FIX: add `grep -n '^## ' CLAUDE.md` with the expected order.

**N6**
- UNIT: criterion 5.
- VERDICT: note
- REASON: "A failed run is fixed in the skill and the three runs start again" has no bound.
- FIX: tie it to the tries in Settings, then reassess as Limits says.

**N7**
- UNIT: section 7, the exceptions row and Setup note.
- VERDICT: note
- REASON: superpowers' exceptions include "configuration files". The spec's answer names only docs and purely visual
  changes. That leaves a config-only change (`biome.json`, a workflow) with no stated way to verify it.
- FIX: say whether config is verified "by what fits" (lint, typecheck, build, the CI run).

**N8**
- UNIT: section 2 block, wording (drunk-grandma test).
- VERDICT: note
- REASON: the block is mostly plain. A few spots are not:
  - "only grow if let" reads oddly (better: "only grow unless someone trims them").
  - "red-green-refactor" is jargon, used without an explanation.
  - The **Test first** bullet is long, with six sentences in one line.
- FIX: optional rewording, then recompute the hash.

**N9**
- UNIT: spec "Owner decisions".
- VERDICT: note
- REASON: the request says "add it to our games and apps claude.md". That most naturally names the games and apps kits,
  which the spec excludes ("not ... the website's two kits"). The card's choice, as relayed, settles it. But repos set
  up later from the kits will not get the Verification section.
- FIX: the coordinator confirms the card's wording once. A follow-up for the kits needs the Owner's own request.

**N10**
- UNIT: section 2, the `verify` skill may change in the same pull request.
- VERDICT: note
- REASON: the article's mechanism keeps the judging file out of the change's reach ("reads the REVIEW.md file from the
  base or default branch"). Letting `verify` change with the code is reasonable, because it is a smoke harness and not
  the merge gate. One cheap guard would still help.
- FIX (optional): the implementation audit runs `verify` from the base branch as well, when a pull request edits it.

**N11**
- UNIT: spec "Why".
- VERDICT: note
- REASON: the article practices left out, as "Core rewrite only" allows: a human after three failed rounds (Limits
  already does something like this), code owners writing their own checks, one reviewer over several rounds, testing
  the checks against reverted changes, and replaying known bugs to find rules. The two declined items (a property-test
  library, and a stamp or commit gate) are correctly absent. The block says a property-test library needs the Owner's
  yes.
- FIX: none needed. Recorded so a later spec can pick them up.

## Lenses, in short

1. **Article fidelity.** The seven points taken up match the article's words. Nothing the Owner declined is in. R5
   (the title promises more than the rule does) and R8 (the Tests bullet is kept, not replaced) are the gaps.
2. **Agreement with every other rule and skill, in all five repos.** R1, R2, R4, R6 and R7. The anchors and the claims
   that the five repos are the same were all confirmed (see above). N1 covers RukenApp's history.
3. **Superpowers 7.0.2.** The reading is accurate, and the outside-in nesting and the "break it on purpose" settlement
   hold. Missed: "Other tests fail? Fix now" (R2) and configuration files (N7).
4. **Criteria can be observed.** The criterion 1 hash was reproduced. Gaps: R9, N1, N5 and N6.
5. **`verify` works in this container.** Shown for Site from start to screenshot, and for RukenApp's Postgres. N2 (Node
   24) and N3 (RukenApp's stand-ins) are what a stranger would trip on.
6. **Drunk-grandma test.** Mostly plain; N8.
7. **Identity.** Clean (see above).

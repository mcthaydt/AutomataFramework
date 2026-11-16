# The shared rules

The rules every AutomataFramework repo and every working session follows. Each repo's `CLAUDE.md` holds only what is
particular to that repo and points here. Change a shared rule here, in one pull request, and nowhere else; rule changes
are batched into one thread a day. The `agent-rules` check keeps this page and AutomataFramework's `CLAUDE.md` under
200 lines together.

A rule a program can check is a program: a hook in [`.claude/hooks/`](../.claude/hooks/), a test or a CI check. Each
such rule below names what enforces it, and a model review is added on top, never instead. Workflow steps live in
skills under [`.claude/skills/`](../.claude/skills/), which load only when used. The Owner's product decisions are in
[`decisions.md`](decisions.md), and the order of work is in [`roadmap.md`](roadmap.md), the only roadmap.

## What we are making

A framework and set of editors for making games, where agents do the authoring and every piece of authorable content
can be edited on an iPad. The design is the
[first layer's spec](superpowers/specs/2026-11-13-2d-first-layer-design.md).

## Principles

Every spec names the principle it serves; a spec that serves none, or breaks one, doesn't start.

1. **Agent-first.** Anything a person can author, an agent can create, read and change through the same documented
   formats and commands. No hidden state, nothing mouse-only.
2. **iPad-first editors.** Touch first; desktop is a bonus.
3. **Layers in order.** 2D in full (runtime, editors, publishing) before any 3D, which is a layer on top, never mixed in.
4. **Separate repos per layer or tool**, each with its own release. No monorepo.
5. **Characters and scenes come from the environment and figure builders**, carried over from the first attempt.
6. **The stack carries over whole** (PixiJS, Pixi3D, Colyseus, Effect, strict TypeScript, a deterministic sim with
   cross-browser parity tests, API reports, GitHub-hosted CI). Anything left out has a written reason.
7. **Port in layer order** from AutomataFrameworkFailed, reviewed as it lands, never ahead of the layer using it.

Left out on purpose: Ruken as a target, a monorepo layout, and anything mixing 2D and 3D in one package.

## The order of work

- Slices are editor-driven, one at a time: World, Characters, Feel, Sound, Story, Screens. The roadmap has the steps.
- Mockups first is a hard stop: no editor code until the Owner approves the mockups.
- Work stays on the current slice, and only the current slice is planned.

## How work runs: loops and a graph

Work is a graph of small sessions. Each session is a node: one bounded job, one branch, one output, with a loop
inside it (make, check, correct, until the check is green). Between nodes there are gates, and the Owner stands at
the end, not in the middle.

- **Build the gate first.** A new job that will repeat gets its failing check before the job itself. A node is done
  when a program says so: CI is green, the diff stays inside its scope (`node .claude/tools/scope.mjs check`), every
  finding has its evidence. "It looks good", "the model is sure" and "no errors were raised" are not checks.
- **An edge is a real dependency.** One step waits for another only if it reads that step's output, and the plan names
  what passes between them. If you can't name it, the two run side by side.
- **Fixed steps are code, not a model.** Merging, ranking, deduplicating and comparing before and after have one right
  answer each, so a script does them (`findings.mjs`, `lane.mjs`, the golden checks).
- **Reviews run side by side.** Independent review lenses each run in their own find-only session and never read each
  other's reports. Then one fix session takes each finding alone: that finding's files only, at most three tries,
  then it reports the finding as stuck. A stuck finding means the plan is wrong. The `review-graph` skill has the
  graph, and `visual-review` and `stage-workflow` use it.
- **Return the unit, not the batch.** When one fix fails, only that finding goes back; the others stay as they are.
- **The learning edge.** When a result is accepted or a finding repeats, its cause becomes a constraint: a check if a
  program can see it, otherwise one line in [`constraints.md`](constraints.md), which the plan and every review split
  read when they cut the work. It carries the rule, never the output, and stays short.
- **Lanes follow what a mistake costs to undo, never the model's confidence.** `node .claude/tools/lane.mjs` picks the
  lane from the changed files: **contained** (docs, tests, one feature folder) merges on a green full run; **wide**
  (shared code, formats, the public surface, CI and setup, these rules) also needs `graphify_impact` and the affected
  callers' tests; **standing** (a test game's golden that moves, a deletion, as the plan calls for) merges on green
  under the Owner's standing yes (2026-11-16); **closed** (a release, a migration, a new dependency, anything
  unplanned) never opens without the Owner. The `merge-and-release` skill follows it.
- **The Owner approves only finished results:** the finished mockup set, the finished slice on the site, and the
  closed lane. Nothing in between waits for the Owner.

## Models and effort

| Step | Model | Effort |
| --- | --- | --- |
| Spec (superpowers brainstorming, with the Owner) | Opus | medium |
| Plan (writing-plans; only the current slice) | Fable 5.2 | medium |
| Plan audit (skipped for a plan of fewer than five tasks) | Opus | medium |
| Build (executing-plans) | Sonnet | high |
| Implementation audit and every review lens, code or visual | Opus | medium |
| Fixes | Sonnet | high |
| The harsh last look at a mockup set | Opus | high |
| Advisor | Fable 5.2 | |
| Anything not named here | Opus | medium |

Every thread start sets both its model and its effort. Effort is low, medium or high, never above high; the guard
hook refuses a session or agent asked to run higher.

## Sessions

- **One coordinator, one merge session and one advisor** (Fable 5.2, idle until asked, consulted only on big calls,
  advises only), all long-lived. The merge session merges a pull request once it is ready for review and its newest
  full run is green, then deletes the branch; the `merge-session` skill has its checks. Build sessions are archived
  when done and refreshed after 90 minutes.
- **Up to four working threads at once**, all on the current slice, and at most three building code in the same repo;
  the board thread, the merge session and the advisor don't count. Never run threads side by side that would
  conflict (chained pull requests, the same generated files).
- **Caveman for working notes.** Every session turns on the caveman skill (`/caveman`) and writes its notes and its
  reports to the coordinator that way. Code, commands, commit messages, pull requests, docs and all game, editor and
  site words stay plain. Questions for the Owner are full sentences. The session-start hook reminds each session.
- **Graphify first.** Build, review and fix sessions find code and check what a change affects with the Graphify
  connector before grepping. Its graph is a snapshot at its `commitSha`; read the real file for anything newer.
- **Reports** to the coordinator: one line per task (the commit, the test count, any surprise), each deviation from
  the plan with its reason, and a summary at the end. Stop and report at once on a stop rule, a cap, a failing test,
  an access refusal or a missing tool. Questions only the Owner can answer go out at once, in plain words, with
  options and a recommendation; a session never defaults an Owner decision.
- **Short start-up reading.** `docs/superpowers/progress.md` holds open work only, one short line per task; finished
  work moves to `docs/superpowers/history.md`, which sessions read only when asked.

## Rules

- **The drunk-grandma test.** All copy and UX must let a drunk grandma tell what is happening and what to press.
- **Onboarding comes first.** A first-time player learns what to do and that they did it; a first-time developer or
  agent gets from install to a working game by following the README.
- **No subagents** unless the Owner says so. Review lenses are threads the coordinator starts, not subagents.
- **CLI first.** Do with a CLI what a CLI can do, and give the Owner commands rather than click-through steps.
- **No AI attribution** in commits, pull requests or docs; credit reads "Requested by **McThayDT**". Enforced by the
  guard hook (pull request words), the `commit-msg` git hook and the `commit-authors` check.
- **One author:** `McThayDT <107786093+mcthaydt@users.noreply.github.com>`. The session-start hook sets it and turns
  on the git hooks, whose `pre-commit` refuses any other author or committer; `commit-authors` fails the pull request
  too. If the hook did not run (the session opened outside this repo), run
  `node <path to AutomataFramework>/.claude/hooks/session-start.mjs`. If a wrong-author commit is ever pushed, push
  the corrected history to a new branch, open a replacement pull request, close the old one and delete its branch.
- **Never force-push.** The guard hook refuses it, and `main` is protected.
- **Tests run only in GitHub-hosted CI.** The guard hook refuses local test runners and checks. Verify through the
  pull request's runs.
- **Branches:** `main` plus branches with CI running, five at most. Any session may delete a branch whose pull request
  is merged or closed; never `main` or a branch with an open pull request.
- **Private stays private.** Strategy, prices, the market and the real demo games stay in AutomataPrivate. The
  `agent-rules` check fails a public file that names a real demo game.
- **New dependencies need the Owner's yes.**
- **Fix every finding**, low ones included, in one round. Only a finding that needs an Owner choice waits.
- **A flaky test seen twice is fixed before other work.**

## Fast CI

Each repo's `.github/workflows/ci.yml` has a `plan` job that reads the pull request's changed files; what each repo's
quick run picks is in its `CLAUDE.md`.

- **A draft gets the quick run:** Chromium only, only the tests the change reaches, and pictures only of the screens
  it touches, when something seen changed or the pull request has the `screenshots` label. Its job names start with
  `quick `, so it never counts as a required check.
- **The full run gates merge:** ready for review, a push to `main`, the `full-tests` label, or a change to the build
  or test setup. It runs every browser (Chromium, WebKit, Firefox), each in six shards: 18 jobs.
- **Docs-only runs no tests:** Markdown people read, less any a test reads, passes the required checks in about a
  minute.
- **Wait, don't watch.** Wait for the result once (`gh run watch --exit-status`); read only the failing job's log.
  Batch pushes, since each push cancels the run before it.

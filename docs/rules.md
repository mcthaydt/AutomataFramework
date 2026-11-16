# The shared rules

The rules every AutomataFramework repo and every working session follows. Each repo's `CLAUDE.md` holds only what is
particular to that repo and points here; a shared rule changes here, in one pull request. A rule a program can check
is a program (a hook in [`.claude/hooks/`](../.claude/hooks/), a test or a CI check), and the rule names it. Optional
workflows are skills in [`.claude/skills/`](../.claude/skills/). Operating numbers (fix tries, thread and branch
limits, session refresh, line caps) are settings in [`.claude/workflow.json`](../.claude/workflow.json), tuned from
experience. The Owner's product decisions are in [`decisions.md`](decisions.md), the order of work in
[`roadmap.md`](roadmap.md), the only roadmap.

## How to work

**Keep working until there is something to approve.** The test of every rule here: one session can fix a typo,
look at it, run the relevant checks and merge it, with no other session and no planning document. The default:

1. **Complete the requested change on your own**, test first, in one session, branch and pull request.
2. **Keep the change contained.** Report an unrelated problem you find; don't fix it in the same change.
3. **Ask only when a missing decision blocks progress, or an action needs the Owner's yes** (below). Otherwise pick
   the likeliest reading, say which, and go on.
4. **Run the relevant checks and fix the failures your change causes.** Targeted tests run locally (one test file,
   lint, typecheck, format); whole suites run in GitHub-hosted CI. The test you wrote first failing, and ordinary
   debugging, are part of the work. Stop only for a blocker still unresolved after `fixTries` attempts, and then
   report it and look again at the approach; repeated failure says to reassess, not where the cause is.
5. **Look at the result and show it**: the session inspects its own change (a small visual change included), fixes
   what it finds and rechecks; no findings means no fix round. Show the evidence (the run, the test, the picture)
   and what is still limited or open. Never round up: done means merged and green on `main`.
6. **Merge on green.** Required checks pass on the newest full run, then the pull request merges: the session that
   made a contained or standing change merges it itself, and the merge session takes the rest (the
   `merge-and-release` skill). The Owner approves a finished feature, slice or mockup set, a release, and the closed
   lane, never each pull request.

**The lane** comes from `node .claude/tools/lane.mjs` where it exists, otherwise from the diff and what it is meant to
do; never build tooling before doing the task. It judges by effect as well as path: a change to the approval and
permission rules themselves (this page, `decisions.md`, the lane, the hooks, the merge skill, the checks that
enforce them, or the project instructions) is closed, whatever its file type.

**Separate spec, plan, audit and review sessions are the exception**, for big or risky work: a new feature or format,
a change to the public surface or the sim's determinism, a slice's editor work, or a closed-lane change. Then the
`stage-workflow` and `review-graph` skills apply. Risk calls for an audit, not task count: `lane.mjs` prints
`audit: needed` for wide and closed changes. Implementation, review and fixes share one pull request: reviewers read
its branch, fixes land on it, and it merges once. A spec or plan may merge on its own on green, or ride on that
branch; handoffs are committed files, and nothing waits on an intermediate merge.

**Red checks.** A required check must pass to merge; there is one exception, the Owner's explicit yes for that pull
request, quoted in the merge commit. A required check that is red on `main` too is not this change's to fix: report
it, the coordinator starts its fix thread, and the change merges once that fix lands or the Owner grants the
exception. A check that isn't required never holds a merge.

## Boundaries

- **Principles.** Every spec names the one it serves: (1) agent-first: anything a person can author, an agent can
  create, read and change through the same documented formats and commands; (2) iPad-first, touch-first editors;
  (3) 2D in full before any 3D, which is a layer on top; (4) one repo per layer or tool, each released on its own;
  (5) characters and scenes come from the environment and figure builders; (6) the stack carries over (PixiJS,
  Pixi3D, Colyseus, Effect, strict TypeScript, a deterministic sim with cross-browser parity tests, API reports,
  GitHub-hosted CI); (7) port from AutomataFrameworkFailed in layer order, never ahead of its user. The design is
  [the first layer's spec](superpowers/specs/2026-11-13-2d-first-layer-design.md).
- **The order of work.** One slice at a time (World, Characters, Feel, Sound, Story, Screens), and only the current
  slice is planned. Mockups first: no editor code until the Owner approves the mockups. **Design review last:** a
  slice does not close, and the next does not start, until every screen built in it has been through the design
  review loop (review, fix, recheck; the `visual-review` skill) and its record says `Recheck: passed` (the Owner,
  2026-11-16; the `agent-rules` check reads `docs/roadmap.md` and fails without it).
- **The Owner's yes** is needed for: a product choice that changes what we make, a new dependency, a release, a real
  game's golden that moves, and anything else `lane.mjs` calls closed. Ask at once, in plain words, on a decision
  card, with options and a recommendation, and keep working on the rest; never default an Owner decision.
- **One author, no AI credit.** Every commit's author and committer is
  `McThayDT <107786093+mcthaydt@users.noreply.github.com>`, and credit reads "Requested by **McThayDT**". The
  session-start hook sets the identity and turns on the git hooks (`pre-commit` refuses another author,
  `commit-msg` a Claude credit); the guard hook refuses a credit in pull request words; `commit-authors` fails the
  pull request. A session opened outside this repo runs `node <AutomataFramework>/.claude/hooks/session-start.mjs`.
  A wrong-author commit pushed: push the fixed history to a new branch, open a replacement, close the old one.
- **Never force-push.** The guard hook refuses it, and `main` is protected.
- **Private stays private.** Strategy, prices, the market and the real demo games stay in AutomataPrivate; the
  `agent-rules` check fails a public file that names a real demo game.
- **Product words** pass the drunk-grandma test: anyone can tell what is happening and what to press. A first-time
  player learns what to do; a first-time developer or agent gets from install to a working game with the README.
- **CLI first**, and give the Owner commands rather than click-through steps.

## Tests and goldens

- **A failure blocks only the change that touches it**, through the red-check rule above. Never loosen, skip or
  quarantine a test to get green.
- **A failure on `main` gets its own thread**: report it with the run, and the coordinator starts a fix thread. Work
  that doesn't touch it goes on. A test that fails then passes is a defect, reported the same day.
- **A golden moves only for a behaviour change someone asked for**, the commit naming the move with its before and
  after. Re-recording to turn red green without knowing why hides a defect. Test games' goldens and planned deletions
  merge on green under the Owner's standing yes (2026-11-16, the `standing` lane); a real game's wait for the Owner.
- **Lessons become tests.** When a mistake repeats, its cause becomes a regression test or a check. Only what no
  program can catch becomes one line in [`constraints.md`](constraints.md); a new rule here is the last resort.

## Sessions

- **The long-lived three:** the coordinator; the merge session, which merges wide changes and any green pull request
  left open, and deletes merged branches; the advisor (Fable 5.2), which only advises, on big calls. Working threads are archived when done.
- **Threads are not subagents.** Threads the coordinator starts, review lenses among them, are what these rules set
  up and need no further yes. A subagent (the Agent, Task or Workflow tools, from inside a session) needs the Owner's.
- **Limits** are in `workflow.json`: working threads at once (all on the current slice; the board, merge session and
  advisor don't count), coding threads per repo, branches per repo. Don't run conflicting threads side by side.
  Any session may delete a branch whose pull request is merged or closed; never `main` or one with an open pull request.
- **Models.** Every thread start sets its model and effort; effort is never above high (the guard hook refuses it).
  Opus medium by default; build and fixes Sonnet high; plans and the advisor Fable 5.2; the harsh last look at a
  mockup set Opus high.
- **Notes.** Sessions write working notes and reports to the coordinator in caveman (`/caveman`); code, docs,
  commits, pull requests and product words stay plain, and Owner questions are full sentences. Reports are short:
  each change, its evidence, what didn't run and why. `docs/superpowers/progress.md` holds open work only.
- **Tools.** Use the Graphify connector to find code and a change's reach; read the real file for anything newer
  than its `commitSha`. Wait for CI once (`gh run watch --exit-status`), read only the failing job's log, and batch
  pushes. A draft gets a quick run of only what the change reaches; marking it ready starts the full run (Chromium,
  WebKit, Firefox) that gates merge; docs-only changes run no tests. Each repo's `CLAUDE.md` has its CI details.

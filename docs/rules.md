# The shared rules

The rules every AutomataFramework repo and every working thread follows: AutomataFramework,
AutomataFrameworkExamples, AutomataFrameworkEditors, AutomataFrameworkSite and the private notes. This is the one
page they live on (the Owner, 2026-11-16). Each repo's `CLAUDE.md` holds only what is particular to that repo and
points here; a shared rule is never copied into a repo's `CLAUDE.md`. Change a shared rule here, in one pull request,
and nowhere else; rule changes are batched into one thread a day. Read only the repos your work needs.

## What we are making

A framework and set of editors for making games, where agents do the authoring and every piece of authorable content
can be edited on an iPad. The first layer's design is
[`docs/superpowers/specs/2026-11-13-2d-first-layer-design.md`](superpowers/specs/2026-11-13-2d-first-layer-design.md);
where a page is short, the spec has the detail.

## Principles

1. **Agent-first.** Anything a person can author, an agent can create, read and change through the same documented
   formats and commands. No hidden state, nothing mouse-only.
2. **iPad-first editors.** Touch first; desktop is a bonus.
3. **Layers in order.** 2D built in full (runtime, editors, publishing) before any 3D. 3D is a layer on top, never
   mixed in.
4. **Separate repos per layer or tool**, each with its own release. No monorepo.
5. **Characters and scenes come from the environment builder and figure builder**, carried over from the first attempt.
6. **The stack carries over whole** (PixiJS, Pixi3D, Colyseus, Effect, strict TypeScript, a deterministic sim with
   cross-browser parity tests, API reports, GitHub-hosted CI). Anything left out has a written reason. New dependencies
   need the Owner's yes.
7. **Port in layer order** from AutomataFrameworkFailed, reviewed as it lands, never ahead of the layer using it. That
   repo is a reference, not a template.

Every spec names the principle it serves; a spec serving none, or breaking one, doesn't start.

**Left out:** Ruken as a target (web, itch and desktop stay); a monorepo layout; anything mixing 2D and 3D in one
package.

## The Owner's decisions (2026-11-13 onwards)

- **Strategy and research stay private.** Positioning, competitors, pricing and market research never go in the
  public repos; the Owner keeps them in the project's private files. A public doc may point at a private decision but
  never repeats its reasoning.
- **The first layer** is a thin slice through the whole offering: the framework, a demo game, the editors, the site and
  deployment, built as a thin thread through all four public repos first and then widened.
- **Repos:** AutomataFramework (the 2D runtime), AutomataFrameworkExamples (the test game, later the 3D game and the
  site's examples), AutomataFrameworkEditors, AutomataFrameworkSite. PixiJS is the biggest inspiration.
- **Determinism means physics.** Rapier's deterministic 2D build. Physics and networking (Colyseus) are in the core,
  like the ECS (Koota).
- **Multiplayer:** every game is built as if it were multiplayer; turning it on is a per-game choice. Networking is
  built and proven in CI, not deployed. Fly.io hosts the room server once the 3D game uses it.
- **The test games prove the editors.** The current games are test games; real demo games come later and are planned
  only in the private notes. The demo game is a small original physics platformer, single-player, with every
  built-in: saves; title, pause and settings screens; keyboard, touch and gamepad with remapping; music and sound with
  volume; phone, tablet and desktop layouts; languages.
- **Editors:** all nine old 2D editors plus the figure and environment builders, which make 2D art only, combined into
  six: World (Levels, Tiles, the environment builder), Characters (the figure builder, clips and entity kinds,
  Schematic), Feel (Feel, Tuner), Sound (Audio), Story (Writer, Sequence) and Screens (the UI and the game's flow: every
  screen a player sees and how one leads to the next; added by the Owner, 2026-11-15). World and Characters have a 2D
  and a 3D version; the 2D ones work the way the old 3D builders did. In the browser, and as a Tauri app for iPad,
  Android and desktop.
- **Agents working on the code are the primary way a game is made.** The editors change authorable content only: the
  JSON files the coding agents produce.
- **Edits live in the game's GitHub repo.** Save makes a commit; edits that collide merge the way GitHub does. Sign-in
  is a GitHub App, run through Cloudflare Pages Functions, which also do the editors' GitHub work as the App; the site
  is on Cloudflare Pages.
- **The editors are for teams,** technical people and not, working on their own games. People get levels of what they
  may do (Look, Suggest, Approve, Edit, Owner), kept in `automata.access.toml` in the game's repo and set from a Share
  screen. People need GitHub only to sign in. Anyone can try the editors on the demo game without signing in and keep
  a copy; saving into a game and working with others need a sign-in.
- **Formats:** game content is JSON; everything else is TOML.
- **Releases are big and few.** Release 1 is when 2D is finished (the framework in full and the 2D test game), Release 2
  the 2D editors, Release 3 the website, Release 4 distribution (shipping games and the editor app), Release 5 3D, and
  the loop repeats for 3D. Milestones are not releases: nothing is published per milestone, and `release.yml` runs only
  when the Owner starts it by hand.
- **Publish targets:** web, itch.io, Wavedash (if its rules fit the host port) and desktop.
- **Languages:** games ship English, Spanish, Korean, Japanese, Chinese and Portuguese. Editors add French, Russian and
  German. The list follows the most popular languages for Godot.
- **`main` is protected** in every repo: pull requests only, no force pushes or deletion, checks required once CI exists,
  no required approving review. Every new repo gets the same protection, and its own short `CLAUDE.md` pointing here,
  when it is created.

## Roadmap

- **One roadmap.** [`docs/roadmap.md`](roadmap.md) in AutomataFramework is the only roadmap; update it first, and copy
  it everywhere else (the project's files, the "needs you" board).
- **Editor-driven slices,** one editor at a time, in this order: World, Characters, Feel, Sound, Story, Screens. Per
  slice: build what it needs in AutomataFramework, mockups (visual review), the editor, its tests, then the website
  demo (the Owner tests on https://automataframework.pages.dev).
- **Mockups first is a hard stop:** no editor code until the Owner approves the mockups.
- **Work stays locked on the current slice.** Plan only the current slice, never ahead.

## Workflow

Each stage is a fresh session on its own branch; the handoff is committed docs.

1. **Spec**: Opus, medium effort, superpowers brainstorming, with the Owner, written to
   `docs/superpowers/specs/<date>-<topic>-design.md` in AutomataFramework.
2. **Plan**: Fable 5.2, medium effort, writing-plans, written to `docs/superpowers/plans/<date>-<topic>.md`.
3. **Plan audit**: Opus, medium effort, the audit prompt, written to
   `docs/superpowers/audits/<date>-<cycle>-plan-audit.md`. Skipped for a plan of fewer than five tasks.
4. **Execution**: Sonnet, high effort, executing-plans, the implementation prompt.
5. **Implementation audit**: Opus, medium effort, written to
   `docs/superpowers/audits/<date>-<cycle>-implementation-audit.md`.
6. **Fixes**: Sonnet, xhigh effort, the code audit's fixes only.
7. **Owner review.**

Every stage reads the spec, the plan, the audits and its repo's `docs/superpowers/progress.md`, updates the tracker
with a progress percentage, and ends by committing and pushing.

**Short start-up reading** (the Owner, 2026-11-16). `progress.md` keeps only open work, one short line per task.
Finished and parked work moves to `docs/superpowers/history.md` in the same repo, which threads read only when asked.

**Implementation prompt:** "Now implement precisely as planned, in full. Implementation Requirements: - Write elegant,
minimal, modular code. - Adhere strictly to existing code patterns, conventions, and best practices. - Include
thorough, clear comments/documentation within the code. - As you implement each step: - Update the markdown tracking
document and overall progress percentage dynamically."

**Audit prompt:** "Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and
relative to the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete
implementations or incomplete integrations. Do your best work."

**Model choice.** Use the model named for each stage or review step. For anything not explicitly mapped (bug fixes,
flaky tests, cleanups, one-off jobs), use Opus at medium effort (the Owner, 2026-11-15).

## Visual review process

Every mockup or UI round goes through these steps (the Owner, 2026-11-16), and all of it lands in one pull request.

1. **The Owner glances first.** Rough mockups go on the board and the Owner looks at them (about five minutes) before
   any review or polish starts.
2. **Review only what changed.** The board shows only the round's new or changed screens; screens already reviewed
   are skipped.
3. **Two review steps.** Each is a find-only thread that writes a report and changes nothing; then one separate fix
   thread, on Sonnet at high effort, fixes every finding before the next step starts.
   - **Words and design** (Opus, medium effort): every word passes the drunk-grandma test, and every screen, device
     and orientation is checked for layout, touch size and polish.
   - **End-to-end check** (Opus, medium effort): walk every real user journey from first open to playing the result,
     and check that every action has its opposite and a visible way back (open/close, hide/show, undo/redo, cancel,
     leave and return) at every size; fully usable, nothing missing, no dead ends. Run the drunk-grandma test on
     every journey: could a drunk grandma find each action, understand what it does and what happened, and recover
     from a wrong tap, with no hidden gestures, guessing or reading the docs.
4. **Fewer pictures in the middle** (the Owner, 2026-11-16). Every device and orientation is pictured only for the
   words and design step and for the harsh last look. The end-to-end walk-through, and any words-only check, uses
   three views: a small phone, an iPad and a computer. A second round looks only at the screens that changed.
5. **One harsh last look** (Opus, xhigh effort), once per mockup set, at the very end, just before the Owner's
   approval, over everything changed since the last approval.
6. **Owner review.** The Owner's tweaks are targeted fixes on Sonnet at high effort, with no new cycle.

**The board.** The Owner reviews all design work in the Editor Mockups artifact,
https://claude.ai/artifact/W5REbCVDUkABgoPY5Hxy2X. Every mockup change publishes a new version of that same artifact
before it is reported done.

## Sessions and reporting

- **One long-lived coordinator. One long-lived merge session** merges each finished stage branch to `main` by pull
  request once its newest full run is green and it is ready for review, then deletes the branch; it never leaves a
  passing pull request open. **One long-lived advisor** (Fable 5.2, idle until asked) is consulted only on big calls
  (plans, specs, roadmap changes, mockup approval, parallel scheduling) and only advises. Stage sessions are archived
  when done.
- **Up to four working threads at once** (the Owner, 2026-11-15), all within the current slice; the board thread, the
  merge session and the advisor don't count. Of those four, at most three build code in the same repo at once. Keep
  the slots filled when there is real parallel work, but never run threads side by side when they'd conflict (chained
  pull requests, the same generated files).
- **Stage sessions report to the coordinator:** one line per task (the commit, the test count, any surprises);
  immediately at any stop (a stop rule, a cap, a failing test, an access refusal, a missing tool), and that task stops;
  each deviation from the plan, with the reason; Owner-only questions, with options, before defaulting; a handoff at
  90 minutes; a summary at the end.
- **The merge session reports** each merge, and immediately, then waits for an answer, on any of these: a failing
  check, a conflict, a golden moved without a commit naming it, more than five branches, an unrequested branch, or any
  judgement call.
- **Refresh sessions after 90 minutes.**

## Rules

- **The drunk-grandma test.** All copy and UX (every editor, the site, the game's screens) must let a drunk grandma
  tell what is happening and what to press. A screen that fails it is a defect.
- **Onboarding comes first** (the Owner, 2026-11-13): it is one of the most important parts of any product. A
  first-time player must learn what to do, how to do it and that they did it; a first-time developer or agent must get
  from install to a working game by following the README.
- **No subagents** unless the Owner says so.
- **CLI first.** If something can be done with a CLI (gh, npm, wrangler and the like), do it with the CLI, and give the
  Owner CLI commands rather than click-through steps.
- **No AI attribution anywhere.** No `Co-Authored-By: Claude`, no session-link trailer and no "Generated with Claude
  Code" in commits, pull request bodies or docs (the Owner, 2026-11-13). Pull request credit reads "Requested by
  **McThayDT**".
- **One author.** Every commit's author and committer is
  `McThayDT <107786093+mcthaydt@users.noreply.github.com>`. Before the first commit in any clone, install a local git
  hook that refuses any other author or committer, and set the identity again before every commit (cloud sessions
  reset it):
  `git config --global user.name "McThayDT" && git config --global user.email "107786093+mcthaydt@users.noreply.github.com"`.
  The `commit-authors` check fails a pull request with a wrong author, a commit by Claude or a Claude credit; its
  failure message gives the fix. If a wrong-author commit is ever pushed, never force-push: push the corrected history
  to a new branch, open a replacement pull request, close the old one and delete its branch.
- **Never force-push.**
- **Branches:** `main` plus branches with CI running, five at most. Any session may delete a branch whose pull request
  is merged or closed, in any project repo; never `main` or a branch with an open pull request.
- **Tests run only in GitHub-hosted CI, never locally.** Verify through the pull request's CI runs.
- **Fix every finding.** A fix round fixes all findings from its report, low ones included, in one round. The one
  exception is a finding that needs an Owner choice: ask, with options, and fix everything else meanwhile.
- **Owner questions that block work** go to the Owner right away, in plain words, with options and a recommendation.
  Never default an Owner decision. Resolve threads and close answered decision cards as soon as they are done.
- **Graphify** (the Owner, 2026-11-16). Every build, audit and fix thread uses the Graphify connector (indexed:
  AutomataFramework, AutomataFrameworkEditors) to find code and to check what a change affects (`graphify_find`,
  `query_graph`, `graphify_callers`, `graphify_impact`, `graphify_tests_for`) before grepping or opening files. The
  graph is a snapshot at its `commitSha`: read the real file for anything changed since, and use text search for
  strings, config and unindexed repos.
- **A flaky test seen twice is fixed before other work.**

## Fast CI

Two speeds (the Owner, 2026-11-15), set up in each repo's `.github/workflows/ci.yml`, whose `plan` job reads the pull
request's changed files and decides. What each repo's quick run picks is in its own `CLAUDE.md`.

- **A draft gets the quick run:** only the tests the change reaches (Vitest `--changed=origin/main --bail=1`;
  Playwright `--only-changed=origin/main --max-failures=1` where a repo uses it), and the pictures only when something
  seen changed or the pull request has the `screenshots` label. Every job's name starts with `quick ` on a draft, so a
  quick run never counts as a required check.
- **The full run gates merge.** Marking the pull request ready for review, every push to `main`, the `full-tests` label,
  or a change to the build or test setup (`package.json`, the lockfile, any `*.config.*`, `tsconfig*.json`,
  `tests/fixtures/`, `.github/`) runs everything, the browsers in six shards, each engine's check green only when both
  its shards passed. Only that run's checks have the required names.
- **A docs-only change runs no tests.** When a pull request changes only Markdown that people read (`CLAUDE.md` and the
  notes under `docs/`, less any a test reads, which each repo's `CLAUDE.md` names), `plan` says `docs`: the testing
  jobs are left out and the `docs` job passes each required check under its exact name, so it merges in about a
  minute. One other file, or the `full-tests` label, brings the usual run back.
- **Always:** checkout with `fetch-depth: 0`, installs and Playwright browsers cached, and a new push cancels the run it
  replaces. So batch pushes.
- **Wait, don't watch.** While CI runs, wait for the result (`gh run watch --exit-status` or a single check); never
  poll or re-read logs again and again. Read only the failing job's log.
- **How to use it:** open the pull request as a draft, push as often as you like, and mark it ready for review when the
  work is done. Only a green full run is merged.

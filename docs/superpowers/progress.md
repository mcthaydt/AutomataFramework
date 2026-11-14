# Progress

The tracker every stage reads first and updates last. One section per cycle; newest first.

## Cycle 4: M2, the 2D framework in full

Spec: [`specs/2026-11-14-m2-design.md`](specs/2026-11-14-m2-design.md)

Overall: **5%** (stage 1, the spec, is written and in review; M2 is eleven plans, each running stages 2 to 7)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Written, in review | `specs/2026-11-14-m2-design.md` |
| 2 to 7, per plan | Not started (plans C, I, V and N can start at once) | |
| Plan C (content): 2. Plan | Written, in review: twelve tasks, twelve new kinds of file and the widened character and level | `plans/2026-11-14-m2-content.md` |
| Plan V (saves and the host port): 2. Plan | Written, in review; stage at 100%, plan V at 10% | `plans/2026-11-14-m2-saves-host.md` |
| Plan I (input), stage 2: plan | Written, in review; **0%** of the plan built (ten tasks, 10% each) | `plans/2026-11-14-m2-input.md` |
| Plan N, networking: 2. Plan | Written, in review (12 tasks; Task 11 waits for plan I's `join` and `leave`; stages 3 to 7 not started) | `plans/2026-11-14-m2-networking.md` |

### Log

- 2026-11-14, plan N (networking): the plan is written. Two new features, `net` (the wire, the room's rules, the
  client's two sims with rollback) and `server` (the Colyseus room, the process on Effect), a third package entry
  `/server`, and three proofs: a scripted two-player run in four engines with a golden, two headless players over
  real sockets, and two real browsers against a server CI starts. Nothing is deployed.
- 2026-11-14: the M2 spec, with the Owner's answers: the demo has same-screen co-op for 2 to 4 players, and online
  play is built and proven in CI, not deployed; the showcase is one short real game of three levels plus a "What's
  inside" page. M2 is cut into small plans that can run side by side.

## Cycle 3: the demo game plays itself (watch mode)

Spec: [`specs/2026-11-14-watch-mode-design.md`](specs/2026-11-14-watch-mode-design.md). The plan, its audit and the
tracker for the other three parts are in AutomataFrameworkExamples (`docs/superpowers/plans/2026-11-14-watch-mode.md`).
This repo has Part A only: one function.

| Task | State |
|---|---|
| 1. `watchReplay` draws a replay with no input | Done, 100% (merged, PR 29, `cc281c9`) |
| The Owner's answers, Q1 (a), Q2 (a), Q3 (b), Q4 (a) | Recorded in the spec addendum, 2026-11-14 |

## Cycle 1: the 2D first layer

Spec: [`specs/2026-11-13-2d-first-layer-design.md`](specs/2026-11-13-2d-first-layer-design.md)

Overall: **44%** (stages 1 to 3 are 12 points, stage 4 is worth 18, stage 5 is worth 8 and stage 6 is worth 6, so the
figure is 12 + 18 + 8 + 6; stage 4 is now whole, because publishing 0.1.0 is no longer part of M1, see the log)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Done, 100% (merged, PR 1) | `specs/2026-11-13-2d-first-layer-design.md` |
| 2. Plan (M1, framework) | Done, 100% (merged, PR 3) | `plans/2026-11-13-m1-thin-thread-framework.md` |
| 3. Plan audit | Done, 100% (merged) | `audits/2026-11-13-m1-framework-plan-audit.md` |
| 4. Execution | Done, 100% (merged, PR 6, `b7b672f`; Task 15's publish step is deferred to Release 1) | `docs/superpowers/plans/2026-11-13-m1-thin-thread-framework.md`, ticked as it goes |
| 5. Implementation audit | Done, 100% (in review) | `audits/2026-11-13-m1-framework-implementation-audit.md` |
| 6. Fixes | Done, 100% (PR 9, green on all four engines; F4's layout in PR 14, green) | `audits/2026-11-13-m1-framework-implementation-audit.md`, F1 to F8 |
| 7. Owner review | Not started | |

Milestones (each runs stages 2 to 7 per repo):

| Milestone | State |
|---|---|
| M1 The thin thread | Framework: built, audited and fixed (PR 9); publishing deferred to Release 1. Examples, Editors, Site: waiting for their repos, then one plan each |
| M2 The framework in full | Not started |
| M3 The editors in full | Not started |
| M4 The site and publishing | Not started |

Releases (the Owner, 2026-11-13; the spec's Releases section): nothing is published per milestone.

| Release | What ships | State |
|---|---|---|
| 1 | 2D finished: framework in full and the demo game (M1, M2) | Not started; `release.yml` is manual-only until then |
| 2 | The 2D editors (M3) | Not started |
| 3 | The website (M4's site) | Not started |
| 4 | Distribution (M4's publishing) | Not started |
| 5 | 3D, then the loop repeats for 3D | Not started |

### Log

- 2026-11-14: a level file may set `sky` and `ground` (`#rrggbb`, both optional, default the old light blue and slate), in
  pull request 25. Asked for by the Owner's choice of palette No. 276 for the example games' art, whose sky and ground
  were framework constants no content file could change. A level that sets neither is unchanged, goldens included.
- 2026-11-14: The touch buttons read their look from seven `--automata-touch-*` CSS properties (today's look is the
  default), and carry the classes `automata-touch` and `automata-touch-button` and `data-action`, so the demo game's
  Blueprint look (Examples cycle 2) needs no more than CSS. No change to the public API and none to the progress
  figure.
- 2026-11-14: The spec's Visual direction takes its colours from "A Dictionary of Color Combinations" (the Owner):
  No. 325 for the site, No. 310 for the editors, No. 340 for the demo game's screens and No. 276 for the example
  games' own art, replacing the Blueprint blue and yellow and the tint per editor. The product is "Automata
  Framework" and its wordmark is the word "automata". Fonts: Fraunces, Onest and JetBrains Mono for the site and
  the editors; Fredoka with rounded Japanese, Korean and Chinese partners for the demo's screens and the demo
  games; IBM Plex Sans Condensed leaves the UI. Layout, type, icons and the drawing notes are unchanged. No
  change to the progress figure.
- 2026-11-14: The spec gains a Visual direction section (the Owner): Blueprint as the editors' and the site's skin,
  dark by default, canvas first with floating tools, a drawing-notes layer over the game's real art, Phosphor
  regular icons as an approved dependency, and the Examples demo game's screens in the same look. No change to the
  progress figure.
- 2026-11-13: The spec combines the editors into five (the Owner): World (Levels, Tiles, the environment builder),
  Characters (the figure builder, clips and entity kinds, Schematic), Feel (Feel, Tuner), Sound (Audio) and Story
  (Writer, Sequence). World and Characters have a 2D and a 3D version; the 2D ones work the way the old 3D builders
  did. M1's Levels editor is the start of World; M3's first slice is Feel, with Tuner inside it. Spec change only.

- 2026-11-13: F4 pulled forward from M2 (the Owner: fix it now). Root cause of the cut-off pictures: Vitest's browser page
  is 414 by 896 by default, so the sideways and tablet pictures were clipped there (the white strip and the missing
  Jump button were off the page, not missing from the game). The real problem under it, the buttons sitting over the
  level, is fixed in PR 14: the level is fitted above the buttons. Details in "F4 follow-up" below.

- 2026-11-13: The spec follows the Owner's answers to the Editors' plan audit: someone who has not signed in can
  open only the demo game (every other game is its team's), and keeping a copy gives the level's JSON to paste back
  into an agent or a game's files. "Try it now" opens the demo game.
- 2026-11-13: The spec follows the Owner's decisions made while the Editors' M1 plan was written: the editors are for
  teams; sign-in is a GitHub App, which does the editors' GitHub work through Pages Functions; five access levels kept
  in `automata.access.toml` with a Share screen, all in M1; Save commits straight in for Edit and Owner levels and
  opens a suggestion for the rest. The plan is in AutomataFrameworkEditors (PR 1). Added the same day: the editors
  change authorable content only (the JSON files); anyone can use them without signing in and keep a copy, and
  saving or working with others needs a sign-in.
- 2026-11-13: `package.json` gains `"prepare": "pnpm build"`. Found while planning Examples' M1: a git install of
  this package had no `dist/` (it is not committed, and a package manager builds a git dependency only when it has a
  `prepare` script). Tried with pnpm 10.34.6: with the script, `dist/` is built on install. The consuming repo must
  also allow the build, by listing the pinned source in its `pnpm.onlyBuiltDependencies`. Every pin in Examples,
  Editors and Site must be this change's merge commit or newer. `tests/package.test.ts` keeps the script there.
- 2026-11-13: The Owner chose how Examples gets the framework before Release 1: a git dependency pinned to a commit on
  the framework's `main`, moved by pull request; npm from Release 1. Recorded in the spec's Releases section.
- 2026-11-13: Release policy (the Owner): releases are big and few, Release 1 to 5 as above; small releases come back
  only once the product is feature complete. `release.yml` no longer starts when `ci` passes on `main`: it runs only by
  hand, from `main`, and first checks that `ci` passed for a push of that commit. Publishing 0.1.0 is no longer a
  done-criterion of M1; Task 15's Step 5 (the publish) is deferred to Release 1. How the Examples repo gets the
  framework before Release 1 was left to the Owner (answered, see above).
- 2026-11-13: Stage 1. Spec written from the Owner's brainstorm, then updated with the Owner's answers (sign-in on Cloudflare
  Pages, file formats, languages, Android, GitHub-style merges, protected main). Open items are in the spec.
- 2026-11-13: Stage 2. The framework's M1 plan written: 15 tasks, from the repo's skeleton and CI to publishing 0.1.0.
  The sim core and the Rapier integration are lifted from AutomataFrameworkFailed@ed8592e8; the rest is fresh. Stages 2
  to 7 above track this plan; the other three repos' M1 plans are written in their own repos once the Owner creates
  them. The Owner's answers the same day: the npm scope is `@automataframework` (the spec and `CLAUDE.md` still say
  `@automata` and need a follow-up edit); `@types/node` and `@vitest/browser-playwright` are approved; the old repo's
  hosted-runner refusals came from it being private.
- 2026-11-13: Stage 3. The plan audit: the plan matches the spec and every lift path exists at ed8592e8, but five
  blocking findings (an unlifted fixture seven tests import, unnamed helpers, renames that move lifted hashes, 3D-only
  physics tests, rule tests that double-trip) and nine should-fix items, which the execution stage applies (the Owner).
  The spec and `CLAUDE.md` now say `@automataframework`. The stale branch `claude/project-thread-5h5fpo` still exists.

### Stage 6: fixes (2026-11-13)

PR 9, branch `claude/project-thread-glweo1`, each fix with its test first. What was done:

- F2: `release.yml` now starts from the `ci` run finishing (`workflow_run`), only for a green run of a push to `main`,
  checking out that run's commit; `workflow_dispatch` starts it by hand, from `main` only. `tests/workflows/release.test.ts`
  reads the workflow's text. The Owner can now add `NPM_TOKEN` and start the release by hand.
- F1: `stage.resize` draws the last views again after setting the size, and keeps views asked for before the mount had
  a size. Minor M1 is closed with it: `Renderer.apply` draws the first delta at once. Three new browser tests.
- F3: every box has a dark (`#1b1b24`) one-pixel edge, inside the box, one screen pixel wide at any scale. A browser
  test reads canvas pixels of a white box.
- F5: the button panel is `rgba(20,20,30,0.55)`; a browser test works out the contrast over the sky (at least 4.5 to 1).
- F6: `checkControls` checks `side` and `keys` with plain messages; two tests.
- F7: the README example uses `formatDiagnostic` (`tests/docs/readme.test.ts`). F8: `CLAUDE.md`'s Structure block lists
  `src/headless.ts`, `tests/lib/`, `tests/fixtures/`, `tests/install/` and the new `tests/workflows/` and `tests/docs/`.
- F4: the sideways pictures (`phone-844x390`, `tablet-1180x820`) are in `game.browser.test.ts`. The layout (moving the
  level or the buttons so they do not cover the hero) is the Owner's call; with no answer, it is **deferred to M2's
  layouts**, as the audit recommends (option A).

CI on the PR's head `18b5317` (run 43510352137): `check` (lint, typecheck, knip, 376 Node tests in 58 files, up from
370 in 56), `package`, and Chromium, WebKit and Firefox all passed; WebKit ran 113 tests in 13 files (up from 106).
Tests were not run locally; lint, typecheck and knip were. The `screens-*` artifacts now hold four pictures per engine,
which still need a person's eyes (the cloud network refuses the artifact host).

Not done, on purpose: the sideways layout. The Owner's question about it (audit, "For the Owner" 1) had no answer when
this stage ended, so option A stands: M2's layouts plan moves the level or the buttons. `NPM_TOKEN` is still the
Owner's; publishing now waits for Release 1 (see the log).

### F4 follow-up: the sideways layout (2026-11-13, PR 14)

Overall for this fix: **100%, green in CI on PR 14's head `a681062` (check, package, Chromium, WebKit, Firefox)**.

- Cause one, found from the pictures themselves: every picture ends at x 414, and the tablet upright one at y 896, which
  is Vitest's default browser page (414 by 896). The mount was wider than the page, so its right part, including the Jump
  button, was never in the screenshot. Nothing was wrong with the canvas.
- Cause two, from the audit: sideways, the level fills the height and the buttons sit on its lower corners.
- Test first: `tests/features/game/layout.browser.test.ts` sets the real viewport at the four sizes (and checks the page
  has it), then checks the canvas fills the screen, each of Left, Right and Jump is whole, at least 48 px, not covered
  and not overlapping, and the drawn level ends above the buttons. It took over the four pictures from
  `game.browser.test.ts`. Renderer and input got tests for the room the buttons take.
- Fix: `Renderer.setInset(px)` keeps the bottom `px` free and fits the level into the rest (never more than half the
  height); `Input.inset()` and `Input.onInset()` give the height of the button strip (0 while hidden); `startGame`
  wires them. Sideways phone: the level is 523 by 294, above 96 px of buttons.
- The coordinator also asked for an "editors open pull requests" line in `CLAUDE.md`. Not added: after the merge with
  `main` the page already holds the Owner's rule (Edit and Owner levels save straight in, Suggest opens a suggestion),
  and a blanket "open pull requests" line would contradict it. Raised with the coordinator.
- The first CI run on the tests alone failed as it should: the two sideways screens said the level ended at 390 while
  the buttons began at 311 (and 742 against 741 on the tablet), upright passed, and the canvas filled the screen in
  all four, which is how the pictures' cut-off was shown not to be the game's.

### Stage 5: implementation audit (2026-11-13)

[`audits/2026-11-13-m1-framework-implementation-audit.md`](audits/2026-11-13-m1-framework-implementation-audit.md),
for `main` at `b7b672f`. The build matches the spec and the plan; `main` is green (370 Node tests in 56 files, 106 in 13
files on Chromium, WebKit, Firefox and `package` passing); no golden moved after it was recorded; no attribution or
strategy text. Nothing blocks M1. Eight should-fix findings for Stage 6: F1 a resize while paused leaves a blank
canvas; F2 the release does not wait for CI; F3 boxes hard to see against the sky (add an outline); F4 sideways
phone pictures missing, and the buttons cover the hero there; F5 the button words a little faint; F6 `checkControls`
misses a bad `side` or `keys`; F7 the README's example drops the place of a problem; F8 `CLAUDE.md`'s Structure block.
Nine minors (M1 to M9) are noted for later plans; Stage 4's deferred minors and rulings were reviewed and stand.

Not done: the `screens-*` pictures were not looked at, because the container's network refuses the artifact host
(`productionresultssa7.blob.core.windows.net`); the check was worked out from the code instead. The release failed
with `ENEEDAUTH` (no `NPM_TOKEN`), which is the Owner's to add; F2 should land before it is re-run.

### Stage 4 close (Tasks 12 to 15, 2026-11-13)

Tasks 12 to 15 ran in a second session. Input (12), the loop, host and `startGame` (13) and the public surface, build,
API report and install smoke (14) were green in CI; Task 15 added changesets, `release.yml`, the version 0.1.0 and the
`version.test.ts` that ties `FRAMEWORK_VERSION` to `package.json`. `NPM_TOKEN` is a repository secret, which no session
can read, so whether it exists is known only when the `release` run on `main` publishes (Task 15 Step 5, after the merge).

Rulings in this session:
- Task 12: `ACTION_NAME` and `MAX_ACTIONS` are now exported from `commands` so `checkControls` and the `controls` command
  share one definition. A key press with Ctrl, Cmd or Alt held is left to the browser. Touch buttons are never smaller
  than 64 px (the plan's test asserts 48).
- Task 13: a loop frame that throws stops the loop and rethrows. `startGame` checks the controls before the sim is made.
  The screenshots go to `tests/features/game/__screenshots__/`, which is git-ignored and uploaded by CI.
- Task 14: the public surface and schemas already existed, so the red state was the unrecorded `idleHash60` (the Node job
  printed `fa986edc200c5437`; the installed package printed the same). `load.ts` imported `#src/...`, which the emitted
  declarations would keep; it is now a relative import. `package.json` no longer says `sideEffects: false`, because the
  browser entry sets Zod's `jitless` when it loads. The api-report extractor is lifted without the break check, the
  Svelte kind and the `.d.ts` reader (nothing to compare with before 0.1.0 is published; knip rejects unused exports).
  `schemas/` and `docs/api/` are generated files and are left out of Biome. The packed `.d.ts` files keep `.ts` import
  specifiers; TypeScript 7 resolves them, and the smoke typechecks a consumer against the tarball with `skipLibCheck` off.
- Task 15: `release.yml` sets a git identity and runs `git push origin --tags` (the checkout is detached and `main` is
  protected, so `--follow-tags` would fail). Provenance is switched on in `publishConfig` and in the job.

Whole-branch review (a self-review: the project allows no subagents, so there was no fresh reader). One finding was
fixed with a test first: a thumb sliding from one touch button onto the next let go of the first and never pressed the
second (`pointerenter` now presses, while the finger is still down). Deferred minors:
- `startGame` draws nothing until its second frame (the first only sets the clock), so a phone shows sky for about 16 ms.
- `game.replay()` throws after `game.stop()`, because stopping disposes the sim; a "save what I just did" button must ask first.
- The phone and tablet pictures exist as `screens-*` artifacts but were not looked at in this session (no download access
  here); the implementation audit reads them for the drunk-grandma test.
- Browser test counts per engine were not read from the logs; Node ran 370 tests in 56 files on the last full read.

### Handoff 1 (after Task 11, 2026-11-13)

**State.** Tasks 1 to 11 of 15 are done and green on PR 6 (draft, branch `claude/project-thread-kcc4b8`), one commit
per red step, code step and golden step. The Node test count was 341 after Task 10; Task 11 added the scene and fit
tests in Node and four render tests per browser. CI (lint, typecheck, knip, Node tests, and Chromium, WebKit and Firefox
jobs) passed on the last code commit, `a043d50`. WebGL started in all three engines, so nothing was skipped.

**Resume at Task 12 (keyboard and touch input).** Read the plan's Task 12 first, then 13, 14, 15. After them: the whole
branch review (`superpowers:executing-plans`, "Final Review"), mark the PR ready, and send the coordinator the end
summary (rulings and deferred minors).

**How the loop has run, so the next session can repeat it.**
- Set the author before any commit: `git config --global user.name "McThayDT" && git config --global user.email "107786093+mcthaydt@users.noreply.github.com"`. No Claude trailers anywhere.
- Per task: write the tests, check `npx biome check --write src tests`, `npx tsc --noEmit` and `npx knip` locally (these are allowed; tests are never run locally), push the red state, write the code, push, read the CI result with the GitHub actions tools, fix, then record the task in the plan (tick its steps) and in this file, and send the coordinator one line.
- A new golden is committed with `"finalHash": ""`; the Node job's log prints the JSON to commit (`get_job_logs` with `return_content` and a `tail_lines` of about 110). Record once, then all four engines must match.
- Every test disposes every sim it creates (Koota allows 16 worlds). `exampleLevel`, `loadFixtureGame`, `readFixture`, `heroPlugin` and `pushScript` live under `tests/fixtures/`.
- `pnpm add <pkg>@<exact>` when the task first imports a package (knip fails on unused dependencies). Still to add: `@changesets/cli` (Task 15). `pixi.js` 8.22.0 and `smol-toml` 1.9.0 are in.

**Carry-overs the plan does not say.**
- Task 14: set Zod's `config({ jitless: true })` in `src/index.ts` (audit S4). `render/stage.ts` already imports `pixi.js/unsafe-eval` and turns off Pixi's texture worker probe. `src/index.ts` already re-exports render; add input, host and game as they land.
- Task 14: smoke typechecks a consumer `.ts` against the packed tarball (S6); `idleHash60` runs with no game plugin (N4); the README describes only what the framework does and how to use it (no strategy, market, competitor or pricing words, no reference to `docs/research/`); the `typescript-6` alias dev dependency.
- Task 15: check `NPM_TOKEN` is in the environment before anything else; stop and report if it is missing. `release.yml` gets `--provenance` and a tag push (S9).
- Task 12: input must not leave the hero running when a key is held and the window loses focus, or a touch is cancelled by the system (Review Focus 2).
- Task 13: coming back to a tab after a minute, or a slow frame, must not fast-forward or freeze (Review Focus 3).
- Public names: content exports `LevelThing` and `LevelStart` (the level feature's `Thing` is a component); `levelPlugin` is defined in `level/plugin.ts`.

**Rulings made so far (all also in the git-ignored ledger).**
- B1: `fixture-world.ts` lifted to `tests/fixtures/`. B2: `sim.test.ts` hash barrel repointed to `src/lib`; bounce golden test closes over its own seeded stream. B3: physics renames cover system names and error text; the old inline hash is replaced by `tests/golden/physics-scene.json`. B4: physics-world test rewritten onto the 2D names; `property.ts` lifted. B5: architecture rule tests name the feature's entry as the offender so one violation fires.
- S1: `expectGolden` compares only ticks, final hash and checks. S2: check hashes fall after each step on a multiple of 60 ticks, never at tick 0, never for the last tick. S3: `fixedRotation` field before the physics golden. S5: every test disposes its sims. S7: `tests/fixtures/raw.d.ts` declares `*?raw`. S8: `physics()` default gravity is y-down `{ x: 0, y: 9.81 }`; `createGameSim` defaults to `{ x: 0, y: 30 }`. N1 to N4 applied (N4 in Task 14).
- Task 1: Biome line width 110 (the old repo's value) so lifted files stay as they were; dependencies added by the task that first imports them; CI runs on `pull_request`, so the draft PR opened at the first push.
- Task 2: added `tests/lib/deep-freeze.test.ts` (nothing used `deepFreeze` until Task 9). Task 3: the architecture `no-cycles` rule ignores type-only imports (the lifted `context.ts` and `definitions.ts` only import each other's types).
- Task 4: error classes moved to `errors.ts` to keep `create-sim.ts` under 600 lines. Task 5: after a restore the physics adapter trusts the entity's `fixedRotation` instead of re-locking (re-locking woke sleeping bodies and broke restored-equals-straight); cost: a `fixedRotation` edit made after the last sync-in and before a snapshot is lost in the restored sim until edited again.
- Task 8: unknown-key problems are one per key; missing fields are found by reading the raw data; `exampleLevel` moved to a fixture file (Biome forbids exports from tests). Task 9: two files claiming one id are reported (beyond the plan); any failed read counts as "missing". Task 10: `LevelThing`/`LevelStart` rename, `level/plugin.ts`.
- Owner: no AI attribution anywhere; credit line "Requested by **McThayDT**"; history was rewritten once at the Owner's word; author is McThayDT. PR bodies are edited only with the GitHub MCP `update_pull_request`.

**Deferred minors.** None yet; the whole-branch review has not run.


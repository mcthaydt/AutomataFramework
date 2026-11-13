# Progress

The tracker every stage reads first and updates last. One section per cycle; newest first.

## Cycle 1: the 2D first layer

Spec: [`specs/2026-11-13-2d-first-layer-design.md`](specs/2026-11-13-2d-first-layer-design.md)

Overall: **28%** (spec, plan and audit done; stage 4 is worth 18 points, so the overall figure is 12% plus 18% of the stage's own)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Done, 100% (merged, PR 1) | `specs/2026-11-13-2d-first-layer-design.md` |
| 2. Plan (M1, framework) | Done, 100% (merged, PR 3) | `plans/2026-11-13-m1-thin-thread-framework.md` |
| 3. Plan audit | Done, 100% (in review) | `audits/2026-11-13-m1-framework-plan-audit.md` |
| 4. Execution | In progress, 90% (Tasks 1 to 15 done in the branch; the publish check after the merge is the last 10%; PR 6, draft) | `docs/superpowers/plans/2026-11-13-m1-thin-thread-framework.md`, ticked as it goes |
| 5. Implementation audit | Not started | `audits/<date>-m1-implementation-audit.md` |
| 6. Fixes | Not started | |
| 7. Owner review | Not started | |

Milestones (each runs stages 2 to 7 per repo):

| Milestone | State |
|---|---|
| M1 The thin thread | Framework: planned and audited. Examples, Editors, Site: waiting for their repos, then one plan each |
| M2 The framework in full | Not started |
| M3 The editors in full | Not started |
| M4 The site and publishing | Not started |

### Log

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
- Set the author before any commit: `git config --global user.name "Dawson McThay" && git config --global user.email "107786093+mcthaydt@users.noreply.github.com"`. No Claude trailers anywhere.
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
- Owner: no AI attribution anywhere; credit line "Requested by **McThayDT**"; history was rewritten once at the Owner's word; author is Dawson McThay. PR bodies are edited only with the GitHub MCP `update_pull_request`.

**Deferred minors.** None yet; the whole-branch review has not run.


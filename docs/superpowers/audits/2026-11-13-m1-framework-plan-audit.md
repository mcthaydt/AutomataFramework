# Plan audit: the framework's M1 thin-thread plan

Written 2026-11-13. Stage 3 (Plan audit) of cycle 1, for
[`plans/2026-11-13-m1-thin-thread-framework.md`](../plans/2026-11-13-m1-thin-thread-framework.md), read against the
[spec](../specs/2026-11-13-2d-first-layer-design.md), `CLAUDE.md`, the
[market drill](../../research/2026-11-13-market-problem-drill.md), [`progress.md`](../progress.md) and the source the
plan lifts from (`mcthaydt/AutomataFrameworkFailed` at `ed8592e8f81db71f114275e2d625a6d7a4a4f22c`, checked file by
file).

## The answer first

The plan is sound in shape and true to the spec. It covers every item on M1's framework line, keeps the spec's layer
order, serves the principles it names, and its contract for the other three repos ("What the other repos rely on") is
what the M1 "done means" needs. The lift table is accurate: every old source path it names exists at `ed8592e8`.

It is **not ready to execute as written**. The plan's own rule is "a lifted test keeps every assertion; if one cannot
pass without a change this plan does not name, stop". Read literally, that rule stops Tasks 1, 4 and 5 on their first
push. Five blocking findings (B1 to B5) need a plan edit first. Each fix is a few lines. Then there are nine
should-fix findings (S1 to S9) and six notes (N1 to N6).

**Recommendation:** amend the plan for B1 to B5 and S1 to S9 in a short fix pass on this branch, or on the next one,
before Stage 4 starts. Nothing here reopens a decision the Owner made.

## Method

- Every lifted file and test path in Tasks 2 to 5 was looked up at `ed8592e8` (`git cat-file`). Their imports were
  read to check that what the plan lifts is closed under import.
- Every lifted test was read for hard-coded hashes, ids and helpers that the plan's renames or exclusions touch.
- Each task's interfaces were checked against the tasks that consume them, and against the spec's M1 line and
  constraints.
- No tests were run (project rule). Nothing here is measured. Hashes are quoted from the old source.

## Blocking (fix before execution)

**B1. Task 4 excludes a fixture that seven of its lifted tests import.** The plan lifts "all eleven files" of
`packages/sim/tests/unit/shared/world/` and says "Not lifted: … `src/testing/*` other than the bounce fixtures". But
`capacity`, `describe`, `fault`, `lifecycle`, `plugin-state` and `snapshot` `.test.ts`, plus the browser
`snapshot.test.ts`, import `#src/testing/fixture-world.ts` (107 lines, imports only `define/definitions.ts`).
*Fix:* lift it to `tests/fixtures/fixture-world.ts`.

**B2. Task 4's lifted tests use three things the plan doesn't name.**
- `sim.test.ts` imports the barrel `#src/shared/hash/hash.ts`, which isn't lifted. Repointing it at `src/lib/` is an
  import-path change, so it is allowed, but it should be named.
- The browser `snapshot.test.ts` and the browser physics test import `recordGoldenEvidence` from
  `@automata/evidence/golden`, a package that won't exist here. Dropping that call changes a test.
- `bounce-script.ts` imports `type Recorder` from `@automata/sim/replay` (the old binary replay, not lifted) for
  `bounceDrive`. Its `bounceScript(tick, rng)` also takes an `Rng`, which doesn't fit `runGolden`'s
  `commandsAt: (tick) => Command[]`.

*Fix:* name all three. Drop the `recordGoldenEvidence` lines. Drop `bounceDrive`, since Task 7's tests drive the new
recorder themselves. Say that the bounce golden test closes over `createRng(deriveSeed(BOUNCE_SEED, 'golden-script'))`.

**B3. Task 5's renames move hashes and names that its lifted tests pin.** The plan renames the component ids
(`transform-2d` becomes `transform`, `physics2d.rigid-body` becomes `physics.body`, and so on), the event ids and the
plugin name, and says Step 3 is one green push. Three things break:
- The ids are in the sim's schema hash, and the event ids are in `run-scene.ts`'s events hash. So the lifted
  `physics.parity.test.ts` and its inline `EXPECTED` (`hash 46042079c99bfdf1`, `events 4fc381ee4c45b8dd`) cannot
  pass.
- `physics-2d.test.ts` asserts `plugin.name === 'physics-2d'` and the system names `physics2d.sync-in` and the rest,
  which the rename table doesn't cover.
- `rapier-2d.ts` puts the old ids into its error messages.

*Fix:* add the system names (`physics.sync-in`, `physics.step`, `physics.sync-out`, `physics.events`) and the
error-message ids to the rename table. Say plainly that the old inline `EXPECTED` is replaced by
`tests/golden/physics-scene.json`, because the renames change the schema. Delete the lifted browser test's inline
constant, so the same scene isn't pinned twice.

**B4. Two Task 5 tests can't be lifted as "drop every 3D case".**
- `physics-world.test.ts` is built only on a fake adapter over the 3D components. Dropping the 3D cases drops the
  file, and with it the only test of the event-ordering contract (ended first, sorted by sid, `a < b`).
- `snapshot-property.test.ts` needs `snapshotRoundTripProperty` from `@automata/sim/testing/property` (156 lines),
  which isn't lifted.
- `gravity-config`, `init-retry` and `lazy-load` mix 2D and 3D in `test.each` tables and import `#src/entries/2d.ts`
  by path. Those changes are mechanical, but they aren't named.

*Fix:* say that `physics-world.test.ts` is rewritten onto `Transform`, `Body`, `Collider` and the 2D events, with
the same assertions. Either lift `property.ts` into `tests/fixtures/`, or drop `snapshot-property` and say why (the
golden test already restores at tick 150). Name the entry path the dynamic-import tests use, which is
`#src/features/physics/physics.ts`.

**B5. Task 1's rule tests expect one violation, but five of them would get two.** `feature-has-entry` flags a
feature folder with no entry file. The made-up maps for `imports-go-down`, `through-the-entry`, `sim-is-pure` and
`package-confined` each put a file in a feature folder (`sim/a.ts`, `physics/a.ts`, `input/a.ts`) with no
`sim.ts`, `physics.ts` or `input.ts` beside it. So each would also report `feature-has-entry`, and none can equal
`[rule]`. *Fix:* name the offending file the feature's entry (`src/features/sim/sim.ts`), or add the entry file to
each map.

## Should fix

**S1. `expectGolden` must compare only `ticks`, `finalHash` and `checks`.** Task 7 adds `replayTextHash` to
`bounce.json` and Task 14 adds `idleHash60` to `push-crate.json`. If `expectGolden` compares whole objects, as
"otherwise expects equality" reads, Tasks 4 and 10 go red when those keys land. Say it compares those three fields.
Also say how a new key gets recorded: the `GOLDEN NOT RECORDED` path only fires on an empty `finalHash`.

**S2. Say exactly where the check hashes fall.** `runGolden` takes "a hash every 60 ticks and at the end", the
recorder takes one "every `checkEvery` ticks", and Task 10 compares the recorder's `checks` with a `Golden`. Fix the
rule in one place: after each step where `sim.tick % 60 === 0`, never at tick 0. The final hash is only `finalHash`,
even when the last tick is a multiple of 60. Otherwise two executors can read the same plan two ways.

**S3. Task 5's planned golden move can be avoided.** Step 7 re-records `physics-scene.json` after adding
`fixedRotation`. That is an exception to the plan's own rule, "a golden that already holds a hash moves only with
the Owner seeing". *Fix:* do Steps 4 to 6 (the `fixedRotation` field) before Step 2, so the golden is first recorded
with the field and never moves.

**S4. The no-eval entry is carried over only in half.** The old `packages/automata/src/shared/lib/no-eval.ts` does
three things before any schema or renderer runs:
- imports `pixi.js/unsafe-eval`;
- sets Zod's `config({ jitless: true })`, so that Zod compiles no validators with `new Function` and doesn't trip
  `securitypolicyviolation`;
- turns off Pixi's texture worker probe.

The plan keeps only the first, inside `render.ts`. Lifted `no-eval.test.ts` still says a game's no-eval entry sets
`jitless`. Portals (itch, Wavedash) serve games under strict CSPs. *Fix:* name where `jitless` is set (the browser
entry `src/index.ts` is the natural place), and lift the texture-probe line with it.

**S5. Koota allows 16 live worlds per process.** The lifted tests dispose their sims in `afterEach`. The plan's new
tests (Tasks 6, 7, 9, 10, 13) create sims and don't say to dispose them, and `SimCapacityError` would then fail at
random once a file passes 16. Add one global constraint: every test disposes every sim it creates.

**S6. The install smoke proves the JavaScript, not the types.** The Examples repo will rely on the declarations from
`tsc -p tsconfig.build.json`. With `allowImportingTsExtensions`, the emitted `.d.ts` files may keep `.ts`
specifiers that don't resolve in `dist/`, and nothing in the plan would notice. *Fix:* in Task 14, have the smoke
also typecheck a two-line consumer `.ts` against the packed tarball. If TypeScript 7.0.2 can't emit declarations
here, stop and report: don't swap tools.

**S7. `?raw` imports need a type declaration.** `tests/fixtures/game/read.ts` imports the fixture files with Vite's
`?raw`. `tsc -p .` fails on those imports without `vite/client` types or a small `declare module '*?raw'`. Name it
in Task 9.

**S8. The default gravity points up in a y-down world.** Task 5 keeps `physics()`'s default
`{ x: 0, y: -9.81 }` so that the lifted tests hold. The plan's world is y-down, so anyone who calls `physics()`
without options gets things falling up. `createGameSim` hides this with its own default of `{ x: 0, y: 30 }`, but
`physics` is public in the headless entry. *Fix:* either say on `physics()` in the doc comment and the API report
that the default is y-up and games pass their own, or change the default and accept it as part of B3's hash
change. The second is cleaner, since the hash moves anyway.

**S9. Two claims in `release.yml` need wording or a step.**
- `changeset publish` tags in the runner's checkout but doesn't push the tags, so "and tags it" isn't true without a
  `git push --follow-tags`.
- `id-token: write` only matters with npm provenance, which nothing turns on.

Either add both (`--provenance`, the tag push) or drop the claims. See question Q2 below.

## Notes

**N1. The rejected-player test's wording.** Task 6's test title says source 0 or 5 is "rejected", but the sim only
rejects on header, tick, seq or payload (`ed8592e8` `sim.ts` lines 378 to 401). A `controls` command from source 0
or 5 is accepted by the sim and ignored by the system. The asserts are right ("players unchanged"). Retitle the
test "is ignored", so nobody adds a rejection the sim can't make.

**N2. "The later one wins" means "the higher seq wins".** The sim sorts each tick's commands by source, then seq.
Say so in Task 6, Step 3.

**N3. Content hash covers the project name.** `createGameSim` hashes the whole `GameContent`, `project.name`
included, so renaming the game makes `verifyReplay` say `content-changed`. That's right, but it will surprise
someone; one line in the `verifyReplay` doc comment covers it.

**N4. `idleHash60` must run with no game plugin.** Task 14's smoke runs `createGameSim` "with no game plugin". The
new parity case "runs the same 60 idle ticks", and must also leave out `heroPlugin`, or its schema hash differs.
Say "with no plugins".

**N5. The stage is one pull request of 15 tasks.** That follows `CLAUDE.md` (one branch per stage), but a review of
it will be long. The red-then-green pushes leave a clean trail per task, so no change is asked for. This note is so
the merge session isn't surprised.

**N6. The test layout differs a little from `CLAUDE.md`.** The plan's tree adds `src/headless.ts`, `tests/lib/`,
`tests/fixtures/`, `tests/install/` and `tests/architecture/rules.ts` to `CLAUDE.md`'s structure. Each has a reason
in the plan, and none breaks a rule. Worth adding to `CLAUDE.md`'s Structure block when the plan lands.

## Against the spec

| Spec, M1 framework line | Plan | Verdict |
|---|---|---|
| sim | Tasks 2 to 4 (lifted) | Covered (after B1, B2) |
| physics | Task 5 | Covered (after B3, B4) |
| commands and replay | Tasks 6, 7 | Covered |
| content, level and character only | Tasks 8, 9 | Covered |
| render | Task 11 | Covered |
| keyboard and touch input | Task 12 | Covered |
| the web host | Task 13 | Covered |
| published to npm | Task 15 | Covered, waiting on `NPM_TOKEN` |
| CI: one replay hash in four engines | Tasks 1, 4, 10 | Covered |

Spec constraints: no I/O, clock or randomness in the sim (the `sim-is-pure` rule); Pixi as the only renderer
(`package-confined`); Zod only; JSON content and a TOML project file; at most 600 lines per file; touch targets of
44 and 48 px (the plan uses 64 and tests 48); drunk-grandma copy pinned word for word in Tasks 8, 9 and 12, plus
screenshots for the implementation audit. All hold.

The layer order keeps the spec's direction. `level` and `game` are new, which the spec allows. `net` arrives in M2
between `commands` and `content`, as the spec orders it. Effect, Svelte, Paraglide and Tauri are left out because
M1 has no user for them (principle 7). The market drill asks M1 for nothing beyond the spec.

## Repo state (asked by the coordinator)

- **The stale branch `claude/project-thread-5h5fpo` still exists** at `592262a`, PR 2's head, which merged at
  19:23Z. That's two branches with `main` and this one, under the five-branch cap. Deleting it is the merge
  session's job (or the Owner's).
- **Delete-branch-on-merge:** not read directly, because this session's GitHub tools can't read repository
  settings. Indirect evidence says it is on now: the heads of PR 1 (`claude/project-thread-f7whcs`) and PR 3
  (`claude/project-thread-flahcu`, merged 19:34Z) are gone, while PR 2's, merged in between, is still there. So it
  was probably switched on after PR 2 merged, or the merge session deleted the other two by hand. The Owner can
  confirm under Settings, then General, then "Automatically delete head branches".
- `main` is protected (the branch listing says so), which is "Before starting" item 1.

## Also fixed in this pull request

The npm scope is `@automataframework` (the Owner, 2026-11-13). The spec (five places) and `CLAUDE.md` (one) said
`@automata`, and now say `@automataframework/framework`. The plan's note that the two still had the old scope is
updated to say the audit fixed them.

## Questions for the Owner

**Q1. Who applies the plan fixes?** The workflow has no stage between the plan audit and execution.
- (a) *Recommended:* a short fix pass amends the plan for B1 to B5 and S1 to S9, and execution starts from the
  amended plan.
- (b) Execution starts now and treats this audit as part of the plan.

(b) is faster, but it gives the executor two documents to reconcile.

**Q2. How should npm publishing work?** npm's publish tokens are now short-lived, and trusted publishing (OIDC from
GitHub Actions, no token) is npm's recommended path. The workflow already asks for `id-token: write`. From memory,
not checked here: a package must exist on npm before trusted publishing can be set up for it.
- (a) *Recommended:* publish 0.1.0 once with `NPM_TOKEN`, as planned, then switch `release.yml` to trusted
  publishing and remove the secret.
- (b) Keep `NPM_TOKEN` for every release.

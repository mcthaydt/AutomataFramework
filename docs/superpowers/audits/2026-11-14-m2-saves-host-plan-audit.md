# M2 plan V (saves and the host port): plan audit

Stage 3 for [`plans/2026-11-14-m2-saves-host.md`](../plans/2026-11-14-m2-saves-host.md), read against the M2 spec
([`specs/2026-11-14-m2-design.md`](../specs/2026-11-14-m2-design.md) at `328b76a`), the first-layer spec, `main` at
`e8a08c7` (plans C and I merged as plans, plan N in review) and AutomataFrameworkExamples at `5ad2df0`.

**Verdict: sound, with three major findings fixed in the plan.** Every finding below is applied to the plan in the
same pull request as this audit; execution reads both. No question for the Owner came up. Two changes touch the
contract section ("What the other plans rely on"), and the coordinator has been told: `Host.saves` is now
`Host.store` (F8), and both entries export `z` (F2).

## What was checked and holds

- **Spec coverage.** Each sentence of "Saves (plan V)" and "Host (plan V, with saves)" maps to a task, as the plan's
  self-review says; the non-goals (no itch, Wavedash or Tauri host) are kept. The one deviation it names (sizes for a
  plan that draws nothing) is reasonable: Task 7 still runs at five sizes.
- **The rules tests.** Task 1's case (`saves` importing `host` gives `imports-go-down`) and Task 5's two cases
  (headless reaching `web` gives `headless-is-headless`; reaching `host` gives nothing once `host` leaves
  `PAGE_FEATURES`) give exactly those answers under `tests/architecture/rules.ts` as it is: `walk` marks a target
  reached even when it is not in the map, and a feature missing from `LAYERS` fails Task 1's red run as planned.
- **The code the plan names exists as it says.** `canonicalJson` (`src/lib/canonical.ts`); `webHost(doc = document)`
  and the `Host` of `target`, `visible`, `onVisibility` (`src/features/host/`); the hand-made hosts in
  `game.browser.test.ts`, `layout.browser.test.ts` and `watch.browser.test.ts`; the fixtures `loadFixtureGame`,
  `heroPlugin`, `fixtureControls`, `manualFrames`; the fixture game's one level, `level-1`, which is also its start;
  `Sim.hash()`; `startGame`'s `level` option; the README's "Watch a recorded play" and "Without a page" headings.
- **`game` needs only the type.** `game.ts` and `watch.ts` import `type { Host }`, so moving `webHost` out of `host`
  breaks nothing in `src/`; Examples' `play.ts` imports `Host` and `webHost` from the browser entry, which still has
  both.
- **The packed-package step.** CI's `package` job installs the tarball with `npm` into an empty folder and runs
  `smoke.mjs`, then typechecks `consumer.ts`; Task 8's additions fit it. The API report's extractor names a re-export
  from an outside package by where it comes from, so `export { z } from 'zod'` (F2) reports without a build.
- **Progress figures.** Eight tasks at 12% and a final 4% make 100%.
- **The save policy** ported from the old repo is consistent with the contract: a newer save is never touched, an
  unreadable one is kept and listed damaged, a damaged settings record starts again.
- **Merging with plans C, I and N.** Plan C adds no feature and no line to `rules.ts`. Plan I changes no layer. Plan N
  makes `LAYERS` `sim, physics, commands, net, content, level, server, render, input, host, game`, adds `net` to the
  pure features, and keeps `server` away from both entries. Its lines and plan V's sit side by side in an array and a
  set, so "keep both sides" is right for them; the order needed fixing (F1).

## Findings

### F1 (major): the merge guidance put `host` above the features that read it

The plan told a merge to order features as the first spec does, `... saves, locale, story, ui, screens, host, web,
game`. But its own contract has plan L read `host.language()` and plan U read `host.canQuit` and show `SaveProblem`.
`imports-go-down` counts type imports, so with `host` above `locale` and `screens` neither plan could even name
`Host`. The first spec's order was written when the host only said "is the game on screen".

**Fixed:** the plan now gives the whole merged order,
`sim, physics, commands, net, content, level, server, render, input, audio, saves, host, locale, story, ui, screens,
web, game`, says why `host` moves below `locale`, `ui` and `screens`, and says a merge must not put `host` back in
`PAGE_FEATURES`. This differs from the spec's listed order; the spec leaves the layers to the plans ("continue the M1
spec's order"), and the reason is recorded in the plan.

### F2 (major): a game could not write a save's schema

`defineSave` takes a Zod schema, but Examples' `tests/architecture.test.ts` (`only-the-framework`) fails any import
other than the framework's two entries, so the demo (plan D's step for V) had no way to build one. The same gap would
meet the first game command or settings section a game writes itself. Two copies of Zod would also be a quiet risk.

**Fixed:** both entries export `z` (`export { z } from 'zod'` in `src/headless.ts`, after the `no-eval` import, in
Task 6). Task 8 adds `z` to the public-surface list, has `smoke.mjs` build its schema with the package's `z` (not
`zod`, which npm's flat folder would let it reach and so prove nothing), has `consumer.ts` type a `defineSave` built
with it, and the README imports it from the framework. Zod is already a dependency, so nothing is added.

### F3 (major): "each plan adds its own section" could not be done by plans I and S

The plan said plans S, I and L each add a `settings.section(...)`. `input` and `audio` sit below `saves`, so they
may not import `SettingsSection` or `Settings`. Plan I, merged as a plan since, already says so: it exports
`InputSettingsSchema` and `INPUT_SETTINGS_DEFAULT`, and leaves the wiring to plan U.

**Fixed:** the plan now says the feature plans export a schema and first values as plain data, plan U wires each into
a section, and it keeps three section names: `controls` (plan I's), `sound` (S) and `language` (L).

### F4 (medium): "a save made as the page closes" would pass or fail on how many `await`s `save` has

Task 7 called `save` without waiting and removed the frame "at once". Browsers do not run the promise steps of a
removed frame, and `save` reads the slot before it writes, so whether the write happened before the removal depended
on the number of promise steps on each side, not on anything a player can do. A player closing a tab is a later task
than the tap that saved, and every promise step of the earlier task runs first. The stop rule ("a finding about that
browser") would then have reported a test artefact as a browser fault.

**Fixed:** the opener yields one task (a `MessageChannel` message) before removing the frame, and the plan says why.
Task 3 adds the other half: with fake timers that never advance, `save` still finishes, so no step of a save waits on
a timer, an event or a frame.

### F5 (medium): data a schema allows but JSON cannot keep threw the wrong error, late

`canonicalJson` throws `CanonicalJsonError` on `undefined`, `NaN`, `Infinity`, a `Date` and any class instance. A
schema can allow some of these (`z.date()`, `z.any()`, an optional field given `undefined`), so `save` would have
thrown a framework-internal error after the schema check.

**Fixed:** Task 3's `save` writes the envelope's text before touching the store and turns that error into a
`RangeError` in plain words, with a test; Task 4's `set` has the same test.

### F6 (medium): browser test files share one `localStorage`

Vitest's browser projects can run test files at the same time in one browser, on one origin. Task 5's "check leaves
nothing behind" read the real `automata.check` key, which Task 7's pages write and remove through `saves.check()`, and
Task 5 used the loose prefix `automata.t.`.

**Fixed:** Task 5's keys start `automata.web-storage-test.`; its `check` test records the calls on a Storage that
passes them to the real one, instead of reading a key another file also writes. Task 7 already keeps to
`automata.fixture-game.`.

### F7 (minor): a global constraint the code already breaks

"Only `src/features/web/` touches `document`, `navigator`, `localStorage` or `window`" is false today: `render` reads
`window.devicePixelRatio` and `input` makes buttons with `document`. **Fixed:** the constraint now says `saves` and
`host` touch no page API, and of the page only `web` reads `localStorage`, `navigator`, `window.open` and the
document's visibility.

### F8 (minor): `host.saves` was a `SaveStore`, not `Saves`

The contract had `Host.saves: SaveStore` beside `createSaves(): Saves<S>`, so `host.saves.save(...)` looked right and
was not (a store has `set`). **Fixed:** the member is `Host.store` (and `TestHostOptions.store`), everywhere in the
plan. No other plan names it yet.

### F9 (minor): a test in Examples that the pin move breaks

Examples' `tests/features/play/play.browser.test.ts` builds a `{ target: 'web', ... }` host by hand. After this plan
it no longer typechecks. **Fixed:** plan D's line in the contract names it; it becomes `testHost()`.

### F10 (minor): a setting could be changed behind `set`

`SettingsHandle.get()` handed out the kept object, so a screen that changed it would change the value listeners never
heard about. **Fixed:** `get` gives a frozen value (`src/lib/deep-freeze.ts`), with a test.

## Left as it is

- **`automata.check` is one key for every game on an origin.** Two games on one site could both write it, but each
  removes it at once and neither reads it, so it cannot mislead either.
- **Slots are numbered from 0 in code.** A screen shows "Slot 1"; that is plan U's words.
- **The same-origin frame in Task 7** is the plan's riskiest step (Vitest serving `page.ts` to a frame in each
  browser). The plan already stops there rather than proving less; that is right.

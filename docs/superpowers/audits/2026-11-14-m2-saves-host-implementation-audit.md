# M2 plan V (saves and the host port): implementation audit

Stage 5 of the workflow, for the code of [`plans/2026-11-14-m2-saves-host.md`](../plans/2026-11-14-m2-saves-host.md)
as merged in PR 40 (`8811935`, branch head `bcf7487`), against that plan, its
[plan audit](2026-11-14-m2-saves-host-plan-audit.md) (PR 36), the [M2 spec](../specs/2026-11-14-m2-design.md) ("Saves
(plan V)", "Host (plan V, with saves)") and the code on `main` at `8811935`. Written 2026-11-14.

**Verdict:** the build is sound and close to the plan. All eight tasks are there, with every test the plan names (and
a few more), every finding of the plan audit (F1 to F10) is in the code, no golden moved, and CI was green on
`bcf7487` (`check`, the three `engines`, `package`, `screens`, `commit-authors`) and again on `main` at `8811935`.
There is nothing critical. One finding is important: a save can be written with a label its own reader refuses, so
the save a player just made, and the one it replaced, are both gone. Ten minor findings and five notes follow. There
is no Owner question.

**How it was checked.** Every file under `src/features/saves/`, `src/features/host/` and `src/features/web/` was read
in full, with `src/headless.ts`, `src/index.ts`, `src/lib/deep-freeze.ts` and `tests/architecture/rules.ts`. Each test
file the plan lists was read against the plan's list of test names; the journey (`continue.browser.test.ts`) and its
fixtures (`page.ts`, `open-page.ts`, `progress.ts`) were read in full, as were the README's two new sections and the
packed-package checks (`smoke.mjs`, `consumer.ts`, `public-surface.test.ts`). The API report's diff was read for names
outside the contract. The branch's two merges of `main` (`8cc1667`, `2331ac2`) were compared with git's own merge of
their parents (`git merge-tree`): `2331ac2` is git's merge exactly, and `8cc1667` differs only where git left
conflicts, each resolved by keeping both sides (`docs/api/framework.api.md`, `layout.browser.test.ts`, and plan I's
`co-op-game.ts` host becoming `testHost()`). Checks were read with `gh api`. Nothing was run locally: no install, no
typecheck, no test, no probe. Every behaviour below is traced from the source.

## The build's deviations

Each was reported by the build. All six are accepted.

1. **The test frame loads `page.ts` with a `<script type="module" src>`**, not an inline `import()`, and stubs
   Vitest's `__vitest_browser_runner__.wrapDynamicImport` inside the frame. The frame is still a fresh same-origin
   document (a `srcdoc` frame takes its parent's origin) with its own module copies, so it proves what Task 7 asked:
   nothing reaches the next page but what the browser stored. The plan's stop rule (do not fall back to a second
   `webHost()` in one page) was kept. See note N1.
2. **The API report was regenerated in each task.** CI checks the report on every pull request, so a task that
   changed the surface could not go green otherwise. The final report adds only the contract's names, plus the two in
   deviation 4, and changes `Host.target` and `webHost`'s argument as planned.
3. **Each task is two commits** (`test(...)` then `feat(...)`). That is the plan's "a task pushes twice", red then
   green; the CI history shows each red run.
4. **`LoadResult` and `SaveResult` are exported types.** They are the contract's inline answer types, named; nothing
   changes for a caller. Fix 10 adds the names to the contract, so plans U and D use them.
5. **Saves and settings reject bad input with a `RangeError`.** The plan asks for this: `defineSave`, a slot that is
   not one of the game's (Task 3), data the schema refuses (Task 3, "throws"), data JSON cannot keep (audit F5), a
   bad section name and a refused settings value (Task 4). A host's "no" is still an answer, never a rejection. The
   one place the words disagree is `openSettings` (M6).
6. **The final review was a self-review.** This audit is the independent one.

## Critical

None.

## Important

**V1. A save written with an empty label, or one over 80 characters, becomes "damaged" the moment it is written, and
the save it replaced is gone.**

`readEnvelope` (`src/features/saves/envelope.ts`) refuses a `label` that is not 1 to 80 characters. `Saves.save`
(`src/features/saves/slots.ts`) never checks the label it is given: it writes the envelope with whatever `label` came
in. So `save(0, data, { label: '' })`, or a label built from a long level name, answers `{ ok: true }`, and the next
`list` shows slot 0 as `damaged` ("This save has a label that cannot be read.") and `load` refuses it. The slot's
previous save was written over on the way. That is exactly what the save policy forbids: progress lost, with "yes"
as the answer. Plan U will build labels from level names in six languages, so this is a real path, not a contrived
one.

Fix: `save` checks `label` with the same rule as `readEnvelope` (one `MAX_LABEL` and one check, shared from
`envelope.ts`) and throws a `RangeError` in plain words before anything is written, like the other mistakes it
rejects. Tests: an empty label and an 81-character label each throw and leave the slot byte for byte as it was; an
80-character label saves and lists as ready.

## Minor

**M1. A browser that hands over no storage at all answers `failed`, not `unavailable` (not reported as a deviation).**
The plan (Task 5) says "`storage()` throwing, or a `DOMException` named `SecurityError`, is `unavailable`".
`webStore` (`src/features/web/storage.ts`) sends every error, the getter's included, through `refusalOf`, which only
knows the error's name: a getter that throws anything but a `SecurityError` answers `failed`. And where the browser
has storage switched off and `localStorage` is `null` (Firefox with `dom.storage.enabled` off), the call fails with a
`TypeError` and answers `failed`. Plan U's title screen says "saving is off" only for `unavailable`. The tests pass
because the one getter test throws a `SecurityError`. Fix: call `storage()` in its own `try`, and treat any throw from
it, or a `null` result, as `unavailable`; tests for a getter that throws a plain `Error` and one that returns `null`.

**M2. Slots let a store's rejection escape; settings catch it; `openSettings` does not.** `SaveStore` does not say
its methods never reject. `settings.ts` turns a rejected `set` into `failed`, but `openSettings` awaits `store.get`
unguarded, so a rejecting store makes it reject (its doc says it "never rejects" for a host's "no"), and every method
of `createSaves` passes a rejection straight on. The two built-in stores never reject, so nothing breaks today; an
adapter in M4 (itch, Tauri) could. Fix: one small helper in `store.ts` that turns a rejected store call into
`{ ok: false, refusal: 'failed', detail }`, used by `slots.ts` and both places in `settings.ts`; and say on
`SaveStore` that an adapter answers, never rejects. Test with a store whose calls reject.

**M3. Two tabs of one game undo each other's settings.** `openSettings` reads the record once. Each write
serialises this page's copy of every section, so tab B changing `controls` writes back the `sound` it read when it
opened, undoing the volume tab A set since. Saves do not have this problem (they read afresh). Fix: each write reads
the stored record first and overlays only the sections this page has set, then writes; a test with two `openSettings`
on one store, each setting a different section, ending with both kept. (If the stored record cannot be read at that
moment, the write goes ahead with this page's copy, as now.)

**M4. A listener that throws stops the write.** `SettingsHandle.set` keeps the value, calls the listeners, then
starts the write. A listener that throws makes `set` reject, and the value the game now uses is never stored. Fix:
start the write before calling the listeners, call each listener in its own `try`, and rethrow the first error once
all have run; a test with a throwing listener whose value is still stored and whose other listeners still hear it.

**M5. `set` may freeze the game's own object.** `set` freezes `checked.data`. A Zod object schema gives a new object,
but a schema that hands its input back (`z.any()`, `z.custom()`, a `z.record` in some cases) gives the caller's own
object, which is then frozen under the game's feet. Fix: `deepFreeze(structuredClone(checked.data))`, as `initial`
already is; a test with `z.any()` where the passed object stays unfrozen.

**M6. `openSettings`'s words and its behaviour differ on a bad game id.** It rejects with `settingsKey`'s
`RangeError`, which is right (a mistake in the game), but the doc says it never rejects. Fix the doc: "Rejects only
for a game id that breaks the rule, a mistake in the game; a host's "no" or a damaged record is `problem`."

**M7. The README leaves out two things a game must know.** It says `save` does not write over a damaged slot; it does
not say the same holds for a newer or too-old one. And it says every `save` answers `{ ok: false, problem }` when the
save was not kept, but not that `save` rejects, before writing anything, for a slot the game does not have or data its
schema refuses. Fix those two sentences; `readme.test.ts` needs nothing new.

**M8. The journey never sees the game being told no.** `SavesPage.save` throws its answer away, so "a save broken by
hand ... after a page that tried to play" checks that the bytes survived but not that the game was told `damaged`; and
the page in it never plays, despite the name. Fix: `save` in `page.ts` returns the answer; the test asserts
`{ ok: false, problem: { kind: 'damaged' } }` and either plays first or drops "tried to play" from its name.

**M9. A settings record in a newer format is described as an unknown form.** `readSections` checks that `sections`
is an object before it reads `format`, so a later format whose layout differs gets "These settings are not in a form
this game knows." rather than naming its format. Fix: check `format` first, as `readEnvelope` does; one test.

**M10. The contract does not name `LoadResult` and `SaveResult`.** Add both names to the plan's "What the other plans
rely on" block (a doc change in the plan), so plans U and D import them rather than retyping the unions.

## Notes for other plans

- **N1 (the Vitest pin).** The journey's frame stubs `__vitest_browser_runner__.wrapDynamicImport`, a Vitest
  internal. A Vitest upgrade may change it; the journey then fails with its own named message ("The page did not
  answer ... its script started"), not silently. Whoever moves the Vitest version reads this first.
- **N2 (plan D).** "A save made as the page closes" proves that a save finishes within the task that asked for it
  (with Task 3's fake-timer test). A real tab closing, with `pagehide`, is plan D's reload journey, as the plan says.
- **N3 (plans U and D).** By the settings policy, an older build that finds a settings record in a newer format
  starts every section from its first values and writes over the record on the first change. That is accepted
  (losing a preference is fine), but a settings screen should say so through `settings.problem` rather than quietly.
- **N4 (plan U).** A slot list answers one refusal for the whole list (`list` stops at the first refused slot); a
  saves screen shows "saving is off" for the screen, not per slot. `erase` asks nothing: plan U asks the player before
  it erases a newer or damaged slot.
- **N5 (plans L, U, I, S, D).** The contract holds as written: `Host.store`, `language()`, `deviceLanguages()`,
  `canQuit`, `quit()`, the stored keys and forms, `z` from both entries, and only the browser entry exporting
  `webHost`. `LAYERS` on `main` is `sim, physics, commands, content, level, render, input, saves, host, web, game`;
  plans N, S, L, T and U slot in as the plan's merge order says.

## What was checked and holds

- **The contract.** Every name and shape in "What the other plans rely on" is in the code as written: the store
  port and `memoryStore`, `SaveDef` and `defineSave` (with the plan's exact messages), `SaveProblem`, `SlotState`,
  `Saves`, `createSaves`, `latestSlot`, the settings types and `openSettings`, the grown `Host`, `isOpenableLink`,
  `testHost` and its options, `WebSeams` and `webHost(seams?)`.
- **The save policy.** A newer save is refused before any upgrade runs; an upgrade gets a `structuredClone`, so it
  cannot change the stored data; a missing or throwing upgrade is `too-old`; a damaged, newer or too-old slot is
  never written without `replace`; a refused read stops `save` even with `replace`. A damaged settings record starts
  every section again, and a section its schema refuses starts again alone.
- **Order and timing.** `save` checks the schema and writes the envelope's text before it reads the slot, so bad data
  throws before the store is touched (audit F5). `webStore` does its work before returning its promise, and nothing in
  `saves` waits on a timer (audit F4). Settings writes are chained and serialise when they start, so the last value
  asked for is the one stored (Review Focus 5).
- **Layers.** `saves` imports only `src/lib/`; `host` imports `saves` through its entry; `web` imports `host` and
  `saves`; `host` left `PAGE_FEATURES` and `web` joined it (audit F1). Nothing in `sim`, `physics`, `commands` or
  `level` reaches either.
- **Entries.** Headless exports `z` (after `no-eval`), `saves` and `host`; the browser entry adds `web` and no longer
  carries `host` itself. The packed-package smoke saves and loads with the package's own `z`, and `consumer.ts` types a
  `Host` from `testHost()` and a `defineSave` built with it (audit F2).
- **Tests.** Browser storage keys start `automata.web-storage-test.`, and the `check` test records calls instead of
  reading the shared key (audit F6). `get` gives a frozen value (audit F10). Every test name the plan lists is in its
  file.

## Fixes for stage 6

Each test is pushed red first, then its fix, as the plan's tasks were.

1. V1: check `label` in `save` with `readEnvelope`'s rule; tests for '', 81 and 80 characters.
2. M1: `webStore` treats a throwing or `null` `storage()` as `unavailable`; two tests.
3. M2: one helper turns a rejected store call into `failed`, used by `slots.ts` and `settings.ts`; `SaveStore`'s doc
   says adapters answer, never reject; a test with a rejecting store.
4. M3: each settings write reads the record and overlays only this page's sections; a two-handle test.
5. M4: `set` starts its write before calling listeners, and a throwing listener does not stop the write; a test.
6. M5: `set` freezes a clone; a `z.any()` test.
7. M6: `openSettings`'s doc.
8. M7: the README's two sentences.
9. M8: `page.ts`'s `save` returns the answer; the damaged journey asserts it and its name matches what it does.
10. M9: `readSections` reads `format` first; one test.
11. M10: name `LoadResult` and `SaveResult` in the plan's contract.

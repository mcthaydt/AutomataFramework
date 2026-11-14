# M2 plan C (content): implementation audit

Stage 5 of the workflow, for the code of [`plans/2026-11-14-m2-content.md`](../plans/2026-11-14-m2-content.md) as
merged in PR 43 (`0c48f3e`), against that plan, its [plan audit](2026-11-14-m2-content-plan-audit.md) (PR 38), the
[M2 spec](../specs/2026-11-14-m2-design.md) and the code on `main` at `0c48f3e`. Written 2026-11-14.

**Verdict:** the build is sound and matches the plan closely. Every kind has its own file, schema, row, tests and a
fixture file; the loader, the writer, the project file and the schema script all run from the one table; the M1 game
loads to the same three keys, so no golden moved; every sentence the plan names is quoted by a test. `main` is green
on `0c48f3e` (`check`, the three `engines`, `package`). There is nothing critical. Two important findings need a
fix before plans A, S and T build on these files, and eight minor ones can go in the same fixes branch. There is no
Owner question.

How it was checked: every file under `src/features/content/`, the changed files in `src/features/level/` and
`src/features/commands/`, the full fixture game, the new tests, the smoke, the consumer, the README and the CI change
were read. The ci run on `main` for `0c48f3e` (run 43579333630) was read: all six jobs passed. Zod's handling of a
half-read file, the duplicate-id sentence, the wrong-kind sentence, a cutscene's clip and an empty music row were
probed with a throwaway script (not a test) against the source; `pnpm typecheck` was run locally with the tuning
cast narrowed (M1). No test was run.

## Critical

None.

## Important

**I1. A cutscene's `clip` accepts any name, and plan A's check would then break files that load today.** The plan's
check at `actors[i].clip` ("The character "keeper" has no clip called "wave". It has: idle, talk.") needed a
character's `clips`, which went to plan A with `figure` (the Owner's answer (c)). The build kept the `clip` field in
`cutscene.ts` with no check, so `"clip": "anything-at-all"` loads (probed), and the full game's cutscene names `idle`
and `talk`, which no file defines. When plan A adds clips and the check, every file written in between that names a
clip its character lacks stops loading, which the plan's own rule says needs `format: 2`.
*Fix:* take `clip` out of `ActorKey` and `CutsceneSchema` (and its `missing` words, if any), out of
`tests/fixtures/full-game/content/cutscenes/level-1-intro.json` (rewritten by `writeContent`) and the cutscene
tests; run `pnpm schemas`. Plan A adds `clip` back as an optional field together with `character.clips` and the
check, which is an optional field and no new format. Write one line in "What the other plans rely on" for plan A.

**I2. Two files of one kind with one id get "There is already a cues called" and "a messages called".** `claim()` in
`load.ts` builds the sentence from `ref.type`, which was fine for `level` and `character` and is wrong English for
the new kinds (probed: `There is already a cues called "cues", in content/cues/cues.json.` and `There is already a
messages called "en", ...`). That fails the drunk-grandma test.
*Fix:* use the kind's noun with its article, as `wrongKind` does: `There is already ${withArticle(noun)} called
"cues", in content/cues/cues.json.` gives "a cue list" and "a messages file"; level and character read as today.
Add a test for one of the new kinds.

## Minor

- **M1. The tuning schema is cast whole.** `TuningSchema` ends in `as unknown as z.ZodType<TuningFile, TuningFile>`
  so that `pad` can be `PadInput[]`. Only the pad name needs it; today the rest is caught by `checkTuning`'s typed
  parameter, but by chance. *Fix:* put the cast on `padName` alone (`as unknown as z.ZodType<PadInput, PadInput>`) and
  drop it from the schema; `pnpm typecheck` passes so (checked locally). The comment moves with it.
- **M2. An empty music row says "Separate the steps with one space."** `"".split(' ')` is one empty step. *Fix:* a
  row with no steps says `This row has no steps. Write at least one, like C4 or -.`, with a test. (Also for plan S to
  decide, not here: a part that starts with `=` holds nothing.)
- **M3. A cutscene line may stay up past the end.** `lines[i].at` is checked against `length`, `until` is not, so a
  line can be on screen after the cutscene ends. *Fix:* at `lines[i].until`: `This is after the cutscene ends, at tick
  300.`, the sentence the other keys use, with a test.
- **M4. "before the one above it" for an actor's key.** Two actors' keys may interleave (tested), so the key "above"
  is not always the one meant. *Fix:* for actors, `This key is at tick 30, before "keeper"'s key above it (60). Keys
  go in time order.`; the camera keeps its sentence.
- **M5. A file listed as the wrong kind still sends problems to other files.** A sound listed as `messages` gets the
  one wrong-kind sentence (Review Focus 1, as planned), but each cue that plays it also says `There is no sound called
  "jump"` (probed), because `Listed` counts the file under the kind it is listed as. *Fix:* when a file's only problem
  is the wrong-kind sentence, `has` also counts it under the kind it reads as, so the references are not reported a
  second time; a test with the sound and its cue.
- **M6. The README's tuning row says "numbers a player can change".** It is the game's maker who changes them (in the
  Tuner, or an agent in the file); a player changes the controls in settings. *Fix:* `numbers that decide how
  something plays, each with its range, and the controls`. And nothing holds the README's `door.json` to the bytes
  `writeContent` makes: *fix:* `readme.test.ts` takes the JSON block under "Content files" and checks
  `writeContent('sound', JSON.parse(block)) === block`.
- **M7. `content.ts`'s first line still says "level and character files".** *Fix:* "every kind of content file".
- **M8. The tracker's plan C rows are stale.** Stage 2 says "in review" (merged in PR 33) and stage 4 "in review
  (PR 43)" (merged, `0c48f3e`). Corrected in this pull request.

For plan L, not fixed here: a messages file's `messages` is an ordinary object in `GameContent`, so a reader that
writes `messages[key]` finds `Object`'s own `constructor` for a key the file lacks. The loader's checks use
`Object.hasOwn`; plan L's lookups must do the same (or plan L gives the map no prototype, which does not change the
written bytes or the hash).

## The deviations the build reported

- **`shared.ts` was added.** It is in the plan (Task 2, the plan audit's I5), so this is not a deviation. Its rule
  holds: no kind imports `load.ts` or `project.ts`; `conversation.ts` and `cutscene.ts` import `messages.ts`, a kind
  below them, with no cycle.
- **Tasks 4 and 5 were swapped.** Right: `character.tuning`'s check needs the `tuning` kind in the table, so Feel
  had to come before Characters. Nothing else depended on the order.
- **The nouns are "music track" and "cue list"**, not the plan's "music" and "cues". Better words in "This is not
  something a music track has" and the wrong-kind sentence; accepted. `noSuch('music', ...)` still reads "There is no
  music called", as the plan says.
- **`tuning.controls`' `pad` and `shared` are `| undefined`, with a cast.** `| undefined` matches every other
  optional field in the content types. The cast is M1. The test that a tuning file's controls pass plan I's
  `controlsFromList` is in plan I's PR 42 (its merge of `main` adds it), as the plan allowed when `controlsFromList`
  was not yet on `main`; this audit did not run it.
- **Not reported, but expected:** `figure`, `backdrop`, `level.backdrop`, `character.figure` and `character.clips`
  are gone, by the Owner's answer (c); the table has twelve rows and `schemas/` twelve files. The cutscene's `clip`
  should have gone with them (I1).

## Checked and found right

- **The table.** `CONTENT_TYPES` has the twelve rows in the plan's order (less the two), with `plural`, `editor`,
  `part`, `title`, `noun`, `missing`, and `tidy`/`check` where the plan lists them. `project.ts` takes its `type` enum
  from the table; `writeContent` applies `tidy`; `jsonSchemaFor` and `pnpm schemas --check` work from the table
  (`package` job green).
- **The content hash (plan audit C1).** `GameContent` always has `levels` and `characters` and another map only when
  a file of that kind is listed; the test that the M1 game loads to `characters, levels, project` is in
  `agent-journey.test.ts`. `tests/golden/` and `tests/fixtures/game/` are untouched by PR 43.
- **The tileset in the sim (Task 8, C2).** `tileRuns` takes `isSolid`, `#` by default; `spawnLevel` builds it from
  the tileset and throws the planned `LevelError` when the content lacks it; the parity test compares
  `describeSnapshot()` with `contentHash` blanked, every 60 ticks, in Node and the three browsers.
- **Review Focus.** 1: the wrong-kind sentence (see M5 for what follows from it). 2: `constructor` as a character
  and as a message key, `Object.hasOwn`, prototype-free maps. 3: a byte-order mark and `\r\n` in both parsers. 4: the
  loop sentence, said once per loop, with a choice breaking it. 5: `1e999` and the six languages' bytes in four
  engines.
- **The plan audit's fixes.** I2 (no `en.json` means every key reported, listed but unread means skipped), I3 (the
  kinds check is skipped when any character did not read), I4, I5, I6 (the blank label, with plan I's sentence), M1
  (`﻿` written as an escape), M3 (the discriminator and bad-key sentences run inner issues through `sentence()`),
  M5 (`player-1` to `player-4` refused as thing ids). All present and tested.
- **Every sentence.** Each of the plan's sentences was searched for in `tests/`; every one is quoted by a test.
- **A half-read file.** Zod 4.6.6 does not run an object's `superRefine` when a field inside failed (probed), so the
  checks that read `kind.pictures` or `one.when` cannot throw on a broken file and fall into "This file could not be
  read".
- **The package.** The smoke loads the full game from the installed package, finds all twelve kinds and reads each
  schema through `import.meta.resolve`; `consumer.ts` typechecks the new types; the CI change is the one copy line
  the plan names, with its test.
- **Layers.** `content` imports only `src/lib/` and `commands` (`pad-names.ts`, plan I's text, with its test);
  every source file is under 600 lines (the longest, `tuning.ts`, is 272).

## Fixes needed

For stage 6, on one branch, test first:

1. I1: take `clip` out of the cutscene format, the fixture and the tests; `pnpm schemas`; a line for plan A.
2. I2: the duplicate-id sentence uses the kind's noun with its article; a test.
3. M1: the cast on `padName` only.
4. M2: the empty-row sentence; a test.
5. M3: `until` after the end; a test.
6. M4: the actor's key sentence; the test updated.
7. M5: a wrong-kind file counts under the kind it reads as; a test.
8. M6: the README's tuning row, and a test that its `door.json` is `writeContent`'s bytes.
9. M7: `content.ts`'s first line.

None of these moves a golden or changes an M1 file's bytes. Plan A, S and T can be planned now; plan A's
execution should start after fix 1 is merged.

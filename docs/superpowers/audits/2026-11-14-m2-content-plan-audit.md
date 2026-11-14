# M2 plan C (content): plan audit

Stage 3 of the workflow, for [`plans/2026-11-14-m2-content.md`](../plans/2026-11-14-m2-content.md) as merged in
`4fa1d1b`, against the [M2 spec](../specs/2026-11-14-m2-design.md), the code on `main` at `e8a08c7`, and the other M2
plans: V (saves, merged), I (input, merged as `e8a08c7`), N (networking, PR 35) and P (physics, not yet written).
Written 2026-11-14.

**Verdict:** sound in shape (one table, one file per kind, every sentence tested, the M1 bytes kept), with two
critical faults that would have stopped execution at its own stop rule. Both are fixed in the plan. One question is
the Owner's (I1) and is open; the `figure` and `backdrop` halves of Tasks 3 and 4 wait for it, the rest can start.

How it was checked: every file the plan names under `src/features/content/`, `src/features/level/`,
`src/features/sim/create-sim.ts`, `src/lib/`, `tests/architecture/rules.ts`, the fixtures, the smoke and the CI
workflow were read. Zod 4.6.6 and smol-toml 1.9.0 were installed from the lockfile and probed with a throwaway
script (not a test) for the exact issue shapes the plan relies on. The Editors and Examples repos were searched for
every name the plan changes. No test was run.

## Critical

**C1. Widening `GameContent` moves every golden.** `createSim` hashes the canonical JSON of the whole content into
`contentHash` (`create-sim.ts:175-177`), the snapshot header carries it, and `sim.hash()` is the hash of the snapshot
(`create-sim.ts:542`). The plan's `GameContent` has all fourteen maps, so the M1 fixture game would load with twelve
new empty maps, and `push-crate.json` (every hash and `idleHash60`), the packed-install smoke, and Examples'
`replays/level-1.json` and `replays/test-game.json` would all move at the first pin move. The plan's own rule ("no
golden moves; if one would, stop") would have stopped Task 3.
*Fixed:* `levels` and `characters` are always there; another kind's map is present only when the project lists a
file of that kind (the same idea as plan I's absent `players` key). Global Constraints, the contract, Task 1 Step 3,
Task 9's tests (plus a test that an M1 game loads to exactly `characters, levels, project`) and Task 11's
`consumer.ts` line are updated.

**C2. Task 8's parity test could never pass.** It compared `sim.hash()` of a level with a tileset to the same level
written with `#` and `.`. The two games' content differs, so their `contentHash`, and with it every snapshot hash,
differs too. *Fixed:* the test compares `describeSnapshot()` with `header.contentHash` blanked, at tick 0 and every 60
ticks to the end. (`finalHash` was also not an existing helper; the new helper is defined in the test file.)

## Important

**I1. The figure and backdrop formats do not carry the old builders over. Open for the Owner.** The spec's content
table says `figure` is "the old figure file, 2D only", its Principle 5 row says the painting half of the figure and
environment builders arrives as `automata art`, and Principle 5 is "characters and scenes come from the environment
builder and figure builder, carried over". The plan instead writes a new, small format (blocks and round parts moved
per pose) and does not list Principle 5 among those it serves. Its reason, that the old figure "describes a 3D
body", is true of the rig, but the old figures extension's painter rasterises that rig into 2D pixel art, which is
the half the spec carries over. This changes what plan A paints and what the M3 figure builder edits, so it is the
Owner's to settle. Options, as sent to the coordinator:

- (a) Keep plan C's new formats; the old builders are read for ideas only, and the spec gets a line saying so.
- (b) Plan C's `figure` and `backdrop` carry the old files' data, cut to 2D (genes, gait and outfit for a figure;
  the old scene description for a backdrop), and plan A ports the old painter.
- (c) Plan C leaves `figure` and `backdrop` out, and plan A designs both formats together with the painter it ports,
  since a format and its painter are one piece. *Recommended:* it keeps plan C moving and puts the decision where the
  painting code is read.

The plan now says the `figure` and `backdrop` halves of Tasks 3 and 4 wait for the answer.

**I2. "A check skips what it cannot see" let a game with no English file pass.** A conversation or cutscene line is
checked against `en.json`; with no `en.json` listed, `get` returns nothing and the check would be skipped, so the
lines would name nothing at all. *Fixed:* no `en.json` listed means every key is reported; `en.json` listed but
unread means skipped.

**I3. The behaviour check's kinds are a whole-game list.** A behaviour's `kind`, `from` and `to` are checked against
every character's `kind`; one broken character file would make every behaviour naming its kind look wrong too, which
the loader avoids for ids today. *Fixed:* skipped when any listed character did not read.

**I4. A message key named like an object's own property.** Zod's `z.record` returns an ordinary object (probed: a
parsed record has `Object.prototype`), so `constructor` would be "found" in an English file that lacks it. Review
Focus 2 asks for exactly this case to be reported. *Fixed:* lookups use `Object.hasOwn`, with a test for a missing
`constructor`.

**I5. No shared home for "There is no X called".** Each kind's `check` needs that sentence and its list, which live in
`load.ts`. A kind importing `load.ts` makes a run-time cycle (`load.ts` → `content-types.ts` → kind → `load.ts`),
which `tests/architecture.test.ts` fails on (type-only imports are exempt, run-time ones are not). *Fixed:*
`noSuch(noun, id, known)` and `list()` move to `shared.ts`, with the rule written down.

**I6. A tuning file could load and then fail plan I.** The plan's `controls.label` is 1 to 12 characters, while plan
I's `checkControls` also refuses a label of only spaces; such a file would load and then throw in `controlsFromList`
when the game starts. *Fixed:* the same refusal with plan I's sentence, and a test, once `controlsFromList` is on
`main`, that the example's controls pass it and each refusal both plans share gives the same words. Every other rule
was compared with plan I's Task 1 and "Shared types": `ControlEntry`'s fields, the pad names, the reserved lists,
`MAX_ACTIONS` and `ACTION_NAME` all match, and plan C is never looser than plan I.

## Minor

- **M1.** The byte-order-mark test held a literal, invisible U+FEFF in three places, which a copy loses. *Fixed:*
  written `﻿`.
- **M2.** Two of Task 2's new tests already pass on `main` (Zod 4.6.6 reports `1e999` as `invalid_type`, which reads
  "This must be a number."; smol-toml 1.9.0 skips a leading byte-order mark). *Fixed:* Step 2 says so; they stay as
  guards.
- **M3.** Task 2 said to read Zod's issue shapes from its types. Probed: the discriminator issue already carries
  `discriminator`, `options` and a path ending in the key, so no path work is needed; a bad record key is
  `invalid_key` with inner `issues`. *Fixed:* written into Step 3, and the bad-key sentence runs the inner issue
  through `sentence()` so a too-long key gets plain words, not Zod's.
- **M4.** The spec's tileset has "collision shapes"; the plan has solid or not. Enough for M2. *Fixed:* recorded,
  with a later optional `shape` left open for plan A or P.
- **M5.** A level thing named `player-1` to `player-4` would share an id with a player's hero (`spawnLevel` names
  heroes so), and a cutscene's `who` could not tell them apart. *Fixed:* refused, with a sentence; no M1 file has one.
- **M6.** A cutscene actor's clip check did not say which character `player-N` is. *Fixed:* the project's `hero`.
- **M7.** The file structure left out `json-schema.ts` and the possible `pad-names.ts`. *Fixed.*

## Checked and found right

- The table design, `ContentTypeInfo<Out, In>`'s two type parameters and the moved `editor` word: the Editors repo
  reads none of them (searched `src/`, `functions/`, `tests/`); Examples' `scripts/write-content.ts` is generic.
- `content` importing `commands` for `ACTION_NAME` and the pad names is a downward import in `LAYERS`, and stays so
  after plans V (`saves`, `web`) and N (`net`, `server`) change `LAYERS`.
- Type-only imports between `type-info.ts`, `content-types.ts` and the kind files do not count as cycles
  (`rules.ts` takes only run-time imports).
- The tileset's 93 tiles (`!` to `~` less `.`), the `#`-is-solid default, the M1 row sentence, the `?raw` fixture
  pattern, `attemptsToBuildCode`, `./schemas/*` in the package's exports, `pnpm schemas` reading the table, the
  CI `package` job's copy step, `heroPlugin`, `pushScript` and `PUSH_TICKS` all exist as the plan says.
- Every sentence in the plan is a whole plain sentence that says what to change.
- The coverage of the spec's thirteen kinds, the M6 minor (already fixed by `ae67fd0`), and the split of work with
  plans A, S, T, L, I and K.

## For other plans, not fixed here

- **Plan D, "What's inside".** The spec builds that page from a content file, but `automata.toml` lists only the
  framework's kinds, and plan C's table has no room for a game's own kind. Plan D (or K) needs to say where the list
  lives before its step.
- **Plan P.** It can add joints and sensors as optional fields; with C1's fix an old file still hashes the same.
  Written into the plan's "What the other plans rely on".
- **Editors.** A level with a tileset has letters the Levels screen does not paint. Written into the same section.
- **Plan N.** Clients compare `contentHash`; nothing in plan C changes how it is made beyond C1's fix.

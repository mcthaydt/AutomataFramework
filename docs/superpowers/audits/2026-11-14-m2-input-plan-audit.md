# Plan audit: M2 plan I, input

Written 2026-11-14. Stage 3 (plan audit) of cycle 4 for plan I,
[`plans/2026-11-14-m2-input.md`](../plans/2026-11-14-m2-input.md) as merged in `e8a08c7`. It was read against the
[M2 spec](../specs/2026-11-14-m2-design.md) ("Input (plan I)", "Multiplayer in the demo", "Testing"), the
[first layer's spec](../specs/2026-11-13-2d-first-layer-design.md), `CLAUDE.md`, [`progress.md`](../progress.md), the
code on `main`, the old repo it ports from (`mcthaydt/AutomataFrameworkFailed` at `ed8592e8`), and the plans it must
fit: C (content, merged), V (saves and host, merged), N (networking, PR 35) and P (physics, being written).

## The answer first

The plan is sound, true to the spec and serves the principles it names. Its shape is right: pure parts (reading a
pad, seats, what a seat holds, bindings) wired by one entry, and joining as two recorded commands that only a game
with `players = 2` or more gets, so no golden in this repo or in Examples moves. Its contracts with C, V and N hold.

It was **not ready to execute as written**: three findings (B1 to B3) would have turned a CI job red, or a test
unpassable, on the plan's own steps. Twelve should-fix findings (S1 to S12) close gaps a person would meet, chiefly
how real browsers show a gamepad, and presses that land twice. There are five notes (N1 to N5).

**Every fix below is applied in the plan's text** (this branch). Stage 4 executes the plan as it now reads; where the
plan and this audit differ, this audit wins. Nothing here reopens a decision the Owner made, and no Owner question
came up.

## Method

- Every port source in "Porting from the old repo" was looked up at `ed8592e8` (`read-pad.ts`, `handover-mask.ts`,
  `nav-repeat.ts`, `testing/input/fake-gamepads.ts`): all exist, and the constants the plan carries (deadzone 0.25,
  triggers from 0.5, `sin(22.5°)`, 400 and 120 ms) are the old ones.
- Each interface the plan consumes was checked in `src/`: `defineSystem`'s `before` (`sim/schedule.ts`), `ctx.spawn`
  and the deferred `ctx.despawn` (`sim/context.ts`), the `unknown-command` reason (`sim/create-sim.ts`), physics
  making and removing bodies for entities spawned and despawned mid-game (`physics/physics-world.ts`, `syncIn`),
  `describeSnapshot`, `verifyReplay`, `expectGolden`'s GOLDEN NOT RECORDED path, `manualFrames`, the CI jobs.
- The architecture rules (`tests/architecture/rules.ts`) were walked for every new file: `src/lib/frames.ts` holds a
  type only, so lib stays below features; `input` imports only `commands` through its entry; `level/join.ts` and
  `commands/sequence.ts` are in pure features and use nothing impure; `/headless` reaches no page feature.
- `PAD_BUTTONS` was checked against the standard mapping's button order (0 south, 1 east, 2 west, 3 north, 4 to 7
  shoulders and triggers, 8 select, 9 start, 10 and 11 the sticks, 12 to 15 the D-pad, 16 home).
- Plans C, V and N were read where they touch input: C's `tuning.controls` rows and its copy of plan I's sentences;
  V's contract section (`SettingsSection`, the stored form, "a section its schema refuses starts again"); N's
  Task 11 and its room rules for `seq`. Plan P has no text yet; its thread was told what plan I changes in `level`.

## Blocking (applied)

**B1. Every task but the last leaves `package` red.** The `package` job runs `pnpm api-report`, which fails when
`docs/api/framework.api.md` does not match the source. Task 1 exports the pad names from the commands entry (and so
from both entries); Tasks 5 to 9 add or change exported names and signatures (`createSequence`, the join commands,
`createInput`'s options, `Input`, `GameOptions`, `Game`). The plan updates the report only in Task 10, yet each task's
Step 4 says "all jobs pass". *Applied:* Global Constraints and "How every task is verified" now say that a task which
changes what an entry exports, or an exported doc comment, runs `pnpm build` then `pnpm api-report --update` and
commits the report with its implementation.

**B2. `applySettings` as written refuses every saved swap.** It applied overrides one action at a time, in sorted
order, checking `checkControls` after each. After `rebind(c, 'jump', 'keys', 'KeyA')` the saved settings hold `jump:
['KeyA']` and `left: ['ArrowLeft']`; applying `jump` first leaves `KeyA` on both actions, so `jump` is dropped, and
then `left` loses `KeyA` with nobody taking it. The plan's own round-trip test would fail on any swap, and a player's
changed key would silently come back wrong. *Applied:* overrides for known actions are applied together; then,
until nothing changes, an override is dropped when it fails a check of its own or shares an input with another
action in the same slot; a final `checkControls` guards the result. Two tests added: a taken key and a swapped
button each survive a save and a load.

**B3. One `manualFrames` cannot drive two loops.** `tests/fixtures/game/frames.ts` keeps a single pending request: a
second `request` replaces the first. Task 6 has the input read pads on its own frames, and Task 9's tests give the
game a `manualFrames()`; if `startGame` passes it on (it must, or the input reads pads on the page's real frames and
"two frames" in a test means nothing), the loop and the pad reader cancel each other. *Applied:* Task 6 widens
`manualFrames` to keep every pending request and deliver them in the order asked; Task 9 says `startGame` passes its
`frames` to `createInput`.

## Should fix (applied)

**S1. Browsers show a gamepad only after a button on it is pressed.** Chromium, WebKit and Firefox all hide pads from
`getGamepads()` until the person presses something, so the first read that sees a new pad already has that button
down. The invite masked "what was held", which would swallow exactly the press that says "I want to play"; the
person would have to press twice, and nothing on screen would say so. The plan's tests (`connect`, then `press`)
would not notice. *Applied (Task 8):* a pad that first appears while the invite is open with a button down counts as
that press; a test connects and presses before the next frame.

**S2. One press, two effects.** `onMenu` sends presses "silenced or not", so a pad capture's answer `south` is also
an `accept` (on a settings screen that opens the same row again), `start` cancels the capture and also pauses, and
the `south` that joins a player also accepts the "Add a player" screen's focused button. That is Review Focus 2's own
failure, through the menu path. *Applied (Tasks 7 and 8):* while a pad capture waits, and for the press that ends
it, `onMenu` is told nothing; a press an invite takes is not sent to `onMenu`. A test for each.

**S3. `getGamepads()` can throw.** In a frame whose permissions policy refuses gamepads (a game embedded on another
site can be), `navigator.getGamepads()` throws a `SecurityError`, and called as a loose function it throws an illegal
invocation. Review Focus 5 promised "nothing throws". *Applied (Task 6):* the default calls it on `navigator`, and a
throw counts as no pads on every read; a test.

**S4. The saved bindings' schema decides what plan V throws away.** V's settings keep a section only while its
schema accepts it; a refused section starts again from `initial`. The plan called `InputSettingsSchema` "the strict
shape" without saying what it checks. If it checked action names or free keys, one renamed action would wipe every
binding at V's door, before `applySettings` could drop just that one. *Applied (Task 3):* the schema checks shape
only (format 1; a record of strict objects of optional `keys`, `shared`, `pad`, with pad names from the lists);
fitting the game is `applySettings`' job.

**S5. Plan N starts a co-op room with nobody in it.** N's Task 11 makes the room's and clients' sims with
`players: []` and says "if `createGameSim` refuses an empty list of players, stop and report". The code accepts it
today (`spawnLevel` spawns no hero), but nothing in plan I keeps it so. *Applied (Task 5):* a test that a co-op sim
starts with `players: []` and that a `join` from 1 then brings player 1's hero.

**S6. `pad-names.ts`'s "exact text" was not a whole file.** Plan C creates the file "with exactly the text in plan
I's Shared types" if it runs first, but that text had no header comment and doc comments on only one of five
exports, against the plan's own rule that every exported name has one (the API report prints them). *Applied:*
Shared types now holds the whole file, header and doc comments included, with no new names. Plan C points at this
text, so it follows without an edit.

**S7. End-to-end sizes.** The M2 spec's Testing section asks for journeys "at phone, tablet and desktop sizes,
upright and sideways". Task 9's tests ran at one size; only one layout test ran at the M1 layout test's four screens,
which have no desktop. *Applied:* the two headline tests (a second player joins with a gamepad and both run; a
player changes the jump key and uses it) run once per screen: the four `SCREENS` and `desktop-1280x720`.

**S8. Key repeats must still be held back from the page.** Task 6 makes the keyboard ignore `repeat` events, so a
key held through `clear()` waits for a fresh press. Ignored outright, a held Space's repeats would scroll the page
the game sits in. *Applied:* repeats change nothing that is down but are still `preventDefault`ed for bound keys; a
test.

**S9. A Space or Enter answer would press the focused button.** The settings row that opens a capture has the
focus. Stopping the answer's `keydown` is not enough everywhere: a button activates on Space's `keyup`. *Applied
(Task 7):* a key capture also swallows the `keyup` of the key it took, and a test proves the focused button's click
never fires, in all three browsers.

**S10. "In command order" across two command types.** `ctx.commands.of(def)` gives one type at a time; there is no
merged list. *Applied (Task 5):* the system merges the `join` and `leave` records and sorts them by source, then seq.

**S11. The existing "a player who cannot exist" test.** With `player` gone from `createInput`, half of that test had
nothing left to test. *Applied (Task 6):* `setPlayers` throws today's message for a number outside 1 to 4.

**S12. The headless surface test.** The pad names, `JoinCommand`, `LeaveCommand` and `joinPlugin` reach `/headless`
through the commands and level entries, and an editor that offers a gamepad button needs the names without a page,
but Task 10's list named only four of them. *Applied:* the list names all of them.

## Notes

**N1. Pad slots past four.** `Device` and `Claim` name `pad-0` to `pad-3`. Browsers normally use four slots, but
nothing in the Gamepad API promises it. *Applied (Task 6):* a pad at index 4 or more is listed as not usable.

**N2. `rebind`'s "if two would be left empty".** It cannot happen: `checkControls` gives an input to at most one
action per slot. The words are replaced, and "takes what it gave up" now says "everything", for an action that gave
up two keys.

**N3. For plan U: lost settings are V's to report.** Wired through V, a controls section V refuses comes back as
`INPUT_SETTINGS_DEFAULT`, so `dropped()` says `[]`, not `['*']`. The settings screen should say "your controls could
not be read" from V's `settings.problem` and from `dropped()` together.

**N4. For plan N's audit, not this plan.** N's server makes the `join` and `leave` commands and gives them "that
seat's next seq", and its room refuses a `seq` that is not higher than the seat's last. A client's own `Sequence`
does not know the server used a number, so its next `controls` could be refused `out-of-order`. Plan I's shared
`Sequence` is right for same-screen play, where one page makes every command; how a client learns the server's
numbers is N's to say.

**N5. Plan P.** P (joints and sensors, being planned) is likely to touch `src/features/level/spawn-level.ts`, which
Task 5 splits into `hero.ts`; whichever merges second merges `main` first. A door that needs every hero can use
`playersIn(sim)`. P's thread was told on 2026-11-14.

## What was checked and holds

- **Spec coverage.** Gamepad on the standard mapping, keyboard and touch mapped to the same actions (Tasks 1, 2, 4,
  6); bindings changed and kept with the settings (Tasks 3, 7, 9, and V's section); up to four players, each with a
  device, joining by a press on their own gamepad or the other half of the keyboard and leaving from pause (Tasks 4,
  5, 8, 9: `invite`, `addPlayer('keyboard')`, `removePlayer`); touch one player only (call 3); the level fitted above
  the buttons with two players (Task 9's layout test); the co-op replay a golden of its own (Task 5); the first-time
  player shown the right control for the device in use (`device`, `inputsFor`). The camera, colours, "every player
  through the door" and the demo's journeys are rightly A's and D's.
- **Goldens.** The join plugin is added only when `players` is 2 or more, and a project with no `players` line parses
  with no `players` key, so `push-crate.json`, `bounce.json`, `physics-scene.json` and Examples' `level-1.json` cannot
  move from this plan.
- **Plan C.** `tuning.controls` is `ControlEntry` field for field; C's sentences for the same slips are plan I's word
  for word; both plans share `pad-names.ts`; C's tighter limits (8 keys, 4 pad names) sit inside what `checkControls`
  allows. The `project.ts` and `load.ts` overlap is named in both plans.
- **Plan V.** The `controls` section is `{ name: 'controls', schema: InputSettingsSchema, initial:
  INPUT_SETTINGS_DEFAULT }`, which fits `SettingsSection<T>`; `saves` sits above `input`, so input never imports it.
- **Plan N.** Task 11 consumes `JoinCommand`, `LeaveCommand`, `playersIn`, the project's `players` and `coopFiles`,
  all named here; the join system's place (`input` phase, before `commands.controls`) is what N relies on.
- **No new dependency**, and the Owner's rules (no subagents, CI-only tests, the git identity, no Claude credit) are
  in the plan's constraints.

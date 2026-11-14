# M2 plan I (input): implementation audit

Stage 5 of the workflow, for the code of [`plans/2026-11-14-m2-input.md`](../plans/2026-11-14-m2-input.md) as merged
in PR 42 (`2aa020b`, branch head `eb7e32e`), against that plan, its
[plan audit](2026-11-14-m2-input-plan-audit.md) (PR 39), the [M2 spec](../specs/2026-11-14-m2-design.md) ("Input
(plan I)", "Multiplayer in the demo") and the code on `main` at `5af8f74`. Written 2026-11-14.

**Verdict:** the build is sound and close to the plan. Every task is there, with the tests the plan names (several
more besides), every blocking and should-fix finding of the plan audit is in the code, no existing golden moved, and
CI was green on `eb7e32e` (`check`, the three `engines`, `package`, `screens`, `commit-authors`). There is nothing
critical. Two important findings are both in `src/features/game/players.ts`: `addPlayer` can answer "yes" for a
player who never arrives, and it can give a gamepad that already has a player to a second one. Ten minor findings
and five notes for other plans follow. There is no Owner question.

**How it was checked.** Every file the PR added or changed under `src/` was read in full: `commands/` (`pad-names`,
`sequence`), `content/` (`project`, `load`), `level/` (`hero`, `join`, `spawn-level`, `game-sim`), `input/` (all
of it), `game/` (`game`, `players`, `loop`) and `lib/frames.ts`. Each test file the plan lists was read against the
plan's list of test names; the end-to-end tests (`co-op`, `remap`, `layout`) and the fixtures (`frames`,
`fake-gamepads`, `co-op`, `co-op-game`) were read in full. The merge commit `9944c63` was compared with git's own
merge of its two parents (`git merge-tree`), to see exactly what the merge changed by hand. The PR's checks on
`eb7e32e` were read with `gh api`. Nothing was run locally: no install, no typecheck, no test, no probe. Every
behaviour below is traced from the source, step by step.

## Critical

None.

## Important

**I1. Taking a player out and adding one before the game steps answers "yes" and adds nobody.**
`removePlayer(2)` queues a `leave`; `addPlayer` then works out who will be in "once everything asked for has
happened" (`eventually()`, `players.ts:50`), sees number 2 free, claims the device for 2 and queues a `join` for 2.
Both go in the next step, `leave` first (lower seq). The join system (`join.ts`) counts a hero leaving this tick as
still there, as the plan says, so the `join` is ignored. After the step `afterStep()` sees player 2 gone and tells
the input, which drops the new claim. `addPlayer` said `{ ok: true, player: 2 }`, and the person who pressed their
gamepad is in no game, with nothing on screen to say so. This is the likely way it happens, not a corner: on a pause
screen (plan U) the game takes no steps, so "Remove player 2" then "Add a player" queue up together. The same
happens in a full game of four: remove one, add one.
*Fix:* in `addPlayer`, a number is free only when it is free now *and* eventually: leave out every number whose hero
is still in the sim (`playersIn(sim)`) as well as those in `eventually()`, so the new person gets the next number
(or, in a full game, is told it is full until the step has run). Test (co-op, paused): `removePlayer(2)`,
`addPlayer('pad-2')` answers a player other than 2, and after `resume` and a frame that player's hero is in the sim
and their seat holds `pad-2`; and in a game of four, remove then add while paused answers `full`.

**I2. `addPlayer` cannot see a claim made through `game.input.claim`, so one gamepad can drive two heroes.**
The plan keeps `startGame({ players: [1, 2] })` working, with each extra player given a device by `input.claim`
(Task 9; the test "starting with players [1, 2] and a claim for 2" does exactly that). `addPlayer`'s "taken" check
reads only its own `claimed` map (`players.ts:78`), which `input.claim` never fills. So after
`game.input.claim(2, 'pad-1')`, `addPlayer('pad-1')` answers `{ ok: true, player: 3 }`, and `seatsFor` gives
`pad-1` to both 2 and 3: one pad moves two heroes. The same is true of the keyboard. The invite path is safe (its
`free` reads the input's claims), so only a direct `addPlayer` hits it, but that is the call plan U's "Join with the
keyboard" button makes.
*Fix:* drop the separate `claimed` map and decide "taken" from the input's seats (`input.seats()`: a non-first
seat whose `devices` hold `pad-N` or `keyboard-2`), plus the joins still queued; or have `Input` expose its claims.
Test: start with `players: [1, 2]` and `input.claim(2, 'pad-1')`; `addPlayer('pad-1')` answers `taken`, "That
gamepad already has a player."; with `claim(2, 'keyboard')`, `addPlayer('keyboard')` answers "The keyboard is
already shared."

## Minor

**M1. Touch is not covered by `silence`.** `Input.silence()` promises "what is down then does nothing until let
go", and `pause()`/`resume()` and a capture rely on it. On release the input clears the keyboard and masks the pads
(`input.ts:278`), but a finger still on a touch button acts the moment the game is back. *Fix:* give `Touch` a
`mask()` (held buttons count only after their finger lifts) and call it beside `keyboard.clear()`; test: a finger
held on Jump through `pause()`/`resume()` does not jump until lifted and pressed again.

**M2. A trigger can count before half travel.** `readPad` holds a button when `pressed || value >= 0.5`
(`gamepad.ts:50`), which is the plan's words, but a browser that marks a trigger `pressed` at a lower value decides
for itself, and the 0.5 never applies there; the comment "as browsers count it" says otherwise. The plan's intent
("triggers pressed from half travel") is met only where `pressed` comes later than 0.5. *Fix:* for `l2` and `r2`
read `value` alone; keep `pressed || value` for the other buttons. Test: `l2` with `pressed: true, value: 0.2` holds
nothing.

**M3. `rebind`'s reason for a name that is not a gamepad button is `reserved`.** `bindings.ts:216` answers a pad
name outside `PAD_BUTTONS`/`PAD_STICKS` with `reason: 'reserved'` and "That is not a button on a gamepad. Pick another
button." The words are right; the reason is not, and a screen that switches on `reason` will say "kept for menus".
*Fix:* add `'unknown-input'` to `Rebound`'s reasons (update the API report); test it.

**M4. `settingsOf` compares a shared keyboard's keys flattened.** `bindings.ts:178` compares `shared.flat()`, which
cannot tell `[["A","B"],["C"]]` from `[["A"],["B","C"]]`. `rebind`'s "other half" refusal keeps a key from crossing
halves, so it cannot happen today, but a change that moves keys between halves would not be saved. *Fix:* compare
the two halves (`same(was.shared?.[0], now.shared[0]) && same(was.shared?.[1], now.shared[1])`); a unit test with
controls built by hand.

**M5. `ListedPad` is in the public surface but cannot be imported.** `Input.pads()` returns `readonly ListedPad[]`
(API report line 917), but `input.ts` does not export the type. *Fix:* `export type { ListedPad } from './pads.ts'`
from the input entry, and update the API report.

**M6. The two copies of the control checks are compared on one case.** `controls.ts`' `checkControls` and
`tuning.ts`' own check say the same sentences by design (plan C), and `controls-tuning.test.ts` shows they agree on
one clash (two actions on `KeyA`). The other eight sentences of Task 1 could drift apart unseen. *Fix:* one table of
the Task 1 cases (each a list of `TuningControl`s and its sentence), run through both `parseContent('tuning', ...)`
and `controlsFromList`, expecting the same message from each.

**M7. The two-player layout test never checks that there are two players.** `layout.browser.test.ts` calls
`game.addPlayer('keyboard')` and goes on without looking at the answer or at a second hero, so a join that failed
would still pass it. *Fix:* expect the answer's `ok` and, after the frames, `game.players()` to be `[1, 2]`.

**M8. A pad the game cannot read arrives without anyone being told.** `Pads.onChange` fires only when the set of
*usable* pads changes (`pads.ts:50`), so a pad with no standard mapping appears in `input.pads()` without
`onSeats` (or anything) firing; a screen that says "This gamepad cannot be used here" (Review Focus 5) only finds out
by asking. *Fix:* key the change on every listed pad and whether it is usable; test that `onSeats` (or a new
`onPads`) hears a non-standard pad arrive.

**M9. The browser's pads are read many times a frame, and the seats and the buttons from different reads.** One
`poll` calls `getGamepads` through `pads.read()` twice and through `seats()` (via `pads.list()`) three more times;
the frame callback does as many again. Besides the cost, `poll` works out the seats from one reading and what is
held from another. *Fix:* take one snapshot per `read()` and per `poll`, and derive the usable list, the seats and
the held inputs from it.

**M10. "This level has room for 1 players."** The `no-start` sentence (`players.ts:76`) is built from the number of
start points, and with one it reads wrong. `loadGame` refuses such a level, so only hand-built content reaches it.
*Fix:* "This level has room for one player." when there is one start point.

## Process (nothing to fix in the code)

- **No red-first pushes.** Each task pushed its tests and code together, so no CI run shows a task's tests failing
  for the reason the plan names. The tests read as tests of the right thing (each was checked against the plan's
  list above), but the proof the workflow asks for does not exist. The next execution should push the tests alone
  first, as "How every task is verified" says.
- **Hand changes inside a merge commit.** `9944c63` (main into the input branch) holds, besides the conflict
  resolution, the `| undefined` on `Control.pad` and `Control.shared`, and the new `controls-tuning.test.ts`.
  Compared with git's own merge of its parents, the resolution is right: plan I's start-point check was moved into
  plan C's per-file loop with the same sentence, and both sides' tests were kept. The two extra changes are right
  too, but belonged in their own commit, where a reader looks for them.
- **The two `game.browser.test.ts` changes are accepted.** The input now asks for frames all the time (to read pads
  for menus while the game is held), so "no frame is pending" can no longer be true. The new assertion, that the sim
  does not tick over five frames, is what the test was for. The plan said the file would be unchanged; it could not
  be.
- **Files the plan did not list:** `input/invite.ts`, `input/use.ts` and `game/players.ts`, each one job, which
  keeps `input.ts` and `game.ts` short; `Pads.leftStick`, `CaptureAnswer` and the extra sentences are additions the
  build reported. None changes a contract another plan relies on.
- **`main`'s own run for `2aa020b` was cancelled** by the next push (`3766786`), so `main` was first checked whole at
  `5af8f74` (run 43580338793, in progress as this was written). The PR's run on `eb7e32e` was green in every job.

## Notes for other plans

- **N1 (plan U, plan D: a game with more than one level).** The join plugin's `level` and `players.ts`' list of
  start points are fixed when the game starts. When a game moves to another level, a player who joins there is put
  at the first level's start point. Whichever plan adds moving between levels makes both follow the open level.
- **N2 (plan U).** `onMenu` hears every usable pad all the time, playing or not: a `south` that jumps is also an
  `accept`. Listen only while a screen of your own is up, as the plan says.
- **N3 (plans K and V).** `InputSettingsSchema`, `applySettings`, `checkControls` and `controlsFromList` are pure but
  reach only the page entry, since `input` is a page feature. If a Node tool (the `automata` command checking a
  saved settings file, say) needs them, the pure files move to a headless feature first.
- **N4 (code comment).** The invite's "not the pad the first player used last" works because the input's frame
  callback runs before the loop's step in every frame (it asked first, and both ask again in the same order). If the
  loop ever polled first, the joining press would count as the first player's and the invite would refuse it. A
  comment at `input.ts:220` saying so would stop someone reordering it.
- **N5 (plan N).** Plan audit N4 still stands: a client's own `Sequence` does not learn the seq numbers the room used
  for its `join` and `leave`.

## The fixes, in order

1. I1: `addPlayer` never gives a number whose hero is still in the sim; the two tests.
2. I2: "taken" comes from the input's seats and the queued joins; the two tests.
3. M1: touch is masked when silence ends; the test.
4. M2: `l2` and `r2` by value alone; the test.
5. M3: `unknown-input` reason; the test; the API report.
6. M4: `settingsOf` compares each half; the test.
7. M5: export `ListedPad`; the API report.
8. M6: one table of control sentences through both checks.
9. M7: the layout test checks the second player.
10. M8: a change of any listed pad is announced; the test.
11. M9: one snapshot of the pads per read and per poll.
12. M10: "room for one player".
13. N4: the comment on frame order.

Each is small and in `src/features/input/`, `src/features/game/players.ts` or the tests; no golden moves. Fixes 1 to
3 come before plan U builds its pause and "Add a player" screens on these calls.

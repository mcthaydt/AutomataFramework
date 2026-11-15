# Plan U (the default game flow): implementation audit

Stage 5 of Cycle 7, 2026-11-15. The build is pull request 123 (branch `claude/plan-u-flow-b`, head `0f975a0`, merged to
`main` as `79f725d` while this audit was being written), with part A before it (pull request 110), against
[`plans/2026-11-15-game-flow.md`](../plans/2026-11-15-game-flow.md), its [plan audit](2026-11-15-plan-u-plan-audit.md),
and the spec ([`specs/2026-11-14-m2-design.md`](../specs/2026-11-14-m2-design.md), "UI, screens and layouts (plan U)",
with the flow's order from [`specs/2026-11-14-no-default-language-design.md`](../specs/2026-11-14-no-default-language-design.md)).
Done with the project's audit prompt: "Audit all of your work for completeness, consistency, cohesion, and harmony, both
within itself and relative to the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any
incomplete implementations or incomplete integrations. Do your best work."

Nothing was run here: this stage read the diff, the code it touches, the tests and the CI run of `0f975a0` (run
43675606540). Every check on that head is green: `check`, `package`, `engines` (Chromium, WebKit, Firefox), `online`,
`create-pack`, `create-play`, `create` on three systems, `screens` and `commit-authors`. The `screens` job put 375
pictures under `ci-screens/pr-123/`, the flow's at five sizes in three engines among them.

**Verdict: sound, with six important fixes.** The shape is the plan's: three page features in the planned layer order
(`ui`, `screens` below `game`, `flow` above it), one pure `advance` that owns every rule of the flow, screens that are
replaceable functions over a Svelte kit compiled into the framework's files, and words that all come through the
library (the grandma and word-scan tests hold both). No golden moved: no file under `tests/golden/` or
`template/replays/` is in the diff, and the four new `automata.toml` fields stay out of what the sim is given. The
important findings are one planned behaviour that is missing (a hidden page does not pause the flow), one that is wrong
(taking over watch mode always starts a new saved game), and four tests the plan names that are missing or stop short.
No Owner question.

## Findings

Sorted by weight. Every fix is for stage 6 (Sonnet, high effort), as one pull request; none moves a golden.

| # | Weight | Finding | Fix |
|---|---|---|---|
| I1 | Important | **A hidden page does not pause the flow.** The builder's call 8 says pause is also "the page leaving the screen", and "a game paused because the page left stays paused until the player presses Keep playing". Review Focus 2 is that case on a phone mid-jump. Nothing in `src/features/flow/` listens to `host.onVisibility`: `game.ts`'s `sync` only stops the loop while hidden, so the flow stays `playing`, no pause screen is shown, and the game runs again the moment the page comes back, under a thumb that may no longer be there. The test the plan names ("the page is hidden in the middle of a jump: paused, nothing held when it comes back, and the first tap presses Keep playing and does not jump", Task 11) is not in `pause.browser.test.ts` or anywhere else. | In `startLevel`, add `host.onVisibility((visible) => { if (!visible) dispatch({ type: 'pause' }) })` to the `off` list, so it is let go with the game. Add the plan's test to `flow.browser.test.ts` with `testHost().hide()` while a jump key is held: `data-state` is `paused` and `game().paused()` is true; after `show()` it is still `paused`; the first tap on "Keep playing" resumes and the hero's jump count is unchanged. `flow.ts` is 576 lines, so move `startLevel` (and its listeners) to its own file, `flow/level.ts`, first. |
| I2 | Important | **Taking over watch mode always starts a new saved game at the first level.** The builder's call 13 says a tap goes "straight into the main menu's first action", and `FlowFacts.first` is "the level the main menu's first action opens". With a saved game that action is Continue. The build sets `first` to `project.start` (`flow.ts`, `facts`), and `startLevel` calls `places.begin()` whenever no progress is open. So a returning visitor who taps the demo's watching game on the Site is put back at level 1 in a new place; the third time every place is taken, `begin` finds none, and the done screen tells them "This browser did not keep your progress.", which is not true. | Read the places before `loaded` is raised (`await places.refresh()` in `boot`), and let `facts().first` be the newest saved game's level when there is one (as `places.openNewest()` would answer), else `project.start`. In `startLevel`'s take-over branch call `places.openNewest()` in place of `begin()`. Test in `flow.browser.test.ts`: two games saved, `?watch`, a tap goes to `playing` at the newest game's level, and the places are unchanged (no third game). |
| I3 | Important | **The flow's sound is never tested, and the fixture says it is.** `tests/fixtures/flow/game.ts` opens with "a cue for each screen the flow raises", but the game it makes has no cues file. So `createAudio` over the flow's content, `wireSound`, the `screen.menu`, `screen.pause` and `screen.done` events, and Settings' sliders inside the flow are never run together. Task 13's test "the menu, pause and done screens raise screen.menu, screen.pause and screen.done in the cue log" is missing, and the touch journey (Task 17) turns Swap sides on in place of "turn the music down" and checks it is "still on" in place of "music still low". Only `show.browser.test.ts` checks the `ui.*` events, on one screen. | Give the fixture a cues file with one cue for each of `FLOW_EVENTS`, and a `speaker` option the tests fill with a fake that logs what it is told. Add the Task 13 test (the three `screen.*` events, in order, once each). In `journey-touch`, turn the music down in Settings from pause, and on the returning visit check the speaker was given that volume before the first sound. Fix the fixture's opening comment to say what the game has. |
| I4 | Important | **Watch mode's take-over is proven only as far as the picker.** The plan's test is "a tap on a first visit shows the flags, then the level, never the splash or the menu". `flow.browser.test.ts` stops at `picking`, so the second half of builder's call 13 (the splash and the menu are skipped once, then the visit is ordinary) is not held by anything; a change to `advance`'s `taken` would stay green in the browser. | Extend the test: choose a flag, press Go, and expect `playing` at the first level, with the steps heard by `onState` being exactly `watching, picking, playing`. Then leave from pause and expect `menu` (and on the next level-done, `taken` is false). Once I2 is fixed, the same test with a saved game covers it. |
| I5 | Important | **The players fix the build reported has no test.** Deviation 2 (the gamepad that opened "Add a player" does not join itself) is in `overs.ts` (`navigating`), but the plan's test for it, "player 1's own gamepad pressing Done does not join as player 2" (Task 16), is missing. `journey-pad` cannot catch it: if pad 0 joined, "Player 2 is in." would still show, pad 1 would be refused as full, and `players()` would still be `[1, 2]`. | Add the plan's test to `players.browser.test.ts` (flow): pad 0 opens Add a player with its bottom button, lets go, presses its bottom button on Done; the menu is back, the party is player 1 alone (`flow.game()` is undefined, so read it from the next level's `players()`), and "Add a player" is still offered. In `journey-pad`, also check that player 2's claim is `pad-1`. |
| I6 | Important | **The turning journey failed three times in Chromium and its cause is not known** (deviation 1). The build added a `window` `resize` listener to `Frame.svelte` and the test then passed, but the frame's own comment says it measures "never the window", the tracker calls the failure a possible flake, and the same class of failure (a wait on a `ResizeObserver` after a turn) was plan H's I5. A failure that passes on retry is a defect to find. | Keep the listener only if it is the fix, and say why in its comment: in the frame test, turn the viewport and expect `data-height` to be `short` without any `resize` event (remove the listener in that test with a frame that fills a fixed-size box resized by style, which only a `ResizeObserver` hears). If that fails in Chromium alone, the window listener is the fix and the comment names the Chromium behaviour; if it passes, look for the real cause in the journey. Either way, drop the diagnostic counters from `journey-sizes` once it is understood, and record the second sighting rule in the tracker. |
| M1 | Minor | The pause button sits at `max(12px, env(safe-area-inset-*))` (`Hud.svelte`), not "12 px in from the top corner plus the safe area" as the plan says. On a notched phone held sideways the button touches the notch's edge. | `calc(12px + env(safe-area-inset-top))`, and the same for the side. |
| M2 | Minor | A game whose rules throw shows the thrown message (`error.message`, like a JavaScript type error) as a line under the player's words (`fail` in `flow.ts`). The plan gives `lines` to a game's bad files and an `ArtError`'s sentence; a rule's error is for the console, which already has it (the loop throws it again). | In `fail`, pass `lines` only for errors whose sentence is written for a person (`ArtError`, `startGame`'s own), and nothing for an error from `onBroken`. The test "a game whose rules throw" then checks that "the rules broke" is not on the screen. |
| M3 | Minor | The splash's picture is never read in a flow test: the fixture names no `splash` figure, so `paintedPath` and `readPicture` in `boot` (and the fallback to the name when the read fails) only run in the screen's own test, with a `Blob` handed in. | `splash = "hero"` in the fixture, with a `readPicture` that answers a small PNG, and one test: the splash shows an image named the game's name; with a `readPicture` that throws it shows the name as a heading. |
| M4 | Minor | Plan H's hint counts are still kept only for the page's life. The plan's "Not covered" asked the builder to report it if plan H gave no way in and out of its `Input`; plan H has none, and neither the tracker nor the build's report says so. | One line in the tracker's plan U row, and a handoff to plan H's fix stage: give `Input` a way to read and set its hint counts, and the flow keeps them in a `hints` section. |
| M5 | Minor | `journey-pad`'s "both reach the door" ends the walk when the level is done, which one hero is enough for; `journey-sizes`' turning test turns the phone on three screens, not every screen, and its `look` checks only that the page does not scroll, not that "nothing scrolls outside a list". | Check that both heroes are past the door's left edge when the level ends. Turn the phone on the warnings, saves, players and done screens too. In `look`, check that every element with `scrollHeight > clientHeight` and `overflow` `auto` or `scroll` is a `List`. |
| M6 | Minor | Settings names no main button, against the plan's grandma rule that every screen but the splash and the hud has exactly one. The build's ruling (in the tracker) is sound: Settings is a list with Back, and there is nothing to choose between. | None to the code. Write the ruling into the plan's Task 17 line, so the next reader of the plan does not take it for a gap. |
| M7 | Note | Deviations 3 to 6 are as reported and are right: the three journeys read what a person sees now (Continue in place of Play once a game is saved, no "Next level" after the last level, a question's two buttons side by side); the word scan catches the two one-part keys `automata.back` and `automata.keep`; plan G's merge kept `tune` and `onStep` side by side in `game.ts` and the API report matches the `package` job; the Firefox switch test waits for the press. | None. |

## Checked, and right

- **The layers.** `LAYERS` is `…, 'locale', 'web', 'ui', 'screens', 'game', 'flow', 'cli'`; `ui` and `screens` are page
  features; only they hold `.svelte` files or import `svelte` (`svelte-in-its-place`, `CONFINED`), each with a test in
  `rules.test.ts`; `screens` takes structural types, never the `Game`. `svelte` is a dependency at 5.57.1, the two tools
  development dependencies at the approved versions. The plan audit's I6 (does `svelte-check` get TypeScript 6) is
  answered: an override does not reach a peer, so `.pnpmfile.cjs` makes it a dependency on 6.0.3, said in `CLAUDE.md`.
- **The steps.** `steps.ts` is the plan's table row for row, with `enter` as one function; every row and the six walks
  are tested, including "the very same object" for an event that means nothing. `flow.ts` dispatches only through
  `advance` and drops late answers by `epoch`.
- **No default language and the words.** No `'en'` in `src/`; the 74 keys are in all six files, the English is the
  table's, every button word is at most four words, and every key written in `src/` is in the library and every key in
  the library is written (`library.test.ts`). The warnings speak the device's language before the picker (Q2), with
  `lang` set.
- **The edges the plan named.** The door touched twice and again under the done screen gives one done screen and one
  save (Review Focus 5); a crate on the door ends nothing (`endsLevel`, audit I7); a held button that opened a screen
  presses nothing (Review Focus 4); a turned phone keeps the focused slider (Review Focus 3); a store that refuses still
  plays and says so (Review Focus 1); `stop()` during each `await` leaves the mount empty.
- **Touch first.** Every screen is tested at the five sizes for 44 px controls and a 48 px main button, and
  `journey-sizes` does it again on the real flow with a picture of each; the pause button is outside the thumbs and
  never walks or jumps; Escape is heard capturing on the window, so the Escape that resumes does not pause again.
- **The public surface.** `startFlow`, the kit's parts (the frame as `ScreenFrame`, since `content` has a `Frame`) and
  the screens' functions are on the browser entry only; `levelOrder` and `nextLevel` on the headless one; the README's
  "Screens and the flow" and both skills say what the plan asked, held by their tests.

## Progress

Stage 5 done: six important fixes and six small ones for stage 6, which also writes the tracker's stage 5 and 6 rows.

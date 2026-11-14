# M2 plan S (audio): implementation audit

Stage 5 of the workflow, for the code of [`plans/2026-11-14-m2-audio.md`](../plans/2026-11-14-m2-audio.md) as merged
in PR 61 (`b3f5e97`, branch head `033ae4e`), against that plan, its [plan audit](2026-11-14-m2-audio-plan-audit.md)
(PR 59), the [M2 spec](../specs/2026-11-14-m2-design.md) ("Audio (plan S)") and the build's report of four deviations.
The coordinator also asked for the cause of one failure of the `online` journey on `f1517a9`. Written 2026-11-14.

**Verdict:** the build is sound and close to the plan. All eleven tasks are there, and every finding of the plan audit
is in the code: I1 the golden is on `tests/fixtures/audio/sounding-game.ts`, I3 an online game hears one step at a
time (`Advance.steps`) and calls `begin()` after a sync, I4 a landing is the first still tick after a falling one, I5
page sounds are not counted, a waiting sound is, and a page event before any step is tick 0; M1 `hear` is given only
`tick` and `events`, M2 the `1e-9`, M3 `B#8` and `Cb0`, M4 the holds, M6 `SCREENS` and the generic `openPage`, M7 the
static mount, M8 `audio` in `PURE_FEATURES`, M9 the replay test and the doc comment, M10 the smoke over the full game.
`audio` reads only each event's `type`, holds no clock but its speaker's, and is above every sim feature in `LAYERS`.
No critical fault was found. Two important ones were: the `online` journey's flake is real, and comes from the
session's rollback count, not from the network; and the sound journey proves less than the plan asked of it. Four
minor ones are noted. No question for the Owner.

How it was checked: the plan, its audit and the whole diff of PR 61 (`b3f5e97^1..b3f5e97`, 61 files) were read:
every file under `src/features/audio/`, `web/speaker.ts`, `voices.ts`, `notice.ts`, the changes to `game/game.ts`,
`game/online.ts`, `level/game-sim.ts`, `level/sim-content.ts`, `net/session.ts`, both entries, `rules.ts`,
`scripts/api-report.ts`, every new test and fixture, and `tests/golden/sounding.json`. `input/touch.ts` was read for
how it and the notice share the mount's `position`. For the flake, the failed job's log (job 132443000203) was read,
with `net/session.ts`, `net/protocol.ts`, `net/room-engine.ts`, the journey and its page. Nothing was run here.

## The coordinator's points

- **Task 1 drops sound, music and cue entries from `project.content`** (the plan L audit's C1). It does:
  `simContent` filters `project.content` by type as well as leaving out the three maps, and gives back the same object
  only when there is nothing to drop. `listing sound, music and cue files moves no hash and keeps every other file
  listed` proves it in four engines. Every path to a `contentHash` goes through `createGameSim`.
- **`session.advance` returns `steps`.** It does, beside `events`: one entry for each tick predicted for the first
  time, its own tick (the tick after the step) and its own events, never the ticks a rollback steps again. The new
  session test holds the ticks to `1, 2, 3, …` and the flattened steps to `events`. `startOnlineGame` calls `hear` once
  per entry, and `begin()` when the session's `syncs` count has moved, which is right because a sync arrives between
  advances (in the link's `bytes` handler), never inside one.
- **`tests/golden/sounding.json` is new**, recorded in CI (`5eb0595`, `2af8f8d`) and moved once inside the PR by
  `f1517a9`, whose message names it, when the project's list of audio files left the hash. No golden on `main` moved.
  Its log reads as the plan says: the music at tick 0 from the page, then jump 11, land 60, jump 121, land 170, none
  skipped.
- **The four deviations.** All accepted. (1) The online sound test drives `startOnlineGame` with a stub session in its
  own file, `tests/features/game/online-sound.browser.test.ts`, not in plan N's test: it proves the wiring the plan
  asked for (two jumps in one advance are two entries on their own ticks; a sync lets ticks be heard again; the
  button). (2) Task 9's browser tests use the sounding game, which the plan allowed either way. (3) The API report was
  brought up to date from the CI log, through a new printer in `scripts/api-report.ts` that lists the lines to take out
  and put in; nothing was typed from memory, and the report is checked on every pull request. (4) Firefox with no
  sound card: see I2.

## The flake: "rollbacks in the pair: expected 0 > 0"

**Cause.** The failed pair was WebKit at 1180x820 and Firefox at 1280x720; the log shows the Firefox page had no
WebGL ("Exhausted GL driver options"), so it drew on the slower path. `advance` confirms every room tick waiting
(`confirmWaiting`), and only then counted a rollback, and only `if (was > confirmed.tick)`: if the page's guess was
still ahead of what the room had confirmed. A page predicts only `lead` ticks ahead (2 at the start, 1 after five calm
seconds). When one of its frames takes longer than that, the room's ticks arrive in a batch bigger than the lead, so
`confirmed` ends past `was` and the correction is never counted, even when the room's commands for a tick the page
had already guessed were not the ones it guessed. On a page that slow every correction goes uncounted, and neither
page of the pair counts one. So the count was wrong, not the game: the pictures were put right, but `stats()` said
none were. The journey then asked of real timing what only the count could say.

**Fix** (below, I1): a rollback is counted when the room's commands for a tick the page had guessed (it is in
`predictedAt`) differ from the guess, whatever the batch then does to `confirmed`. This counts every case the old rule
did, and the ones it missed; no existing session test changes. And the journey no longer leans on frame timing: the
friend's page in each pair has a slow line (`?late=250` on the page fixture holds each key back a quarter of a second
before it is sent), so the room puts the friend's first keys on later ticks than the friend's page guessed, and the
journey asks the friend's page for a rollback. A new session test, red on the old count, has a page that advances only
every third tick.

## Critical

None.

## Important

**I1. The session's rollback count misses every correction on a page slower than its lead** (the flake above). A
`SessionStats.rollbacks` of 0 on a page that was put right many times is a wrong answer to a debugging tool and to the
journey. *Fix:* count a guess the room put right, as above; a session test with a page that advances every third
tick; the journey's friend on a slow line, and the check asked of the friend's page.

**I2. The sound journey proves less than the plan asked.** Task 10's `sound-journey.browser.test.ts` was to show, with
the real speaker, the button, a real tap, the sound on, the real clock running, `meadow` wanted and a held jump key in
the cue log. On `main` it shows the button, a real key, and that the button is there exactly while the state is not
`on`. In Firefox, where the runner has no sound card and the state stays `waiting`, that last check holds whether or
not the key did anything, so nothing about the game's sound is proved in that engine. *Fix:* in every engine, after
the key, the track `meadow` is wanted, a real jump key held for ten frames puts `hero.jumped` in the cue log as a
played sound, and nothing in the log was skipped; where the state is `on`, `speaker.now()` passes 0.05 (the real clock
runs). The cue log fills whatever the device, so Firefox now proves the game hears its own jump through the real
page. The engine is still picked by name for the "has ears" wait; see M1.

## Minor

- **M1. "Has ears" is decided by the browser's name.** The journey waits for `on` everywhere but Firefox. A Firefox
  runner with a sound card would wait a second and pass on `waiting` too, and a Chromium runner without one would
  fail. It is honest about today's runners, and the plan's stop rule ("do not swap the real speaker for a fake")
  rules out the seam that could tell. *Noted*, not changed: when the runners change, this line is the one to read.
- **M2. No pointer tap in the journey.** The plan's journey tapped the canvas (`userEvent.click`); the build moved to a
  letter key (`da41bfe`), which every engine counts as a gesture. `pointerdown`, `pointerup` and `touchend` are each
  proved on the speaker through its seams (`speaker.browser.test.ts`), so the path is tested, but not end to end with
  a finger. *Noted for plan D*, whose demo journey taps the game on a phone and should see the button go.
- **M3. A sync lets a tick already heard sound again.** `startOnlineGame` calls `begin()` after a sync, as the
  contract says, so a jump on a tick heard before the sync and stepped again after it is played twice. It is rare (a
  sync follows a desync, a long stall or a hole in the room's ticks) and the cue log says so. *Noted*, as the plan's
  call.
- **M4. Online, `level.started` is raised while the room still waits for a friend**, so the level's music plays under
  "Waiting for 1 more player". *Noted for plan U*, whose waiting screen can stop it (`audio.stop()`) and raise its own
  page event when play starts.

## Notes

- The notice and the touch buttons share the mount's `position`. `createTouch` runs when the input is made, before
  the notice, so the notice always finds the mount positioned and never changes it back under the buttons. A game
  that calls `soundNotice` by hand on a mount that later gets touch buttons would see the notice give the mount back
  to `static` when it goes; nothing does that today.
- `soundingHeroPlugin` keeps one "falling" flag for all heroes, which is right for its one-hero game and wrong for
  two. It is a fixture; plan D's hero should keep it per hero.

## Fixes

Each test was pushed red first, then the code.

1. `tests/features/net/session.test.ts`: `a page whose frames are longer than its lead still counts the guesses the
   room put right` (red on the old count). `src/features/net/session.ts`: `confirmWaiting` also says whether a tick
   the page had guessed was put right, and `advance` counts a rollback on that (I1).
2. `tests/fixtures/online/page/main.ts`: `?late=<ms>`, a slow line that holds each key back. The online journey opens
   the friend with `&late=250` and asks the friend's page for a rollback (I1).
3. `tests/features/web/sound-journey.browser.test.ts`: `meadow` wanted, the real clock running where the sound is on,
   a real jump key in the cue log, nothing skipped (I2).

None moves a golden, and nothing exported changes, so the API report does not move.

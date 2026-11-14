# M2 plan S (audio): plan audit

Stage 3 of the workflow, for [`plans/2026-11-14-m2-audio.md`](../plans/2026-11-14-m2-audio.md) as merged in `d21642d`
(PR 57), against the [M2 spec](../specs/2026-11-14-m2-design.md)'s "Audio (plan S)", the `sound`, `music` and `cues`
row of its content table, "Goldens" and "Testing", the code on `main` at `d21642d`, and the other M2 plans as they
stand: C (content, built and fixed), I (input, built and fixed), V (saves and the host, built and fixed), P (joints
and touch, planned and audited; being built on its branch, its goldens recorded there), N (networking, planned and
audited; being built on its branch) and A (art, planned and audited, PR 56), with plan T (story) as written on its
branch. Written 2026-11-14.

**Verdict:** sound, and ready for stage 4 with the fixes below applied (they are in the plan). The central call holds:
`audio` sits above `level` in the layers and is handed `{ tick, events }` after a step, so nothing it does can reach
the sim, and Task 1 makes "sound never moves a hash" true for the files too. The ordering the coordinator asked
about no longer exists: plan A's own audit took `sprites.json` off the full game. No critical fault was found. Five
important ones were: a golden recorded on a game every later plan grows, a landing the fixture would hear in mid-air,
three rules the cue log's determinism rests on and the plan leaves unsaid, the online game left out, and a stop rule
about plan A that is out of date. Ten minor ones are fixed or noted. No question for the Owner.

How it was checked: the plan was read whole. On `main`, these were read for every call the plan makes:
`src/features/level/game-sim.ts`, `join.ts` (its `ctx.content` read), `src/features/sim/create-sim.ts` (how
`contentHash` is made from the canonical content, `StepResult`, `SimEvent`), `src/features/commands/play.ts` and
`recorder.ts` (`content-changed`), `src/features/game/game.ts` and `watch.ts`, `src/features/content/` (`load.ts`'s
`GameContent`, `sound.ts`, `music.ts` with its `NOTE` pattern, `cues.ts` with its two checks), `src/features/saves/
settings.ts`, `src/features/host/host.ts` and `test.ts`, `src/features/input/touch.ts` (how the touch buttons
position themselves), `tests/architecture/rules.ts` (`LAYERS`, `PURE_FEATURES`, `PAGE_FEATURES`, `IMPURE`),
`tests/fixtures/full-game/` (all four audio files and `automata.toml`), `tests/fixtures/game/` (`hero.ts`, the
level, `script.ts`), `tests/fixtures/saves/open-page.ts` and `page.ts`, `tests/fixtures/golden.ts`, every golden,
`tests/public-surface.test.ts`, `tests/install/smoke.mjs`, `vitest.config.ts`, `package.json`, `tsconfig.json` and
`ci.yml`'s `package` and `ci-screens` steps. On the branches: plan N's `src/features/net/session.ts` and
`src/features/game/online.ts`, plan P's `tests/fixtures/playground/automata.toml` and its two goldens, plan N's
`online-two-players.json`, and plan T's plan (its `story.json` and story fixture). Plans A and N and plan A's audit
were read for what they hand this plan. The numbers in the tests (meadow's 16 notes and 11 hits, 4.8 s, the 0.15 s
step, `jump` 9 ticks and `land` 8, the music window's first voices, 88 zero crossings) were worked by hand. Nothing
was run.

## The coordinator's questions

- **Task 1, and its order against plan A's `sprites.json`.** The fix is sound; the order is no longer needed. Today
  `createSim` hashes the canonical form of all the content it is given, so one number in `jump.json` moves every hash
  of that game. Task 1 narrows only the copy `createGameSim` hands to `createSim`: `spawnLevel`, `startGame` and the
  players keep the whole content, and the one sim system that reads `ctx.content` (`join.ts`, for `heroParts`) reads
  levels and characters only. No content kind on `main` (cutscene, conversation, feel, behaviour) names a sound, so
  no sim system will miss the three maps. Every path to a sim's `contentHash` (`startGame`, `watchReplay`, the
  recorder's replays, `verifyReplay`, plan N's room and its version check) goes through `createGameSim`, so all of
  them agree. A game with no audio file gets its own content object back and hashes as before, so Examples' two
  goldens and the four here do not move. The ordering: plan A's audit (I4) moved `sprites.json` from the full game to
  `tests/fixtures/game/sprite-game.ts`, the M1 game with a figure, which lists no audio file. Every other sim golden
  on `main` or recorded or planned on a branch was checked against its game's `automata.toml`: `push-crate`,
  `co-op`, `physics-scene`, `bounce`, plan P's `joints-scene` and `playground`, plan N's `online-two-players` and plan
  T's `story`. None lists a `sound`, `music` or `cues` file. So Task 1 may land in any order. The stop rule in "Before
  starting" still named plan A; it now says how to check, and what was found (I2).
- **The plan's other calls.** All three stand. (1) Taking the audio kinds out of the sim's content changes plan C's
  "all content is hashed" only for games that list them, and is the only way the spec's sentence can be true; one
  consequence is now written down: plan N's version check lets two players whose sound files differ share a room,
  which is right. (2) The framework drawing "Tap to start the sound" until plan U takes it over is right: the spec
  says audio "says so ... rather than staying quietly silent", and plan U is not built. (3) Music playing on through
  a pause by hand is a fair default for a framework, and plan U's pause screen can call `audio.stop()` or raise a
  page event if the Owner wants it quiet there. Skipping the newest sound over a limit, counted in ticks, is what
  keeps the cue log the same in every engine. Three rules that claim depends on were unsaid (I5).
- **Audio never affects the sim or the goldens.** It holds, by construction and by test. `audio` is above `level` and
  every pure feature in `LAYERS`, so the architecture check refuses an import of it from the sim's side; `hear` is
  given a step that has already happened and reads only `type`; Task 1 keeps the files out of `contentHash`; Task 10
  runs the same run with and without audio in four engines and replays it. Two gaps are closed: `startGame` handed
  `hear` the whole `StepResult`, so the type test proved less than it says (M1), and nothing enforced "the speaker's
  clock is the only clock" (M8). The one new golden, `sounding.json`, is now on a game of its own (I1).
- **Are the end-to-end tests adequate?** Yes, once I1, I3 and I4 are applied. The journeys use the real
  `webSpeaker()` with no seam and a real tap or key in Chromium, WebKit and Firefox at five sizes; a fresh frame proves
  a volume survives a new page; the packed package plays a sound in Node; the button is pictured at five sizes for the
  drunk-grandma check. The paths a real browser cannot be made to take on demand (no `AudioContext`, a phone call
  taking the sound, the page hidden) are tested against a fake context through the speaker's seams, which is the
  right place. What was missing: an online game hears nothing (I3), and the sounding fixture would have recorded a
  landing in mid-air into the golden (I4).
- **No new dependency.** None. Web Audio is the browser's own, its types come with the `DOM` library `tsconfig.json`
  already names, and the plan's tools are the ones in `package.json` at the versions it gives.

## Critical

None.

## Important

**I1. `sounding.json` would be recorded on the full game, which every later plan grows.** Tasks 9 and 10 play the
sounding run on the full fixture game. That is plan A's I4 again: plan A changes the full game's level, hero, keeper
and tileset, and plan T makes its critter's behaviour and its cutscene run. Each would move the run's hashes and its
landings, so `sounding.json` would need the Owner's before and after for changes that have nothing to do with sound.
*Fixed:* a sounding game of its own, `tests/fixtures/audio/sounding-game.ts`: the M1 game's files with the full
game's `jump.json`, `land.json`, `meadow.json` and `cues.json` added and listed. Thanks to Task 1, only
`soundingHeroPlugin` and the M1 level can move it. The browser tests that are not goldens may keep the full game.

**I2. The stop rule about plan A is out of date.** "Before starting" said Task 1 must merge before plan A records
`sprites.json` from the full game, and to stop if it had. Since plan A's audit, `sprites.json` is not on the full
game, so the rule would have the executor watch for something that cannot happen, and miss the general case. *Fixed:*
the rule says how to check (open each golden's game and read its `automata.toml`), records what the audit found on
`main` and on the branches, and keeps the stop for any golden on a game with audio files.

**I3. An online game gets no audio, and plan N's `advance` cannot feed `hear` as written.** Task 9 wires `startGame`
only. Plan N's `startOnlineGame` (on its branch, `src/features/game/online.ts`) has its own loop. Its
`session.advance` returns one `events` list for every step it ran (`stepPredicted` pushes each fresh step's events
into the same array, up to `MAX_CATCH_UP` steps), with no tick. Handed to `hear` as one result, the sounds of several
ticks would be limited as one tick ("a sound starts once a tick") and logged on the wrong tick. The plan's note for
plan N says only that `hear` ignores a tick already heard. *Fixed in the contract:* `hear` takes one step at a time;
`startOnlineGame` takes `audio` and `soundNotice` as `startGame` does, raises `level.started`, calls `hear` once per
fresh step with that step's tick, and calls `begin()` after a `sync`; plan N's `Advance` gives the fresh steps one by
one (`steps: { tick, events }[]`). Task 9 builds it if `startOnlineGame` is on `main` by then, with a test that two
jumps in one `advance` are two entries on their own ticks; otherwise the coordinator hands plan N the paragraph. This
is sent to the coordinator, since plan N is being built now.

**I4. The sounding fixture would hear the hero land at the top of every jump.** `soundingHeroPlugin` is "the fixture
hero" with `hero.landed` "on the first tick it is on the ground after being off it". The fixture hero's ground test is
`Math.abs(vy) < 0.01` (`tests/fixtures/game/hero.ts`), and a jump's `vy` goes from -12 to 0 in 24 ticks of 0.5
(gravity 30 at 60 Hz), so at the top of a jump the hero is "on the ground". Task 10's test ("each jump followed,
later, by a landing") would pass with four landings, and the wrong log would be recorded as the golden. *Fixed:*
`hero.landed` is the first tick with `|vy| < 0.01` after a tick with `vy > 0.01` (falling; y points down); the plugin
replaces `heroPlugin` rather than sitting beside it, which the plan left open; a Node test holds exactly two jumps and
two landings, each landing at least 40 ticks after its jump; Task 10 asks for exactly two of each, alternating.

**I5. The cue log's determinism rests on three rules the plan does not state.** The plan says the cue log is the
same in every engine because "nothing in it comes from a clock or from whether the speaker was on". That is true only
if: page sounds do not count towards `MAX_SAME` and `MAX_SOUNDS` (a menu pressed at any moment would otherwise
decide which sim sound is `busy`); a sim sound asked for while the speaker waits still counts as playing (otherwise
the log depends on when the player tapped); and a page event has a tick when nothing has been heard yet (the golden's
first entry is `level.started` on a fresh audio, and the plan said only "the last tick heard"). *Fixed:* all three are
in "Facts the other plans may rely on" (page sounds are not counted; a waiting sound is; a page event before any step
is tick `0`), with a test each in Task 4, and Task 10's first entry says `tick: 0`.

## Minor

- **M1.** `startGame` was to call `audio.hear(result)` with the whole `StepResult`, so the audio would be handed the
  render delta and the rejected commands, and Task 10's type test (`hear` takes exactly `tick` and `events`) would
  not catch it, since TypeScript lets a wider object through. *Fixed:* `hear({ tick: result.tick, events:
  result.events })`.
- **M2.** A sound's length in ticks, `ceil(max(at + length) * tickHz)`, counts one tick too many for sums that come
  out a hair over (`0.1 + 0.2` is `0.30000000000000004`, so 19 ticks, not 18). It is the same in every engine, so it
  is not a determinism fault. *Fixed:* `- 1e-9` before the `ceil`; the full game's 9 and 8 ticks are unchanged.
- **M3.** The music schema accepts `[A-G][#b]?[0-8]`, so `B#8` (C9) and `Cb0` (B-1) are notes it lets through, and
  the plan's "`C9` is not a note" left them unclear. *Fixed:* every note the schema accepts has a pitch; a test for
  the two.
- **M4.** `=` after a rest, and a hold across the end of a row, were not defined. *Fixed:* `=` after a rest is a rest;
  a hold carries on into the next row; a test.
- **M5.** "Advance past 4.8" for the end of a track that does not loop: it ends at 4.85 (it starts at `LEAD`).
  *Fixed:* still wanted at 4.8, not at 4.9.
- **M6.** Two fixtures the plan leans on do not exist in the shape it uses. `SCREENS` is private to
  `layout.browser.test.ts`; `openPage` is typed and waits as a `SavesPage`; and the "sixteen sounds in all" test needs
  seventeen sounds, which `contentWithCues` (the full game has two) could not give. *Fixed:*
  `tests/fixtures/game/screens.ts`, `openPage<T>`, and `beeps(count)` with a `sounds` argument to `contentWithCues`.
- **M7.** The button is `position: absolute` in the mount, but only `input/touch.ts` makes a static mount
  `relative`, and only when it puts touch buttons in. On a desktop with no touch buttons, the button would be placed
  against the page. *Fixed:* the notice does what the touch buttons do, and the layout test places the mount away
  from the page's corner so the mistake would show; a test for the static mount.
- **M8.** "The speaker's clock is the only clock" and "no page API in `audio`" were held by care alone. *Fixed:*
  `audio` joins `PURE_FEATURES`, so the existing check refuses a timer, a clock, `Math.random`, `fetch` and `node:`
  imports there; a rules test. (`AudioContext` is not in `IMPURE`; the headless walk and review keep it out.)
- **M9.** Task 1 did not prove the contract's "`verifyReplay` does not answer `content-changed`" for a sound edit,
  and `createGameSim`'s doc comment still says all the content goes into the sim. *Fixed:* a test, and the comment.
- **M10.** The install smoke was to write three content files of its own, though the `package` job already copies
  the full game, with a sound and a cue for `hero.jumped`, into the smoke folder. *Fixed:* it uses the full game it
  has already loaded.

## Notes for other plans

These are not plan S's to fix, and are passed to the coordinator.

- **Plan D and the Site: a Play pressed outside the game's frame does not start its sound.** A tap on the Site's
  Play button is a user gesture in the Site's page, not in the game's frame, and the hand-over message carries no
  gesture. So after a hand-over by `{ automata: 'play' }` the game's button will say "Tap to start the sound" until
  the player touches the game. That is honest and needs no change here; plan D's journey should expect it, and
  whether the Site's frame should delegate autoplay is a Site question.
- **Plans L, T and the feel plan: two more presentation kinds are hashed.** Like sound before Task 1, `messages` and
  `feel` files are in every snapshot's `contentHash`, so a changed translation or a changed dust puff moves every
  replay of a game that lists them (plan T's `story.json` lists two messages files). Whether the sim reads either is
  those plans' call; if it does not, `simContent` is the place to leave them out.
- **Plan U: music during a pause.** The plan's default is that it plays on. Plan U's pause screen can quiet it with
  `audio.stop()` and start it again with a page event; nothing here stops that.

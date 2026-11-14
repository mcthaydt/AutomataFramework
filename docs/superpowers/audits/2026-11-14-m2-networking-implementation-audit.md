# M2 plan N (networking): implementation audit

Stage 5 of the workflow, for the code of [`plans/2026-11-14-m2-networking.md`](../plans/2026-11-14-m2-networking.md)
as merged in PR 44 (`4b685e0`, branch head `45d1e4f`), against that plan, its
[plan audit](2026-11-14-m2-networking-plan-audit.md) (PR 41, F1 to F10), the
[M2 spec](../specs/2026-11-14-m2-design.md) ("Networking (plan N)") and the build's report of eight rulings. Written
2026-11-14.

**Verdict:** the build is sound, tidy and close to the plan. All twelve tasks are there, Task 11 included; every
finding of the plan audit is in the code (F1 the `nextSeq`, F2 `create` and never `joinOrCreate`, F3 the beat
order, F4 the API report, F6 hiding lets go, F7 the input on its own seat, F10 the co-op seats); the golden
`online-two-players` was recorded once and has not moved; CI was green on `45d1e4f` (`check`, the three `engines`,
`package`, `online`, `screens`, `commit-authors`). There is nothing critical. Three findings are important: a page
whose line drops gives up after one failed try to get back in; a quiet room stops the local hero after a tick or two,
not after the two seconds the plan promises, and the test was loosened to fit; and the no-eval promise rests on the
order a bundler happens to put chunks in. Eight minor findings and six notes follow, then the fixes. Every one of the
eight rulings is accepted. There is no Owner question.

**How it was checked.** Every file the PR added under `src/` was read in full: `net/` (`protocol`, `link`,
`room-engine`, `session`, `colyseus-link`, `join`, `words`, `net`), `server/` (`room`, `room-server`, `process`,
`server`), `game/online.ts` and `src/server.ts`; the tests against the plan's list of test names; the fixtures
(`tests/fixtures/online/`), the journey, the CI job, `vite.config.ts`, `vitest.config.ts`, `knip.json` and the
README's "Play online". Colyseus's behaviour was read from its own published source (`@colyseus/core` 0.18.18,
`MatchMaker.reconnect` and `joinById`; `@colyseus/sdk` 0.18.5, `Client.reconnect`). The checks on `45d1e4f` were
read with `gh api`. Nothing was run locally: no install, no typecheck, no test, no probe.

## Critical

None.

## Important

**I1. A page whose line drops tries once to get back in, then gives up.**
`connection.reconnect()` (`colyseus-link.ts:150`) turns every failure into `OnlineError('lost')`, and
`startOnlineGame`'s retry (`online.ts:242`) treats `lost` as final: it sets `attempt` past the end of
`RECONNECT_DELAYS_MS` and ends the game. So the five waits (500 ms to 8 s) never run past the first. A phone that loses
its signal for two seconds, the plan's Review Focus 2, is still offline when the first try goes at 500 ms; the fetch
fails, and the player reads "The connection was lost and could not be got back" while their seat is held for 30 more
seconds. The journey and the socket tests pass because there the server answers at once. Colyseus says exactly when a
seat is gone: its matchmaker answers `reconnection token invalid or expired.` or `room "<code>" has been disposed.`
(`MatchMaker.reconnect`); everything else is a server that did not answer.
*Fix:* in `reconnect`, those two answers give `lost`; anything else gives `no-server`, which `startOnlineGame`
already tries again after the next wait. Tests: `colyseus-link.test.ts`, a fake client whose `reconnect` rejects with
`Failed to fetch` gives `no-server` and one with `reconnection token invalid or expired.` gives `lost`;
`online.browser.test.ts`, "a failed try is tried again": `rejoin` rejects once with `no-server`, then resolves, and
the statuses are `reconnecting`, then `playing`.

**I2. A quiet room stops the local hero after `lead` ticks, not after two seconds; `MAX_AHEAD` is never reached.**
The client's rule 3, as the plan writes it and as `session.ts:311` builds it, steps `predicted` up to
`confirmed.tick + lead`. `lead` is at most `MAX_CLIENT_LEAD` (30), so `predicted` can never be `MAX_AHEAD` (120)
ticks past `confirmed`, and the `gap >= MAX_AHEAD` check never fires. When the room goes quiet the hero stops after
`lead` ticks (2 at the start: 33 ms), not after two seconds as Review Focus 5 says. The plan's test said the gap
"stops at 120"; the build's test (`session.test.ts:206`) asserts only `gap <= MAX_AHEAD` and that it stays put, which
holds for a gap of 2 and hides the difference. The build did not report it.
*Judgement:* keep the rule as built. It is the plan's numbered rule, it keeps rollbacks short, and predicting as far
as the plan's words say would stamp commands up to 120 ticks past a stalled room, which refuses anything over
`MAX_LEAD_TICKS` (60) as `too-far-ahead` and so loses a held key. Predicting through a jittery downlink is tuning for
real networks, which the plan already leaves to the deploy plan with smoothing.
*Fix:* remove `MAX_AHEAD` and its check (the API report moves); the silent-room test asserts that the gap stops at
the session's `lead` and stays there; in the plan, Review Focus 5 says "the game waits after `lead` ticks", the table
of numbers loses `MAX_AHEAD`, and "Left for the deploy plan" gains "predicting through a quiet room".

**I3. The no-eval promise depends on chunk order (the build's own finding, confirmed).**
`src/lib/no-eval.ts` sets Zod's `jitless` from the entries' first import. Inside one script that runs first, but a
game's bundler that splits our source into chunks may put the schema files and Zod in a shared chunk that runs before
the entry's own, and then Zod probes `new Function` as it loads and a strict CSP reports it (Firefox logs it). The
build met exactly this in the journey page and worked round it there with `codeSplitting: false`
(`online.journey.test.ts:96`). The published `dist/` is fine today only because no-eval happens to land in the shared
chunk. Twenty-four files import Zod's `z` and nine more import its types; `src/headless.ts` re-exports `z`.
*Judgement:* the proposed fix is right and is the only one that holds whatever a bundler does: ES modules run a
module's imports before its body, so a module that sets `jitless` and is imported by every file that uses Zod runs
before any schema is built, in whatever chunk it lands. It is mechanical (one import line per file).
*Fix:* `git mv src/lib/no-eval.ts src/lib/zod.ts`; it sets `jitless` and re-exports `z` and the types the files use.
Every file under `src/` that names `zod` imports it from `lib/zod.ts` instead, and the three entries' first imports
point at it. `tests/architecture/rules.ts` gains a confinement: `zod` only in `src/lib/zod.ts` ("Zod is reached
through lib/zod.ts, which turns its eval probe off first"), with a rule test. The journey page drops
`codeSplitting: false`, so its `data-built-code` of `[]` in all three engines proves the split case. The comments that
name `no-eval.ts` (the journey, `tests/features/sim/no-eval.test.ts`) name the new file. Plans C, I and V's fix
stages touch some of the same files: this fix is its own pull request, merges `main` first, and keeps each change to
the import line, so any conflict is lines side by side.

## Minor

**M1. A player who has left stays "lost their connection" for good.** In a game without co-op seats, a player who
leaves on purpose, or whose grace runs out, is told to the others as `away` (`room-engine.ts:245`) or not at all, and
nothing ever takes them off the list. Everyone else reads "Player 2 lost their connection. The game goes on." for
the rest of the game. *Fix:* `leave` tells the others `gone` in this path too (after the let-go), as the co-op path
does; the session already takes `gone` off the list. The test: after `leave(2)`, seat 1's state has nobody away.

**M2. A co-op place that someone left cannot be taken again (ruling 5).** A gone seat stays in the table, so a room of
four that lost a player refuses a fifth person with "That room is full" while Colyseus shows a free place. Taking the
same number again would need the sim to take a `join` for a number that just had a `leave`, which is plan I audit I1's
ground. Accepted for M2; plan U's "Add a player" and plan D should know. *Fix:* a sentence in the plan's Task 11 and
in `room-engine.ts`'s header comment saying so.

**M3. Two rooms made at once can both pass `maxRooms`.** `onCreate` counts open rooms (`room.ts:63`) and only adds its
own after `await createGameSim`, so two creates in flight both see space. At `maxRooms` 16, the seventeenth Koota world
throws, and the player is told `no-server`. *Fix:* count a room from the start of `onCreate`, and let it go if the
room is not made; a test with `maxRooms: 1` and two creates at once.

**M4. The version check does not see the game's code.** `RoomOptions` holds the framework version, the schema hash
and the content hash. A game whose systems changed but whose shapes and content did not is let in, then disagrees
with the room at every hash, and syncs once a second for as long as it plays. *Fix:* nothing in code now; "Left for
the deploy plan" gains "a build id of the game's own code in `RoomOptions`".

**M5. The server entry exports more than the plan names.** `server.ts` exports `startTickScheduler`, which only the
lifted test uses. *Fix:* export only `type TickClock` (it is in `RoomServerOptions`); the test imports the
scheduler's own file, as Task 6 Step 1 said; the API report moves.

**M6. `SdkRoom.removeAllListeners` is never called** (`colyseus-link.ts:32`). *Fix:* take it out of the interface
and the fake.

**M7. The README's example has a name from nowhere and a made-up code.** `heroPlugin` is not defined in the snippet,
and `'K7QX'` looks like a short code a person types, which the plan leaves to the deploy plan (codes are Colyseus's
room ids). *Fix:* `plugins: [/* your game's plugins */]`, and the comment says the code is `online.code` from the
friend's page.

**M8. The plan does not name what the build added.** The message `gone`, `coopSeats`, `Link.drop()`, and the journey
page built with Vite and served from files rather than the dev server. *Fix:* the plan's protocol table gains `gone`,
Task 4's `Link` gains `drop?()`, Task 11 names `coopSeats`, and Task 10 says how the page is served.

## The rulings

All eight are accepted.

1. **Task 8, the fixture server runs `dist/`, and `check` builds first.** Right. A game's server file uses the
   package, not our source, and our source cannot run under plain Node because Rapier's binary comes through a module
   only the build writes. The cost is a build in `check`, which also means `check` now proves the
   package builds. The process test still checks `dist/` against a source sim, and the packed-package smoke covers the
   server entry.
2. **The journey page as one script.** A fair workaround while I3 stands; fix 3 takes it away so the journey proves
   the split case.
3. **Hiding lets go with `input.silence()` and one `advance`.** Right: it uses plan I's own call instead of a hand-made
   command, and the browser test shows the room taking `held: []`.
4. **`advance` always sends what is unsent.** Right, and safe: a command is stamped at most `lead` past the confirmed
   tick, which is never past what the room takes (see I2).
5. **`coopSeats`, `gone`, co-op places not reused.** Accepted; M2 and M8.
6. **The fixture server's own copy of the hero.** Accepted. The two agree by the plugin's name, so a change to one
   alone is not refused at the door; it shows as desyncs, which the journey's equal checks would catch.
7. **At least one rollback across the pair, not each.** Accepted: the socket test (Task 7) still asserts each
   player's `rollbacks` above 0, so the per-player claim is proven where timing is the test's own.
8. **Red-first not seen for Task 9's browser tests.** Noted, not a defect of the code; the tests were read and each
   asserts what the plan names.

`Link.drop()` is accepted too: it is optional, says it is for tests and debug tools, and is the only way a `wrapLink`
can make a network failure without leaving the room.

## Notes for other plans

- **N1 (plan S, its audit I3).** Nothing in plan N's build reads `Advance.events`: `startOnlineGame` uses only
  `deltas`, and no test or fixture reads `events`. Plan S Task 9 can turn it into `steps: { tick, events }[]` freely;
  it updates `session.ts`, its doc comment and the API report, and no other file.
- **N2 (plans A and D).** At phone size both heroes are the same red (`pr-44/online/` on `ci-screens`), so a player
  cannot tell which is theirs. The framework draws what the art says; plan A's figure format needs a way to give each
  player its own colour (or variant), and plan D's two same-screen heroes and any online page need it used.
- **N3 (plan U).** The pause screen must not stop an online game's loop (the room does not wait), and the online
  status words go on a screen there.
- **N4 (plan L).** `onlineWords` is the set to translate.
- **N5 (plan K).** If the `automata` command wraps `runRoomServer`, the Effect rule widens past `process.ts`.
- **N6 (the Owner).** The `online` check is not required yet:
  `gh api repos/mcthaydt/AutomataFramework/branches/main/protection/required_status_checks/contexts -X POST -f 'contexts[]=online'`.

## The fixes, in order

1. I1: `reconnect` tells `lost` from a server that did not answer; the two tests.
2. I2: `MAX_AHEAD` goes; the silent-room test asserts the gap stops at `lead`; the plan's words; the API report.
3. I3: `lib/zod.ts`, every Zod import through it, the confinement rule and its test, the journey without
   `codeSplitting: false`. Its own pull request, after `main` is merged.
4. M1: `gone` for a player who leaves a game without co-op seats; the test.
5. M3: a room counts from the start of `onCreate`; the test.
6. M5: the server entry exports only `type TickClock`; the API report.
7. M6: `removeAllListeners` out of `SdkRoom`.
8. M7: the README's example.
9. M2, M4, M8: the plan's and the engine's words.

None moves a golden: fixes 1, 4 and 5 change only what the room and the page say and when they try, fix 2 removes a
check that never fires, and fix 3 changes which file sets the same switch.

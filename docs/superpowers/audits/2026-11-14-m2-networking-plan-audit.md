# Plan audit: M2 plan N, networking

Written 2026-11-14. Stage 3 (Plan audit) of cycle 4, for
[`plans/2026-11-14-m2-networking.md`](../plans/2026-11-14-m2-networking.md) as merged in `f95060d`, read against the
[M2 spec](../specs/2026-11-14-m2-design.md) ("Networking (plan N)", "Testing", "Done means"), the
[first-layer spec](../specs/2026-11-13-2d-first-layer-design.md), `CLAUDE.md`, [`progress.md`](../progress.md), the
code on `main`, plans [C](../plans/2026-11-14-m2-content.md), [I](../plans/2026-11-14-m2-input.md) and
[V](../plans/2026-11-14-m2-saves-host.md) (with plan V's open audit, pull request 36), and the old repo
`mcthaydt/AutomataFrameworkFailed` at `ed8592e8`.

## The answer first

The plan is sound and true to the spec. Its model (a room that relays each tick's commands and runs the same sim, a
client with a confirmed sim and a predicted one, hashes every sixty ticks, a sync to mend a desync) is the M1 spec's,
and its three proofs are exactly the two the M2 spec names plus a scripted four-engine run with a golden. It deploys
nothing, as the Owner decided on 2026-11-14, and it lists what a deploy will still need. Every version it pins is the
one the old repo ran.

It was **not ready to execute as written**: ten findings would have turned a test red or let a person meet a wrong
screen. Each is fixed in the plan in this pull request, marked "audit F<n>" where it changed. Five notes follow; none
needs a change now. No Owner question came up.

## Method

- Every API the plan calls was looked up on `main`: `Sim` (`seed`, `contentHash`, `restore`, `hash`,
  `describeSnapshot().header.schemaHash`), the reasons `step` rejects a command (`wrong-tick`, `duplicate-seq`,
  `invalid-payload`), `createRecorder` (which ticks its checks carry), `verifyReplay`, `controlsCommand` and its strict
  payload, `MAX_PLAYERS`, `LevelError`, `createGameSim`'s options, `createInput`, `startGame`, the render delta's
  `resync`, `expectGolden`'s shape, `attemptsToBuildCode`, `tests/install/smoke.mjs` and `push-crate.json`'s
  `idleHash60`, `vite.config.ts`, `knip.json`, `scripts/api-report.ts` and the `ci.yml` jobs.
- Each number the tests assert was worked through by hand: ten checks for ticks 59 to 599, the recorder's tick 600
  being the room's hash after tick 599, the server smoke landing on `idleHash60`, and a command's trip through the
  scripted wire in beats.
- The old repo at `ed8592e8`: every path the plan lifts or reads exists; the lifted test imports only Vitest and the
  scheduler; the room (`automata-room.ts`) and the client's error reading (`net-error.ts`) were read for how Colyseus
  0.18 behaves; `extensions/net-server/package.json` and `extensions/net/package.json` pin `@colyseus/core` 0.18.18,
  `@colyseus/schema` 5.0.36, `@colyseus/ws-transport` 0.18.4, `@colyseus/sdk` 0.18.5 and `effect` 3.22.2.
- Plans I, C and V were read for every name plan N takes from them or every file both touch.

## Findings, all applied to the plan

**F1. The room's own commands would make a player's next command "out of order".** The room makes commands for a
seat: a let-go `controls` when the connection drops, and in Task 11 `join` and `leave`. Task 11 gives them "that
seat's next `seq`", and Task 3 says nothing. Either way the player's own counter does not know, so after a return
their next command (the resend of what is held, first of all) carries a `seq` the room has already used, and is
refused `out-of-order`: the player comes back and cannot move. (Plan I's audit raised the same point for `join`.)
*Fix:* the `seat` message carries `nextSeq`; the session carries on from it; every command the room makes takes the
seat's next `seq`, so the replay holds one order. A new engine test, "after a return the player's numbers carry on".

**F2. A page with no code could land in a full room, or in a stranger's.** Nothing set the room's `maxClients`, so
Colyseus never locks a full room and `joinOrCreate` keeps matching it: a third page with no code is refused
`room-full` instead of getting a room of its own. In the journey, the second pair's first page has the same options
as the first pair's full room. And "join or make" means a page that shows "Share this code so a friend can join"
can have its seat taken by anyone else opening the game, which fails the drunk-grandma test. *Fix:* with no code a
page always makes a new room (`create`), a friend joins by code; `maxClients` is `seats`; Colyseus 0.18's own
`room "<code>" is locked` reads as `room-full` and `room "<code>" not found` as `no-room` (the wording the old
`net-error.ts` matches). The version check moves to `onAuth`, before a seat is reserved, as the old room did. New
tests for both readings and for a third page with no code.

**F3. "Agrees without a rollback when alone" could not pass in the order a beat ran.** A beat was "room steps, then
deliver, then advance". With delays of 1 each way, a command stamped for the tick after the confirmed one reaches the
room one beat later, just after the room stepped that tick: it is late by one, and the first command always rolls
back. *Fix:* a beat is "deliver, room steps, advance", in Task 4's wire and Task 5's `runOnline`, with the reasoning
written next to it. `START_LEAD` stays 2.

**F4. No task added `net` to `src/headless.ts`, and the API report would go stale.** Task 7's lazy-load test and
Task 8's surface test both need `joinSession` and the rest exported from the headless entry, but no task's file list
had the edit. And the `package` job runs `pnpm api-report`, which fails when `docs/api/framework.api.md` is not what
the source makes; only Task 8 updated it. *Fix:* Task 2 adds the headless line; a global constraint has every task
that changes the surface run `pnpm build` and `pnpm api-report --update` and commit the report; the shared-file list
names both files.

**F5. knip would fail twice.** Task 6's first push created `src/features/server/server.ts`, which nothing imports
yet, and knip fails an unused file. Task 8's `tests/fixtures/online/server.ts` is started by path, never imported,
and is unused to knip for the same reason. *Fix:* Task 6 lifts only the scheduler and its test first; Task 8 adds the
fixture server to `knip.json`'s entries.

**F6. A hidden tab let the hero run on for everyone.** When the page goes out of sight its loop stops, as `startGame`
does, so nothing more is sent, and the room keeps the last `controls` it had. A player who switches tabs while
holding right leaves their hero running for the other player for as long as they are gone. *Fix:* on going out of
sight the page sends one let-go through the session, and the input forgets what it last sent; a new browser test.

**F7. Plan I takes away the input's `player` option.** Task 9 made "the input for the seat the room gave", which on
today's `main` is `createInput({ player: seat })`. Plan I's Task 6 removes that option: input starts as player 1 and
is told who plays with `setPlayers`. *Fix:* Task 9 names both, and says the online page never tells the input about
the other players in the sim (Task 11 repeats it, since plan I's `startGame` does the opposite).

**F8. The layer list would undo plan V's.** Task 1 wrote out the whole of `LAYERS`. Plan V and its audit (pull
request 36) reorder the layers above `level` (`saves`, `host`, `locale`, `ui`, `screens`, `web`). *Fix:* Task 1 makes
two insertions, `net` after `commands` and `server` after `level`, and touches nothing else. Both places agree with
plan V's own note that `net` comes after `commands`.

**F9. The Colyseus hooks were not named.** "On a dropped connection ... then back or leave" leaves the executor to
find that 0.18 splits this into `onDrop` (lost, not given up: hold the seat with `allowReconnection`), `onReconnect`
and `onLeave` (consented, or the grace ran out). *Fix:* Task 6 names each hook and what it calls, as the old room
uses them.

**F10. A co-op room could seat a player with no hero.** Task 11 made a room's seats equal the project's `players`.
Plan I's `join` does nothing for a player whose number has no start in the level, so a game for four on a level with
two starts would seat a third person who never appears. *Fix:* a co-op room's seats are the level's starts numbered
1 to the project's `players`; any other `seats` is `bad-room`.

## Notes, no change needed

1. **Effect is confined to `process.ts`.** Right for this plan. Plan K's `automata` command will want Effect too; the
   Task 12 notes now say plan K widens the rule when it does.
2. **`net` is a pure feature that holds `colyseus-link.ts`.** That file does socket I/O through the SDK it loads on
   demand; it reads no clock and sets no timer, so the purity rule holds. Task 1's rules comment now says why.
3. **The pause screen (plan U).** An online game never pauses, because the room does not wait. Task 12's notes tell
   plan U its pause screen must not stop an online game's loop.
4. **A join by code with other options reads "different version".** A page joining with a code but another level or
   seed is told to reload. Only a hand-made address can do that, and reloading is still the right thing to try.
5. **Checked and right as written:** the recorder labels the hash after tick 599 as tick 600, so Task 7's "599 against
   600" is right; ten checks for ticks 59 to 599; the server smoke's room sim is the same sim `smoke.mjs` steps (seed
   1, the start level, player 1, no plugins), so its tick-59 check is `idleHash60`; `restore` makes the next delta a
   resync, so `Advance.deltas` needs nothing new; the build leaves every dependency external, so `dist/server.js`
   carries no Colyseus or Effect; plan C leaves `tests/fixtures/game/` alone, so `twoPlayerLevel` adds the only
   second start; plan V keeps `visible` and `onVisibility`, which is all `startOnlineGame` reads of the host.

## For the executor

Read the plan with this audit beside it. The fixes are already in the plan, so follow the plan; where a task's words
and this audit seem to differ, the audit's finding says what was meant. Task 11 still waits for plan I's Task 5 to
be on `main` (it is not yet: `src/features/level/join.ts` does not exist on `main` today).

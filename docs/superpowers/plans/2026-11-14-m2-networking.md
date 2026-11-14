# M2 Plan N: Networking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Online play that is built and proven in CI: a room server (`@automataframework/framework/server`) and a
client that predicts, rolls back and replays, with two players ending on the same hash, and two real browsers playing
together against a server CI starts. Nothing is deployed.

**Architecture:** Two new features. `net` (pure, just above `commands`) holds the wire messages, the room's rules as a
plain engine with no sockets and no clock, and the client's session, which runs two sims: one that only ever steps
what the server confirmed, and one that runs ahead on the player's own commands and is put back on the confirmed one
when they differ. `server` (Node only) wraps the engine in a Colyseus room, ticks it on a clock, and runs the process
on Effect. A page joins with `startOnlineGame`, in the `game` feature.

**Tech Stack:** as on `main`, plus (all named in the first-layer spec's stack table) `@colyseus/core` 0.18.18,
`@colyseus/schema` 5.0.36, `@colyseus/ws-transport` 0.18.4, `@colyseus/sdk` 0.18.5 and `effect` 3.22.2, the versions
the old repo ran. No other dependency.

**Spec:** [`docs/superpowers/specs/2026-11-14-m2-design.md`](../specs/2026-11-14-m2-design.md), "Networking (plan
N)", "Testing" and "Done means"; and the model in
[`2026-11-13-2d-first-layer-design.md`](../specs/2026-11-13-2d-first-layer-design.md), layer 4 (net). Principles
served: 1 (the protocol is documented messages and the room's play is an ordinary replay file an agent can read and
verify), 3 (2D only), 4 (one package), 6 (Colyseus and Effect carry over), 7 (the old repo's net is read, and one file
is lifted, for this layer only).

## What this plan covers, and what it does not

Covered: the wire protocol, the room engine, the client session (prediction, rollback, pacing, desync recovery,
getting back in after a dropped connection), the Colyseus room and server, the server process, `startOnlineGame`, and
the three proofs: a scripted two-player run in four engines, two headless players over real sockets, and two real
browsers.

Not covered, with the reason:

- **Deploying anything** (the Owner, 2026-11-14). No Fly.io config, no Dockerfile, no domain. What a deployed server
  still needs is listed under "Left for the deploy plan".
- **Online play in the demo game.** The demo's co-op is same-screen (plan D). This plan's step in plan D is one check,
  under "Handoff to plan D".
- **Screens.** The framework has no Svelte kit until plan U. This plan gives a game the status as data and the plain
  English words for it; plan U puts them on a screen and plan L translates them.
- **Coming and going without plan I.** Plan I adds the `join` and `leave` commands to the sim, for games whose
  `automata.toml` says `players = 2` or more. Tasks 1 to 10 do not need them: there a room starts when its seats are
  full and its players are fixed from tick 0, as `createGameSim` fixes them today. Task 11 makes a room of a co-op
  game use plan I's two commands, so a player can join a game that is already going and a player who leaves takes
  their hero with them. **Task 11 starts only after plan I has merged**; the rest does not wait for it.
- **Smoothing a correction.** After a rollback the picture is redrawn from the corrected state at once. Hiding that
  with blending is tuning for real networks, and is the deploy plan's.
- **`@colyseus/testing`.** Left out of the stack: it needs `@colyseus/tools`, which the spec's table does not name,
  and the tests here start the real server on port 0 and join with the real SDK, which proves more.

## Before starting

Stop and report to the coordinator if either is not true.

1. `main` holds the M2 spec (`328b76a` or later) and CI is green on it.
2. `pnpm install` of the five packages above succeeds with exactly those versions. If a version cannot be installed,
   stop: choosing another is the Owner's.

Other M2 plans (C, I, V) are being executed in this repo at the same time. This plan touches four shared files:
`tests/architecture/rules.ts`, `package.json`, `.github/workflows/ci.yml` and `docs/superpowers/progress.md`. Merge
`main` before every push, keep the edits to those files as small as the task says, and report a conflict that is more
than lines side by side.

## Global Constraints

- The sim has no I/O, no wall clock and no `Math.random`. This plan adds `net` to the pure features: nothing in
  `src/features/net/` reads a clock or sets a timer. Time reaches it only as "advance once" from whoever owns the loop.
- Effect is for Node tooling only: in this plan, only `src/features/server/process.ts` imports it.
- `@colyseus/sdk` is imported only by `src/features/net/colyseus-link.ts`, and only by a dynamic `import()`, so
  loading the package loads no SDK (the Rapier rule). `@colyseus/core` and `@colyseus/ws-transport` are imported only
  under `src/features/server/`.
- Neither `src/index.ts` nor `src/headless.ts` may reach `src/features/server/`. Its only entry is `src/server.ts`.
- Zod is the only schema language. Every message off the wire is parsed before it is used, on both sides.
- The server sets a command's `source` from the seat and its `tick` from its queue. What a client says for either is
  never trusted.
- A source file has at most 600 lines. Comments say why.
- Tick rate is 60 Hz. Player numbers are 1 to 4; a seat is a player number.
- A hash that differs between engines, or between a player and the room, is investigated, never re-recorded. A golden
  is recorded from CI, never typed (`tests/fixtures/golden.ts`).
- **Tests run only in GitHub-hosted CI, never locally.** `pnpm lint`, `pnpm typecheck`, `pnpm knip`, `pnpm build` and
  the scripts are not tests and are run locally before every push.
- The drunk-grandma test: every word a player can read is pinned in Task 9 and says what is happening and what to do.
- No AI attribution anywhere. Author and committer are `McThayDT <107786093+mcthaydt@users.noreply.github.com>`; set
  both and install the wrong-author hook before the first commit. Conventional Commits.

## How every task is verified

As in the M1 plan: there is no local test run, so each task proves itself in the pull request's CI, read with
`gh run list --branch <branch>` and `gh run view <id> --log-failed`.

- A fresh task pushes twice: first the tests alone (the `check` job must fail for the reason the step names), then the
  implementation (every job must pass). Task 6's lifted file and its lifted test push once, together.
- A new golden is committed with `"finalHash": ""`; the Node job fails with `GOLDEN NOT RECORDED` and the JSON to
  commit; after that all four engines must match. If a browser differs from Node, stop and report.
- After each task: tick its boxes here, update this plan's row in `docs/superpowers/progress.md` (Tasks 1 to 11 are 8%
  each of this stage, Task 12 is 12%), and send the coordinator one line: commit, test count, surprises.
- Stop rules: a failing check you cannot explain, a third fix for the same failure, an access refusal, a missing
  tool, or an Owner-only question. Stop that task and report at once. Hand off at 90 minutes.

## The old repo

Source: `mcthaydt/AutomataFrameworkFailed` at `ed8592e8`. Its net was a different model (the room sent whole
snapshots twenty times a second) wrapped in what a deployed server needs, so almost nothing is copied.

- **Lifted** (copy, fix import paths, first line `// Lifted from AutomataFrameworkFailed@ed8592e8: <old path>`,
  change nothing else): `extensions/net-server/src/features/room/rules/tick-scheduler.ts` and its test
  `extensions/net-server/tests/unit/room/rules/tick-scheduler.test.ts` (Task 6). The test imports only Vitest and the
  scheduler.
- **Read for how Colyseus 0.18 and Effect are called, nothing copied:**
  `extensions/net-server/src/features/room/engine/automata-room.ts` (a `Room` subclass, `client.send`,
  `client.sendBytes`, `allowReconnection`, a refusal as an `Error` whose message starts with the code),
  `extensions/net-server/src/app/start-server.ts` and `server-process.ts` (`Server`, `WebSocketTransport` on a Node
  HTTP server, port 0, the scope, SIGTERM), `extensions/net/src/features/client/room/sdk.ts` and
  `colyseus-transport.ts` (the slice of the SDK a client uses; `reconnectionToken`; switching the SDK's own retry off),
  `extensions/net/src/features/client/session/prediction.ts` and
  `extensions/net-server/src/features/room/rules/input-queue.ts` (the two queue rules, restated below).

## The protocol

Left to this plan by the spec. One Colyseus room type, `game`. Messages are plain objects on channel `m` (Colyseus
packs them); snapshot bytes follow their header on channel `b`.

**Joining.** A client joins with `RoomOptions`, which also describe the room it would make:

```ts
interface RoomOptions {
  protocol: 1            // PROTOCOL_VERSION
  framework: string      // FRAMEWORK_VERSION
  schemaHash: string     // sim.describeSnapshot().header.schemaHash: the game's code shape
  contentHash: string    // sim.contentHash
  tickHz: number
  level: string
  seed: number           // u32
  seats: number          // 1 to MAX_PLAYERS: the room starts when this many have joined
}
```

The room filters on every field, so "join or make" only ever meets a room of the same game, level, seed and size, and
a join by code with another version is refused `different-version`. Because the options hold everything a sim needs,
a client builds its sims before it joins.

**Client to room.**

| Message | Meaning |
|---|---|
| `{ t: 'cmd', seq, tick, type, payload }` | A command, stamped with the tick the client predicted it on. |
| `{ t: 'sync' }` | "Send me the whole state": after a desync, or when too far behind. |

**Room to client.**

| Message | Meaning |
|---|---|
| `{ t: 'seat', seat, code }` | Your player number and the room's code. First message after a join or a return. |
| `{ t: 'waiting', missing }` | The room has not started; `missing` more players are needed. |
| `{ t: 'start' }` | Every seat is taken. The next message is tick 0. |
| `{ t: 'tick', tick, commands, hash? }` | The commands the room's sim took on `tick`, sorted by source then seq. `hash` is the room's hash after that step, present when `(tick + 1) % 60 === 0`. Sent for every tick, in order. |
| `{ t: 'refused', seq, reason }` | Your command `seq` was not taken: `too-far-ahead`, `out-of-order`, `too-many`, `not-started` or `not-valid`. |
| `{ t: 'sync', tick }` then bytes on `b` | The sim's snapshot (format v1, as `sim.snapshot()` writes it) before `tick`. Tick messages from `tick` follow. |
| `{ t: 'away', seat }` / `{ t: 'back', seat }` | That player's connection dropped, or returned. |

**The numbers** (all exported from `protocol.ts`):

| Name | Value | What it bounds |
|---|---|---|
| `PROTOCOL_VERSION` | 1 | Bumped when a message changes. |
| `ROOM_NAME` | `'game'` | |
| `MAX_MESSAGE_BYTES` | 16 384 | A larger message from a client is dropped by the transport. |
| `MAX_LEAD_TICKS` | 60 | A command stamped further ahead of the room than this is refused. |
| `MAX_QUEUED_COMMANDS` | 32 | Per seat, waiting for their tick. |
| `HASH_EVERY` | 60 | Ticks between hashes; the recorder's interval, so the room's replay holds the same ones. |
| `START_LEAD`, `MIN_LEAD`, `MAX_CLIENT_LEAD` | 2, 1, 30 | How many ticks ahead of the last confirmed tick a client runs. |
| `LEAD_DECAY_TICKS` | 300 | With no late command for this long, the lead drops by 1. |
| `MAX_AHEAD` | 120 | A client never predicts further past the confirmed tick; it waits. |
| `MAX_CATCH_UP` | 4 | New predicted steps in one advance, at most. |
| `MAX_CONFIRM_PER_ADVANCE` | 240 | Confirmed ticks taken in one advance, at most. |
| `SYNC_BEHIND` | 600 | With more tick messages than this waiting, a client asks for `sync` instead. |
| `RECONNECT_GRACE_SECONDS` | 30 | How long a dropped player's seat is kept. |
| `RECONNECT_DELAYS_MS` | 500, 1000, 2000, 4000, 8000 | When a page tries to get back in. |
| `DEFAULT_MAX_ROOMS` | 8 | Koota allows 16 worlds in a process and each room is one. |

**The room's queue rules** (the engine, Task 3). A command takes effect on `max(stamped tick, the room's next tick,
the effective tick of that seat's previous command)`: late is never refused and never rewound, and a seat's commands
never overtake each other. `seq` must be higher than the seat's last. The room steps the commands due, drops the ones
the sim rejects (`refused: not-valid`), and relays the rest in the tick message. When a seat's connection drops, the
room queues a `controls` command with nothing held for it, so a hero does not run on with nobody holding the button.

**The client's rules** (the session, Task 4). Two sims made the same way. `confirmed` steps only tick messages.
`predicted` is what is drawn. On each advance:

1. Take up to `MAX_CONFIRM_PER_ADVANCE` waiting tick messages, in order. For each: step `confirmed` with its commands;
   if it has a hash and `confirmed.hash()` differs, count a desync, send `sync` and take no more until the sync
   arrives; drop this seat's commands in it from `pending`, and if one landed later than it was stamped, raise the
   lead by the difference (to `MAX_CLIENT_LEAD` at most); and compare the commands with what `predicted` stepped on
   that tick (as canonical JSON). A difference, or `predicted` not having reached that tick, marks the prediction
   wrong.
2. If the prediction is wrong: remember `predicted.tick`, restore `predicted` from `confirmed.snapshot()`, and step it
   back up to where it was with the `pending` commands, each on `max(its stamped tick, the tick being stepped)`, in
   `seq` order. Count one rollback if `predicted` had been ahead.
3. Step `predicted` `clamp(confirmed.tick + lead - predicted.tick, 0, MAX_CATCH_UP)` new ticks, and none while
   `predicted.tick - confirmed.tick >= MAX_AHEAD`. The local commands given to this advance go on the first new step:
   the session gives each `source` (the seat), the next `seq` and that tick, keeps it in `pending` and sends it. With
   no new step they wait for the next advance.
4. With no late command for `LEAD_DECAY_TICKS`, lower the lead by 1, to `MIN_LEAD` at least.

A `sync` restores both sims from its bytes, forgets `pending` and everything waiting before its tick, and sends again
the last command of each type in `resendAfterSync` (default `['controls']`), because commands sent while the line was
down are gone and the room must learn what is held now. A pending command is also given up once its stamped tick is
`2 * MAX_LEAD_TICKS` behind the confirmed tick.

**The replay format does not change.** The room records with `createRecorder`, so its play is a format 1 replay.
Which players and which level it needs go in `meta` (`players: "1,2"`, `level`, `seats`), which is words only.

## Left for the deploy plan

Written down so the 3D layer's plan starts from a list: allowed origins; limits per address (joins, sockets,
commands a second); who a player is (sessions); `/health` and `/ready`; draining rooms on a deploy; short room codes a
person can read out; logs; the Fly.io config and region; batching tick messages; smoothing corrections; a room that
keeps itself to one process's 16 worlds across machines.

## Handoff to plan D

One step, after this plan merges and the Examples pin moves: a `server.ts` at the demo game's root (five lines, as in
this plan's README section) and one Node test that starts it on port 0 and joins two headless players on the demo's
own content with its own plugins, ending on agreed hashes. That proves an outside game can run a room with only the
published package. The demo's pages stay offline.

## File structure

```
src/server.ts                                the Node entry: re-exports the server feature
src/features/net/net.ts                      entry
src/features/net/protocol.ts                 messages, their schemas, the numbers, RoomOptions, roomOptionsOf
src/features/net/room-engine.ts              the room's rules: seats, the queue, stepping, relaying, sync
src/features/net/link.ts                     the Link port a session talks through
src/features/net/session.ts                  the client: two sims, prediction, rollback, pacing, desync
src/features/net/colyseus-link.ts            a Link over the Colyseus SDK (dynamic import)
src/features/net/join.ts                     joinSession: options from the sims, connect, session
src/features/net/words.ts                    the status and problem words, in plain English
src/features/server/server.ts                entry
src/features/server/tick-scheduler.ts        lifted: ticks at fixed deadlines on an injected clock
src/features/server/room.ts                  the Colyseus room: an adapter over the engine
src/features/server/room-server.ts           createRoomServer: HTTP, transport, the room type, port 0
src/features/server/process.ts               runRoomServer: the process on Effect (config, signals, exit)
src/features/game/online.ts                  startOnlineGame: a page in a room
tests/features/net/*.test.ts                 protocol, engine, session, colyseus-link, words
tests/features/net/two-players.parity.test.ts   proof 1: four engines, one golden
tests/features/server/*.test.ts              scheduler (lifted), room server over real sockets (proof 2), process
tests/features/game/online.browser.test.ts   startOnlineGame against a room in the page
tests/journeys/online.journey.test.ts        proof 3: two real browsers, a server process
tests/fixtures/online/                       the two-player level, scripts, the scripted wire, the headless player,
                                             server.ts (the fixture game's server), page/ (the journey's page)
tests/golden/online-two-players.json         the golden of proof 1
tests/install/server-smoke.mjs               the packed package's server entry, used
```

## Review Focus

What the spec implies and a person will meet, most likely first. Each has its test in the task named.

1. **A tab hidden for a minute, then looked at again.** The game catches up at once (it asks for the state) rather
   than freezing while it replays an hour of ticks. Task 4, test "far behind asks for the state".
2. **A connection that drops for a few seconds.** The player gets back into the same seat and plays on; the others
   never stopped; the dropped hero stood still. Task 7 (real sockets) and Task 10 (browsers).
3. **A client that sends rubbish**: not a message, a forged `source`, a tick an hour ahead, a thousand commands. The
   room refuses or ignores each, and the other player's game is untouched. Task 3, "rubbish in".
4. **Joining with an older copy of the game.** Refused before a seat is taken, with words that say to reload. Task 7,
   "another version is refused".
5. **A server that goes quiet.** The player's game waits after two seconds of prediction instead of running away from
   the truth, and carries on when ticks return. Task 4, "a silent room".

---

### Task 1: The layers and their rules

**Files:**
- Modify: `tests/architecture/rules.ts`, `tests/architecture/rules.test.ts`

**Interfaces:**
- Produces: `LAYERS` is `sim, physics, commands, net, content, level, server, render, input, host, game`. `net` joins
  `PURE_FEATURES`. New confinements: `@colyseus/sdk` only in `src/features/net/colyseus-link.ts`;
  `@colyseus/core`, `@colyseus/ws-transport` and `@colyseus/schema` only under `src/features/server/`; Effect only in
  `src/features/server/process.ts` (the message becomes "Effect is only for the server's process."). New rule
  `server-is-node-only`.

- [ ] **Step 1: Write the failing rule tests** in `rules.test.ts`, each on a made-up map that includes the entry files
  it needs (M1 audit, B5), each expecting exactly one violation:
  - `net` importing `content` gives `imports-go-down`; `server` importing `level` and `net` gives none.
  - `src/features/net/net.ts` containing `setTimeout` gives `sim-is-pure`.
  - `src/features/net/session.ts` importing `@colyseus/sdk` gives `package-confined`; the same import in
    `src/features/net/colyseus-link.ts` gives none.
  - `src/features/net/net.ts` importing `effect` gives `package-confined`; `src/features/server/process.ts` importing
    it gives none.
  - `src/features/game/game.ts` importing `../server/server.ts` gives `server-is-node-only` ("Only src/server.ts may
    import the server feature: it needs Node.").
  - `src/headless.ts` reaching `src/features/server/server.ts` through any chain gives `server-is-node-only`, and so
    does `src/index.ts`.
- [ ] **Step 2: Push; `check` fails** on the new cases.
- [ ] **Step 3: Change `rules.ts`** as the Interfaces block says. `server-is-node-only` is reported instead of
  `imports-go-down` for an import of `server` from a feature above it, so each case has one violation.
- [ ] **Step 4: Push; every job passes.** The real tree has no `net` or `server` yet, so `architecture.test.ts` is
  unchanged.
- [ ] **Step 5: Commit** `test: layers and rules for net and the room server`.

### Task 2: The wire

**Files:**
- Create: `src/features/net/protocol.ts`, `src/features/net/net.ts`, `tests/features/net/protocol.test.ts`

**Interfaces:**
- Consumes: `Command`, `Sim`, `FRAMEWORK_VERSION` from the sim's entry; `MAX_PLAYERS` from commands.
- Produces:
  - every name in "The numbers";
  - `type ClientMessage`, `type ServerMessage`, `type RoomOptions`, `type Refusal` (the five reasons), as in "The
    protocol";
  - `parseClientMessage(raw: unknown): ClientMessage | undefined` and `parseServerMessage(raw: unknown):
    ServerMessage | undefined` (strict Zod objects; `undefined` for anything else, never a throw);
  - `parseRoomOptions(raw: unknown): RoomOptions | undefined`;
  - `roomOptionsOf(sim: Sim, room: { level: string; seats: number }): RoomOptions`;
  - `type OnlineProblem = 'different-version' | 'room-full' | 'no-room' | 'server-full' | 'bad-room' | 'no-server' |
    'lost'`.

- [ ] **Step 1: Write the failing tests:**
  - `parseClientMessage` returns the message for a good `cmd` and a good `sync`, and `undefined` for: a string, `null`,
    an unknown `t`, a `cmd` with an extra key, `seq: -1`, `seq: 1.5`, `tick: 4294967296`, `type: ''`.
  - `parseServerMessage` round-trips one of each message in the table, and returns `undefined` for a `tick` whose
    `hash` is not 16 hex digits and for a `refused` with an unknown reason.
  - `parseRoomOptions` refuses `seats: 0`, `seats: 5`, `protocol: 2` and a missing `level`.
  - `roomOptionsOf(sim, { level: 'level-1', seats: 2 })` on a fixture game sim gives `protocol: 1`,
    `framework: FRAMEWORK_VERSION`, `contentHash: sim.contentHash`, `tickHz: 60`, `seed: sim.seed`, and a `schemaHash`
    of 16 hex digits that differs when the sim is made with `heroPlugin` and without.
- [ ] **Step 2: Push; `check` fails** ("Cannot find module").
- [ ] **Step 3: Write `protocol.ts` and the entry.** A command's `payload` is `z.json()` here; the sim's own schema
  judges it when the room steps.
- [ ] **Step 4: Push; every job passes.**
- [ ] **Step 5: Commit** `feat: the room's wire messages`.

### Task 3: The room engine

**Files:**
- Create: `src/features/net/room-engine.ts`, `tests/features/net/room-engine.test.ts`,
  `tests/fixtures/online/two-player-level.ts`, `tests/fixtures/online/game.ts`
- Modify: `src/features/net/net.ts`

**Interfaces:**
- Consumes: Task 2; `createRecorder`, `controlsCommand`, `type Replay` from commands.
- Produces:

```ts
interface RoomPeer {
  send(message: ServerMessage): void
  sendBytes(bytes: Uint8Array): void
}
interface RoomEngine {
  readonly options: RoomOptions
  readonly started: boolean
  readonly tick: number                       // the next tick the room steps
  readonly stats: { late: number; refused: number; ignored: number }
  /** The lowest free seat, or the problem. Sends `seat`, then `waiting` to everyone, or `start` when full. */
  join(peer: RoomPeer, options: unknown, code: string): { seat: number } | { problem: 'different-version' | 'room-full' }
  /** Anything off the wire from that seat. Never throws. */
  receive(seat: number, raw: unknown): void
  /** The connection dropped: tells the others `away` and lets go of that player's controls. */
  away(seat: number): void
  /** The same player, on a new connection: `seat`, then `sync` and the bytes; tells the others `back`. */
  back(seat: number, peer: RoomPeer): void
  /** The player is gone for good: the seat stays empty and the hero stands still. */
  leave(seat: number): void
  /** One tick, if started: steps the commands due, sends `refused` for what the sim rejected, relays the rest. */
  step(): void
  replay(): Replay
}
function createRoomEngine(setup: {
  sim: Sim
  level: string
  seats: number
  /** The sim's own commands for a player arriving and going, by type. Task 11 gives them; without them the room waits until it is full. */
  seatCommands?: { readonly join: string; readonly leave: string }
}): RoomEngine
```

  Tasks 3 to 10 never pass `seatCommands`; the option is named here so Task 11 changes no signature.

- `tests/fixtures/online/two-player-level.ts`: `twoPlayerLevel(levelText: string): string`, the fixture's `level-1`
  with a second start added (`{ "player": 2, "x": 13.5, "y": 7.5 }`). It imports nothing, so plain Node can load it
  (Task 8's server does). `tests/fixtures/online/game.ts`: `loadOnlineGame(): Promise<GameContent>` (the fixture game
  through `readFixture`, with that level) and `onlineSim(seats = 2): Promise<Sim>` (`createGameSim` with `heroPlugin`
  and `players` 1 to `seats`).

- [ ] **Step 1: Write the failing tests** (each with fake peers that collect what they are sent):
  - "waits, then starts": with `seats: 2`, the first join gets `seat 1` and `waiting { missing: 1 }`; `step()` does
    nothing; the second join gets `seat 2` and both get `start`; `step()` then sends both `tick { tick: 0, commands: [] }`.
  - "another version is refused": a join whose `contentHash` differs returns `{ problem: 'different-version' }` and
    takes no seat; a third join returns `{ problem: 'room-full' }`.
  - "a command lands on its tick": seat 1 sends `cmd` for tick 5 at room tick 2; tick messages 2 to 4 carry none, tick
    5 carries it with `source: 1`.
  - "a late command lands on the next tick": `cmd` stamped 1 arrives at room tick 4, is in tick message 4, and
    `stats.late` is 1.
  - "a seat's commands keep their order": seq 0 stamped tick 9, then seq 1 stamped tick 6, both arrive at tick 3; both
    are in tick 9, seq 0 first.
  - "rubbish in" (Review Focus 3): `receive(1, 'x')`, `receive(1, null)`, a `cmd` with `source: 2` as an extra key, a
    `cmd` stamped `tick + 61` (`refused: too-far-ahead`), the same `seq` twice (`refused: out-of-order`), 40 commands
    for a far tick (the 33rd on get `refused: too-many`), a `cmd` before `start` (`refused: not-started`), and a
    `controls` whose payload is `{ held: 'right' }` (`refused: not-valid` on its tick, and it is not relayed). None
    throws; seat 2 receives nothing but ordinary tick messages; `receive(7, …)` for a seat nobody holds is ignored.
  - "a hash every sixty ticks": tick message 59 has a `hash` equal to the engine sim's `hash()` after that step; 58 and
    60 have none.
  - "away lets go": seat 2 holds `right`, `away(2)`; seat 1 gets `away { seat: 2 }` and the next tick message carries
    a `controls` from source 2 with `held: []`.
  - "back gets the state": after `away(2)` and 30 steps, `back(2, peer)` sends `seat`, then `sync` with the engine's `tick` and
    bytes that restore on a second `onlineSim()` to the engine sim's hash; later tick messages reach the new peer.
  - "sync on request": `receive(1, { t: 'sync' })` sends seat 1 `sync` and bytes, and seat 2 nothing.
  - "the room's play is a replay": after 120 steps with a few commands, `verifyReplay(await onlineSim(),
    engine.replay())` is `{ ok: true }`, and `replay().meta` is `{ level: 'level-1', players: '1,2', seats: '2' }`.
- [ ] **Step 2: Push; `check` fails.**
- [ ] **Step 3: Write `room-engine.ts`** to "The room's queue rules". The engine owns a `createRecorder(sim)`.
- [ ] **Step 4: Push; every job passes.**
- [ ] **Step 5: Commit** `feat: the room engine`.

### Task 4: The client session

**Files:**
- Create: `src/features/net/link.ts`, `src/features/net/session.ts`, `tests/features/net/session.test.ts`,
  `tests/fixtures/online/wire.ts`
- Modify: `src/features/net/net.ts`

**Interfaces:**
- Consumes: Tasks 2 and 3; `canonicalJson` from `src/lib/canonical.ts`.
- Produces:

```ts
interface Link {
  send(message: ClientMessage): void
  /** One listener; set by the session. `closed` is called once, when the connection ends for any reason. */
  listen(handlers: { message(m: ServerMessage): void; bytes(b: Uint8Array): void; closed(): void }): void
  close(): void
}
interface SessionStats {
  readonly confirmedTick: number; readonly predictedTick: number; readonly lead: number
  readonly rollbacks: number; readonly late: number; readonly desyncs: number; readonly syncs: number
  readonly checked: number                     // hashes that matched the room's
}
type SessionState =
  | { readonly state: 'waiting'; readonly code: string; readonly missing: number }
  | { readonly state: 'playing'; readonly away: readonly number[] }
  | { readonly state: 'closed' }
interface Advance {
  /** In order; the first after a rollback or a sync is a resync. Apply every one. */
  readonly deltas: readonly RenderDelta[]
  /** Events of ticks predicted for the first time; a replayed tick's events are not given twice. */
  readonly events: readonly SimEvent[]
}
interface Session {
  readonly seat: number | undefined
  /** The predicted sim: what a game draws and reads. Never step it. */
  readonly sim: Sim
  state(): SessionState
  stats(): SessionStats
  /** Once per tick of the caller's loop. Only `type` and `payload` of each local command are read. */
  advance(local: readonly Command[]): Advance
  /** Takes over a new link after a drop (the room answers with `seat` and `sync`). */
  resume(link: Link): void
  close(): void
}
function createSession(setup: {
  link: Link
  confirmed: Sim                                // both at tick 0, made the same way
  predicted: Sim
  resendAfterSync?: readonly string[]           // default ['controls']
  onCheck?: (tick: number, hash: string, ok: boolean) => void
  onState?: (state: SessionState) => void
  /** The link ended. The session keeps its state and waits for `resume` or `close`. */
  onLinkClosed?: () => void
}): Session
```

- `tests/fixtures/online/wire.ts`: `createWire(engine: RoomEngine)` gives `link(delay: { up: number; down: number }):
  Link` (each call joins the engine as the next peer) and `pump(): void` (one beat: delivers every message that has
  waited its delay, in the order sent). Also `silence(on: boolean)`, which holds everything from the room back.

- [ ] **Step 1: Write the failing tests** (each builds an engine on one `onlineSim()` and sessions on two more each, and
  disposes them):
  - "predicts at once": after `start`, `advance([controls right])` moves player 1's hero in `session.sim` on the same
    advance, before any tick message has come back.
  - "agrees without a rollback when alone": with `seats: 1` and delays of 1, 120 beats of a scripted hero end with
    `rollbacks: 0`, and once the room stops and the wire drains, `confirmed.hash()` equals the engine sim's.
  - "rolls back for the other player": seat 2's `right` reaches seat 1 as a tick message for a tick seat 1 already
    predicted; `rollbacks` goes up by one, and player 2's hero in seat 1's `session.sim` is where the engine's sim has
    it once the wire drains.
  - "a late command is replayed where the room put it": with seat 1's `up` delay at 12 beats, its command lands later
    than stamped; `late` is 1, `rollbacks` goes up, `lead` rises above `START_LEAD`, and it ends agreeing with the room.
  - "the lead comes back down": 301 confirmed ticks with no late command lower `lead` by 1, and never below 1.
  - "a silent room" (Review Focus 5): with the wire silenced, `predictedTick - confirmedTick` stops at 120 and
    `advance` still returns; unsilenced, play continues and the hashes agree.
  - "far behind asks for the state" (Review Focus 1): 700 beats of the room with no `advance`, then one `advance`:
    the session sends `sync`, `syncs` becomes 1 after the answer arrives, and `confirmedTick` is the room's within two
    advances, not after 700 single steps (assert it took at most `MAX_CONFIRM_PER_ADVANCE` steps on any advance by
    counting the confirmed sim's ticks before and after).
  - "a desync is caught and mended": a link wrapper changes one tick message's `hash`; `onCheck` is called with
    `ok: false`, `desyncs` is 1, a `sync` is sent, and after it `onCheck` is called with `ok: true` again.
  - "after a sync it says what is held": holding `right`, then a `sync`; the next `cmd` the link sees is a `controls`
    with `held: ['right']` and a new `seq`.
  - "resume": the link closes (`state()` stays `playing`), `engine.away(2)`, 60 beats, `engine.back(2, …)` through a
    new link given to `resume`; the session ends agreeing with the room, and seat 1's state listed seat 2 in `away`
    in between.
  - "a refused command is forgotten": a `refused` for a pending `seq` removes it; the next rollback does not replay it.
- [ ] **Step 2: Push; `check` fails.**
- [ ] **Step 3: Write `link.ts` and `session.ts`** to "The client's rules".
- [ ] **Step 4: Push; every job passes.**
- [ ] **Step 5: Commit** `feat: the client session, with prediction and rollback`.

### Task 5: Proof 1, two players on one hash in four engines

**Files:**
- Create: `tests/features/net/two-players.parity.test.ts`, `tests/fixtures/online/script.ts`,
  `tests/fixtures/online/run.ts`, `tests/golden/online-two-players.json`

**Interfaces:**
- Consumes: Tasks 3 and 4, `expectGolden` from `tests/fixtures/golden.ts`.
- Produces: `ONLINE_TICKS = 600`; `onlineScript(seat: number, tick: number): Command[]` (seat 1: hold `right` from
  tick 10, add `jump` at 200, let go at 260; seat 2: hold `left` from 30, add `jump` at 120, let go at 300, hold
  `right` from 400, let go at 520); `runOnline(delays: Record<number, { up: number; down: number }>): Promise<{
  room: Replay; players: SessionStats[]; hashes: string[] }>`. One beat of `runOnline` is: `engine.step()` (until the
  room has stepped `ONLINE_TICKS`), `wire.pump()`, then each session's `advance(onlineScript(seat, predicted tick))`;
  it beats until both sessions have confirmed `ONLINE_TICKS`, and `hashes` are the two confirmed sims' final hashes.

- [ ] **Step 1: Write the test and an empty golden** (`{ "ticks": 600, "finalHash": "", "checks": [] }`):
  - "two players and the room end on the same hash, with a lag and a late command": `runOnline({ 1: { up: 1, down: 1 },
    2: { up: 9, down: 6 } })`. Both `hashes` equal `room.finalHash`; each player's `rollbacks` is above 0; player 2's
    `late` is above 0; every `desyncs` is 0; every `checked` is 10 (ticks 59 to 599); `verifyReplay(await onlineSim(), room)` is
    `{ ok: true }`; and `expectGolden` of the room's replay against the golden file.
  - "with no lag they agree too": `runOnline` with every delay at 1 ends with both `hashes` equal to its own
    `room.finalHash` and `verifyReplay` ok. (Its hash may differ from the laggy run's, because late commands land on
    later ticks; nothing compares the two runs.)
- [ ] **Step 2: Push; the Node job fails `GOLDEN NOT RECORDED`.** Copy the JSON from its log into the golden. Name the
  golden in the commit message.
- [ ] **Step 3: Push; Node, Chromium, WebKit and Firefox all pass.** A browser that differs from Node is a stop.
- [ ] **Step 4: Commit** `test: two online players and the room end on one hash in four engines (new golden
  online-two-players)`.

### Task 6: The room server

**Files:**
- Create: `src/features/server/tick-scheduler.ts` (lifted), `tests/features/server/tick-scheduler.test.ts` (lifted),
  `src/features/server/room.ts`, `src/features/server/room-server.ts`, `src/features/server/server.ts`,
  `src/server.ts`
- Modify: `package.json` (dependencies `@colyseus/core`, `@colyseus/schema`, `@colyseus/ws-transport`), `knip.json`,
  `tests/package.test.ts`

**Interfaces:**
- Consumes: Task 3; `createGameSim`, `type GameSimOptions`, `LevelError` from level.
- Produces:

```ts
interface RoomGame {
  readonly content: GameContent
  readonly plugins?: readonly PluginDef[]
  readonly gravity?: { readonly x: number; readonly y: number }
}
interface RoomServerOptions {
  readonly game: RoomGame
  readonly port?: number          // default 0: the system picks one
  readonly host?: string          // default '127.0.0.1'
  readonly maxRooms?: number      // default DEFAULT_MAX_ROOMS; more than 16 throws
  readonly graceSeconds?: number  // default RECONNECT_GRACE_SECONDS; a test shortens it
  readonly clock?: TickClock      // default the real one (performance.now and setTimeout)
}
interface RoomServer {
  readonly port: number
  /** The play of each open room so far, by code. */
  replays(): Record<string, Replay>
  readonly stats: { rooms: number; late: number; refused: number }
  /** Closes every room and the listener. Resolves when the port is free. */
  close(): Promise<void>
}
function createRoomServer(options: RoomServerOptions): Promise<RoomServer>
```

- The room: on create, parses the options, refuses `server-full` at `maxRooms`, builds the sim with
  `createGameSim({ ...game, level, seed, players: 1..seats })` (a `LevelError` refuses `bad-room` with its message),
  and makes an engine; the room's code is Colyseus's `roomId`. It filters on every `RoomOptions` field. On join it
  calls `engine.join` and refuses with the problem; on a dropped connection `engine.away` and
  `allowReconnection(client, graceSeconds)`, then `engine.back` or `engine.leave`; on a consented leave
  `engine.leave`. It starts a tick scheduler (`tickMs: 1000 / 60`) when the engine starts and stops it, and disposes
  the sim, when the room is disposed. A refusal is an `Error` whose message is `<problem>: <words>`. The transport is
  made with `maxPayload: MAX_MESSAGE_BYTES + 1024`.
- `@colyseus/schema` is installed because `@colyseus/core` requires it beside it; no file imports it, so it goes in
  `knip.json`'s `ignoreDependencies`, and `tests/package.test.ts` says why in a comment and asserts all three are
  dependencies at the exact versions.

- [ ] **Step 1: Lift the scheduler and its test.** Push once; every job passes (the scheduler's test runs; nothing
  else uses the feature yet, so `src/features/server/server.ts` exports only the scheduler). The dependencies wait for
  Step 3, because knip fails a dependency nothing imports.
- [ ] **Step 2: Commit** `feat: the room's tick scheduler, lifted`.
- [ ] **Step 3: Add the three dependencies; write `room.ts`, `room-server.ts`, the entries.** No test of its own here: Task 7 tests it through
  real sockets, and writes those tests first. Run `pnpm lint`, `pnpm typecheck`, `pnpm knip` locally.
- [ ] **Step 4: Do not push Step 3 alone.** It is committed with Task 7's Step 3.

### Task 7: Proof 2, real sockets

**Files:**
- Create: `src/features/net/colyseus-link.ts`, `src/features/net/join.ts`,
  `tests/features/net/colyseus-link.test.ts`, `tests/features/net/lazy-load.test.ts`,
  `tests/features/server/room-server.test.ts`, `tests/fixtures/online/headless-player.ts`
- Modify: `src/features/net/net.ts`, `package.json` (dependency `@colyseus/sdk`)

**Interfaces:**
- Consumes: Tasks 2, 4, 6.
- Produces:

```ts
/** Thrown when a room cannot be joined or the connection is lost for good. `message` is the plain words. */
class OnlineError extends Error { readonly problem: OnlineProblem }
interface Joined {
  readonly session: Session
  readonly code: string
  /** Tries once to get back into the seat after a drop. Rejects with OnlineError('lost') once the grace is over. */
  rejoin(): Promise<void>
  leave(): void
}
function joinSession(options: {
  server: string                               // ws:// or wss:// address
  room?: string                                // a code: join that room; without one, join or make
  level: string
  seats: number
  confirmed: Sim
  predicted: Sim
  wrapLink?: (link: Link) => Link              // a test's lag, a debug tool
  resendAfterSync?: readonly string[]
  onCheck?: (tick: number, hash: string, ok: boolean) => void
  onState?: (state: SessionState) => void
  onLinkClosed?: () => void
}): Promise<Joined>
```

- `colyseus-link.ts`: `connect(server, room, options): Promise<{ link: Link; code: string; reconnect(): Promise<Link> }>`.
  With a code it calls the SDK's `joinById(code, options)`, without one `joinOrCreate(ROOM_NAME, options)`, and
  `reconnect` uses the room's `reconnectionToken`. It is the only file that names the SDK, by
  `await import('@colyseus/sdk')`, uses a structural slice of the SDK's
  room (as the old `sdk.ts` does) so a test hands in a fake, switches the SDK's own retry off, and maps a rejected
  join to `OnlineError`: the problem is the message's prefix up to the colon when it is an `OnlineProblem`, `no-room`
  when a code is not found, and `no-server` when nothing answered.
- `tests/fixtures/online/headless-player.ts`: `headlessPlayer(setup: { server: string; room?: string; seats: number;
  lagMs?: number; script: (seat: number, tick: number) => Command[] }): Promise<{ joined: Joined; checks: Map<number,
  string>; stop(): void }>`. It makes two `onlineSim(seats)`s, joins, and calls `advance` on a 60 Hz timer; `lagMs` wraps
  the link so every message each way waits that long.

- [ ] **Step 1: Write the failing tests.**
  - `colyseus-link.test.ts`, on a fake SDK room: a message on `m` that parses reaches `message`, one that does not is
    dropped; bytes on `b` reach `bytes`; the SDK's leave calls `closed` once; a rejected join whose message is
    `room-full: …` throws `OnlineError` with `problem: 'room-full'`.
  - `lazy-load.test.ts` (the pattern of `tests/features/physics/lazy-load.test.ts`): importing `#src/headless.ts`
    loads no `@colyseus/sdk`; `joinSession` does.
  - `room-server.test.ts`, each test on `createRoomServer({ game })` at port 0, closed after:
    - **"two players over real sockets end on the same hash, rollback included"**: player 1 with no lag, player 2
      with `lagMs: 120`, both on `onlineScript`. Wait (on what arrived, never a sleep, 30 s at most) until both have
      a check for tick 599. Then: the two hashes for 599 are equal, and equal the check for tick 600 in
      `server.replays()[code]`; each player's `rollbacks` is above 0; `server.stats.late` is above 0; every
      `desyncs` is 0; and after the players leave, `verifyReplay(await onlineSim(), thatReplay)` is `{ ok: true }`.
    - "a second player joins by code": player 1 joins with no code, is `waiting` with `missing: 1`; player 2 joins
      with `joined.code`; both become `playing`.
    - "another version is refused" (Review Focus 4): a player whose sims are made without `heroPlugin` joins by code
      and gets `OnlineError` with `problem: 'different-version'`; the room still shows `missing: 1`.
    - "a full room, a wrong code, no server": `room-full`, `no-room`, and (after `close()`) `no-server`.
    - "a level with no start for player 3 cannot be a room": `seats: 3` gives `bad-room`, and the message names the
      level.
    - "the server is full": with `maxRooms: 1`, a second room (another `seed`) gives `server-full`.
    - **"a dropped connection gets back in"** (Review Focus 2): both playing; player 2's link is closed from the
      test (not a leave); player 1's state lists seat 2 in `away`; `rejoin()` resolves; player 1's `away` is empty;
      both players reach a later check with equal hashes; player 2's `syncs` is 1.
    - "the seat is kept only for the grace": on a server with `graceSeconds: 1`, player 2's link is closed and the
      test waits 1.5 seconds (the one wait on time in this plan: the grace is Colyseus's own timer); `rejoin()` then
      rejects with `problem: 'lost'`, and player 1 reaches a later check.
    - "close frees the port": after `close()`, a new server can listen on the same port.
- [ ] **Step 2: Push the tests with Task 6's Step 3 held back; `check` fails** ("Cannot find module" for
  `colyseus-link.ts`).
- [ ] **Step 3: Write `colyseus-link.ts` and `join.ts`; push with Task 6's Step 3. Every job passes.** If the two-player
  test is ever red and then green on a rerun, that is a defect to find, not a flake: stop and report.
- [ ] **Step 4: Commit** `feat: the room server and joining it, proven over real sockets`.

### Task 8: The server process and the package's third entry

**Files:**
- Create: `src/features/server/process.ts`, `tests/features/server/process.test.ts`,
  `tests/fixtures/online/server.ts`, `tests/install/server-smoke.mjs`
- Modify: `src/features/server/server.ts`, `package.json` (dependency `effect`; export `./server`), `vite.config.ts`
  (entry `server: 'src/server.ts'`; `node:` modules external), `scripts/api-report.ts` (the `./server` entry),
  `docs/api/framework.api.md` (`pnpm api-report --update`), `tests/package.test.ts`, `tests/public-surface.test.ts`,
  `.github/workflows/ci.yml` (the `package` job runs the new smoke)

**Interfaces:**
- Consumes: Task 6.
- Produces: `runRoomServer(options: RoomServerOptions): Promise<never>`. An Effect program: it reads the port from
  `options.port`, else the `PORT` variable, else 0; a `PORT` that is not a whole number from 0 to 65535 ends the
  process with code 1 and one line on stderr, `PORT must be a whole number from 0 to 65535, but it is "<value>".`; it
  starts the server in a scope, prints exactly one line on stdout, `{"event":"listening","port":<n>}`; on SIGTERM or
  SIGINT it closes the scope (every room closes), prints `{"event":"stopped"}` and exits 0. Effect appears nowhere
  else.
- `tests/fixtures/online/server.ts`: the fixture game's server, as a game would write it. Plain Node runs it, so it
  reads the fixture game's files from disk with `node:fs` (the `?raw` imports of `tests/fixtures/game/read.ts` are
  Vite's and do not load in Node), swaps in `twoPlayerLevel`, calls `loadGame`, then
  `await runRoomServer({ game: { content, plugins: [heroPlugin] } })`. `scripts/write-schemas.ts` already runs `src/`
  under plain Node; if this file cannot be run that way, stop and report rather than adding a build step.

- [ ] **Step 1: Write the failing tests.**
  - `process.test.ts` spawns `node tests/fixtures/online/server.ts` (Node 24 runs the TypeScript as it is): reads the
    `listening` line and its port; a headless player with `seats: 1` joins that port and reaches a check; SIGTERM
    gives `{"event":"stopped"}` and exit code 0 within 5 seconds. With `PORT=abc` the process exits 1 with the line
    above.
  - `tests/package.test.ts`: `exports['./server']` is `{ types: './dist/server.d.ts', import: './dist/server.js' }`,
    and `effect` and `@colyseus/sdk` are dependencies at the exact versions.
  - `tests/public-surface.test.ts`: `#src/server.ts` exports `createRoomServer` and `runRoomServer`; `#src/headless.ts`
    exports `joinSession`, `createSession`, `createRoomEngine`, `OnlineError`, `PROTOCOL_VERSION` and `onlineWords`
    (Task 9 adds the last; add its line there).
  - `tests/install/server-smoke.mjs`, run by the `package` job after `smoke.mjs`: from the packed package, in the
    empty folder, `createRoomServer` on the copied fixture game with no game plugins, one `joinSession` with
    `seats: 1` on two `createGameSim`s, advanced on a 60 Hz timer with no commands until the check for tick 59
    arrives; that hash must be `push-crate.json`'s `idleHash60` (the same sim, the same sixty idle ticks, this time
    through a socket). It closes everything and exits 0, or prints both hashes and exits 1.
- [ ] **Step 2: Push; `check` and `package` fail.**
- [ ] **Step 3: Write `process.ts`, the build entry and the exports; update the API report.** Run `pnpm build` locally
  and check `dist/server.js` and `dist/server.d.ts` exist and that `dist/index.js` and `dist/headless.js` contain
  neither `@colyseus/core` nor `effect`.
- [ ] **Step 4: Push; every job passes.**
- [ ] **Step 5: Commit** `feat: runRoomServer and the package's server entry`.

### Task 9: A page in a room

**Files:**
- Create: `src/features/net/words.ts`, `tests/features/net/words.test.ts`, `src/features/game/online.ts`,
  `tests/features/game/online.browser.test.ts`
- Modify: `src/features/net/net.ts`, `src/features/game/game.ts` (one export line)

**Interfaces:**
- Consumes: Tasks 4 and 7; `createInput`, `createRenderer`, `createLoop`, `Host` as `startGame` uses them.
- Produces:

```ts
type OnlineStatus =
  | { readonly state: 'waiting'; readonly code: string; readonly missing: number }
  | { readonly state: 'playing'; readonly away: readonly number[] }
  | { readonly state: 'reconnecting' }
  | { readonly state: 'ended'; readonly problem: OnlineProblem }
/** The plain English for a status; '' while playing with everyone here. Plan L translates these. */
function onlineWords(status: OnlineStatus): string

interface OnlineOptions extends Omit<GameOptions, 'players' | 'level'> {
  readonly server: string
  readonly room?: string
  readonly level?: string                       // default the project's start
  readonly seats?: number                       // default 2; used when this page makes the room
  readonly onStatus?: (status: OnlineStatus) => void
  readonly onCheck?: (tick: number, hash: string, ok: boolean) => void
  readonly wrapLink?: (link: Link) => Link
  /** Default `joinSession`. A test joins a room that lives in the page. */
  readonly join?: typeof joinSession
}
interface OnlineGame {
  readonly sim: Sim                             // the predicted sim
  readonly seat: number
  readonly code: string
  status(): OnlineStatus
  stats(): SessionStats
  /** Leaves the room, removes the canvas and the controls, disposes both sims. Safe to call twice. */
  leave(): void
}
/** Rejects with OnlineError, leaving nothing on the page, if the room cannot be joined. */
function startOnlineGame(options: OnlineOptions): Promise<OnlineGame>
```

- The words, exactly:

| Status | Words |
|---|---|
| `waiting`, 1 missing | `Waiting for 1 more player. Share this code so a friend can join: <code>` |
| `waiting`, n missing | `Waiting for <n> more players. Share this code so friends can join: <code>` |
| `playing`, nobody away | (empty) |
| `playing`, one away | `Player <n> lost their connection. The game goes on.` |
| `playing`, more away | `Players <a> and <b> lost their connection. The game goes on.` (commas before the last, as `spawn-level.ts` writes a list) |
| `reconnecting` | `Connection lost. Trying to get you back in.` |
| `ended: different-version` | `This game is a different version from the room. Reload the page to get the newest one, then join again.` |
| `ended: room-full` | `That room is full. Start a new room, or ask for another code.` |
| `ended: no-room` | `No room has that code. Check the code and try again.` |
| `ended: server-full` | `The server has no space for another room right now. Try again in a minute.` |
| `ended: bad-room` | `That room could not be made. Check the level and the number of players.` |
| `ended: no-server` | `Could not reach the game server. Check your internet and try again.` |
| `ended: lost` | `The connection was lost and could not be got back. Start or join a room to play again.` |

- `startOnlineGame` is `startGame`'s wiring with a session in the middle: both sims from `createGameSim` with
  `players: 1..seats`; the input is made for the seat the room gave; each loop step calls
  `session.advance(input.poll(session.sim.tick))` and applies every delta. It never pauses: while the host says the
  page is hidden the loop stops as today, and on return the session catches up or syncs. When the link closes it
  reports `reconnecting` and calls `rejoin()` after each of `RECONNECT_DELAYS_MS` (`setTimeout`: `game` is a page
  feature, not a pure one), then `ended: lost`.

- [ ] **Step 1: Write the failing tests.**
  - `words.test.ts`: one assertion per row of the table, and that no string holds any of `socket`, `server tick`,
    `desync`, `rollback`, `sync` or `seat`.
  - `online.browser.test.ts` (three engines), with `join` given a function that joins a `createRoomEngine` in the page
    through the scripted wire, stepped by the test:
    - "waiting, then playing": `onStatus` gets `waiting` with the code and `missing: 1`, then `playing` when a second
      scripted session joins; the canvas is in the mount.
    - "the other player moves on my screen": the scripted player holds `right`; after the wire is pumped, player 2's
      hero in `game.sim` has moved right of 13.5.
    - "my key moves me before the room answers": a `keydown` of `ArrowRight` moves player 1's hero within two frames
      with the wire silenced.
    - "the input is for my seat": joining second gives `seat: 2`, and the page's `ArrowRight` moves player 2's hero.
    - "a refused join leaves nothing": `join` rejecting with `OnlineError('room-full')` rejects `startOnlineGame`
      with it, and the mount is empty.
    - "leave": the canvas and the touch buttons are gone, a second `leave()` does nothing, and both sims are disposed.
    - "reconnecting, then lost": the link closes and `rejoin` always rejects; statuses are `reconnecting`, then
      `ended: lost`, with Vitest's fake timers driving the delays.
    - a phone-size picture (390 by 844) of two heroes in a room, saved to `__screenshots__` for the drunk-grandma
      read, as the M1 browser tests do.
- [ ] **Step 2: Push; `check` and the engines fail.**
- [ ] **Step 3: Write `words.ts` and `online.ts`.**
- [ ] **Step 4: Push; every job passes.**
- [ ] **Step 5: Commit** `feat: startOnlineGame, a page in a room`.

### Task 10: Proof 3, two real browsers and a server CI starts

**Files:**
- Create: `tests/journeys/online.journey.test.ts`, `tests/fixtures/online/page/index.html`,
  `tests/fixtures/online/page/main.ts`, `tests/workflows/online.test.ts`
- Modify: `vitest.config.ts` (a fifth project, `journeys`: Node, `tests/journeys/**/*.journey.test.ts`, test timeout
  120 s; the `node` project excludes `**/*.journey.test.ts`), `package.json` (script `"test:journeys": "vitest run
  --project journeys"`), `.github/workflows/ci.yml` (job `online`), `knip.json` (the page's `main.ts` as an entry)

**Interfaces:**
- Consumes: Tasks 8 and 9; `playwright` and `vite`, both already development dependencies.
- Produces:
  - The page: reads `?server=`, `?room=` and `?seats=` from its address, calls `startOnlineGame` on the fixture's
    online game with `fixtureControls`, and shows what a test reads: `#status` holds `onlineWords(status)`; `#game`
    carries `data-state`, `data-seat`, `data-code`, `data-rollbacks`, `data-p1-x`, `data-p2-x` (from the predicted
    sim, each frame) and `data-check-<tick>` for each hash that matched; `data-built-code` holds the JSON list from
    `attemptsToBuildCode` wrapped round the whole join (`tests/fixtures/strict-csp.ts`), so the SDK is held to the
    no-eval promise in each engine. `window.dropConnection()` closes the link without leaving, through `wrapLink`.
  - The journey, in Node: starts `node tests/fixtures/online/server.ts` as a child process and reads its port; starts
    Vite's dev server on `tests/fixtures/online/page` (port 0, no config file, `server.fs.allow` the repo's root so the
    page can import `#src/index.ts`); launches browsers with Playwright;
    stops all three after.
  - The `online` CI job: checkout, pnpm, Node 24.21.0, install, `pnpm exec playwright install --with-deps chromium
    webkit firefox`, `pnpm test:journeys`, and uploads `tests/journeys/__screenshots__/**` as `screens-online`
    (the `screens` job's pattern `screens-*` then copies it to `ci-screens`; add `online` to that job's `needs`).

- [ ] **Step 1: Write the failing journey**, once per pair:

  | Player 1 | Player 2 |
  |---|---|
  | Chromium, 1280 by 720, keyboard | WebKit, 390 by 844, touch |
  | WebKit, 1180 by 820, touch | Firefox, 1280 by 720, keyboard |
  | Firefox, 844 by 390, touch | Chromium, 820 by 1180, touch |

  1. Player 1 opens the page with no room. `#status` reads `Waiting for 1 more player. Share this code so a friend
     can join: <code>`, and `data-code` is that code.
  2. Player 2 opens the page with `?room=<code>`. Both `#status` are empty and both `data-state` are `playing`;
     `data-seat` is 1 and 2.
  3. Player 1 holds right (the `ArrowRight` key, or a touch on the button `[data-action='right']`) for a second;
     player 2 holds left for a second, then presses jump.
  4. On player 1's page `data-p2-x` goes below 13.5; on player 2's page `data-p1-x` goes above 2.5. Each sees the
     other move.
  5. Both pages get `data-check-599`, and the two values are equal. Both `data-rollbacks` are above 0. Both
     `data-built-code` are `[]`.
  6. Player 2's page calls `dropConnection()`. Its `#status` reads `Connection lost. Trying to get you back in.`;
     player 1's reads `Player 2 lost their connection. The game goes on.` Then both are empty again, and both pages
     get a later check (`data-check-1199` or the next after the return) with equal values.
  7. A third browser page opens `?room=<code>`: `#status` reads `That room is full. Start a new room, or ask for
     another code.`
  8. A page opened with `?room=NOPE` reads `No room has that code. Check the code and try again.`
  9. A picture of each player's page after step 4 is saved as `online-<engine1>-<engine2>-p<n>.png`.

  `tests/workflows/online.test.ts` reads `ci.yml`: the `online` job installs all three browsers, runs
  `pnpm test:journeys`, has no `contents: write`, and `screens` needs it.
- [ ] **Step 2: Push; `online` fails** (no page), the rest pass.
- [ ] **Step 3: Write the page and the job.**
- [ ] **Step 4: Push; every job passes, `online` included.** Read the six pictures on the `ci-screens` branch
  (`pr-<number>/online/`) and say in the report whether two heroes and the buttons are plain to see at phone size.
- [ ] **Step 5: Commit** `test: two real browsers play together against a server CI starts`.

### Task 11: Coming and going, with plan I's commands

**Starts only after plan I (`docs/superpowers/plans/2026-11-14-m2-input.md`) has merged to `main`.** If it has not
when Task 10 is done, report to the coordinator, go on to Task 12, and leave this task for a later session; the tracker
then says so.

**Files:**
- Modify: `src/features/net/room-engine.ts`, `src/features/net/session.ts`, `src/features/server/room.ts`,
  `tests/features/net/room-engine.test.ts`, `tests/features/net/session.test.ts`,
  `tests/features/server/room-server.test.ts`, `tests/fixtures/online/game.ts`, `tests/fixtures/online/server.ts`,
  `tests/fixtures/online/page/main.ts`, `tests/journeys/online.journey.test.ts`

**Interfaces:**
- Consumes: plan I's `JoinCommand`, `LeaveCommand`, `playersIn` and the project's optional `players` (from the level
  and content entries), and its fixture `tests/fixtures/game/co-op.ts` (`coopFiles`: `players = 4`, four starts).
- Produces, with no new exported name:
  - **The engine with `seatCommands`.** The room starts on the first join: no `waiting`, `start` goes to the first
    player at once. Every join, the first included, queues the `join` command from that seat for the next tick, and
    the player gets `seat`, then `sync` and the bytes, exactly as `back` sends them (a room at tick 0 included).
    `leave(seat)` queues the `leave` command from that seat. `away` and `back` are unchanged: a dropped player's hero
    stands still for the grace, and is taken out only when the grace ends. Server-made commands take that seat's
    next `seq`, so a replay of the room holds them in order.
  - **The room** passes `seatCommands: { join: JoinCommand.id, leave: LeaveCommand.id }` when the game's project has
    `players`. Its sim is then made with `players: []` (everyone arrives by `join`), `RoomOptions.seats` must equal
    the project's `players` (else `bad-room`), and the replay's `meta.players` is `""`. If `createGameSim` refuses an
    empty list of players, stop and report.
  - **A client of a co-op game** makes its two sims with `players: []` too. `joinSession` and `startOnlineGame` take
    `seats` from the project's `players` when it has one. The session already starts from a `sync`.
  - `tests/fixtures/online/game.ts` gains `loadCoopGame()` and `coopSim()` (plan I's `coopFiles`, `heroPlugin`, no
    players); `server.ts` serves the co-op game when started with `--co-op`; the page uses it with `?game=co-op`.

- [ ] **Step 1: Write the failing tests.**
  - Engine: "a co-op room starts with one player" (join 1: `seat`, `start`, `sync`; the tick message for the next
    tick carries a `join` from source 1; `playersIn` of the engine's sim is `[1]` after it); "a second player joins
    a game that is going" (after 90 steps, join 2: its `sync` restores on a fresh `coopSim()` to the engine's hash,
    the next tick message carries `join` from source 2, and seat 1's session shows player 2's hero after a rollback
    or on the confirmed tick); "leaving takes the hero out" (`leave(2)`: a `leave` from source 2 is relayed, and
    `playersIn` is `[1]`); "away keeps the hero" (`away(2)`: no `leave` is relayed); "the fifth player is refused"
    (`room-full`); "the room's co-op play is a replay" (`verifyReplay(await coopSim(), engine.replay())` is ok, with
    the `join` and `leave` commands in it).
  - Session: "a player who joins late starts from the state" (its first advance after the `sync` has
    `confirmedTick` at the room's tick, never replaying from 0).
  - Real sockets: **"a third player joins a game already going, and one leaves"**: players 1 and 2 play
    `onlineScript`; after both have the check for tick 119, player 3 joins by code with `lagMs: 120`; after the
    check for tick 359, player 2 leaves. Players 1 and 3 get the check for tick 599 with equal hashes, equal to the
    room's replay's; `desyncs` are 0; `verifyReplay(await coopSim(), thatReplay)` is ok, and the replay holds three
    `join` commands and one `leave`. And "a room for 2 in a game for 4 cannot be made" (`bad-room`).
  - Journey, one more pair (Chromium 1280 by 720 with WebKit 390 by 844), on the co-op server: player 1 opens the
    page and `data-state` is `playing` at once with an empty `#status`; three seconds later player 2 opens
    `?room=<code>`; each page shows the other's hero move; both get an equal later check; player 2 closes its page
    and, after the grace (the co-op fixture server runs with `graceSeconds: 2`), player 1's page shows one hero
    (`data-players="1"`) and an empty `#status`.
- [ ] **Step 2: Push; `check` and `online` fail** on the new cases; every earlier test passes.
- [ ] **Step 3: Implement.** No change to the lobby path: a game without `players` behaves as Tasks 3 to 10 left it,
  and `tests/golden/online-two-players.json` must not move.
- [ ] **Step 4: Push; every job passes.**
- [ ] **Step 5: Commit** `feat: players join and leave a room that is going, by the sim's own commands`.

### Task 12: The docs, and what the Owner does after

**Files:**
- Modify: `README.md`, `tests/docs/readme.test.ts`, `CLAUDE.md` (Structure), `docs/superpowers/progress.md`

- [ ] **Step 1: Write the failing README test**: the README has a section `## Play online` that contains
  `runRoomServer`, `startOnlineGame`, `@automataframework/framework/server` and `onlineWords`, each of which the
  package exports, and the sentence `Online play is built and checked in CI. It is not deployed anywhere yet.`
- [ ] **Step 2: Push; `check` fails.**
- [ ] **Step 3: Write the section**, short, in the README's voice: the five-line `server.ts` of a game; `node
  server.ts` and the line it prints; `startOnlineGame({ ...the options of startGame, server: 'ws://localhost:<port>'
  })`; how a friend joins with the code; where the words for each status come from; that the room's play is an
  ordinary replay (`server.replays()`); and the sentence above. Add `src/server.ts`, `tests/journeys/` and the two
  features to `CLAUDE.md`'s Structure, with the rule that only `src/server.ts` reaches the server feature.
- [ ] **Step 4: Update the tracker** (this plan's row to "Execution: done, 100%, in review") and push; every job
  passes.
- [ ] **Step 5: Commit** `docs: play online, in the README and the structure`.
- [ ] **Step 6: Report to the coordinator**, with the summary and these for the Owner:
  - The new check `online` is not a required check until the Owner adds it. The command, to run after the merge:
    `gh api repos/mcthaydt/AutomataFramework/branches/main/protection/required_status_checks/contexts -X POST -f
    'contexts[]=online'`.
  - Notes for other plans: plan L translates `onlineWords`; plan U shows them on a screen; plan D takes the step
    under "Handoff to plan D"; plan K's `automata` command may wrap `runRoomServer` later.
  - Whether Task 11 was done, or is waiting for plan I.

## Self-review

- **Spec coverage.** The room server as `@automataframework/framework/server`, on Colyseus, with Effect for its
  process: Tasks 6 and 8. The client, with prediction and rollback: Task 4. Periodic hashes catching a desync: Tasks
  3 and 4. "A room server and two headless players end on the same hash, with a lag and a late command forced so
  that rollback runs": Task 5 (scripted, four engines) and Task 7 (real sockets). "A journey with two real browsers
  against a server CI starts": Task 10. "The demo does not go online": nothing here touches Examples. The protocol
  and the snapshot on the wire: "The protocol". The replay format: unchanged, and said so.
- **Plan I's commands.** Task 11 uses `join` and `leave` (the spec's "the same numbered commands the room server
  relays"), and is the only task that waits on another plan; the spec's rule is that a plan which depends on another
  says so and runs in order, and this one says so for one task only.
- **Not decided here, on purpose:** nothing is left as "to be decided". Smoothing a correction is named with its
  owner, the deploy plan.

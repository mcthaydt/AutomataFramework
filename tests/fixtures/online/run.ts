// The scripted two-player run: a room engine, two client sessions and the scripted wire between them, driven beat by
// beat (see wire.ts for what a beat is). Everything is deterministic, so the room's replay is the same in every engine.
import type { Replay } from '#src/features/commands/commands.ts'
import { createRoomEngine, createSession, type SessionStats } from '#src/features/net/net.ts'
import type { Command, Sim } from '#src/features/sim/sim.ts'
import { onlineSim } from './game.ts'
import { ONLINE_TICKS, onlineScript } from './script.ts'
import { createWire, type Delay } from './wire.ts'

export interface OnlineRun {
  /** The room's own play. */
  readonly room: Replay
  readonly players: readonly SessionStats[]
  /** Each player's confirmed sim's hash at the end. */
  readonly hashes: readonly string[]
}

/** What else a run may change: the game it plays (a sim for both seats), its level, what each seat does, how long. */
export interface OnlineGame {
  readonly make: () => Promise<Sim>
  readonly level: string
  readonly script: (seat: number, tick: number) => Command[]
  readonly ticks: number
}

const FIXTURE_GAME: OnlineGame = {
  make: () => onlineSim(2),
  level: 'level-1',
  script: onlineScript,
  ticks: ONLINE_TICKS,
}

/**
 * Plays `game.ticks` ticks (default the fixture game's `ONLINE_TICKS`) with two players, whose lines to the room have
 * the delays given (by seat).
 */
export async function runOnline(
  delays: Readonly<Record<number, Delay>>,
  game: OnlineGame = FIXTURE_GAME,
): Promise<OnlineRun> {
  const sims: Sim[] = []
  const make = async (): Promise<Sim> => {
    const s = await game.make()
    sims.push(s)
    return s
  }
  try {
    const engine = createRoomEngine({ sim: await make(), level: game.level, seats: 2 })
    const wire = createWire(engine)
    const players = []
    for (const seat of [1, 2]) {
      const link = wire.link(delays[seat] ?? { up: 1, down: 1 })
      const confirmed = await make()
      const predicted = await make()
      players.push({ seat, confirmed, session: createSession({ link, confirmed, predicted }), given: 0 })
    }
    for (let beat = 0; beat < 10 * game.ticks; beat++) {
      wire.pump()
      if (engine.tick < game.ticks) engine.step()
      for (const p of players) {
        // The script is by predicted tick; a tick the session stepped several of at once is not skipped.
        const local = []
        for (; p.given <= p.session.sim.tick; p.given++) local.push(...game.script(p.seat, p.given))
        p.session.advance(local)
      }
      if (players.every((p) => p.confirmed.tick >= game.ticks)) break
    }
    return {
      room: engine.replay(),
      players: players.map((p) => p.session.stats()),
      hashes: players.map((p) => p.confirmed.hash()),
    }
  } finally {
    for (const s of sims) s.dispose()
  }
}

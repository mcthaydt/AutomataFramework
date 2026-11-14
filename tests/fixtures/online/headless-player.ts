// A player with no page: two sims, a real socket to a room server, and a 60 Hz timer that plays a script. The tests of
// the room server use it to prove that real sockets, real timers and a lag each way still end on one hash.
import type { Link } from '#src/features/net/link.ts'
import { type Joined, joinSession } from '#src/features/net/net.ts'
import type { Command, Sim } from '#src/features/sim/sim.ts'
import { onlineSim } from './game.ts'

export interface HeadlessPlayer {
  readonly joined: Joined
  /** The hash of every tick the room sent one for, by tick, as this player computed it. */
  readonly checks: Map<number, string>
  /** The newest line to the room, wrapped as it was given to the session: `drop` ends it like a network failure. */
  drop(): void
  stop(): void
}

export interface HeadlessSetup {
  readonly server: string
  readonly room?: string
  readonly seats: number
  /** Every message, each way, waits this long. */
  readonly lagMs?: number
  readonly script: (seat: number, tick: number) => Command[]
  /** Makes each of the two sims; default the online game for `seats` players with the hero code. */
  readonly makeSim?: () => Promise<Sim>
}

/** Delays everything each way by the same time, so it arrives in the order sent. */
function lagged(link: Link, ms: number): Link {
  const later = (run: () => void): void => void setTimeout(run, ms)
  return {
    send: (m) => later(() => link.send(m)),
    listen: (h) =>
      link.listen({
        message: (m) => later(() => h.message(m)),
        bytes: (b) => later(() => h.bytes(b)),
        closed: () => h.closed(),
      }),
    close: () => link.close(),
    ...(link.drop === undefined ? {} : { drop: () => link.drop?.() }),
  }
}

export async function headlessPlayer(setup: HeadlessSetup): Promise<HeadlessPlayer> {
  const make = setup.makeSim ?? (() => onlineSim(setup.seats))
  const confirmed = await make()
  const predicted = await make()
  const checks = new Map<number, string>()
  let line: Link | undefined
  let timer: ReturnType<typeof setInterval> | undefined
  const dispose = (): void => {
    confirmed.dispose()
    predicted.dispose()
  }
  let joined: Joined
  try {
    joined = await joinSession({
      server: setup.server,
      ...(setup.room === undefined ? {} : { room: setup.room }),
      level: 'level-1',
      seats: setup.seats,
      confirmed,
      predicted,
      wrapLink: (link) => {
        line = setup.lagMs === undefined ? link : lagged(link, setup.lagMs)
        return line
      },
      onCheck: (tick, hash) => void checks.set(tick, hash),
    })
  } catch (error) {
    dispose()
    throw error
  }
  let given = 0
  timer = setInterval(() => {
    const { session } = joined
    const seat = session.seat
    const local: Command[] = []
    if (seat !== undefined)
      for (; given <= session.sim.tick; given++) local.push(...setup.script(seat, given))
    session.advance(local)
  }, 1000 / 60)
  return {
    joined,
    checks,
    drop: () => line?.drop?.(),
    stop() {
      if (timer === undefined) return
      clearInterval(timer)
      timer = undefined
      joined.leave()
      dispose()
    },
  }
}

/** Waits, polling, until `condition` holds; throws, saying what it waited for, after `ms`. Never a fixed sleep. */
export async function until(what: string, condition: () => boolean, ms = 30_000): Promise<void> {
  const end = Date.now() + ms
  while (!condition()) {
    if (Date.now() > end) throw new Error(`Gave up waiting for ${what}.`)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

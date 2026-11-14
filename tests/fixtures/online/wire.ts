// The scripted wire: stands between sessions and a room engine with a delay each way, counted in beats, and delivers
// everything in the order it was sent. No sockets and no clock, so a test says exactly which message arrives when.
//
// One beat, in every test that uses this, is in this order: `wire.pump()`, then `engine.step()`, then each session's
// `advance`. Delivering before the room steps is what makes START_LEAD 2 enough for delays of 1 each way: a command
// stamped for the tick after the confirmed one, sent at beat j, reaches the room at beat j + 1 before it steps that
// tick. With the room stepping first, the same command is one tick late.
import type { Link } from '#src/features/net/link.ts'
import type { ClientMessage, RoomEngine, RoomPeer, ServerMessage } from '#src/features/net/net.ts'

export interface Delay {
  readonly up: number
  readonly down: number
}

export interface Wire {
  /** Each call joins the engine as the next player and gives that player's end of the line. */
  link(delay: Delay): Link
  /** The same player on a new line after `drop`: the engine's `back`. */
  relink(seat: number, delay: Delay): Link
  /** The line of `seat` ends: its session hears `closed`, and the engine is told the player is away. */
  drop(seat: number): void
  /** Delivers every message that has waited its delay, in the order sent. A delay of `d` is the `d`th pump after. */
  pump(): void
  /** While on, nothing from the room is delivered; it is held and arrives, in order, when this goes off. */
  silence(on: boolean): void
}

interface Entry {
  readonly at: number
  readonly deliver: () => void
}

export function createWire(engine: RoomEngine): Wire {
  let now = 0
  let silenced = false
  const up: Entry[] = []
  const down: Entry[] = []
  type Handlers = Parameters<Link['listen']>[0]
  interface End {
    dead: boolean
    seat: number | undefined
    handlers: Handlers | undefined
  }
  const ends = new Map<number, End>()

  function attach(delay: Delay, join: (peer: RoomPeer) => number | undefined): Link {
    const end: End = { dead: false, seat: undefined, handlers: undefined }
    // Messages the room sends before the session has listened are held, as the real link holds them.
    const early: (() => void)[] = []
    const toSession = (run: (h: Handlers) => void): void => {
      down.push({
        at: now + delay.down,
        deliver: () => {
          if (end.dead) return
          if (end.handlers === undefined) early.push(() => end.handlers && run(end.handlers))
          else run(end.handlers)
        },
      })
    }
    const peer: RoomPeer = {
      send: (m: ServerMessage) => {
        const copy = JSON.parse(JSON.stringify(m)) as ServerMessage
        toSession((h) => h.message(copy))
      },
      sendBytes: (b: Uint8Array) => {
        const copy = new Uint8Array(b)
        toSession((h) => h.bytes(copy))
      },
    }
    end.seat = join(peer)
    if (end.seat !== undefined) ends.set(end.seat, end)
    return {
      send(m: ClientMessage) {
        if (end.dead) return
        const copy = JSON.parse(JSON.stringify(m)) as ClientMessage
        up.push({
          at: now + delay.up,
          deliver: () => {
            if (!end.dead && end.seat !== undefined) engine.receive(end.seat, copy)
          },
        })
      },
      listen(handlers) {
        end.handlers = handlers
        for (const run of early.splice(0)) run()
      },
      close() {
        end.dead = true
      },
    }
  }

  return {
    link: (delay) =>
      attach(delay, (peer) => {
        const joined = engine.join(peer, engine.options, 'ROOM')
        return 'seat' in joined ? joined.seat : undefined
      }),
    relink: (seat, delay) =>
      attach(delay, (peer) => {
        engine.back(seat, peer)
        return seat
      }),
    drop(seat) {
      const end = ends.get(seat)
      if (end === undefined) return
      end.dead = true
      end.handlers?.closed()
      engine.away(seat)
    },
    pump() {
      now++
      const due = (list: Entry[]): void => {
        const ready = list.filter((e) => e.at <= now)
        list.splice(0, list.length, ...list.filter((e) => e.at > now))
        for (const e of ready) e.deliver()
      }
      due(up)
      if (!silenced) due(down)
    },
    silence(on) {
      silenced = on
    },
  }
}

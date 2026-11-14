// The room server: an HTTP listener with Colyseus's WebSocket transport on it and one room type, `game`. Nothing here
// runs a process (signals, exit codes, the port from the environment): that is `process.ts`, on Effect.
import { createServer, type Server as HttpServer } from 'node:http'
import { Server } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import type { Replay } from '../commands/commands.ts'
import { DEFAULT_MAX_ROOMS, MAX_MESSAGE_BYTES, RECONNECT_GRACE_SECONDS, ROOM_NAME } from '../net/net.ts'
import { type OpenRoom, type RoomContext, type RoomGame, roomClassFor } from './room.ts'
import type { TickClock } from './tick-scheduler.ts'

export interface RoomServerOptions {
  readonly game: RoomGame
  /** Default 0: the system picks one. */
  readonly port?: number
  /** Default `127.0.0.1`. */
  readonly host?: string
  /** Default `DEFAULT_MAX_ROOMS`; more than 16 throws, because Koota allows 16 worlds in a process. */
  readonly maxRooms?: number
  /** How long a dropped player's seat is kept. Default `RECONNECT_GRACE_SECONDS`; a test shortens it. */
  readonly graceSeconds?: number
  /** Default the real one (`performance.now` and `setTimeout`). */
  readonly clock?: TickClock
}

export interface RoomServer {
  /** The port that is listening. */
  readonly port: number
  /** The play of each open room so far, by code. */
  replays(): Record<string, Replay>
  readonly stats: { readonly rooms: number; readonly late: number; readonly refused: number }
  /** Closes every room and the listener. Resolves when the port is free. */
  close(): Promise<void>
}

/** Koota allows 16 worlds in a process and each room is one. */
const MAX_WORLDS = 16
/** A frame may be this much larger than a message: Colyseus's envelope (its protocol byte and the channel name). */
const ENVELOPE_BYTES = 1024

const realClock: TickClock = {
  now: () => performance.now(),
  setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

const closeHttp = (http: HttpServer): Promise<void> =>
  new Promise((resolve) => {
    http.closeAllConnections()
    http.close(() => resolve())
  })

/** Starts a server on the port asked for and resolves once it is listening. */
export async function createRoomServer(options: RoomServerOptions): Promise<RoomServer> {
  const maxRooms = options.maxRooms ?? DEFAULT_MAX_ROOMS
  if (!Number.isInteger(maxRooms) || maxRooms < 1 || maxRooms > MAX_WORLDS) {
    throw new Error(`maxRooms must be a whole number from 1 to ${MAX_WORLDS}, but it is ${maxRooms}.`)
  }
  const rooms = new Map<string, OpenRoom>()
  const closed = { late: 0, refused: 0 }
  const context: RoomContext = {
    game: options.game,
    maxRooms,
    graceSeconds: options.graceSeconds ?? RECONNECT_GRACE_SECONDS,
    clock: options.clock ?? realClock,
    rooms,
    closed,
  }
  const http = createServer()
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: http, maxPayload: MAX_MESSAGE_BYTES + ENVELOPE_BYTES }),
    // The process owns the signals (`process.ts`); Colyseus would otherwise end every game on the first SIGTERM.
    gracefullyShutdown: false,
    greet: false,
    // Colyseus's own chatter is not this server's output; its warnings and errors still reach stderr.
    logger: {
      log: () => undefined,
      info: () => undefined,
      debug: () => undefined,
      warn: console.warn,
      error: console.error,
    },
  })
  gameServer.define(ROOM_NAME, roomClassFor(context))
  try {
    await gameServer.listen(options.port ?? 0, options.host ?? '127.0.0.1')
  } catch (error) {
    await closeHttp(http)
    throw error
  }
  const address = http.address()
  const port = typeof address === 'object' && address !== null ? address.port : (options.port ?? 0)
  let shutdown: Promise<void> | undefined
  return {
    port,
    replays: () => Object.fromEntries([...rooms].map(([code, room]) => [code, room.engine.replay()])),
    get stats() {
      let late = closed.late
      let refused = closed.refused
      for (const room of rooms.values()) {
        late += room.engine.stats.late
        refused += room.engine.stats.refused
      }
      return { rooms: rooms.size, late, refused }
    },
    close() {
      shutdown ??= gameServer.gracefullyShutdown(false).then(() => closeHttp(http))
      return shutdown
    },
  }
}

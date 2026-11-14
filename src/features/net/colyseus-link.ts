// A Link over the Colyseus SDK. The only file that names the SDK, and only by `import()` inside `connect`, so loading
// the package loads no SDK (the rule Rapier follows). It reads no clock and sets no timer: the SDK owns the socket.
//
// Everything a client says is one plain object on `MESSAGE_CHANNEL`; everything the room says is the same, and the
// bytes of a snapshot follow their `sync` header on `BYTES_CHANNEL`.
import type { Link } from './link.ts'
import {
  BYTES_CHANNEL,
  MESSAGE_CHANNEL,
  ONLINE_PROBLEMS,
  OnlineError,
  type OnlineProblem,
  parseServerMessage,
  ROOM_NAME,
  type RoomOptions,
} from './protocol.ts'

/** The part of the SDK's room a client reads. The real room fits it, and so does a test's fake. */
export interface SdkRoom {
  /** The room's code. */
  readonly roomId: string
  /** Changed by every reconnect handshake. */
  readonly reconnectionToken: string
  /** The SDK's own retry: switched off, because the page's own gets back in with the same token. */
  readonly reconnection: { enabled: boolean }
  readonly connection: { close(code?: number, reason?: string): void }
  onMessage(type: string, handler: (payload: unknown) => void): unknown
  onLeave(handler: (code: number) => void): unknown
  send(type: string, payload: unknown): void
  /** A consented leave frees the seat at once. */
  leave(consented?: boolean): Promise<number>
  removeAllListeners(): void
}

/** The part of the SDK's client a page uses: make a room, join one by its code, get back into a seat. */
export interface SdkClient {
  create(roomName: string, options: unknown): Promise<SdkRoom>
  joinById(code: string, options: unknown): Promise<SdkRoom>
  reconnect(token: string): Promise<SdkRoom>
}

/** What a join gives back. */
export interface Connection {
  readonly link: Link
  /** The room's code, to share with a friend. */
  readonly code: string
  /** Gets back into the seat with the token of the last connection. Rejects with `OnlineError('lost')`. */
  reconnect(): Promise<Link>
}

/** A close code that is not Colyseus's consented one, so the room treats it as a lost connection. */
const GOING_AWAY = 1001

async function loadSdk(server: string): Promise<SdkClient> {
  const { Client } = await import('@colyseus/sdk')
  return new Client(server) as unknown as SdkClient
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : ''

/** What a rejected join means to a person. The room's own refusals start with their problem and a colon. */
function problemOf(error: unknown): OnlineError {
  const message = messageOf(error)
  const prefix = message.split(':', 1)[0] ?? ''
  const words = message.slice(prefix.length + 1).trim()
  if ((ONLINE_PROBLEMS as readonly string[]).includes(prefix)) {
    return new OnlineError(prefix as OnlineProblem, words === '' ? prefix : words)
  }
  // Colyseus's own matchmaker words, for a code that is wrong or a room that is full.
  if (/is locked/.test(message)) return new OnlineError('room-full', 'The room is full.')
  if (/not found/.test(message)) return new OnlineError('no-room', 'No room has that code.')
  // Everything else is a server that did not answer: a refused connection, a failed fetch, a closed socket.
  return new OnlineError('no-server', message === '' ? 'The server did not answer.' : message)
}

/** A copy, because the SDK hands out a view into its own receive buffer. */
function bytesOf(payload: unknown): Uint8Array | undefined {
  if (payload instanceof Uint8Array) return new Uint8Array(payload)
  if (payload instanceof ArrayBuffer) return new Uint8Array(payload.slice(0))
  return undefined
}

type Handlers = Parameters<Link['listen']>[0]

function linkOf(room: SdkRoom): Link {
  room.reconnection.enabled = false
  let handlers: Handlers | undefined
  // What arrives before anyone listens is held, in order, and given as soon as someone does.
  const early: ((h: Handlers) => void)[] = []
  const deliver = (run: (h: Handlers) => void): void => {
    if (handlers === undefined) early.push(run)
    else run(handlers)
  }
  let ended = false
  room.onMessage(MESSAGE_CHANNEL, (raw) => {
    const message = parseServerMessage(raw)
    if (message !== undefined) deliver((h) => h.message(message))
  })
  room.onMessage(BYTES_CHANNEL, (raw) => {
    const bytes = bytesOf(raw)
    if (bytes !== undefined) deliver((h) => h.bytes(bytes))
  })
  room.onLeave(() => {
    if (ended) return
    ended = true
    deliver((h) => h.closed())
  })
  return {
    send(message) {
      if (!ended) room.send(MESSAGE_CHANNEL, message)
    },
    listen(next) {
      handlers = next
      for (const run of early.splice(0)) run(next)
    },
    close() {
      // Leaving on purpose is not a connection that ended: the session is not told.
      ended = true
      room.leave(true).catch(() => undefined)
    },
    drop() {
      room.connection.close(GOING_AWAY, 'dropped')
    },
  }
}

/**
 * Makes a room (no code) or joins one (a code), with the options the room checks. Rejects with an `OnlineError`
 * whose problem says what a person should be told. `load` is the SDK; a test hands in a fake.
 */
export async function connect(
  server: string,
  code: string | undefined,
  options: RoomOptions,
  load: () => Promise<SdkClient> = () => loadSdk(server),
): Promise<Connection> {
  let client: SdkClient
  let room: SdkRoom
  try {
    client = await load()
    room = code === undefined ? await client.create(ROOM_NAME, options) : await client.joinById(code, options)
  } catch (error) {
    throw problemOf(error)
  }
  let current = room
  return {
    link: linkOf(room),
    code: room.roomId,
    async reconnect() {
      try {
        current = await client.reconnect(current.reconnectionToken)
      } catch (error) {
        throw new OnlineError('lost', messageOf(error) || 'The seat could not be got back.')
      }
      return linkOf(current)
    },
  }
}

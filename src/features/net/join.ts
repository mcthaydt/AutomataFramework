// Joining a room: the options come from the sims, so a client is always the same version as the room it asks for,
// the SDK is loaded on demand, and what comes back is a session the game drives and a way to get back in.
import type { Sim } from '../sim/sim.ts'
import { connect } from './colyseus-link.ts'
import type { Link } from './link.ts'
import { roomOptionsOf } from './protocol.ts'
import { createSession, type Session, type SessionState } from './session.ts'

export interface Joined {
  readonly session: Session
  /** The room's code, to share with a friend. */
  readonly code: string
  /** Tries once to get back into the seat after a drop. Rejects with `OnlineError('lost')` once the grace is over. */
  rejoin(): Promise<void>
  /** Leaves the room, and ends the session. */
  leave(): void
}

export interface JoinOptions {
  /** A `ws://` or `wss://` address. */
  readonly server: string
  /** A room's code: join that room. Without one, a new room is made. */
  readonly room?: string
  readonly level: string
  /** How many players the room is for: used when this join makes the room. */
  readonly seats: number
  /** Both at tick 0, made the same way, for players 1 to `seats`. */
  readonly confirmed: Sim
  readonly predicted: Sim
  /** A test's lag, a debug tool: sees both the first line and any line that takes over after a drop. */
  readonly wrapLink?: (link: Link) => Link
  readonly resendAfterSync?: readonly string[]
  readonly onCheck?: (tick: number, hash: string, ok: boolean) => void
  readonly onState?: (state: SessionState) => void
  readonly onLinkClosed?: () => void
}

/** Rejects with an `OnlineError`, saying what to tell the person, if the room cannot be joined. */
export async function joinSession(options: JoinOptions): Promise<Joined> {
  const { confirmed, predicted, wrapLink = (l: Link) => l } = options
  const roomOptions = roomOptionsOf(confirmed, { level: options.level, seats: options.seats })
  const connection = await connect(options.server, options.room, roomOptions)
  const session = createSession({
    link: wrapLink(connection.link),
    confirmed,
    predicted,
    ...(options.resendAfterSync === undefined ? {} : { resendAfterSync: options.resendAfterSync }),
    ...(options.onCheck === undefined ? {} : { onCheck: options.onCheck }),
    ...(options.onState === undefined ? {} : { onState: options.onState }),
    ...(options.onLinkClosed === undefined ? {} : { onLinkClosed: options.onLinkClosed }),
  })
  return {
    session,
    code: connection.code,
    async rejoin() {
      // The room answers a return with `seat` and `sync`, which the session takes as it does any other.
      session.resume(wrapLink(await connection.reconnect()))
    },
    leave: () => session.close(),
  }
}

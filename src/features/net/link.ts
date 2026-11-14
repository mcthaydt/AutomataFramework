// The port a client session talks through. A Colyseus socket is one adapter (`colyseus-link.ts`); the tests'
// scripted wire, with its delays, is another. The session never knows which.
import type { ClientMessage, ServerMessage } from './protocol.ts'

export interface Link {
  /** Sends one message to the room. After the connection has ended it does nothing. */
  send(message: ClientMessage): void
  /**
   * Sets the one listener; the session does this once. `closed` is called once, when the connection ends for any
   * reason. Messages that arrived before a listener was set are given to it as soon as it is.
   */
  listen(handlers: {
    message(message: ServerMessage): void
    bytes(bytes: Uint8Array): void
    closed(): void
  }): void
  /** Ends the connection, and leaves the room. */
  close(): void
  /**
   * A network failure, for tests and debug tools: ends the connection without leaving the room, so the room keeps
   * the seat for its grace and the player can get back in. A link that cannot do this leaves it out.
   */
  drop?(): void
}

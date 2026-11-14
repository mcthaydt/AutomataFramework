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
}

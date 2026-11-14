// What a person is told about a room, as keys and values. `net` never holds a sentence: `locale` turns each message into
// words in the player's language (`onlineWords`), and the framework's own sentences are in `locale/library/`. Nothing
// the person reads names the machinery (a socket, a tick, a seat): a drunk grandma has to know what is happening and
// what to do next.
import type { Message } from '../../lib/message.ts'
import type { OnlineProblem } from './protocol.ts'

/** Where a page in a room is, as a person sees it. */
export type OnlineStatus =
  | { readonly state: 'waiting'; readonly code: string; readonly missing: number }
  | { readonly state: 'playing'; readonly away: readonly number[] }
  | { readonly state: 'reconnecting' }
  | { readonly state: 'ended'; readonly problem: OnlineProblem }

/**
 * What to tell the person about a status, as a key and values; `undefined` while playing with everyone here, when
 * there is nothing to say. The keys are `automata.online.*`.
 */
export function onlineMessage(status: OnlineStatus): Message | undefined {
  switch (status.state) {
    case 'waiting':
      return status.missing === 1
        ? { key: 'automata.online.waiting.one', values: { code: status.code } }
        : { key: 'automata.online.waiting.many', values: { count: status.missing, code: status.code } }
    case 'playing':
      if (status.away.length === 0) return undefined
      return {
        key: status.away.length === 1 ? 'automata.online.away.one' : 'automata.online.away.many',
        values: { players: status.away },
      }
    case 'reconnecting':
      return { key: 'automata.online.reconnecting' }
    case 'ended':
      return { key: `automata.online.ended.${status.problem}` }
  }
}

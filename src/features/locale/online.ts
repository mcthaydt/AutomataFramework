// What a person reads about a room, in their language: `net` answers with a key and values, the words are here.
import type { Words } from '../../lib/message.ts'
import { type OnlineStatus, onlineMessage } from '../net/net.ts'

/**
 * The plain words for a room's status, '' while playing with everyone here. `words` is a `Locale`'s `words` for the
 * player's language, or `frameworkWords(language)`: there is no language to say them in when none is given.
 */
export function onlineWords(status: OnlineStatus, words: Words): string {
  const message = onlineMessage(status)
  return message === undefined ? '' : words(message.key, message.values)
}

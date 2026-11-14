import { deepFreeze } from '../../lib/deep-freeze.ts'
import type { ContentType, GameContent } from '../content/content.ts'

/**
 * The kinds of content the sim is not given. A player's words are read by the page, never by a system, and a word
 * changed in a file must not move a hash, stop a replay or keep two players out of one room. A plan that takes another
 * kind out of the sim adds it here and to the `GameContent` map it takes out below: a kind's map and its files'
 * entries in the project's list always leave together.
 */
const LEFT_OUT: ReadonlySet<ContentType> = new Set<ContentType>(['messages'])

/**
 * The content the sim is given, and so hashes: everything but the words. Both the `messages` map and its files'
 * entries in `project.content` leave, because that list names every file by path and is hashed: keeping it would move
 * every hash when a language is added or dropped. The very same object comes back when the game lists none of these
 * kinds, so a game that has no words hashes as it always did. The game itself keeps all its content; only the sim goes
 * without.
 */
export function simContent(content: GameContent): GameContent {
  const listed = content.project.content.some((entry) => LEFT_OUT.has(entry.type))
  if (!listed && content.messages === undefined) return content
  const { messages: _words, ...kept } = content
  return deepFreeze({
    ...kept,
    project: {
      ...content.project,
      content: content.project.content.filter((entry) => !LEFT_OUT.has(entry.type)),
    },
  })
}

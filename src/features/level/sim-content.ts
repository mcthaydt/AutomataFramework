import { deepFreeze } from '../../lib/deep-freeze.ts'
import type { ContentType, GameContent } from '../content/content.ts'

/**
 * The kinds of file the sim is not given: the words a player reads (`messages`) and what a game sounds like (`sound`,
 * `music`, `cues`). None of them says what happens, so a word or a sound changed in a file must not move a hash, stop a
 * replay or keep two players out of one room. A plan that takes another kind out of the sim adds it here and to the
 * `GameContent` maps it takes out below: a kind's maps and its files' entries in the project's list always leave
 * together.
 */
const LEFT_OUT: ReadonlySet<ContentType> = new Set<ContentType>(['messages', 'sound', 'music', 'cues'])

/**
 * The content the sim is given, and so hashes: everything but the words and the sounds. Both their maps and their
 * files' entries in `project.content` leave, because that list names every file by path and is hashed: keeping it
 * would move every hash when a language or a sound is added or dropped (the spec's "sound never moves a hash"). The
 * very same object comes back when the game lists none of these kinds, so a game that has neither hashes as it always
 * did. The game itself keeps all its content; only the sim goes without.
 */
export function simContent(content: GameContent): GameContent {
  const listed = content.project.content.some((entry) => LEFT_OUT.has(entry.type))
  if (
    !listed &&
    content.messages === undefined &&
    content.sounds === undefined &&
    content.music === undefined &&
    content.cues === undefined
  )
    return content
  const { messages: _words, sounds: _sounds, music: _music, cues: _cues, ...kept } = content
  return deepFreeze({
    ...kept,
    project: {
      ...content.project,
      content: content.project.content.filter((entry) => !LEFT_OUT.has(entry.type)),
    },
  })
}

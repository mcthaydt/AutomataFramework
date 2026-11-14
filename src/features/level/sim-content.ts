import { deepFreeze } from '../../lib/deep-freeze.ts'
import type { ContentType, GameContent } from '../content/content.ts'

/**
 * The kinds of file the sim is not given: the words a player reads (`messages`), what a game sounds like (`sound`,
 * `music`, `cues`) and how it looks (`figure`, `backdrop`). None of them says what happens, so a word, a sound or a
 * colour changed in a file must not move a hash, stop a replay or keep two players out of one room. (Which clip a
 * character plays is its `character` file's, and stays in.) A plan that takes another kind out of the sim adds it
 * here and to the `GameContent` maps it takes out below: a kind's maps and its files' entries in the project's list
 * always leave together.
 */
const LEFT_OUT: ReadonlySet<ContentType> = new Set<ContentType>([
  'messages',
  'sound',
  'music',
  'cues',
  'figure',
  'backdrop',
])

/**
 * The content the sim is given, and so hashes: everything but the words, the sounds and the art. Both their maps
 * and their files' entries in `project.content` leave, because that list names every file by path and is hashed:
 * keeping it would move every hash when a language or a sound is added or dropped (the spec's "sound never moves a
 * hash"). The very same object comes back when the game lists none of these kinds, so a game that has none hashes as
 * it always did. The game itself keeps all its content; only the sim goes without.
 */
export function simContent(content: GameContent): GameContent {
  const listed = content.project.content.some((entry) => LEFT_OUT.has(entry.type))
  if (
    !listed &&
    content.messages === undefined &&
    content.sounds === undefined &&
    content.music === undefined &&
    content.cues === undefined &&
    content.figures === undefined &&
    content.backdrops === undefined
  )
    return content
  const {
    messages: _words,
    sounds: _sounds,
    music: _music,
    cues: _cues,
    figures: _figures,
    backdrops: _backdrops,
    ...kept
  } = content
  return deepFreeze({
    ...kept,
    project: {
      ...content.project,
      content: content.project.content.filter((entry) => !LEFT_OUT.has(entry.type)),
    },
  })
}

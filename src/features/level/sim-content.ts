import { deepFreeze } from '../../lib/deep-freeze.ts'
import type { ContentType, GameContent, SceneFile } from '../content/content.ts'

/**
 * The kinds of file the sim is not given: the words a player reads (`messages`), what a game sounds like (`sound`,
 * `music`, `cues`) and how it looks and feels (`figure`, `backdrop`, `feel`, `photo`). None of them says what happens, so a
 * word, a sound, a colour or a shake changed in a file must not move a hash, stop a replay or keep two players out of one room. (Which clip a
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
  'feel',
  'photo',
])

/**
 * A scene as the sim is given it: only what decides what happens on the ground, which is its size and the shape and
 * rows of its tiles (and the ground's colour, which the sim copies onto what it spawns). A paint, a material, the
 * seed, the tile's pixels, the sky and the backdrop only change how it looks, so a change to one moves no hash. Keys
 * the scene does not write stay absent. The sim reads nothing else of a scene, so the cut-down one stands in for it.
 */
function simScene(scene: SceneFile): SceneFile {
  const { color, oneBoxPerRow, letters, rows } = scene.ground
  return {
    format: scene.format,
    id: scene.id,
    size: scene.size,
    ground: {
      ...(color === undefined ? {} : { color }),
      ...(oneBoxPerRow === undefined ? {} : { oneBoxPerRow }),
      letters: letters.map(({ letter, shape }) => ({ letter, shape })),
      rows,
    },
  } as unknown as SceneFile
}

/**
 * The fields of the project file that tell the flow what to show (plan U and plan Q): the order of the levels, what ends
 * one, the warnings, the splash, what loses a level and the number counted. None of them says what happens in the
 * game, so none is given to the sim.
 */
const FLOW_FIELDS = ['levels', 'done', 'warnings', 'splash', 'lost', 'score'] as const

/**
 * The content the sim is given, and so hashes: everything but the words, the sounds, the art and the feel. Both their maps
 * and their files' entries in `project.content` leave, because that list names every file by path and is hashed:
 * keeping it would move every hash when a language or a sound is added or dropped (the spec's "sound never moves a
 * hash"). The very same object comes back when the game lists none of these kinds, so a game that has none hashes as
 * it always did. The game itself keeps all its content; only the sim goes without.
 */
export function simContent(content: GameContent): GameContent {
  const listed = content.project.content.some((entry) => LEFT_OUT.has(entry.type))
  if (
    !listed &&
    content.project.source === undefined &&
    // Audit M7: a game that writes only one of the flow's fields is not "the very same object" either.
    !FLOW_FIELDS.some((field) => Object.hasOwn(content.project, field)) &&
    content.messages === undefined &&
    content.sounds === undefined &&
    content.music === undefined &&
    content.cues === undefined &&
    content.figures === undefined &&
    content.backdrops === undefined &&
    content.feels === undefined &&
    content.photos === undefined &&
    content.scenes === undefined
  )
    return content
  // The team's language is not what happens in the game, so `source` goes with the words, and the flow's fields with it.
  const {
    source: _source,
    levels: _levels,
    done: _done,
    warnings: _warnings,
    splash: _splash,
    lost: _lost,
    score: _score,
    ...project
  } = content.project
  const {
    messages: _words,
    sounds: _sounds,
    music: _music,
    cues: _cues,
    figures: _figures,
    backdrops: _backdrops,
    feels: _feels,
    photos: _photos,
    scenes,
    ...kept
  } = content
  return deepFreeze({
    ...kept,
    ...(scenes === undefined
      ? {}
      : { scenes: Object.fromEntries(Object.entries(scenes).map(([id, scene]) => [id, simScene(scene)])) }),
    project: {
      ...project,
      content: project.content.filter((entry) => !LEFT_OUT.has(entry.type)),
    },
  })
}

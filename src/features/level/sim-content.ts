import type { GameContent } from '../content/content.ts'

/** The kinds of file that say what a game sounds like, never what happens: the project lists them by these names. */
const AUDIO_KINDS: ReadonlySet<string> = new Set(['sound', 'music', 'cues'])

/**
 * The content the sim is given and hashes: everything but what a game sounds like. That is the `sounds`, `music` and
 * `cues` maps and also the project file's own list of those files, because the list is hashed with the rest: changing
 * a sound, or listing one more, must not move a hash (the spec's "sound never moves a hash"). A game that lists none
 * of them gets its own content back, so it hashes exactly as it did before audio.
 */
export function simContent(content: GameContent): GameContent {
  const listed = content.project.content.filter((ref) => !AUDIO_KINDS.has(ref.type))
  if (
    content.sounds === undefined &&
    content.music === undefined &&
    content.cues === undefined &&
    listed.length === content.project.content.length
  )
    return content
  const { sounds: _sounds, music: _music, cues: _cues, ...rest } = content
  return { ...rest, project: { ...rest.project, content: listed } }
}

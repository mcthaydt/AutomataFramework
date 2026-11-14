import type { GameContent } from '../content/content.ts'

/**
 * The content the sim is given and hashes: everything but the `sounds`, `music` and `cues` maps. Those three only say
 * what a game sounds like, never what happens, so changing one must not move a hash (the spec's "sound never moves a
 * hash"). A game that lists none of them gets its own content back, so it hashes exactly as it did before audio.
 */
export function simContent(content: GameContent): GameContent {
  if (content.sounds === undefined && content.music === undefined && content.cues === undefined) return content
  const { sounds: _sounds, music: _music, cues: _cues, ...rest } = content
  return rest
}

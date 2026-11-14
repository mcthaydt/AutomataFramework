// The game the sounding run plays: the M1 fixture game (its level, its hero, its crate) with the full game's two
// sounds, its track and its cue list added and listed. The goldens of the sounding run use this game, not the full
// game, because the full game is what every later plan grows; this one moves only when sound or the M1 level does.
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import cues from '../full-game/content/cues/cues.json?raw'
import meadow from '../full-game/content/music/meadow.json?raw'
import jump from '../full-game/content/sounds/jump.json?raw'
import land from '../full-game/content/sounds/land.json?raw'
import { fixtureFiles } from '../game/read.ts'

const listed = `
[[content]]
type = "sound"
path = "content/sounds/jump.json"

[[content]]
type = "sound"
path = "content/sounds/land.json"

[[content]]
type = "music"
path = "content/music/meadow.json"

[[content]]
type = "cues"
path = "content/cues/cues.json"
`

/** The sounding game's files, by their path from its root: the M1 fixture's, and the four audio files listed. */
export const soundingFiles: Record<string, string> = {
  ...fixtureFiles,
  'automata.toml': `${fixtureFiles['automata.toml'] ?? ''}${listed}`,
  'content/sounds/jump.json': jump,
  'content/sounds/land.json': land,
  'content/music/meadow.json': meadow,
  'content/cues/cues.json': cues,
}

/** Loads the sounding game, with `overrides` replacing a file (`undefined` makes it missing). Throws if it does not load. */
export async function loadSoundingGame(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Promise<GameContent> {
  const files: Record<string, string | undefined> = { ...soundingFiles, ...overrides }
  const loaded = await loadGame(async (path) => {
    const text = files[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  })
  if (!loaded.ok)
    throw new Error(`The sounding game did not load:\n${loaded.diagnostics.map((d) => d.message).join('\n')}`)
  return loaded.value
}

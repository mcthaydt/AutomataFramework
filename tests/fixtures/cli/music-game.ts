// The small cli game with the folders a game that makes sound lists, and the spec's `meadow` song in them, so the
// `automata music` and `automata sound` tests start from a game that has music to take out and places to put more.
import { type ContentType, writeContent } from '#src/features/content/content.ts'
import { bouncyBass, drumFill, easyDrums, heroTheme, meadow } from '../audio/song.ts'
import { smallGame } from './game.ts'

/** A folder block of a project file, as `withFolders` writes it, after a blank line. */
export const folderBlock = (type: ContentType, folder: string): string =>
  `\n[[content]]\ntype = "${type}"\nfolder = "${folder}"\n`

/** The folders a game with sound lists, by kind. */
export const SOUND_FOLDERS: readonly (readonly [ContentType, string])[] = [
  ['sound', 'content/sounds'],
  ['music', 'content/music'],
  ['loop', 'content/loops'],
  ['motif', 'content/motifs'],
]

/**
 * The small game with `folders` listed (all four by default) and, when it lists the music and loop folders, `meadow`,
 * its three loops and its motif written in them. A game that lists no folder has none of those files.
 */
export function musicGame(
  folders: readonly (readonly [ContentType, string])[] = SOUND_FOLDERS,
): Record<string, string> {
  const files = smallGame()
  const blocks = folders.map(([type, folder]) => folderBlock(type, folder)).join('')
  files['automata.toml'] = `${files['automata.toml'] ?? ''}${blocks}`
  const has = (type: ContentType): boolean => folders.some(([one]) => one === type)
  if (has('loop')) {
    files['content/loops/easy-drums.json'] = writeContent('loop', easyDrums())
    files['content/loops/drum-fill.json'] = writeContent('loop', drumFill())
    files['content/loops/bouncy-bass.json'] = writeContent('loop', bouncyBass())
  }
  if (has('motif')) files['content/motifs/hero-theme.json'] = writeContent('motif', heroTheme())
  if (has('loop') && has('motif') && has('music'))
    files['content/music/meadow.json'] = writeContent('music', meadow())
  return files
}

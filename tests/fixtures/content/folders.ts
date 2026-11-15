// A game in memory that lists folders: the fixture game plus the files and folder blocks a test chooses, and the `list`
// that goes with it, so a test of folders reads as the files it puts in them.
import { type ContentType, type ListFolder, writeContent } from '#src/features/content/content.ts'
import { fixtureFiles } from '../game/read.ts'

/** A sound of one tone, as `writeContent` writes it. */
export const soundText = (id: string): string =>
  writeContent('sound', {
    format: 1,
    id,
    volume: 0.8,
    voices: [{ kind: 'tone', wave: 'sine', from: 440, to: 660, at: 0, length: 0.2, volume: 0.7 }],
  })

/** A one-part track of format 1, as `writeContent` writes it. */
export const musicText = (id: string): string =>
  writeContent('music', {
    format: 1,
    id,
    tempo: 120,
    stepsPerBeat: 2,
    volume: 0.6,
    loop: false,
    parts: [{ id: 'bass', kind: 'tone', wave: 'sine', volume: 0.5, notes: ['C4 - E4 -'] }],
  })

/** The project file with a folder block for each of `blocks`, after the fixture's own. */
export function withFolderBlocks(blocks: readonly { type: ContentType; folder: string }[]): string {
  const added = blocks.map((b) => `\n[[content]]\ntype = "${b.type}"\nfolder = "${b.folder}"\n`).join('')
  return `${fixtureFiles['automata.toml'] ?? ''}${added}`
}

/** A `list` over files by path: the names directly in a folder, in the order the files were given. */
export function listOver(files: Readonly<Record<string, string | undefined>>): ListFolder {
  return async (folder) =>
    Object.keys(files)
      .filter((path) => path.startsWith(`${folder}/`) && files[path] !== undefined)
      .map((path) => path.slice(folder.length + 1))
      .filter((name) => !name.includes('/'))
}

// The full game's painted pictures, made the way `automata art` makes them: no picture is committed in the fixture, so
// a change to a painter or a figure moves them and the recorded hashes say so. Every engine paints the same bytes.
import { artFiles, loadGame } from '#src/features/content/content.ts'
import { readFullGame } from './read.ts'

let painted: Promise<Record<string, Uint8Array>> | undefined

/** Every file `artFiles` gives for the full game, by its path in the game. */
export function fullGamePictures(): Promise<Record<string, Uint8Array>> {
  painted ??= (async () => {
    const loaded = await loadGame(readFullGame())
    if (!loaded.ok) throw new Error('the full game did not load, so it cannot be painted')
    return Object.fromEntries(artFiles(loaded.value).map((file) => [file.path, file.bytes]))
  })()
  return painted
}

/** A picture of the full game as a `Blob`, the way a page's `readPicture` gives one; rejects for a path with none. */
export async function readFullGamePicture(path: string): Promise<Blob> {
  const bytes = (await fullGamePictures())[path]
  if (bytes === undefined) throw new Error(`${path}: the full game has no such picture`)
  return new Blob([bytes.slice()], { type: path.endsWith('.png') ? 'image/png' : 'application/json' })
}

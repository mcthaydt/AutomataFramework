// The scene game, loaded, and painted the way `automata art` paints it: its pictures are not committed, so a change to a
// painter, a photo or a scene moves them and the recorded hashes say so.
import {
  artFiles,
  formatDiagnostic,
  type GameContent,
  loadGame,
  photosUsed,
} from '#src/features/content/content.ts'
import { libraryPhotos } from '../content/photo-files.ts'
import { readSceneGame } from './read.ts'

/** Loads the scene game, with `overrides` as `readSceneGame` takes them. Throws, naming every problem, if it does not load. */
export async function loadSceneGame(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Promise<GameContent> {
  const loaded = await loadGame(readSceneGame(overrides))
  if (!loaded.ok)
    throw new Error(`The scene game did not load:\n${loaded.diagnostics.map(formatDiagnostic).join('\n')}`)
  return loaded.value
}

let painted: Promise<Record<string, Uint8Array>> | undefined

/** Every file `artFiles` gives for the scene game, by its path in the game. */
export function sceneGamePictures(): Promise<Record<string, Uint8Array>> {
  painted ??= (async () => {
    const content = await loadSceneGame()
    const photos = await libraryPhotos(photosUsed(content))
    return Object.fromEntries(artFiles(content, photos).map((file) => [file.path, file.bytes]))
  })()
  return painted
}

// The scene game as a folder in the memory layer: its files, its own photo's picture, and the library photos in the
// package's `photos/` folder where the command reads them from. Photos are read from disk once and shared.
import { join } from 'node:path'
import { packageRoot } from '#src/features/cli/template.ts'
import { PHOTO_LIBRARY } from '#src/features/content/content.ts'
import { photoBytes } from '../content/photo-files.ts'
import { sceneGameFiles } from '../scene-game/read.ts'

let library: Promise<Record<string, Uint8Array>> | undefined

/** Every library photo's bytes, keyed where the command reads it: under the package's own folder. */
function libraryFiles(): Promise<Record<string, Uint8Array>> {
  library ??= (async () => {
    const files: Record<string, Uint8Array> = {}
    for (const record of Object.values(PHOTO_LIBRARY))
      files[join(packageRoot(), 'photos', record.file)] = await photoBytes(record.file)
    return files
  })()
  return library
}

/** The scene game in `folder`, with the picture of its own photo `moss` and the whole library under the package. */
export async function sceneGameInMemory(
  folder = 'game',
  changes: Readonly<Record<string, string | Uint8Array>> = {},
): Promise<Record<string, string | Uint8Array>> {
  return {
    ...(await libraryFiles()),
    ...Object.fromEntries(Object.entries(sceneGameFiles).map(([path, text]) => [`${folder}/${path}`, text])),
    [`${folder}/content/photos/moss.png`]: await photoBytes('bark.png'),
    ...Object.fromEntries(Object.entries(changes).map(([path, data]) => [`${folder}/${path}`, data])),
  }
}

// The photos a game's painter needs, read from disk. The painter (`artFiles`, `artProblems`) reads no file itself: it is
// handed each photo's pixels by id, so the same photo gives the same tile wherever it is painted. A scene's photo
// material names a photo that is the game's own (a file under its folder, listed as a `photo`) or the library's (a file in
// the package's `photos/`); the game's own wins when both have the id. Only the photos a scene uses are read.
import { join } from 'node:path'
import { Effect } from 'effect'
import { decodePng } from '../../lib/png-read.ts'
import {
  type Diagnostic,
  type GameContent,
  PHOTO_LIBRARY,
  type PhotoPixels,
  type Photos,
  photoPictureProblem,
  photosUsed,
} from '../content/content.ts'
import type { GameFolder } from './game-folder.ts'
import { Files, type FilesService } from './ports.ts'
import { packageRoot } from './template.ts'

/** The id a content file has: its name without the folder or `.json`. */
const idOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1, -'.json'.length)

/**
 * The photos a game's scenes use, read and decoded: the game's own from its folder, the library's from the package's
 * `photos/`. A photo of the game's own whose picture is missing or not one the reader takes is left out (`photoProblems`
 * says why); a library photo that will not read is a fault in the package, not in the game, so it stops the command.
 */
export function readPhotos(game: GameFolder): Effect.Effect<Photos, never, FilesService> {
  return Effect.gen(function* () {
    const found = new Map<string, PhotoPixels>()
    if (!game.loaded.ok) return () => undefined
    const content = game.loaded.value
    const files = yield* Files
    for (const id of photosUsed(content)) {
      const own = content.photos?.[id]
      if (own !== undefined) {
        const bytes = yield* files.readBytes(join(game.folder, own.image))
        if (photoPictureProblem(own, bytes) === undefined && bytes !== undefined)
          found.set(id, { ...decodePng(bytes), size: own.size })
        continue
      }
      const record = PHOTO_LIBRARY[id]
      if (record === undefined) continue
      const path = join(packageRoot(), 'photos', record.file)
      const bytes = yield* files.readBytes(path)
      if (bytes === undefined) return yield* Effect.die(new Error(`The library photo ${path} is missing.`))
      found.set(id, { ...decodePng(bytes), size: record.size })
    }
    return (id) => found.get(id)
  })
}

/** The ids of the photos the scenes use that `photos` could not give: what the painter would stop on. */
export const missingPhotos = (content: GameContent, photos: Photos): string[] =>
  photosUsed(content).filter((id) => photos(id) === undefined)

/** What is wrong with each photo file of the game's own that is listed: the picture is not there, or not one the reader takes. */
export function photoProblems(game: GameFolder): Effect.Effect<readonly Diagnostic[], never, FilesService> {
  return Effect.gen(function* () {
    if (!game.loaded.ok) return []
    const content = game.loaded.value
    const files = yield* Files
    const problems: Diagnostic[] = []
    for (const entry of content.project.content) {
      const photo = entry.type === 'photo' ? content.photos?.[idOf(entry.path)] : undefined
      if (photo === undefined) continue
      const message = photoPictureProblem(photo, yield* files.readBytes(join(game.folder, photo.image)))
      if (message !== undefined) problems.push({ file: entry.path, path: 'image', message })
    }
    return problems
  })
}

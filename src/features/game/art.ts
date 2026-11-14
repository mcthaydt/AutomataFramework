// The pictures of a level, loaded for `startGame` and `watchReplay` before anything is put on the page. A game with no
// figure, no tileset and no backdrop needs none and is given none, so a game made before there was art starts as it did.
import type { GameContent } from '../content/content.ts'
import { type Art, loadArt, needsPictures, type ReadPicture } from '../render/render.ts'

/**
 * The art of the level `level` of `content`, loaded and checked, or `undefined` when the level needs no pictures. Throws,
 * in `who`'s name, when the game has pictures and there is no `readPicture` to fetch them; throws an `ArtError` for a
 * picture that is missing, old or the wrong size.
 */
export async function levelArt(
  who: 'startGame' | 'watchReplay',
  content: GameContent,
  level: string,
  readPicture: ReadPicture | undefined,
): Promise<Art | undefined> {
  if (!needsPictures(content, level)) return undefined
  if (readPicture === undefined)
    throw new Error(`This game has pictures, so ${who} needs "readPicture" to fetch them.`)
  return loadArt({ content, level, readPicture })
}

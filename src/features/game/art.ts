// The pictures of a level, loaded for `startGame`, `startOnlineGame` and `watchReplay` before anything is put on the page. A game with no
// figure, no tileset and no backdrop needs none and is given none, so a game made before there was art starts as it did.
import type { GameContent } from '../content/content.ts'
import type { SimLevel } from '../level/level.ts'
import { type Art, loadArt, needsPictures, type ReadPicture } from '../render/render.ts'

/**
 * The art of the level `level` of `content` (or, given `levels`, of the place it is in), loaded and checked, or `undefined`
 * when the level needs no pictures. Throws,
 * in `who`'s name, when the game has pictures and there is no `readPicture` to fetch them; throws an `ArtError` for a
 * picture that is missing, old or the wrong size.
 */
export async function levelArt(
  who: 'startGame' | 'startOnlineGame' | 'watchReplay',
  content: GameContent,
  level: string,
  readPicture: ReadPicture | undefined,
  levels?: readonly SimLevel[],
): Promise<Art | undefined> {
  if (!needsPictures(content, level, levels)) return undefined
  if (readPicture === undefined)
    throw new Error(`This game has pictures, so ${who} needs "readPicture" to fetch them.`)
  return loadArt({ content, level, ...(levels === undefined ? {} : { levels }), readPicture })
}

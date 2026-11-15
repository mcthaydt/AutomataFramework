// How a game with a built-in hero puts the thumbs on the page: the input gets the scheme (not a button for each action),
// applies the player's choice of sides, and the renderer is told how much room the thumbs take, so one place does it for
// `startGame` and `startOnlineGame`.
import type { GameContent } from '../content/content.ts'
import type { Input } from '../input/input.ts'
import { usesMoves } from '../level/level.ts'
import type { Renderer } from '../render/render.ts'

/** The thumb scheme for this game: set when its hero has `moves`, and says whether the hero can dash. */
export function thumbsOf(content: GameContent): { readonly dash: boolean } | undefined {
  if (!usesMoves(content)) return undefined
  return { dash: content.characters[content.project.hero]?.moves?.dash === true }
}

/**
 * Tells the renderer what the touch controls take, now and whenever it changes. The band under the level is the inset
 * as before. The thumbs' resting corners over the game are room: a level with a camera keeps the heroes clear of them,
 * and a level with no camera (a still room, the whole level in view) is fitted above them instead, since there is
 * nothing to move.
 */
export function wireTouchRoom(
  input: Input,
  renderer: Pick<Renderer, 'setInset' | 'setThumbRoom'>,
  hasCamera: boolean,
): void {
  const apply = (): void => {
    const room = input.thumbRoom()
    renderer.setInset(input.inset() + (hasCamera ? 0 : room))
    renderer.setThumbRoom(hasCamera ? room : 0)
  }
  apply()
  input.onInset(apply)
}

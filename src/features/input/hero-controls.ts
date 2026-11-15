// The controls of a game whose hero the framework moves: the game's tuning file lists them, or the framework's own four
// stand in (left, right, jump, and dash when the hero can dash), so a game with `moves` needs no controls in code.
import { DEFAULT_HERO_CONTROLS, type GameContent } from '../content/content.ts'
import { type Controls, controlsFromList } from './controls.ts'

/**
 * The controls of a game whose hero has `moves`: its tuning file's list when it has one, else `given` (what the game
 * passed in code), else the framework's (without `dash` when the hero does not dash). `undefined` for a game whose hero
 * has no `moves`. Throws what `controlsFromList` throws, in words, when the list could not be played.
 */
export function heroControls(content: GameContent, given?: Controls): Controls | undefined {
  const moves = content.characters[content.project.hero]?.moves
  if (moves === undefined) return undefined
  const listed = content.tunings?.[moves.tuning]?.controls
  if (listed !== undefined) return controlsFromList(listed)
  if (given !== undefined) return given
  return controlsFromList(DEFAULT_HERO_CONTROLS.filter((c) => moves.dash || c.action !== 'dash'))
}

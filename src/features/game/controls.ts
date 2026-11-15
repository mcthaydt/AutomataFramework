// Which controls a game starts with: the tuning file of a hero the framework moves, else the ones passed in code. One
// place for `startGame` and `startOnlineGame`, so both say the same words.
import type { GameContent } from '../content/content.ts'
import { type Controls, checkControls, heroControls } from '../input/input.ts'

/**
 * The controls the game plays with. A game whose hero has `moves` takes its tuning file's list; with none there, the
 * ones passed in code, else the framework's. With a list in the file and `controls` passed in code too, the file wins
 * and the console is told once. Throws, before anything is made, in words, when there are none or they cannot be played.
 */
export function resolveControls(
  caller: 'startGame' | 'startOnlineGame' | 'startFlow',
  content: GameContent,
  given?: Controls,
): Controls {
  const moves = content.characters[content.project.hero]?.moves
  const tuning = moves === undefined ? undefined : content.tunings?.[moves.tuning]
  const controls = heroControls(content, given) ?? given
  if (controls === undefined)
    throw new Error(
      `This game has no controls. Give its hero "moves" in its character file, or pass "controls" to ${caller}.`,
    )
  if (given !== undefined && tuning?.controls !== undefined)
    console.warn(
      `${caller}: the controls come from the tuning file "${tuning.id}". The "controls" passed in code are not used.`,
    )
  checkControls(controls)
  return controls
}

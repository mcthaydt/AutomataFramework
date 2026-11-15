// What the "How to play" screen lists: what the hero can do and how to do it on the device in use. Pure, so a test needs no
// page: the words and the facts come in, and the rows come out.
import type { Words } from '../../lib/message.ts'
import type { DeviceKind } from '../input/input.ts'
import { inputName } from '../locale/locale.ts'

/** One line of the screen. */
export interface HowRow {
  /** What the hero does: "Walk", "Jump", "Jump again in the air", "Jump off a wall", "Dash", "Pause". */
  readonly move: string
  /** How, on the device in use: "Arrow keys", "Space", "The stick", "Slide your left thumb". */
  readonly how: string
}

/** What the hero can do beyond walking and jumping, as the character file switches them on. */
export interface HowMoves {
  readonly doubleJump: boolean
  readonly wallJump: boolean
  readonly dash: boolean
}

/**
 * The rows for the device in use. Walk and Jump are always there; "Jump again in the air", "Jump off a wall" and "Dash"
 * only for a hero that has them; "Pause" is last. A hero with no `moves` is moved by the game's own code, so the rows are
 * the game's own controls (`own`) on a keyboard or a gamepad. `first` gives the first key or button of an action, as
 * `input.inputsFor(player, action)[0]`; `swapped` is the player's "Swap sides" setting, which puts the walking thumb on
 * the right.
 */
export function howRows(facts: {
  readonly device: DeviceKind
  readonly moves: HowMoves | undefined
  readonly first: (action: string) => string | undefined
  readonly swapped: boolean
  readonly words: Words
  /** The game's own controls on this device, by their labels: used when the hero has no `moves`. */
  readonly own?: readonly HowRow[]
}): readonly HowRow[] {
  const { device, moves, first, swapped, words, own } = facts
  const said = (action: string): string => {
    const input = first(action)
    return input === undefined ? '' : inputName(input, words)
  }
  const touch = device === 'touch'
  const walk = touch
    ? words(swapped ? 'automata.how.slide-right' : 'automata.how.slide-left')
    : device === 'gamepad'
      ? words('automata.hint.stick')
      : first('left') === 'ArrowLeft' && first('right') === 'ArrowRight'
        ? words('automata.hint.arrows')
        : [said('left'), said('right')].filter((one) => one !== '').join(' / ')
  const jump = touch ? words(swapped ? 'automata.how.tap-left' : 'automata.how.tap-right') : said('jump')
  const pause = touch
    ? words('automata.how.pause-corner')
    : device === 'gamepad'
      ? inputName('start', words)
      : inputName('Escape', words)
  const rows: HowRow[] =
    moves === undefined && own !== undefined && own.length > 0 && !touch
      ? [...own]
      : [
          { move: words('automata.how.walk'), how: walk },
          { move: words('automata.how.jump'), how: jump },
          ...(moves?.doubleJump === true ? [{ move: words('automata.how.double-jump'), how: jump }] : []),
          ...(moves?.wallJump === true ? [{ move: words('automata.how.wall-jump'), how: jump }] : []),
          ...(moves?.dash === true
            ? [
                {
                  move: words('automata.how.dash'),
                  how: touch ? words('automata.how.dash-button') : said('dash'),
                },
              ]
            : []),
        ]
  return [...rows, { move: words('automata.pause.button'), how: pause }]
}

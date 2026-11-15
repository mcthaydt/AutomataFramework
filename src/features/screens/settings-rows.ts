// What the settings screen's controls part lists: one row for each action on the keyboard and on a gamepad. Pure, so a
// test needs no page: the words come in, and the rows come out.
import type { Words } from '../../lib/message.ts'
import { type BindingSlot, buttonLabel, type Input } from '../input/input.ts'
import { inputName } from '../locale/locale.ts'

/** One line of the controls: what a key or button does, and the first one it has now. */
export interface ControlRow {
  readonly action: string
  readonly slot: BindingSlot
  /** The action in the player's words (`controls.<action>`, or the game's own label when it has no word). */
  readonly label: string
  /** The first key or button now, as a person says it; empty when there is none. */
  readonly input: string
}

/** The first of a list, said in the player's words; empty when the list is. */
const first = (list: readonly string[] | undefined, words: Words): string =>
  list === undefined || list[0] === undefined ? '' : inputName(list[0], words)

/**
 * The keyboard's rows, then the gamepad's for the actions that have one. With `sharing` (two people at one keyboard) an
 * action that has keys for two has a row for each half, named by the person; otherwise one row for the keys.
 */
export function controlRows(
  input: Pick<Input, 'controls'>,
  words: Words,
  sharing: boolean,
): { readonly keyboard: readonly ControlRow[]; readonly gamepad: readonly ControlRow[] } {
  const keyboard: ControlRow[] = []
  const gamepad: ControlRow[] = []
  for (const [action, control] of Object.entries(input.controls())) {
    const label = buttonLabel(words, action, control.label)
    if (sharing && control.shared !== undefined) {
      control.shared.forEach((keys, half) => {
        keyboard.push({
          action,
          slot: half === 0 ? 'shared-1' : 'shared-2',
          label: `${label}, ${words('automata.players.name', { player: half + 1 })}`,
          input: first(keys, words),
        })
      })
    } else {
      keyboard.push({ action, slot: 'keys', label, input: first(control.keys, words) })
    }
    if (control.pad !== undefined) gamepad.push({ action, slot: 'pad', label, input: first(control.pad, words) })
  }
  return { keyboard, gamepad }
}

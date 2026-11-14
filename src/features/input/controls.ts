// What a game says about its controls, and the check that says it plainly when it gets it wrong. Plain because the
// reader is an author or an agent who has just typed it; every message says what to change.
import { ACTION_NAME, MAX_ACTIONS } from '../commands/commands.ts'

/**
 * One action a player can take. `label` is the words on its touch button and its accessible name. The button carries
 * `data-action` with the action's name, so a stylesheet can tell the buttons apart.
 */
export interface Control {
  /** 1 to 12 characters, e.g. 'Jump'. */
  readonly label: string
  /** `KeyboardEvent.code` values, e.g. ['ArrowLeft', 'KeyA']. */
  readonly keys: readonly string[]
  /** Which thumb's corner the touch button sits in. */
  readonly side: 'left' | 'right'
}

/** A game's controls by action name, in the order the touch buttons are shown. */
export type Controls = Readonly<Record<string, Control>>

/** The longest label a button can show without crowding the one beside it. */
const MAX_LABEL = 12

/** Throws, with a message that says what to change, unless the controls can be played. */
export function checkControls(controls: Controls): void {
  const actions = Object.keys(controls)
  if (actions.length > MAX_ACTIONS)
    throw new Error(`A game can have at most ${MAX_ACTIONS} actions; this one has ${actions.length}.`)
  const owner = new Map<string, string>()
  for (const action of actions) {
    const control = controls[action]
    if (control === undefined) continue
    if (!ACTION_NAME.test(action))
      throw new Error(
        `"${action}" cannot be an action name. Use small letters, numbers and dashes, like "jump" or "fire-left".`,
      )
    if (control.label.trim() === '')
      throw new Error(`The action "${action}" needs a label, the word on its button, like "Jump".`)
    if (control.label.length > MAX_LABEL)
      throw new Error(
        `The label "${control.label}" is too long for a button. Use ${MAX_LABEL} letters or fewer.`,
      )
    // A game written in JavaScript, or by an agent, can say anything; say what is wrong instead of crashing later.
    if (control.side !== 'left' && control.side !== 'right')
      throw new Error(`The action "${action}" has side "${String(control.side)}". Use "left" or "right".`)
    if (!Array.isArray(control.keys) || control.keys.some((code) => typeof code !== 'string'))
      throw new Error(
        `The action "${action}" needs its keys as a list of key names, like ["Space"]. Use [] for none.`,
      )
    for (const code of control.keys) {
      const other = owner.get(code)
      if (other !== undefined && other !== action)
        throw new Error(
          `The key ${code} is used for both "${other}" and "${action}". Give each action its own key.`,
        )
      owner.set(code, action)
    }
  }
}

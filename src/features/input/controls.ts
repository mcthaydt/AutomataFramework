// What a game says about its controls, and the check that says it plainly when it gets it wrong. Plain because the
// reader is an author or an agent who has just typed it; every message says what to change.
import {
  ACTION_NAME,
  MAX_ACTIONS,
  PAD_BUTTONS,
  PAD_STICKS,
  type PadInput,
  RESERVED_KEYS,
  RESERVED_PAD,
} from '../commands/commands.ts'

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
  /** Gamepad buttons and stick directions, by name, e.g. ['south'] or ['dpad-left', 'left-stick-left']. */
  readonly pad?: readonly PadInput[]
  /**
   * Keys for two people sharing one keyboard: the first person's, then the second's. A game gives every action
   * `shared` keys, or none of them.
   */
  readonly shared?: readonly [readonly string[], readonly string[]]
}

/** One control as a content file lists it (plan C's `tuning.controls`): the same fields, with the action's name inside. */
export interface ControlEntry extends Control {
  readonly action: string
}

/** A game's controls by action name, in the order the touch buttons are shown. */
export type Controls = Readonly<Record<string, Control>>

/** The longest label a button can show without crowding the one beside it. */
const MAX_LABEL = 12

const PAD_NAMES: ReadonlySet<string> = new Set<string>([...PAD_BUTTONS, ...PAD_STICKS])
const RESERVED_PAD_NAMES: ReadonlySet<string> = new Set<string>(RESERVED_PAD)
const HALVES = ['first', 'second'] as const

const isKeyList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((code) => typeof code === 'string')

/** Throws, with a message that says what to change, unless the controls can be played. */
export function checkControls(controls: Controls): void {
  const actions = Object.keys(controls)
  if (actions.length > MAX_ACTIONS)
    throw new Error(`A game can have at most ${MAX_ACTIONS} actions; this one has ${actions.length}.`)
  const owner = new Map<string, string>()
  const padOwner = new Map<string, string>()
  // Per person on a shared keyboard: key code -> the action that has it.
  const sharedOwner: [Map<string, string>, Map<string, string>] = [new Map(), new Map()]
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
      if (RESERVED_KEYS.includes(code))
        throw new Error(`The key ${code} is kept for the game's menus. Give "${action}" another key.`)
      const other = owner.get(code)
      if (other !== undefined && other !== action)
        throw new Error(
          `The key ${code} is used for both "${other}" and "${action}". Give each action its own key.`,
        )
      owner.set(code, action)
    }
    if (control.pad !== undefined) {
      if (!isKeyList(control.pad))
        throw new Error(`The action "${action}" needs "pad" as a list of button names, like ["south"].`)
      for (const name of control.pad) {
        if (!PAD_NAMES.has(name))
          throw new Error(
            `"${name}" is not a gamepad button the game knows. Use a name like "south", "dpad-left" or "left-stick-up".`,
          )
        if (RESERVED_PAD_NAMES.has(name))
          throw new Error(
            `The gamepad button ${name} is kept for the game's menus. Give "${action}" another button.`,
          )
        const other = padOwner.get(name)
        if (other !== undefined && other !== action)
          throw new Error(
            `The gamepad button ${name} is used for both "${other}" and "${action}". Give each action its own button.`,
          )
        padOwner.set(name, action)
      }
    }
    if (control.shared !== undefined) {
      const { shared } = control
      if (!Array.isArray(shared) || shared.length !== 2 || !shared.every(isKeyList))
        throw new Error(
          `The action "${action}" needs "shared" as two lists of key names, one for each person, like [["KeyW"], ["ArrowUp"]].`,
        )
      shared.forEach((codes, half) => {
        if (codes.length === 0)
          throw new Error(
            `The action "${action}" has no key for the ${HALVES[half]} person on a shared keyboard. Give it one.`,
          )
        for (const code of codes) {
          if (RESERVED_KEYS.includes(code))
            throw new Error(`The key ${code} is kept for the game's menus. Give "${action}" another key.`)
          if (sharedOwner[1 - half]?.has(code))
            throw new Error(
              `The key ${code} is on both halves of a shared keyboard. Each person needs their own keys.`,
            )
          const other = sharedOwner[half]?.get(code)
          if (other !== undefined && other !== action)
            throw new Error(
              `On a shared keyboard, the key ${code} is used for both "${other}" and "${action}". Give each action its own key.`,
            )
          sharedOwner[half]?.set(code, action)
        }
      })
    }
  }
  const without = actions.find((action) => controls[action]?.shared === undefined)
  if (without !== undefined && actions.some((action) => controls[action]?.shared !== undefined))
    throw new Error(
      `The action "${without}" has no keys for a shared keyboard. Give every action "shared" keys, or none of them.`,
    )
}

/**
 * A list of controls, as a tuning file holds them, as the `Controls` a game starts with: same order, checked. Throws,
 * in words, when an action is listed twice or the controls could not be played.
 */
export function controlsFromList(list: readonly ControlEntry[]): Controls {
  const controls: Record<string, Control> = {}
  for (const { action, ...control } of list) {
    if (Object.hasOwn(controls, action))
      throw new Error(`"${action}" is listed twice. Each action is listed once.`)
    controls[action] = control
  }
  checkControls(controls)
  return controls
}

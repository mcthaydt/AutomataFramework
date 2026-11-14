// The names of a standard gamepad's buttons and stick directions, and the keys and buttons kept for a game's menus.
// Here, beside ACTION_NAME, so the content feature can check a tuning file's controls and the input feature can read
// a pad, with one list between them. Names, not numbers: "left-stick-left" says what 0 to 16 cannot.

/** A standard gamepad's buttons, in the order of `Gamepad.buttons` under the standard mapping. */
export const PAD_BUTTONS = [
  'south',
  'east',
  'west',
  'north',
  'l1',
  'r1',
  'l2',
  'r2',
  'select',
  'start',
  'l3',
  'r3',
  'dpad-up',
  'dpad-down',
  'dpad-left',
  'dpad-right',
  'home',
] as const

/** Each stick pushed one way: the left stick is axes 0 and 1, the right stick axes 2 and 3; up is a negative y. */
export const PAD_STICKS = [
  'left-stick-up',
  'left-stick-down',
  'left-stick-left',
  'left-stick-right',
  'right-stick-up',
  'right-stick-down',
  'right-stick-left',
  'right-stick-right',
] as const

/** One thing on a gamepad an action can be bound to: a button, or a stick pushed one way. */
export type PadInput = (typeof PAD_BUTTONS)[number] | (typeof PAD_STICKS)[number]

/** Keys a game's menus need (back, and moving between buttons), so no action may take them. */
export const RESERVED_KEYS: readonly string[] = ['Escape', 'Tab']

/** Gamepad buttons a game's menus need (pause, and the system's own button), so no action may take them. */
export const RESERVED_PAD: readonly PadInput[] = ['start', 'home']

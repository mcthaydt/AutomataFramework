// Ported from AutomataFrameworkFailed@ed8592e8: packages/automata/src/features/input/gamepad/read-pad.ts
// One gamepad, read as the names of what is held on it. A radial deadzone, triggers pressed from half travel, and
// sticks as eight directions. Pure: it takes a plain object, so a test or a replay can pass one.
import { PAD_BUTTONS, type PadInput } from '../commands/commands.ts'

/** The parts of a `Gamepad` that are read, so a test can pass a plain object. */
export interface PadLike {
  readonly id: string
  readonly index: number
  readonly connected: boolean
  readonly mapping: string
  readonly axes: readonly number[]
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[]
}

/** Radial, so a stick resting slightly off centre on both axes stays still. */
export const DEADZONE = 0.25
/** A trigger counts as pressed from half travel. A browser's own `pressed` for a trigger is not trusted: some say it early. */
export const TRIGGER_PRESSED = 0.5
/**
 * Past the deadzone, an axis counts when it carries at least sin(22.5 degrees) of the push: a stick reads as eight
 * sectors, so (0.7, -0.7) is up and right at once and (0.3, 0.01) is plain right.
 */
const AXIS_SHARE = Math.sin(Math.PI / 8)

/** True for a pad the game can read: connected, with the standard mapping (the only one whose buttons have names). */
export function isUsable(pad: PadLike): boolean {
  return pad.connected && pad.mapping === 'standard'
}

/** The directions one stick is pushed, eight-way; none inside the deadzone. */
function stickDirections(side: 'left' | 'right', x: number, y: number): PadInput[] {
  const radius = Math.hypot(x, y)
  if (radius < DEADZONE) return []
  const share = AXIS_SHARE * radius
  const directions: PadInput[] = []
  if (y <= -share) directions.push(`${side}-stick-up`)
  if (y >= share) directions.push(`${side}-stick-down`)
  if (x <= -share) directions.push(`${side}-stick-left`)
  if (x >= share) directions.push(`${side}-stick-right`)
  return directions
}

/** Everything held on the pad right now. Empty for a pad that is not usable. */
export function readPad(pad: PadLike): Set<PadInput> {
  const held = new Set<PadInput>()
  if (!isUsable(pad)) return held
  PAD_BUTTONS.forEach((name, i) => {
    const button = pad.buttons[i]
    if (button === undefined) return
    // The triggers go by how far they are pushed; every other button is down when the browser says so.
    const down = name === 'l2' || name === 'r2' ? button.value >= TRIGGER_PRESSED : button.pressed
    if (down) held.add(name)
  })
  for (const side of ['left', 'right'] as const) {
    const first = side === 'left' ? 0 : 2
    for (const direction of stickDirections(side, pad.axes[first] ?? 0, pad.axes[first + 1] ?? 0))
      held.add(direction)
  }
  return held
}

// Ported from AutomataFrameworkFailed@ed8592e8: packages/automata/src/testing/input/fake-gamepads.ts
// A `navigator.getGamepads` stand-in a test installs and drives: four slots, as browsers give; each read is a
// snapshot, as a real `Gamepad` is. Buttons and stick directions are pressed by their names.
import { PAD_BUTTONS, PAD_STICKS, type PadInput } from '#src/features/commands/commands.ts'

const SLOTS = 4
/** Browsers count an analog trigger pressed from half travel. */
const PRESSED_FROM = 0.5

interface PadState {
  id: string
  mapping: '' | 'standard'
  buttons: number[]
  axes: number[]
}

/** Four gamepad slots a test plugs pads into and presses; `getGamepads` reads them as the browser's would. */
export interface FakeGamepads {
  readonly getGamepads: () => (Gamepad | null)[]
  /** Puts a pad at rest in `index` (0 by default): standard, unless `mapping` says otherwise. */
  connect(index?: number, options?: { readonly mapping?: '' | 'standard'; readonly id?: string }): void
  unplug(index?: number): void
  /** Presses a button by name; a stick name pushes that stick fully that way. */
  press(name: PadInput, index?: number, value?: number): void
  release(name: PadInput, index?: number): void
  /** Puts a stick at (x, y); the left stick unless `side` says so. */
  stick(x: number, y: number, index?: number, side?: 'left' | 'right'): void
}

const buttonIndex = (name: PadInput): number => (PAD_BUTTONS as readonly string[]).indexOf(name)

/** Where a stick name's push lives: the axis, and the sign of the push. */
function stickAxis(name: PadInput): { axis: number; sign: 1 | -1 } | undefined {
  if (!(PAD_STICKS as readonly string[]).includes(name)) return undefined
  const first = name.startsWith('left') ? 0 : 2
  const vertical = name.endsWith('up') || name.endsWith('down')
  const sign = name.endsWith('up') || name.endsWith('left') ? -1 : 1
  return { axis: first + (vertical ? 1 : 0), sign }
}

export function fakeGamepads(): FakeGamepads {
  const slots: (PadState | null)[] = Array.from({ length: SLOTS }, () => null)

  const snapshot = (pad: PadState, index: number): Gamepad =>
    ({
      id: pad.id,
      index,
      connected: true,
      mapping: pad.mapping,
      timestamp: 0,
      axes: [...pad.axes],
      buttons: pad.buttons.map((value) => ({ pressed: value >= PRESSED_FROM, touched: value > 0, value })),
      vibrationActuator: null,
    }) as unknown as Gamepad

  const padAt = (index: number): PadState => {
    const pad = slots[index]
    if (pad == null) throw new Error(`fakeGamepads: no pad connected at ${index}`)
    return pad
  }

  return {
    getGamepads: () => slots.map((pad, index) => (pad === null ? null : snapshot(pad, index))),
    connect(index = 0, options = {}) {
      slots[index] = {
        id: options.id ?? 'Standard Gamepad (STANDARD GAMEPAD)',
        mapping: options.mapping ?? 'standard',
        buttons: Array.from({ length: PAD_BUTTONS.length }, () => 0),
        axes: [0, 0, 0, 0],
      }
    },
    unplug(index = 0) {
      padAt(index)
      slots[index] = null
    },
    press(name, index = 0, value = 1) {
      const pad = padAt(index)
      const stick = stickAxis(name)
      if (stick !== undefined) pad.axes[stick.axis] = stick.sign * value
      else pad.buttons[buttonIndex(name)] = value
    },
    release(name, index = 0) {
      const pad = padAt(index)
      const stick = stickAxis(name)
      if (stick !== undefined) pad.axes[stick.axis] = 0
      else pad.buttons[buttonIndex(name)] = 0
    },
    stick(x, y, index = 0, side = 'left') {
      const pad = padAt(index)
      const first = side === 'left' ? 0 : 2
      pad.axes[first] = x
      pad.axes[first + 1] = y
    },
  }
}

// Ported from AutomataFrameworkFailed@ed8592e8: packages/automata/src/features/input/gamepad/nav-repeat.ts
// Gamepad presses for menus: the D-pad or the left stick walks a screen, south accepts, east goes back, start pauses.
// A held direction fires at once, again after a pause, then steadily, as a held key does. Pure over what it is given:
// the pads' readings, the frame's time, and a way to read a stick.
import type { PadInput } from '../commands/commands.ts'

/** What a gamepad does in a menu. */
export type MenuPress = 'up' | 'down' | 'left' | 'right' | 'accept' | 'back' | 'pause'

/** A held direction fires at once, and again after this long. */
export const REPEAT_DELAY_MS = 400
/** After that it fires this often. */
export const REPEAT_EVERY_MS = 120

type Direction = 'up' | 'down' | 'left' | 'right'
const DPAD: readonly (readonly [PadInput, Direction])[] = [
  ['dpad-up', 'up'],
  ['dpad-down', 'down'],
  ['dpad-left', 'left'],
  ['dpad-right', 'right'],
]
const BUTTONS: readonly (readonly [PadInput, MenuPress])[] = [
  ['south', 'accept'],
  ['east', 'back'],
  ['start', 'pause'],
]

/** The one direction a left stick walks a menu: its stronger axis, and only if the pad reports it held. */
function stickDirection(
  held: ReadonlySet<PadInput>,
  stick: { readonly x: number; readonly y: number },
): Direction | undefined {
  const vertical = Math.abs(stick.y) > Math.abs(stick.x)
  const name: PadInput = vertical
    ? stick.y < 0
      ? 'left-stick-up'
      : 'left-stick-down'
    : stick.x < 0
      ? 'left-stick-left'
      : 'left-stick-right'
  if (!held.has(name)) return undefined
  return vertical ? (stick.y < 0 ? 'up' : 'down') : stick.x < 0 ? 'left' : 'right'
}

export interface Menu {
  /**
   * Reads one frame. `muted` pads still keep their place (so a press that was taken for something else is not
   * fired a frame later) but fire nothing.
   */
  step(
    held: ReadonlyMap<number, ReadonlySet<PadInput>>,
    ms: number,
    stick: (pad: number) => { readonly x: number; readonly y: number },
    muted?: ReadonlySet<number>,
  ): void
  /** Calls `listener` for each menu press, with the pad it came from. */
  on(listener: (press: MenuPress, pad: number) => void): () => void
}

export function createMenu(): Menu {
  const listeners = new Set<(press: MenuPress, pad: number) => void>()
  /** Per pad: the buttons held last frame. */
  const before = new Map<number, ReadonlySet<PadInput>>()
  /** Per pad and direction: when it went down, and when it last fired. */
  const directions = new Map<string, { since: number; lastFired: number }>()
  const fire = (press: MenuPress, pad: number): void => {
    for (const listener of [...listeners]) listener(press, pad)
  }
  return {
    step(held, ms, stick, muted = new Set()) {
      for (const pad of [...before.keys()]) if (!held.has(pad)) before.delete(pad)
      for (const key of [...directions.keys()])
        if (!held.has(Number(key.split(':')[0]))) directions.delete(key)
      for (const [pad, now] of [...held].sort((a, b) => a[0] - b[0])) {
        const quiet = muted.has(pad)
        const was = before.get(pad) ?? new Set<PadInput>()
        before.set(pad, now)
        const pressed: MenuPress[] = []
        const walking = new Set<Direction>()
        for (const [name, direction] of DPAD) if (now.has(name)) walking.add(direction)
        const leaning = stickDirection(now, stick(pad))
        if (leaning !== undefined) walking.add(leaning)
        for (const direction of ['up', 'down', 'left', 'right'] as const) {
          const key = `${pad}:${direction}`
          if (!walking.has(direction)) {
            directions.delete(key)
            continue
          }
          const state = directions.get(key)
          if (state === undefined) {
            directions.set(key, { since: ms, lastFired: ms })
            pressed.push(direction)
            continue
          }
          const due =
            state.lastFired === state.since
              ? ms - state.since >= REPEAT_DELAY_MS
              : ms - state.lastFired >= REPEAT_EVERY_MS
          if (due) {
            state.lastFired = ms
            pressed.push(direction)
          }
        }
        // Buttons never repeat: one press, one answer.
        for (const [name, press] of BUTTONS) if (now.has(name) && !was.has(name)) pressed.push(press)
        if (!quiet) for (const press of pressed) fire(press, pad)
      }
    },
    on(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

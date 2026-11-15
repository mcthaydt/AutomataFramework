// Gamepad presses for a screen shown while no game runs (the language picker comes before the game starts, so there
// is no `Input` yet): the pads read once a frame and walked through the same menu rules the game's input uses.
import { type Frames, pageFrames } from '../../lib/frames.ts'
import type { PadLike } from './gamepad.ts'
import { createMenu, type MenuPress } from './menu.ts'
import { createPads } from './pads.ts'

/**
 * Presses of the pads' menu buttons (up, down, left, right, accept, back, pause), each with the pad it came from (the
 * main menu lets a second player join with their own pad), stepped on `frames`. Whatever is held
 * when it is made does nothing until it is let go, so the button that closed the screen before this one is not heard
 * again. Stops asking for frames on `destroy`.
 */
export function padMenu(
  options: { readonly frames?: Frames; readonly gamepads?: () => readonly (PadLike | null)[] } = {},
): {
  on(listener: (press: MenuPress, pad: number) => void): () => void
  destroy(): void
} {
  const frames = options.frames ?? pageFrames
  const pads = createPads(options.gamepads)
  const menu = createMenu()
  pads.mask()
  let frame: number | undefined
  let stopped = false
  const onFrame = (ms: number): void => {
    frame = undefined
    if (stopped) return
    menu.step(pads.read(), ms, pads.leftStick)
    frame = frames.request(onFrame)
  }
  frame = frames.request(onFrame)
  return {
    on: (listener) => menu.on(listener),
    destroy() {
      stopped = true
      if (frame !== undefined) frames.cancel(frame)
      frame = undefined
    },
  }
}

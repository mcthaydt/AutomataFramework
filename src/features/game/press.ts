// The first press of a level: a game made with `waitForPress` stands still until the player does something that begins
// after the level is on the page (a key that goes down and is not a repeat, a pad button that was up and goes down, or a
// touch). What was already held when the level appeared (the Enter, the pad button or the tap that chose "Play", "Try
// again" or "Next level") never counts, so a level never starts under a finger that has not meant to start it.
import type { PadLike } from '../input/input.ts'

/** What `watchFirstPress` gives back. */
export interface FirstPress {
  /** True from the first press that began after the first frame. */
  pressed(): boolean
  /**
   * Called once each frame. The first call notes what is already down on every pad; a later call counts a button that
   * was up and is now down as the press.
   */
  frame(): void
  /** Called once, when the press comes. Returns the function that stops it. */
  onPress(listener: () => void): () => void
  stop(): void
}

/** The browser's pads; a page that may not see them has none. */
function browserPads(): readonly (PadLike | null)[] {
  try {
    return typeof navigator.getGamepads === 'function' ? Array.from(navigator.getGamepads()) : []
  } catch {
    return []
  }
}

/** The pad buttons that are down, as `index:button` words. */
function down(pads: readonly (PadLike | null)[]): Set<string> {
  const held = new Set<string>()
  for (const pad of pads) {
    if (pad === null || pad === undefined || !pad.connected) continue
    pad.buttons.forEach((button, at) => {
      if (button.pressed) held.add(`${pad.index}:${at}`)
    })
  }
  return held
}

/**
 * Watches for the press that starts a level. `mount` hears the touches and the window hears the keys, as the game's own
 * input does; `gamepads` stands in for the browser's pads in a test.
 */
export function watchFirstPress(options: {
  readonly mount: HTMLElement
  readonly gamepads?: () => readonly (PadLike | null)[]
}): FirstPress {
  const { mount, gamepads = browserPads } = options
  const win = mount.ownerDocument.defaultView ?? window
  const listeners = new Set<() => void>()
  let started = false
  // What was down on the first frame, or last frame: a pad button counts when it was up on the frame before.
  let before: Set<string> | undefined
  const start = (): void => {
    if (started) return
    started = true
    for (const listener of [...listeners]) listener()
    listeners.clear()
  }
  const onKey = (event: KeyboardEvent): void => {
    if (!event.repeat) start()
  }
  // A touch that arrives before the first frame is the one that put the level on the page.
  const onPointer = (): void => {
    if (before !== undefined) start()
  }
  win.addEventListener('keydown', onKey, true)
  mount.addEventListener('pointerdown', onPointer, true)
  return {
    pressed: () => started,
    frame() {
      const now = down(gamepads())
      if (before !== undefined && !started) {
        for (const button of now) if (!before.has(button)) start()
      }
      before = now
    },
    onPress(listener) {
      if (started) return () => {}
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    stop() {
      win.removeEventListener('keydown', onKey, true)
      mount.removeEventListener('pointerdown', onPointer, true)
      listeners.clear()
    },
  }
}

// Where animation frames come from. Here, not in the game feature, because the input reads gamepads on every frame and
// the game's loop steps on every frame: both take one `Frames`, so a test that drives it by hand moves them together.

/** Where frames come from: `requestAnimationFrame` in a page, a hand-driven fake in a test. */
export interface Frames {
  /** Asks for one callback with a timestamp in milliseconds. Returns an id for `cancel`. */
  request(callback: (ms: number) => void): number
  cancel(id: number): void
}

/** The page's own animation frames. Only call it in a page. */
export const pageFrames: Frames = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
}

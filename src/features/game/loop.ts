// The fixed-step loop. The sim takes a step every 1/tickHz of a second however fast the display refreshes: a frame
// adds the time it took to a pool and takes a step for each whole tick in it. What is left over becomes `alpha`, how
// far between two steps the picture is drawn. Time comes only from `frames`, so a test drives the loop by hand.

/** Where frames come from: `requestAnimationFrame` in a page, a hand-driven fake in a test. */
export interface Frames {
  /** Asks for one callback with a timestamp in milliseconds. Returns an id for `cancel`. */
  request(callback: (ms: number) => void): number
  cancel(id: number): void
}

/**
 * A frame never runs more than this many steps. Past that the game is further behind than it can catch up (a slow
 * machine, a stalled tab), and running them all would freeze the page; the rest of the time is dropped instead.
 */
export const MAX_STEPS_PER_FRAME = 5

/** Float error from adding up display timestamps must not cost a step: a millionth of a millisecond of slack. */
const SLACK_MS = 1e-6

export interface Loop {
  /** Starts asking for frames. The first one only sets the clock, so time while stopped is never counted. */
  start(): void
  /** Stops asking for frames. */
  stop(): void
  readonly running: boolean
}

/**
 * Calls `step` at `tickHz` on average and `draw(alpha)` once per frame. If `step` throws, the loop stops and the
 * error goes on to the page's error handler, so a broken game does not look like a frozen one.
 */
export function createLoop(options: {
  tickHz: number
  step: () => void
  draw: (alpha: number) => void
  frames: Frames
}): Loop {
  const { tickHz, step, draw, frames } = options
  const period = 1000 / tickHz
  let running = false
  let pending: number | undefined
  let last: number | undefined
  let pool = 0

  const run = (ms: number): void => {
    // The first frame after a start has nothing to measure against. Time going backwards counts as none passing.
    const passed = last === undefined ? 0 : Math.max(0, ms - last)
    last = ms
    pool += passed
    let steps = 0
    while (pool + SLACK_MS >= period && steps < MAX_STEPS_PER_FRAME) {
      step()
      pool -= period
      steps++
    }
    // Still a whole tick behind after the cap: that time is gone, not owed.
    if (pool + SLACK_MS >= period) pool = 0
    draw(Math.min(1, Math.max(0, pool / period)))
  }

  const loop: Loop = {
    start() {
      if (running) return
      running = true
      last = undefined
      pool = 0
      pending = frames.request(onFrame)
    },
    stop() {
      running = false
      if (pending !== undefined) frames.cancel(pending)
      pending = undefined
    },
    get running() {
      return running
    },
  }

  function onFrame(ms: number): void {
    pending = undefined
    if (!running) return
    try {
      run(ms)
    } catch (error) {
      loop.stop()
      throw error
    }
    // `step` or `draw` may have stopped the loop.
    if (running) pending = frames.request(onFrame)
  }
  return loop
}

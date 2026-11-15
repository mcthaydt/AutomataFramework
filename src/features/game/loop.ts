// The fixed-step loop. The sim takes a step every 1/tickHz of a second however fast the display refreshes: a frame
// adds the time it took to a pool and takes a step for each whole tick in it. What is left over becomes `alpha`, how
// far between two steps the picture is drawn. Time comes only from `frames`, so a test drives the loop by hand.
import type { Frames } from '../../lib/frames.ts'

export type { Frames } from '../../lib/frames.ts'

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
 * Calls `step` at `tickHz` on average and `draw(alpha, ms)` once per frame, `ms` being the time the frame took. If
 * `step` throws, the loop stops and the error goes on to the page's error handler, so a broken game does not look like
 * a frozen one.
 *
 * A game can be held still (a freeze): `hold` is asked first in every frame, with the milliseconds that passed, and
 * answers how many of them the game stood still for. Those are taken out before the steps are counted, so held time is
 * never owed and nothing is caught up afterwards. `held` is asked before each step: true takes no more steps this
 * frame, so a hold that starts in a step stops the rest of that frame's steps, which are taken after it. A held frame
 * is still drawn. The hold itself belongs to whoever answers `hold`, so stopping and starting the loop never shortens
 * it.
 */
export function createLoop(options: {
  tickHz: number
  step: () => void
  /** `ms` is the time this frame took, held or not. */
  draw: (alpha: number, ms: number) => void
  frames: Frames
  /** Called first in every frame with the milliseconds that passed; answers how many of them the game was held for. */
  hold?: (ms: number) => number
  /** Asked before each step; true takes no more steps this frame. */
  held?: () => boolean
}): Loop {
  const { tickHz, step, draw, frames, hold, held } = options
  const period = 1000 / tickHz
  let running = false
  let pending: number | undefined
  let last: number | undefined
  let pool = 0

  const run = (ms: number): void => {
    // The first frame after a start has nothing to measure against. Time going backwards counts as none passing.
    const passed = last === undefined ? 0 : Math.max(0, ms - last)
    last = ms
    // What the game stood still for is not owed: it is taken out before the pool is added to.
    const stood = hold === undefined ? 0 : hold(passed)
    pool += passed - (stood > 0 ? Math.min(stood, passed) : 0)
    let steps = 0
    while (pool + SLACK_MS >= period && steps < MAX_STEPS_PER_FRAME && held?.() !== true) {
      step()
      pool -= period
      steps++
    }
    // Still a whole tick behind after the cap stopped the steps: that time is gone, not owed. A hold stopped them
    // otherwise, and the ticks it left are taken after it.
    if (steps >= MAX_STEPS_PER_FRAME && pool + SLACK_MS >= period) pool = 0
    draw(Math.min(1, Math.max(0, pool / period)), passed)
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

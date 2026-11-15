// Frames for a picture that moves while the game is still. A paused game's loop is stopped, so nothing would draw the
// dust of a feel shown by hand, or finish the dust that was in the air when the player paused. These frames ask for
// one only while someone wants it, draw it with the time it took, and end by themselves when there is nothing left.
import type { Frames } from '../../lib/frames.ts'

export interface StillFrames {
  /** Starts asking for frames if `wanted()` and none are being asked for. */
  kick(): void
  /** Stops asking. Safe to call at any time, and twice. */
  stop(): void
}

/**
 * While `wanted()` is true, asks for frames and calls `draw(ms)` with the time each took (0 for the first: it only sets
 * the clock). When `wanted()` turns false the next frame is the last, and nothing is asked for after it.
 */
export function createStillFrames(options: {
  readonly frames: Frames
  readonly wanted: () => boolean
  readonly draw: (ms: number) => void
}): StillFrames {
  const { frames, wanted, draw } = options
  let pending: number | undefined
  let last: number | undefined

  const onFrame = (ms: number): void => {
    pending = undefined
    const passed = last === undefined ? 0 : Math.max(0, ms - last)
    last = ms
    if (!wanted()) {
      last = undefined
      return
    }
    draw(passed)
    if (!wanted()) {
      last = undefined
      return
    }
    if (pending === undefined) pending = frames.request(onFrame)
  }

  return {
    kick() {
      if (pending !== undefined || !wanted()) return
      last = undefined
      pending = frames.request(onFrame)
    },
    stop() {
      if (pending !== undefined) frames.cancel(pending)
      pending = undefined
      last = undefined
    },
  }
}

// Animation frames driven by hand, so a test decides what time it is and no test ever waits on a real display.
import type { Frames } from '#src/features/game/loop.ts'

export interface ManualFrames extends Frames {
  /** True while a frame has been asked for and not yet delivered or cancelled. */
  readonly pending: boolean
  /** Delivers the asked-for frame at this timestamp (ms). Does nothing when none is pending. */
  at(ms: number): void
  /** Delivers it `ms` after the last one delivered. */
  advance(ms: number): void
}

export function manualFrames(): ManualFrames {
  let nextId = 1
  let waiting: { id: number; callback: (ms: number) => void } | undefined
  let now = 0
  return {
    get pending() {
      return waiting !== undefined
    },
    request(callback) {
      waiting = { id: nextId++, callback }
      return waiting.id
    },
    cancel(id) {
      if (waiting?.id === id) waiting = undefined
    },
    at(ms) {
      const frame = waiting
      if (frame === undefined) return
      waiting = undefined
      now = ms
      frame.callback(ms)
    },
    advance(ms) {
      this.at(now + ms)
    },
  }
}

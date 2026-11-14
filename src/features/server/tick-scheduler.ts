// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/net-server/src/features/room/rules/tick-scheduler.ts
/**
 * The room's metronome.
 *
 * Why not `setInterval(step, 16.67)` with an accumulator: Node truncates a timer's delay to whole milliseconds and
 * fires it late rather than early, so that interval really fires every 17 ms, and the accumulator makes up the
 * difference with a burst of two ticks roughly once a second. When a callback runs long, the catch-up cap throws
 * away the fraction of a tick it had banked as well as the ticks it skipped. Measured under four players, that design ticked at 59.73 Hz with a 99th-percentile gap of 34 ms, and a client steering its clock by
 * snapshot arrivals sees every one of those bursts as jitter.
 *
 * This schedules each tick at its own deadline, `start + n * tickMs`, and sleeps until exactly then. A tick
 * therefore fires at most a millisecond or so after it is due and there is no burst in the steady state. When the
 * host genuinely stalls, it catches up by at most `maxCatchUp` ticks and moves the schedule forward by whole ticks
 * for the rest, which it reports through `onCallback`: the room logs that as a slow tick.
 *
 * The clock is injected: the room adapts Effect's `Clock` in production and tests drive a fake one.
 */

/** The time source and timer the scheduler runs on. Times are milliseconds. */
export interface TickClock {
  now(): number
  setTimer(callback: () => void, delayMs: number): unknown
  clearTimer(handle: unknown): void
}

/**
 * How often to tick and what runs: the tick length, the clock, the tick itself and optional hooks
 * for a slow wake-up, an error and the most ticks to catch up.
 */
export interface TickSchedulerOptions {
  readonly tickMs: number
  readonly clock: TickClock
  /** Runs one tick. */
  readonly onTick: () => void
  /** After each wake-up: how many ticks ran and how much time was given up. */
  readonly onCallback?: (ticks: number, droppedMs: number) => void
  /**
   * A tick threw. The scheduler has stopped for good: it runs in a timer callback, where a throw would be an
   * uncaught exception, so it never lets one out and never runs a room on past one.
   */
  readonly onError?: (error: unknown) => void
  /** The most ticks one wake-up runs [5]. */
  readonly maxCatchUp?: number
}

/** A running metronome. Stop it to end it for good. */
export interface TickScheduler {
  /** Stops for good. Idempotent. */
  stop(): void
}

/**
 * Starts ticking at fixed deadlines, one tick length apart, so ticks do not bunch up. After a
 * stall it catches up a few ticks and drops the rest.
 */
export function startTickScheduler(options: TickSchedulerOptions): TickScheduler {
  const { clock, tickMs } = options
  const maxCatchUp = options.maxCatchUp ?? 5

  let origin = clock.now()
  let fired = 0
  let stopped = false
  let handle: unknown

  const schedule = (): void => {
    if (stopped) return
    const due = origin + (fired + 1) * tickMs
    // Rounded up: a timer rounded down wakes a fraction of a millisecond early, finds nothing due, and has to sleep
    // again.
    handle = clock.setTimer(run, Math.max(0, Math.ceil(due - clock.now())))
  }

  const run = (): void => {
    if (stopped) return
    let owed = Math.floor((clock.now() - origin) / tickMs) - fired
    let droppedMs = 0
    if (owed > maxCatchUp) {
      const skipped = owed - maxCatchUp
      droppedMs = skipped * tickMs
      // Moving the origin by whole ticks keeps the phase: the next deadline is still on the same grid, further on.
      origin += droppedMs
      owed = maxCatchUp
    }
    try {
      for (let index = 0; index < owed && !stopped; index += 1) {
        fired += 1
        options.onTick()
      }
    } catch (error) {
      stop()
      options.onError?.(error)
      return
    }
    options.onCallback?.(owed, droppedMs)
    schedule()
  }

  const stop = (): void => {
    if (stopped) return
    stopped = true
    clock.clearTimer(handle)
  }

  schedule()

  return { stop }
}

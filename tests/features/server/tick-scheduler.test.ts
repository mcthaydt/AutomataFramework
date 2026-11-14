// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/net-server/tests/unit/room/rules/tick-scheduler.test.ts
import { describe, expect, it } from 'vitest'
import { startTickScheduler, type TickClock } from '#src/features/server/server.ts'

// The tick scheduler, on a clock and timer the test controls (the injected clock). No wall time and no real timers.

const TICK_MS = 1000 / 60

/** A scheduler on a fake clock, with a host that is `lateMs` slow to wake. */
function driven(lateMs = 0.5) {
  let now = 0
  let pending: { at: number; callback: () => void } | undefined
  const tickTimes: number[] = []
  const callbacks: { ticks: number; droppedMs: number }[] = []
  const clock: TickClock = {
    now: () => now,
    setTimer: (callback, delayMs) => {
      pending = { at: now + delayMs + lateMs, callback }
      return pending
    },
    clearTimer: () => {
      pending = undefined
    },
  }
  const scheduler = startTickScheduler({
    tickMs: TICK_MS,
    clock,
    onTick: () => tickTimes.push(now),
    onCallback: (ticks, droppedMs) => callbacks.push({ ticks, droppedMs }),
  })
  return {
    scheduler,
    tickTimes,
    callbacks,
    /** Runs timers until `until`. */
    runUntil(until: number) {
      while (pending !== undefined && pending.at <= until) {
        const next = pending
        pending = undefined
        now = next.at
        next.callback()
      }
      now = until
    },
    /** The host freezes: nothing runs until it wakes, however overdue. */
    stall(ms: number) {
      now += ms
      if (pending !== undefined) pending.at = Math.max(pending.at, now)
    },
  }
}

describe('the tick scheduler', () => {
  it('delivers exactly sixty ticks a second, one per wake-up', () => {
    const clock = driven()
    // The 600th tick is due at exactly ten seconds and fires just after.
    clock.runUntil(10_000 + TICK_MS / 2)

    expect(clock.tickTimes.length).toBe(600)
    expect(Math.max(...clock.callbacks.map((c) => c.ticks))).toBe(1)
    // Never early, and never more than the host's own lateness plus the millisecond a rounded-up timer can add.
    clock.tickTimes.forEach((at, index) => {
      const due = (index + 1) * TICK_MS
      expect(at).toBeGreaterThanOrEqual(due)
      expect(at - due).toBeLessThan(1.6)
    })
  })

  it('catches up after a stall, and drops only whole ticks past the cap', () => {
    const clock = driven()
    clock.runUntil(1_000)
    const before = clock.tickTimes.length

    clock.stall(200)
    clock.runUntil(1_200 + TICK_MS / 2)

    const burst = clock.callbacks.find((callback) => callback.ticks > 1)
    expect(burst?.ticks).toBe(5)
    const droppedTicks = (burst?.droppedMs ?? 0) / TICK_MS
    expect(droppedTicks).toBeCloseTo(Math.round(droppedTicks), 9)
    expect(droppedTicks).toBeGreaterThan(0)
    // Nothing but whole dropped ticks was lost: every tick due by now either ran or was dropped and reported.
    expect(clock.tickTimes.length + Math.round(droppedTicks)).toBe(
      Math.floor((1_200 + TICK_MS / 2) / TICK_MS),
    )
    expect(clock.tickTimes.length).toBeGreaterThanOrEqual(before + 5)
  })

  it('stops for good', () => {
    const clock = driven()
    clock.runUntil(100)
    clock.scheduler.stop()
    const count = clock.tickTimes.length
    clock.runUntil(1_000)
    expect(clock.tickTimes.length).toBe(count)
  })
})

describe('a tick that throws', () => {
  it('stops the scheduler, reports the error and lets nothing escape the timer', () => {
    let pending: (() => void) | undefined
    let now = 0
    const errors: unknown[] = []
    startTickScheduler({
      tickMs: TICK_MS,
      clock: {
        now: () => now,
        setTimer: (callback) => {
          pending = callback
          return callback
        },
        clearTimer: () => {
          pending = undefined
        },
      },
      onTick: () => {
        throw new Error('the game threw')
      },
      onError: (error) => errors.push(error),
    })
    now = TICK_MS
    const wake = pending
    pending = undefined
    expect(() => wake?.()).not.toThrow()
    expect(errors).toHaveLength(1)
    expect(pending).toBeUndefined()
  })
})

// The fixed-step loop, driven by hand-made frames: how many steps a frame takes, what it draws, and what it never does.
import { expect, test } from 'vitest'
import { createLoop, MAX_STEPS_PER_FRAME } from '#src/features/game/loop.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'

const FRAME = 1000 / 60

/** A started 60 Hz loop that counts its steps and remembers its draws. */
function setup(tickHz = 60): {
  frames: ManualFrames
  steps: () => number
  alphas: number[]
  loop: ReturnType<typeof createLoop>
} {
  const frames = manualFrames()
  const alphas: number[] = []
  let steps = 0
  const loop = createLoop({
    tickHz,
    step: () => {
      steps++
    },
    draw: (alpha) => alphas.push(alpha),
    frames,
  })
  loop.start()
  return { frames, steps: () => steps, alphas, loop }
}

test('the first frame only sets the clock', () => {
  const { frames, steps } = setup()
  frames.at(5000)
  expect(steps()).toBe(0)
})

test('one 60 Hz frame is one step', () => {
  const { frames, steps } = setup()
  frames.at(0)
  frames.at(16.667)
  expect(steps()).toBe(1)
})

test('a 30 Hz display takes two steps a frame', () => {
  const { frames, steps } = setup()
  frames.at(0)
  frames.at(33.334)
  expect(steps()).toBe(2)
})

test('a 120 Hz display steps every other frame, and alpha is the part of a tick left over', () => {
  const { frames, steps, alphas } = setup()
  frames.at(0)
  frames.at(FRAME / 2)
  expect(steps()).toBe(0)
  expect(alphas.at(-1)).toBeCloseTo(0.5, 5)
  frames.at(FRAME)
  expect(steps()).toBe(1)
  expect(alphas.at(-1)).toBeCloseTo(0, 5)
})

test('every frame draws once', () => {
  const { frames, alphas } = setup()
  for (let i = 0; i < 4; i++) frames.at(i * FRAME)
  expect(alphas).toHaveLength(4)
})

test('a frame a minute late runs MAX_STEPS_PER_FRAME steps and drops the rest', () => {
  const { frames, steps } = setup()
  frames.at(0)
  frames.at(60_000)
  expect(steps()).toBe(MAX_STEPS_PER_FRAME)
  frames.at(60_000 + FRAME)
  expect(steps()).toBe(MAX_STEPS_PER_FRAME + 1)
})

test('time going backwards runs no steps and does not throw', () => {
  const { frames, steps } = setup()
  frames.at(100)
  expect(() => frames.at(50)).not.toThrow()
  expect(steps()).toBe(0)
  frames.at(50 + FRAME)
  expect(steps()).toBe(1)
})

test('stop cancels the pending frame; start after stop does not count the gap', () => {
  const { frames, steps, loop } = setup()
  frames.at(0)
  loop.stop()
  expect(frames.pending).toBe(false)
  expect(loop.running).toBe(false)
  loop.start()
  expect(loop.running).toBe(true)
  frames.at(100_000)
  expect(steps()).toBe(0)
  frames.at(100_000 + FRAME)
  expect(steps()).toBe(1)
})

test('starting twice does not run two loops', () => {
  const { frames, steps, loop } = setup()
  loop.start()
  frames.at(0)
  frames.at(FRAME)
  expect(steps()).toBe(1)
})

test('a step that throws stops the loop and the error is not hidden', () => {
  const frames = manualFrames()
  const loop = createLoop({
    tickHz: 60,
    step: () => {
      throw new Error('broken')
    },
    draw: () => {},
    frames,
  })
  loop.start()
  frames.at(0)
  expect(() => frames.at(FRAME)).toThrow('broken')
  expect(loop.running).toBe(false)
  expect(frames.pending).toBe(false)
})

// A hold: the game stands still for a while. `hold` is asked first in every frame and says how much of the frame it was
// held for; `held` is asked before each step.
/** A loop whose `step` number `startAt` starts a hold of `ticks` ticks, spent by frames as the real runtime does. */
function holding(startAt: number, ticks: number, tickHz = 60) {
  const frames = manualFrames()
  const draws: { alpha: number; ms: number }[] = []
  const stepTicks: number[] = []
  let left = 0
  let steps = 0
  const loop = createLoop({
    tickHz,
    step: () => {
      steps++
      stepTicks.push(steps)
      if (steps === startAt) left = (ticks * 1000) / tickHz
    },
    draw: (alpha, ms) => draws.push({ alpha, ms }),
    frames,
    hold: (ms) => {
      const spent = Math.min(ms, left)
      left -= spent
      if (left < 1e-6) left = 0
      return spent
    },
    held: () => left > 0,
  })
  loop.start()
  return { frames, loop, draws, steps: () => steps, left: () => left }
}

test('a hold of four ticks: the next four 60 Hz frames take no step and the fifth takes one', () => {
  const { frames, steps } = holding(1, 4)
  frames.at(0)
  frames.at(FRAME)
  expect(steps()).toBe(1)
  for (let i = 2; i <= 5; i++) {
    frames.at(i * FRAME)
    expect(steps(), `frame ${i}`).toBe(1)
  }
  frames.at(6 * FRAME)
  expect(steps()).toBe(2)
})

test('after a hold the tick count goes on one a frame: nothing is caught up', () => {
  const { frames, steps } = holding(1, 4)
  frames.at(0)
  for (let i = 1; i <= 6; i++) frames.at(i * FRAME)
  const before = steps()
  for (let i = 7; i <= 26; i++) frames.at(i * FRAME)
  expect(steps() - before).toBe(20)
})

test("a hold that starts in a step stops the rest of that frame's steps, and they are taken after it", () => {
  // A frame of two ticks of time: the first step starts a hold of two ticks, so the second step waits for it.
  const { frames, steps } = holding(1, 2)
  frames.at(0)
  frames.at(2 * FRAME)
  expect(steps()).toBe(1)
  frames.at(3 * FRAME)
  expect(steps()).toBe(1)
  // The hold ends in this frame, and the step that waited is taken.
  frames.at(4 * FRAME)
  expect(steps()).toBe(2)
})

test("draw is called in every held frame, with the same alpha and the frame's time", () => {
  const { frames, draws } = holding(1, 4)
  frames.at(0)
  for (let i = 1; i <= 6; i++) frames.at(i * FRAME)
  expect(draws).toHaveLength(7)
  for (const draw of draws.slice(2, 6)) {
    expect(draw.alpha).toBeCloseTo(draws[1]?.alpha ?? -1, 6)
    expect(draw.ms).toBeCloseTo(FRAME, 6)
  }
})

test("a frame longer than the hold steps for what is left over, and no more", () => {
  const { frames, steps } = holding(1, 2)
  frames.at(0)
  frames.at(FRAME)
  expect(steps()).toBe(1)
  // Two ticks held, five ticks of time: three ticks are left to step for.
  frames.at(FRAME + 5 * FRAME)
  expect(steps()).toBe(1 + 3)
})

test('stopping and starting during a hold does not shorten it', () => {
  const { frames, loop, steps, left } = holding(1, 4)
  frames.at(0)
  frames.at(FRAME)
  frames.at(2 * FRAME)
  const kept = left()
  loop.stop()
  loop.start()
  expect(left()).toBe(kept)
  frames.at(100_000)
  frames.at(100_000 + FRAME)
  // The hold goes on counting down in the frames after the restart; no step was taken during it.
  expect(steps()).toBe(1)
})

test('one frame of ten seconds during a hold takes at most MAX_STEPS_PER_FRAME steps', () => {
  const { frames, steps } = holding(1, 4)
  frames.at(0)
  frames.at(FRAME)
  frames.at(FRAME + 10_000)
  expect(steps()).toBeLessThanOrEqual(1 + MAX_STEPS_PER_FRAME)
  frames.at(FRAME + 10_000 + FRAME)
  expect(steps()).toBeLessThanOrEqual(1 + MAX_STEPS_PER_FRAME + 1)
})

test('with no hold and no held the loop is as it was', () => {
  const { frames, steps, alphas } = setup()
  frames.at(0)
  frames.at(FRAME)
  frames.at(FRAME * 1.5)
  expect(steps()).toBe(1)
  expect(alphas).toHaveLength(3)
})

test('a hold that answers nonsense is no hold', () => {
  const frames = manualFrames()
  let steps = 0
  const loop = createLoop({
    tickHz: 60,
    step: () => {
      steps++
    },
    draw: () => {},
    frames,
    hold: () => Number.NaN,
  })
  loop.start()
  frames.at(0)
  frames.at(FRAME)
  expect(steps).toBe(1)
})

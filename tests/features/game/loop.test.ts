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

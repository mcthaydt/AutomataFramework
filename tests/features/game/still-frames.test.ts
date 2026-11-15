// Frames for a picture that moves while the game is still: asked for only while wanted, with the time each took, and
// never after the last one that was wanted.
import { expect, test } from 'vitest'
import { createStillFrames } from '#src/features/game/still-frames.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'

function make(wanted: { value: boolean }) {
  const frames = manualFrames()
  const drawn: number[] = []
  const still = createStillFrames({ frames, wanted: () => wanted.value, draw: (ms) => drawn.push(ms) })
  return { frames, drawn, still }
}

test('kick asks for nothing while nothing is wanted', () => {
  const { frames, still } = make({ value: false })
  still.kick()
  expect(frames.pending).toBe(false)
})

test('wanted, it draws every frame with the time that frame took, the first with none', () => {
  const { frames, drawn, still } = make({ value: true })
  still.kick()
  expect(frames.pending).toBe(true)
  frames.at(1000)
  frames.at(1017)
  frames.at(1040)
  expect(drawn).toEqual([0, 17, 23])
  expect(frames.pending).toBe(true)
})

test('kicked twice asks once', () => {
  const { frames, drawn, still } = make({ value: true })
  still.kick()
  still.kick()
  frames.at(0)
  expect(drawn).toHaveLength(1)
})

test('when nothing is wanted any more the next frame is the last, and nothing is asked after it', () => {
  const wanted = { value: true }
  const { frames, drawn, still } = make(wanted)
  still.kick()
  frames.at(0)
  frames.at(16)
  wanted.value = false
  frames.at(32)
  expect(drawn).toEqual([0, 16])
  expect(frames.pending).toBe(false)
})

test('a draw that finishes the job is the last: nothing is asked for after it', () => {
  const wanted = { value: true }
  const frames = manualFrames()
  const still = createStillFrames({
    frames,
    wanted: () => wanted.value,
    draw: () => {
      wanted.value = false
    },
  })
  still.kick()
  frames.at(0)
  expect(frames.pending).toBe(false)
})

test('stop cancels what was asked for, and a new kick starts the clock again', () => {
  const { frames, drawn, still } = make({ value: true })
  still.kick()
  frames.at(100)
  still.stop()
  expect(frames.pending).toBe(false)
  still.stop()
  still.kick()
  frames.at(5000)
  expect(drawn).toEqual([0, 0])
})

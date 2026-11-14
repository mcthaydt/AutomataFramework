import { expect, test } from 'vitest'
import type { Clip } from '#src/features/content/content.ts'
import { motionClip, pickClip, poseAt } from '#src/features/level/clip.ts'

const clip = (id: string, poses: string[], fps = 1, loop = true): Clip => ({ id, poses, fps, loop })
const idle = clip('idle', ['idle'])
const run = clip('run', ['run-1', 'run-2'], 8)
const talk = clip('talk', ['idle', 'talk'], 6)

test.each([
  [0, 0, 'idle', 4, false, 'idle'],
  [3, 0, 'idle', 4, false, 'run'],
  [3, -8, 'run', 0, false, 'jump'],
  [0, 4, 'jump', 0, false, 'fall'],
  [0, 0, 'jump', 2, false, 'jump'],
  [0, 0, 'fall', 2, false, 'fall'],
  [0, 0, 'fall', 4, false, 'land'],
  [0, 0, 'land', 4, true, 'land'],
  [0, 0, 'land', 4, false, 'idle'],
  [0, 0, 'jump', 4, false, 'idle'],
  [0.005, 0.2, 'idle', 4, false, 'idle'],
])('moving at %d, %d from %s, still for %d', (vx, vy, now, still, landing, expected) =>
  expect(motionClip(vx, vy, now, still, landing)).toBe(expected),
)

test('a character without the clip asked for plays the nearest it has', () => {
  expect(pickClip([idle, run], 'push')?.id).toBe('run')
  expect(pickClip([idle], 'fall')?.id).toBe('idle')
  expect(pickClip([idle, clip('jump', ['jump'])], 'fall')?.id).toBe('jump')
  expect(pickClip([idle, run], 'land')?.id).toBe('idle')
  expect(pickClip([talk], 'run')?.id).toBe('talk')
  expect(pickClip([idle, run], 'run')?.id).toBe('run')
  expect(pickClip([], 'idle')).toBeUndefined()
})

test('a clip of two poses at 12 a second changes pose every 5 ticks, and a loop goes round', () => {
  const two = clip('run', ['a', 'b'], 12)
  const shown = Array.from({ length: 21 }, (_, ticks) => poseAt(two, ticks).pose)
  expect(shown.slice(0, 5)).toEqual(['a', 'a', 'a', 'a', 'a'])
  expect(shown.slice(5, 10)).toEqual(['b', 'b', 'b', 'b', 'b'])
  expect(shown.slice(10, 15)).toEqual(['a', 'a', 'a', 'a', 'a'])
  expect(shown[20]).toBe('a')
  expect(Array.from({ length: 100 }, (_, ticks) => poseAt(two, ticks).done)).not.toContain(true)
})

test('a clip that does not loop holds its last pose and is done', () => {
  const once = clip('land', ['a', 'b'], 12, false)
  expect(poseAt(once, 4)).toEqual({ pose: 'a', done: false })
  expect(poseAt(once, 5)).toEqual({ pose: 'b', done: false })
  expect(poseAt(once, 9)).toEqual({ pose: 'b', done: false })
  expect(poseAt(once, 10)).toEqual({ pose: 'b', done: true })
  expect(poseAt(once, 1000)).toEqual({ pose: 'b', done: true })
})

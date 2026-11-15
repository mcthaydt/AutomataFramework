import { expect, test } from 'vitest'
import type { Clip } from '#src/features/content/content.ts'
import { motionClip, pickClip, poseAt } from '#src/features/level/clip.ts'
import { MoveMode } from '#src/features/level/level.ts'

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

test.each([
  // What a hero the framework moves is doing wins over how it moves, except an air jump that has stopped rising.
  [0, 0, 'idle', 4, false, MoveMode.dash, 'dash'],
  [3, -8, 'jump', 0, false, MoveMode.dash, 'dash'],
  [0, 5, 'fall', 0, false, MoveMode.wall, 'wall'],
  [0, -8, 'jump', 0, false, MoveMode.airJump, 'air-jump'],
  [0, 3, 'air-jump', 0, false, MoveMode.airJump, 'fall'],
  [3, -8, 'run', 0, false, MoveMode.plain, 'jump'],
  [3, 0, 'idle', 4, false, MoveMode.plain, 'run'],
])('moving at %d, %d from %s, still for %d, in mode %d', (vx, vy, now, still, landing, mode, expected) =>
  expect(motionClip(vx, vy, now, still, landing, mode)).toBe(expected),
)

test('the new clips fall back to the nearest a character has, a hop at a time', () => {
  const jump = clip('jump', ['jump'])
  const fall = clip('fall', ['fall'])
  expect(pickClip([idle, jump], 'air-jump')?.id).toBe('jump')
  expect(pickClip([idle, jump, fall], 'wall')?.id).toBe('fall')
  expect(pickClip([idle, jump], 'wall')?.id).toBe('jump')
  expect(pickClip([idle, run], 'dash')?.id).toBe('run')
  expect(pickClip([idle], 'dash')?.id).toBe('idle')
  expect(pickClip([idle, run, clip('dash', ['run-2'])], 'dash')?.id).toBe('dash')
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

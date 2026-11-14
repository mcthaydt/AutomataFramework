import { expect, test } from 'vitest'
import { blendShot, easeShot, frameHeroes, layerShift, placeCamera } from '#src/features/render/camera.ts'
import { fitWorld } from '#src/features/render/fit.ts'

const level = { w: 40, h: 12 }
const view = { w: 16, h: 9 }

test('one hero in the open is in the middle of the view', () => {
  expect(frameHeroes(level, view, [{ x: 20, y: 6 }])).toEqual({ x: 20, y: 6, w: 16, h: 9 })
})

test("at the level's edge the shot stops at the edge", () => {
  expect(frameHeroes(level, view, [{ x: 1, y: 11 }])).toEqual({ x: 8, y: 7.5, w: 16, h: 9 })
})

test('two heroes 20 tiles apart widen the shot to hold both, with room', () => {
  expect(
    frameHeroes(level, view, [
      { x: 8, y: 6 },
      { x: 28, y: 6 },
    ]),
  ).toEqual({ x: 18, y: 6, w: 24, h: 9 })
})

test('heroes at both ends are held by the whole level, and never more', () => {
  expect(
    frameHeroes(level, view, [
      { x: 1, y: 1 },
      { x: 39, y: 11 },
    ]),
  ).toEqual({ x: 20, y: 6, w: 40, h: 12 })
})

test("the camera pulls back no further than view.most, and holds the heroes' middle", () => {
  expect(
    frameHeroes(level, { ...view, most: { w: 24, h: 12 } }, [
      { x: 4, y: 6 },
      { x: 36, y: 6 },
    ]),
  ).toEqual({ x: 20, y: 6, w: 24, h: 9 })
})

test('with most left out the limit is the whole level', () => {
  const shot = frameHeroes(level, view, [
    { x: 0, y: 6 },
    { x: 40, y: 6 },
  ])
  expect(shot.w).toBe(40)
})

test("nobody to follow rests on the level's middle", () => {
  expect(frameHeroes(level, view, [])).toEqual({ x: 20, y: 6, w: 16, h: 9 })
})

test('a hero whose place is not a number is left out', () => {
  expect(
    frameHeroes(level, view, [
      { x: 20, y: 6 },
      { x: Number.NaN, y: 3 },
    ]),
  ).toEqual({ x: 20, y: 6, w: 16, h: 9 })
})

test('no number is ever NaN', () => {
  const nothing = { w: 0, h: 0 }
  const shots = [
    frameHeroes(nothing, nothing, []),
    frameHeroes(nothing, nothing, [{ x: 3, y: 3 }]),
    frameHeroes(level, { w: Number.NaN, h: Number.NaN }, [{ x: Number.NaN, y: Number.NaN }]),
    frameHeroes(level, view, [{ x: Number.POSITIVE_INFINITY, y: 1 }]),
  ]
  for (const shot of shots) for (const n of Object.values(shot)) expect(Number.isFinite(n)).toBe(true)
  const fits = [
    placeCamera({ w: 0, h: 0 }, level, { x: 0, y: 0, w: 1, h: 1 }),
    placeCamera({ w: 100, h: 100 }, nothing, { x: 0, y: 0, w: 1, h: 1 }),
    placeCamera({ w: 100, h: 100 }, level, { x: 0, y: 0, w: 0, h: 0 }),
  ]
  for (const fit of fits) expect(fit).toEqual({ scale: 0, left: 0, top: 0 })
})

test('easing moves each number 15% of the way, and blending any part of the way', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 }
  const b = { x: 100, y: 20, w: 20, h: 10 }
  expect(easeShot(a, b)).toEqual({ x: 15, y: 3, w: 11.5, h: 10 })
  expect(blendShot(a, b, 0)).toEqual(a)
  expect(blendShot(a, b, 1)).toEqual(b)
  expect(blendShot(a, b, 0.5)).toEqual({ x: 50, y: 10, w: 15, h: 10 })
})

test('a wide screen shows more of the level, and never past its edge', () => {
  const fit = placeCamera({ w: 800, h: 200 }, level, { x: 20, y: 6, w: 16, h: 9 })
  expect(fit.scale).toBeCloseTo(200 / 9, 6)
  expect(fit.left).toBeLessThanOrEqual(0)
  expect(fit.left + 40 * fit.scale).toBeGreaterThanOrEqual(800 - 1e-6)
  // At the level's left edge it shows no more than the edge, however far left the shot is.
  const edge = placeCamera({ w: 800, h: 200 }, level, { x: 0, y: 6, w: 16, h: 9 })
  expect(edge.left).toBe(0)
})

test('the shot fills the box when the box has its shape', () => {
  const fit = placeCamera({ w: 320, h: 180 }, level, { x: 20, y: 6, w: 16, h: 9 })
  expect(fit.scale).toBe(20)
  expect(fit.left).toBe(-(20 - 8) * 20)
  expect(fit.top).toBe(-(6 - 4.5) * 20)
})

test('a level smaller than the screen is centred', () => {
  const small = { w: 10, h: 6 }
  const fit = placeCamera({ w: 400, h: 120 }, small, { x: 5, y: 3, w: 10, h: 6 })
  expect(fit).toEqual(fitWorld({ w: 400, h: 120 }, small))
})

test('a far layer stays put and a near one moves with the level', () => {
  // A camera 10 tiles along the level at 20 pixels a tile.
  const fit = { scale: 20, left: -200, top: -30 }
  const box = { w: 320, h: 180 }
  expect(layerShift(0, fit, level, box)).toEqual({ x: 0, y: 180 })
  expect(layerShift(1, fit, level, box)).toEqual({ x: -200, y: -30 + 12 * 20 })
  expect(layerShift(0.5, fit, level, box)).toEqual({ x: -100, y: (180 + 210) / 2 })
})

test('a layer of a level smaller than the screen stays on its bottom edge', () => {
  const small = { w: 10, h: 6 }
  const fit = fitWorld({ w: 400, h: 120 }, small)
  const bottom = fit.top + 6 * fit.scale
  for (const drift of [0, 0.5, 1])
    expect(layerShift(drift, fit, small, { w: 400, h: 120 })).toEqual({ x: fit.left, y: bottom })
})

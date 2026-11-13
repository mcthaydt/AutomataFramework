import { expect, test } from 'vitest'
import { fitWorld } from '#src/features/render/render.ts'

test('fitWorld letterboxes: the whole world, as large as it goes, centred', () => {
  expect(fitWorld({ w: 800, h: 450 }, { w: 16, h: 9 })).toEqual({ scale: 50, left: 0, top: 0 })
  expect(fitWorld({ w: 390, h: 844 }, { w: 16, h: 9 })).toEqual({ scale: 24.375, left: 0, top: 312.3125 })
  expect(fitWorld({ w: 1000, h: 450 }, { w: 16, h: 9 })).toEqual({ scale: 50, left: 100, top: 0 })
})

test('fitWorld of an empty box or an empty world is scale 0, never NaN or Infinity', () => {
  const none = { scale: 0, left: 0, top: 0 }
  expect(fitWorld({ w: 0, h: 0 }, { w: 16, h: 9 })).toEqual(none)
  expect(fitWorld({ w: 0, h: 100 }, { w: 16, h: 9 })).toEqual(none)
  expect(fitWorld({ w: 100, h: 100 }, { w: 0, h: 9 })).toEqual(none)
  expect(fitWorld({ w: 100, h: 100 }, { w: 16, h: 0 })).toEqual(none)
  expect(fitWorld({ w: Number.NaN, h: 100 }, { w: 16, h: 9 })).toEqual(none)
})

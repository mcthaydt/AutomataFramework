import { expect, test } from 'vitest'
import type { FeelFile } from '#src/features/content/content.ts'
import { MAX_FREEZE_TICKS, withinLimits } from '#src/features/feel/limits.ts'

const file = (parts: Partial<FeelFile>): FeelFile => ({ format: 1, id: 'x', on: 'a.b', ...parts })

test('count 10000 plays as 64, strength 5 as 1, a freeze of 500 ticks as 30', () => {
  const out = withinLimits(
    file({
      dust: { count: 10_000, color: '#ffffff', speed: 500, life: 9999 },
      shake: { strength: 5, ticks: 500 },
      freeze: { ticks: 500 },
    }),
  )
  expect(out.dust).toEqual({ count: 64, color: '#ffffff', speed: 32, life: 120 })
  expect(out.shake).toEqual({ strength: 1, ticks: 60 })
  expect(out.freeze).toEqual({ ticks: MAX_FREEZE_TICKS })
  expect(MAX_FREEZE_TICKS).toBe(30)
})

test('a NaN speed leaves the dust out and keeps the shake', () => {
  const out = withinLimits(
    file({
      dust: { count: 4, color: '#ffffff', speed: Number.NaN, life: 10 },
      shake: { strength: 0.2, ticks: 8 },
    }),
  )
  expect(out.dust).toBeUndefined()
  expect(out.shake).toEqual({ strength: 0.2, ticks: 8 })
})

test('a number that is not above zero leaves that effect out', () => {
  expect(withinLimits(file({ freeze: { ticks: 0 } })).freeze).toBeUndefined()
  expect(withinLimits(file({ shake: { strength: -1, ticks: 5 } })).shake).toBeUndefined()
  expect(withinLimits(file({ freeze: { ticks: Number.POSITIVE_INFINITY } })).freeze).toBeUndefined()
})

test('a file inside the limits comes back unchanged', () => {
  const inside = file({
    dust: { count: 6, color: '#e8dcc0', speed: 2, life: 18 },
    shake: { strength: 0.4, ticks: 12 },
    freeze: { ticks: 4 },
  })
  expect(withinLimits(inside)).toBe(inside)
})

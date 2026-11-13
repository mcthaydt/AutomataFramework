// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/rng/rng.test.ts
import { expect, test } from 'vitest'
import { createRng, deriveSeed, rngFromState } from '#src/features/sim/rng.ts'

test('xoshiro128** from state [1,2,3,4] matches the C reference sequence', () => {
  const r = rngFromState([1, 2, 3, 4])
  expect(Array.from({ length: 6 }, () => r.nextU32())).toEqual([
    11520, 0, 5927040, 70819200, 2031721883, 1637235492,
  ])
  expect(r.state()).toEqual([1110993931, 286554632, 2431677446, 2165318166])
})

test('same seed gives the same sequence; different seeds differ', () => {
  const a = createRng(42)
  const b = createRng(42)
  const c = createRng(43)
  const seqA = Array.from({ length: 8 }, () => a.nextU32())
  expect(Array.from({ length: 8 }, () => b.nextU32())).toEqual(seqA)
  expect(Array.from({ length: 8 }, () => c.nextU32())).not.toEqual(seqA)
})

test('state() round-trips: a restored generator continues identically', () => {
  const a = createRng(7)
  for (let i = 0; i < 100; i++) a.nextU32()
  const b = rngFromState(a.state())
  expect(Array.from({ length: 10 }, () => b.nextU32())).toEqual(Array.from({ length: 10 }, () => a.nextU32()))
})

test('next() is in [0, 1) and int(n) is in [0, n)', () => {
  const r = createRng(1)
  for (let i = 0; i < 10_000; i++) {
    const x = r.next()
    expect(x >= 0 && x < 1).toBe(true)
    const k = r.int(6)
    expect(Number.isInteger(k) && k >= 0 && k < 6).toBe(true)
  }
})

test('int(n) rejects non-positive or non-integer bounds', () => {
  const r = createRng(1)
  expect(() => r.int(0)).toThrow(RangeError)
  expect(() => r.int(2.5)).toThrow(RangeError)
})

test('deriveSeed: per-name substreams are distinct and stable', () => {
  expect(deriveSeed(42, 'movement')).toBe(deriveSeed(42, 'movement'))
  expect(deriveSeed(42, 'movement')).not.toBe(deriveSeed(42, 'combat'))
  expect(deriveSeed(42, 'movement')).not.toBe(deriveSeed(43, 'movement'))
  expect(deriveSeed(42, 'movement') >>> 0).toBe(deriveSeed(42, 'movement'))
})

test('a seed that would produce an all-zero state still yields a working generator', () => {
  const r = rngFromState([0, 0, 0, 0])
  expect(r.nextU32() | r.nextU32() | r.nextU32()).not.toBe(0)
})

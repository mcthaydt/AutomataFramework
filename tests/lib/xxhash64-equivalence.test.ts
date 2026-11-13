// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/hash/xxhash64-equivalence.test.ts
import { expect, test } from 'vitest'
import { xxhash64 } from '#src/lib/xxhash64.ts'
import { xxhash64Reference } from '../fixtures/xxhash64-reference.ts'

// A fixed xorshift stream, so the inputs are the same on every run.
function bytes(n: number, seed: number): Uint8Array {
  let x = seed >>> 0 || 1
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    out[i] = x & 255
  }
  return out
}

test('agrees with the BigInt reference for every length 0..300 and assorted seeds', () => {
  const seeds = [0n, 1n, 0x9e3779b1n, 0xffffffffffffffffn, 0x8000000000000000n]
  for (let n = 0; n <= 300; n++) {
    const data = bytes(n, n + 7)
    const seed = seeds[n % seeds.length] as bigint
    expect(xxhash64(data, seed)).toBe(xxhash64Reference(data, seed))
  }
})

test('agrees on a subarray view with a non-zero byte offset', () => {
  const data = bytes(1000, 3).subarray(13, 913)
  expect(xxhash64(data)).toBe(xxhash64Reference(data))
})

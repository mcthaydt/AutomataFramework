// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/browser/hash/xxhash64.test.ts
import { expect, test } from 'vitest'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'

const bytes = (n: number, f: (i: number) => number) => Uint8Array.from({ length: n }, (_, i) => f(i))

// Vectors from the reference C implementation (python-xxhash 3.x). Lengths cover every code path:
// <4, 4..7, 8..31, exactly 32 (one stripe), multi-stripe with tail.
test.each([
  ['empty, seed 0', new Uint8Array(0), 0n, 'ef46db3751d8e999'],
  ['"a"', bytes(1, () => 97), 0n, 'd24ec4f1a98c6e5b'],
  ['"abc"', bytes(3, (i) => 97 + i), 0n, '44bc2cf5ad770999'],
  ['"abc", seed 1', bytes(3, (i) => 97 + i), 1n, 'bea9ca8199328908'],
  [
    '"AUTO", seed 0x9E3779B1',
    bytes(4, (i) => [65, 85, 84, 79][i] as number),
    0x9e3779b1n,
    '861cb6de581a970a',
  ],
  ['0..31', bytes(32, (i) => i), 0n, 'cbf59c5116ff32b4'],
  ['0..99', bytes(100, (i) => i), 0n, '6ac1e58032166597'],
  ['1000 bytes i%251', bytes(1000, (i) => i % 251), 0n, 'f306f04aa88b54d3'],
] as const)('xxhash64(%s) matches the reference', (_name, data, seed, expected) => {
  expect(hex64(xxhash64(data, seed))).toBe(expected)
})

test('hex64 is always 16 lowercase hex digits', () => {
  expect(hex64(0n)).toBe('0000000000000000')
  expect(hex64(0xabcn)).toBe('0000000000000abc')
})

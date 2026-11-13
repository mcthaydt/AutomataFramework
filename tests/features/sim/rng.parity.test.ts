// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/browser/rng/rng.test.ts
import { expect, test } from 'vitest'
import { createRng, deriveSeed } from '#src/features/sim/rng.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'

test('100k outputs across 8 substreams hash identically in every engine', () => {
  const out = new Uint32Array(100_000)
  const names = ['a', 'b', 'movement', 'combat', 'ai', 'spawn', 'physics.step', 'render.collect']
  const streams = names.map((n) => createRng(deriveSeed(2026, n)))
  for (let i = 0; i < out.length; i++)
    out[i] = (streams[i % streams.length] as ReturnType<typeof createRng>).nextU32()
  expect(new Set(out).size).toBeGreaterThan(99_000) // not degenerate
  expect(hex64(xxhash64(new Uint8Array(out.buffer)))).toBe(RNG_EXPECTED)
})

const RNG_EXPECTED = '697a6ebc1a306834'

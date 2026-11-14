// The PNG writer gives the same bytes in Node and in every browser, as recorded in tests/golden/art.json.
import { expect, test } from 'vitest'
import { createRng } from '#src/features/sim/sim.ts'
import { encodePng } from '#src/lib/png.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'
import { expectRecorded } from '../fixtures/golden.ts'
import golden from '../golden/art.json' with { type: 'json' }

/** 64 by 64 of five colours drawn from a seeded stream: every kind of match, and some that are not matches. */
function noise64(): Uint8Array {
  const rng = createRng(7)
  const pixels = Uint8Array.from({ length: 64 * 64 }, () => rng.int(5))
  // A flat band and a copied band, so the two distances are both used.
  pixels.fill(1, 64 * 10, 64 * 14)
  pixels.copyWithin(64 * 30, 64 * 20, 64 * 24)
  return encodePng({ width: 64, height: 64, palette: [0, 0x111314, 0xfdd4bd, 0xafd472, 0xf37f94], pixels })
}

test('the same picture is the same bytes in every engine', () => {
  expectRecorded('png:noise-64', hex64(xxhash64(noise64())), golden['png:noise-64'])
})

test('it is a PNG of the right size', () => {
  const png = noise64()
  expect(png.length).toBeGreaterThan(100)
  expect([...png.slice(0, 4)]).toEqual([137, 80, 78, 71])
})

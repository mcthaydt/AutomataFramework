// One set of frames everywhere: the feel script is played in Node and in three browsers, and every frame it drew is the
// same text in all four. The hash of those frames is held to the golden like every run's.
import { expect, test } from 'vitest'
import { canonicalJson } from '#src/lib/canonical.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'
import { newFeel, runScript } from '../../fixtures/feel/script.ts'
import { expectGolden } from '../../fixtures/golden.ts'
import golden from '../../golden/feel-frames.json' with { type: 'json' }

test("the feel script's frames match the golden in every engine", () => {
  const frames = runScript(newFeel())
  const hash = hex64(xxhash64(new TextEncoder().encode(canonicalJson(frames))))
  expectGolden({ ticks: frames.length, finalHash: hash, checks: [] }, golden)
})

test('the script has something to draw: dust, a shake and a freeze', () => {
  const frames = runScript(newFeel())
  expect(frames.some((f) => f.specks.length > 0)).toBe(true)
  expect(frames.some((f) => f.shake.x !== 0 || f.shake.y !== 0)).toBe(true)
  expect(frames.some((f) => f.freeze > 0)).toBe(true)
})

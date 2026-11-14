// The schema hash of the fixture game is the same 16 digits in Node, Chromium, WebKit and Firefox, and is the golden
// `tests/golden/schema-hash.json`: a replay of format 2 carries it, so an engine that computed another would call every
// recording's rules changed. Recorded in CI like the other goldens, in a commit that names it.
import { expect, test } from 'vitest'
import { createGameSim } from '#src/features/level/level.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import golden from '../../golden/schema-hash.json' with { type: 'json' }

test('the fixture game with its hero has the recorded schema hash in every engine', async () => {
  const sim = await createGameSim({ content: await loadFixtureGame(), plugins: [heroPlugin] })
  try {
    const hash = sim.describeSnapshot().header.schemaHash
    expect(hash).toMatch(/^[0-9a-f]{16}$/)
    expectRecorded('schemaHash', hash, golden.schemaHash)
  } finally {
    sim.dispose()
  }
})

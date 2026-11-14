// The M1 game's idle run ends on the same hash in Node and in every browser, after words files could be listed: a game
// that lists no words is given the very same content it always was.
import { afterEach, expect, test } from 'vitest'
import { createGameSim } from '#src/features/level/level.ts'
import { simContent } from '#src/features/level/sim-content.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import golden from '../../golden/push-crate.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

test('the M1 fixture still ends sixty idle ticks on the recorded hash', async () => {
  const content = await loadFixtureGame()
  expect(simContent(content)).toBe(content)
  const sim = await createGameSim({ content })
  made.push(sim)
  for (let i = 0; i < 60; i++) sim.step([])
  expectRecorded('idleHash60', sim.hash(), (golden as { idleHash60?: string }).idleHash60)
})

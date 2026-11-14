// A game with figures ends on one recorded hash in Node, Chromium, WebKit and Firefox: the sprites are part of the sim,
// so which clip plays and which pose shows are checked bit for bit with everything else. It is the M1 game with the
// hero given a figure and clips, not the full game, which later plans grow.
import { afterEach, test } from 'vitest'
import { createGameSim } from '#src/features/level/level.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { PUSH_TICKS, pushScript } from '../../fixtures/game/script.ts'
import { loadSpriteGame } from '../../fixtures/game/sprite-game.ts'
import { expectGolden, runGolden } from '../../fixtures/golden.ts'
import golden from '../../golden/sprites.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

test('a game with figures ends on the recorded hash in every engine', async () => {
  const sim = await createGameSim({ content: await loadSpriteGame(), plugins: [heroPlugin] })
  made.push(sim)
  expectGolden(runGolden(sim, PUSH_TICKS, pushScript), golden)
})

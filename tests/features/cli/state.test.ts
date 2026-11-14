import { afterEach, expect, test } from 'vitest'
import { gameState } from '#src/features/cli/state.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { RECORDED_CODE } from '../../fixtures/cli/recording.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

async function idleFor(ticks: number): Promise<Sim> {
  const sim = await createGameSim({ content: await loadFixtureGame(), plugins: [heroPlugin] })
  made.push(sim)
  for (let i = 0; i < ticks; i++) sim.step([])
  return sim
}

test('gameState lists every thing and hero by id, with where it is and how fast it moves', async () => {
  const sim = await idleFor(60)
  const state = gameState(RECORDED_CODE, sim, 'level-1')
  expect(state.tick).toBe(60)
  expect(state.hash).toBe(sim.hash())
  expect(state.level).toBe('level-1')
  expect(state.players).toEqual([1])
  expect(state.things.map((t) => [t.id, t.character])).toEqual([
    ['crate-1', 'crate'],
    ['player-1', 'hero'],
  ])
  for (const thing of state.things) {
    for (const number of [thing.x, thing.y, thing.vx, thing.vy]) expect(Number.isFinite(number)).toBe(true)
  }
})

test('a thing that has settled is where the level put it, to a thousandth', async () => {
  const state = gameState(RECORDED_CODE, await idleFor(120), 'level-1')
  const crate = state.things.find((t) => t.id === 'crate-1')
  expect(crate?.x).toBeCloseTo(6.5, 2)
})

test('the numbers are rounded so an f32 does not print as 6.5000001', async () => {
  const state = gameState(RECORDED_CODE, await idleFor(30), 'level-1')
  for (const thing of state.things) {
    for (const number of [thing.x, thing.y, thing.vx, thing.vy]) {
      expect(Math.round(number * 1000) / 1000).toBe(number)
    }
  }
})

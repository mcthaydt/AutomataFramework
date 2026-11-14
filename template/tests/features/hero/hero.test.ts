// A test of the hero's rules. It plays the game with no page: it makes the game's sim, holds a key by sending the
// command a keyboard would send, steps a few ticks and looks at where the hero is. `npm test` runs it.
import { readFile } from 'node:fs/promises'
import {
  Body,
  controlsCommand,
  createGameSim,
  loadGame,
  Player,
  type Sim,
  Transform,
} from '@automataframework/framework/headless'
import { afterEach, expect, test } from 'vitest'
import { Score } from '../../../src/features/hero/score.ts'
import { gamePlugins } from '../../../src/headless.ts'

const GAME = new URL('../../../', import.meta.url)

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** A new sim of the game, with the hero standing on the floor. */
async function newGame(): Promise<Sim> {
  const loaded = await loadGame((path) => readFile(new URL(path, GAME), 'utf8'))
  if (!loaded.ok) throw new Error(loaded.diagnostics.map((d) => `${d.file}: ${d.message}`).join('\n'))
  const sim = await createGameSim({ content: loaded.value, plugins: gamePlugins })
  made.push(sim)
  for (let i = 0; i < 30; i++) sim.step([])
  return sim
}

const hero = (sim: Sim) => {
  const [found] = sim.query(Player, Body, Transform)
  if (found === undefined) throw new Error('The game has no hero.')
  return { x: found.get(Transform).x, y: found.get(Transform).y }
}

test('holding right runs the hero to the right, and letting go stops it', async () => {
  const sim = await newGame()
  const start = hero(sim).x
  sim.step([controlsCommand(sim.tick, 1, 0, ['right'])])
  for (let i = 0; i < 20; i++) sim.step([])
  const running = hero(sim).x
  expect(running).toBeGreaterThan(start + 1)
  sim.step([controlsCommand(sim.tick, 1, 1, [])])
  for (let i = 0; i < 20; i++) sim.step([])
  expect(hero(sim).x).toBeCloseTo(running, 0)
})

test('jump lifts the hero off the floor', async () => {
  const sim = await newGame()
  const floor = hero(sim).y
  sim.step([controlsCommand(sim.tick, 1, 0, ['jump'])])
  for (let i = 0; i < 10; i++) sim.step([])
  expect(hero(sim).y).toBeLessThan(floor - 0.5)
})

test('touching the spark takes it, and the score counts it once', async () => {
  const sim = await newGame()
  expect(sim.resource(Score).sparks).toBe(0)
  sim.step([controlsCommand(sim.tick, 1, 0, ['right'])])
  for (let i = 0; i < 40; i++) sim.step([])
  expect(sim.resource(Score).sparks).toBe(1)
  // The spark is gone, so running on does not count it again.
  for (let i = 0; i < 60; i++) sim.step([])
  expect(sim.resource(Score).sparks).toBe(1)
})

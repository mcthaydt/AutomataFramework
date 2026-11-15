import { afterEach, expect, test } from 'vitest'
import { Player } from '#src/features/commands/commands.ts'
import { createGameSim, LevelError, Look, Thing, TILE_COLOR } from '#src/features/level/level.ts'
import { Body, Collider, Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

// Koota allows 16 live worlds in a process, so every sim a test makes is disposed when it ends.
const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})
async function gameSim(options: Partial<Parameters<typeof createGameSim>[0]> = {}): Promise<Sim> {
  const sim = await createGameSim({ content: await loadFixtureGame(), ...options })
  made.push(sim)
  return sim
}

test('the fixture level spawns one floor, the crate and the hero, in that order', async () => {
  const sim = await gameSim()
  expect(sim.query(Transform).map((e) => e.sid)).toEqual([1, 2, 3])

  const floor = sim.entity(1)
  expect(floor?.get(Collider)).toMatchObject({ hx: 8, hy: 0.5 })
  expect(floor?.get(Transform)).toMatchObject({ x: 8, y: 8.5 })
  expect(floor?.get(Look)).toMatchObject({ w: 16, h: 1, color: TILE_COLOR })
  expect(floor?.has(Thing)).toBe(false)

  const crate = sim.entity(2)
  expect(crate?.get(Thing)).toEqual({ id: 'crate-1', character: 'crate' })
  expect(crate?.get(Transform)).toMatchObject({ x: 6.5, y: 7.5 })
  expect(crate?.get(Look)).toMatchObject({ w: 1, h: 1, color: 0xc9a227 })
  expect(crate?.get(Body).fixedRotation).toBe(false)

  const hero = sim.entity(3)
  expect(hero?.get(Player).number).toBe(1)
  expect(hero?.get(Thing)).toEqual({ id: 'player-1', character: 'hero' })
  expect(hero?.get(Body).fixedRotation).toBe(true)
  // Collider sizes are stored as 32-bit floats, so 0.4 comes back as the nearest one.
  expect(hero?.get(Collider).hx).toBeCloseTo(0.4, 6)
  expect(hero?.get(Collider).hy).toBe(0.5)
  expect(hero?.get(Transform)).toMatchObject({ x: 2.5, y: 7.5 })
})

test('with no gravity given, things fall down the screen', async () => {
  const sim = await gameSim()
  sim.step([])
  expect(sim.entity(2)?.get(Body).vy).toBeGreaterThan(0)
})

test('asking for more players than the level has starts is a LevelError that says so', async () => {
  await expect(gameSim({ players: [1, 2] })).rejects.toThrow(LevelError)
  await expect(gameSim({ players: [1, 2] })).rejects.toThrow(
    'Level "level-1" has a start point for player 1 only. Add one for player 2.',
  )
})

test('player numbers are 1 to 4', async () => {
  await expect(gameSim({ players: [5] })).rejects.toThrow('Players are numbered 1 to 4, but one is 5.')
})

test('an unknown level is a LevelError', async () => {
  await expect(gameSim({ level: 'level-9' })).rejects.toThrow(LevelError)
  await expect(gameSim({ level: 'level-9' })).rejects.toThrow(
    'There is no level called "level-9". This game has: level-1.',
  )
})

test('two sims from the same content hash the same at tick 0', async () => {
  const a = await gameSim()
  const b = await gameSim()
  expect(a.hash()).toBe(b.hash())
  expect(a.contentHash).toBe(b.contentHash)
})

test('a different level file is different content', async () => {
  const moved = JSON.parse(fixtureFiles['content/levels/level-1.json'] ?? '') as {
    things: { x: number }[]
  }
  ;(moved.things[0] as { x: number }).x = 9.5
  const a = await gameSim()
  const b = await gameSim({
    content: await loadFixtureGame({ 'content/levels/level-1.json': JSON.stringify(moved) }),
  })
  expect(a.contentHash).not.toBe(b.contentHash)
})

test("a level that sets its ground draws its floor in that colour, and one that does not keeps the framework's", async () => {
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] as string) as Record<string, unknown>
  const content = await loadFixtureGame({
    'content/levels/level-1.json': JSON.stringify({ ...level, ground: '#111314' }),
  })
  const sim = await createGameSim({ content })
  made.push(sim)
  expect(sim.entity(1)?.get(Look)).toMatchObject({ w: 16, h: 1, color: 0x111314 })
  expect((await gameSim()).entity(1)?.get(Look)).toMatchObject({ color: TILE_COLOR })
})

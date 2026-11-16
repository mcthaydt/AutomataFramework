// A character's weight is its thing's Rapier mass (F4): a heavier crate is harder to push, each thing weighs its own
// value, and a game that names no weight has no `Mass` at all.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand, createRecorder, Player } from '#src/features/commands/commands.ts'
import { createGameSim, Thing, usesWeights } from '#src/features/level/level.ts'
import { Mass, Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { loadLinksGame } from '../../fixtures/links-game/read.ts'
import { weighedRoom } from '../../fixtures/links-game/weight.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

async function fresh(overrides: Record<string, string | undefined> = {}): Promise<Sim> {
  const sim = await createGameSim({ content: await loadLinksGame(overrides), level: 'room-1' })
  made.push(sim)
  return sim
}

const thing = (sim: Sim, id: string) => {
  const found = sim.query(Thing).find((e) => e.get(Thing).id === id)
  if (found === undefined) throw new Error(`no thing ${id}`)
  return found
}

/** How far the hero's push has moved `crate-1` from where room 1 puts it, after player 1 holds right for `ticks`. */
function pushed(sim: Sim, ticks: number): number {
  const start = thing(sim, 'crate-1').get(Transform).x
  const recorder = createRecorder(sim)
  recorder.step([controlsCommand(sim.tick, 1, 0, ['right'])])
  for (let i = 1; i < ticks; i++) recorder.step([])
  return thing(sim, 'crate-1').get(Transform).x - start
}

test('a thing weighs the value its character names, or the value default', async () => {
  const sim = await fresh(weighedRoom(4, 2))
  expect(thing(sim, 'crate-1').get(Mass).kilos).toBe(4)
  expect(thing(sim, 'crate-2').get(Mass).kilos).toBe(2)
  const plain = await fresh(weighedRoom())
  expect(thing(plain, 'crate-1').get(Mass).kilos).toBe(1)
})

test('two crates in one level with different values weigh differently', async () => {
  const sim = await fresh(weighedRoom(8, 1))
  expect(
    sim
      .query(Mass)
      .map((e) => e.get(Mass).kilos)
      .sort((a, b) => a - b),
  ).toEqual([1, 8])
})

test('a heavier crate is pushed less far in the same time', async () => {
  // The hero sets its own speed each tick, so a heavy crate slows the hero's push more than it stops it; the crate has
  // not reached the gate that stops every weight at 60 ticks.
  const [one, four, eight] = [
    pushed(await fresh(weighedRoom(1)), 60),
    pushed(await fresh(weighedRoom(4)), 60),
    pushed(await fresh(weighedRoom(8)), 60),
  ]
  expect(one).toBeGreaterThan(2)
  expect(four).toBeLessThan(one)
  expect(eight).toBeLessThan(four)
  expect(eight).toBeLessThan(one / 2)
})

test('a game whose characters name no weight has no Mass, and one that does has it', async () => {
  expect(usesWeights(await loadLinksGame())).toBe(false)
  expect(usesWeights(await loadLinksGame(weighedRoom()))).toBe(true)
  // The hero is not weighed, so a weighed game's hero has no Mass of its own.
  const sim = await fresh(weighedRoom(4))
  expect(sim.query(Player)[0]?.has(Mass)).toBe(false)
})

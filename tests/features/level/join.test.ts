// Players joining and leaving a running game, in the sim.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand, isHeld, Player } from '#src/features/commands/commands.ts'
import {
  createGameSim,
  joinCommand,
  Look,
  leaveCommand,
  playersIn,
  Thing,
} from '#src/features/level/level.ts'
import { Body, Collider, Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { coopFiles } from '../../fixtures/game/co-op.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})
async function coop(
  players: readonly number[] = [1],
  files: Record<string, string> = coopFiles,
): Promise<Sim> {
  const sim = await createGameSim({ content: await loadFixtureGame(files), plugins: [heroPlugin], players })
  made.push(sim)
  return sim
}
const hero = (sim: Sim, number: number) => sim.query(Player).find((e) => e.get(Player).number === number)

test("a join puts that player's hero at their start point", async () => {
  const sim = await coop()
  sim.step([joinCommand(0, 2, 0)])
  expect(playersIn(sim)).toEqual([1, 2])
  expect(hero(sim, 2)?.get(Thing).id).toBe('player-2')
  expect(hero(sim, 2)?.get(Transform).x).toBeCloseTo(4.5, 1)
})

test('the joined hero is the same hero the level would have spawned', async () => {
  const joined = await coop([1])
  joined.step([joinCommand(0, 2, 0)])
  const spawned = await coop([1, 2])
  spawned.step([])
  for (const component of [Transform, Thing, Look, Player, Body, Collider] as const)
    expect(hero(joined, 2)?.get(component as never), component.id).toEqual(
      hero(spawned, 2)?.get(component as never),
    )
})

test('joining twice is joining once', async () => {
  const sim = await coop()
  sim.step([joinCommand(0, 2, 0), joinCommand(0, 2, 1)])
  sim.step([joinCommand(1, 2, 2)])
  expect(playersIn(sim)).toEqual([1, 2])
})

test('a join above players, or from player 0, does nothing', async () => {
  const sim = await coop([1], {
    ...coopFiles,
    'automata.toml': (coopFiles['automata.toml'] ?? '').replace('players = 4', 'players = 2'),
  })
  sim.step([joinCommand(0, 3, 0), joinCommand(0, 0, 0)])
  expect(playersIn(sim)).toEqual([1])
})

test('a leave takes the hero out at the end of the tick', async () => {
  const sim = await coop([1, 2])
  sim.step([leaveCommand(0, 2, 0)])
  expect(playersIn(sim)).toEqual([1])
})

test('a leave from someone who is not playing does nothing', async () => {
  const sim = await coop([1])
  sim.step([leaveCommand(0, 3, 0)])
  expect(playersIn(sim)).toEqual([1])
})

test('controls sent in the same tick as the join are held', async () => {
  const sim = await coop()
  sim.step([joinCommand(0, 2, 0), controlsCommand(0, 2, 1, ['right'])])
  const joined = hero(sim, 2)
  expect(joined !== undefined && isHeld(joined, 'right')).toBe(true)
})

test('a game with no players line refuses join as an unknown command', async () => {
  const sim = await createGameSim({ content: await loadFixtureGame() })
  made.push(sim)
  expect(sim.step([joinCommand(0, 2, 0)]).rejected[0]?.reason).toBe('unknown-command')
})

test('a co-op sim can start with nobody in it, and a join brings player 1', async () => {
  const sim = await coop([])
  expect(playersIn(sim)).toEqual([])
  sim.step([joinCommand(0, 1, 0)])
  expect(playersIn(sim)).toEqual([1])
})

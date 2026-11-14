// Behaviour rules in the sim: a critter wanders and runs from a hero, and only a game that has one pays for it.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand } from '#src/features/commands/commands.ts'
import type { GameContent } from '#src/features/content/content.ts'
import { createGameSim, Thing } from '#src/features/level/level.ts'
import { Mind } from '#src/features/level/mind.ts'
import { Body, Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { critterBehaviour, critterFile, type MiniGame, miniGame } from '../../fixtures/level/mini-game.ts'
import golden from '../../golden/push-crate.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** A critter at (x, y) in the mini game, with the full game's behaviour. */
const critterAt = (id: string, x: number, y = 7.7) => ({ id, character: 'critter', x, y })
const withCritters = (things: MiniGame['things'], more: MiniGame = {}): MiniGame => ({
  things,
  characters: [critterFile],
  behaviours: [critterBehaviour],
  ...more,
})

async function simOf(content: GameContent, players: readonly number[] = [1]): Promise<Sim> {
  const sim = await createGameSim({ content, plugins: [heroPlugin], players })
  made.push(sim)
  return sim
}
const thing = (sim: Sim, id: string) => sim.query(Thing).find((e) => e.get(Thing).id === id)
const xOf = (sim: Sim, id: string): number => thing(sim, id)?.get(Transform).x ?? Number.NaN
const ruleOf = (sim: Sim, id: string): string => thing(sim, id)?.get(Mind).rule ?? ''

test('alone, the critter wanders: right for 90 ticks, then left', async () => {
  const sim = await simOf(await miniGame(withCritters([critterAt('critter-1', 12.5)])))
  const rules = new Set<string>()
  let at90 = Number.NaN
  for (let i = 0; i < 150; i++) {
    sim.step([])
    rules.add(ruleOf(sim, 'critter-1'))
    if (sim.tick === 60) expect(xOf(sim, 'critter-1')).toBeGreaterThan(12.5)
    if (sim.tick === 90) at90 = xOf(sim, 'critter-1')
  }
  expect(xOf(sim, 'critter-1')).toBeLessThan(at90)
  // The hero is ten tiles away the whole time, so the only rule it ever follows is the last.
  expect([...rules]).toEqual(['wander'])
})

test('it runs from the hero, and only while the hero is near', async () => {
  const sim = await simOf(await miniGame(withCritters([critterAt('critter-1', 12.5)])))
  sim.step([controlsCommand(0, 1, 0, ['right'])])
  let ran = 0
  for (let i = 0; i < 200 && ran < 5; i++) {
    sim.step([])
    if (ruleOf(sim, 'critter-1') === 'run-away') {
      // Away from the hero, who is on its left, at the speed the rule says.
      expect(thing(sim, 'critter-1')?.get(Body).vx).toBe(4)
      ran++
    } else expect(ran).toBe(0)
  }
  expect(ran).toBe(5)
  for (let i = 0; i < 60; i++) sim.step([])
  // It ran to the wall and stands against it.
  expect(xOf(sim, 'critter-1')).toBeGreaterThan(14.5)
})

test('at the wall it is blocked, and a wanderer turns round there', async () => {
  const sim = await simOf(await miniGame(withCritters([critterAt('critter-1', 14.5)])))
  for (let i = 0; i < 40; i++) sim.step([])
  const mind = thing(sim, 'critter-1')?.get(Mind)
  // Turned round by the wall long before its 90 ticks were up, and walking away from it now.
  expect(mind?.dir).toBe(-1)
  expect(mind?.since).toBeGreaterThan(0)
  expect(mind?.since).toBeLessThan(40)
  expect(xOf(sim, 'critter-1')).toBeLessThan(14.5)
})

test('a critter in the air does not jump, and jumps once it stands', async () => {
  const hop = {
    format: 1,
    id: 'critter',
    rules: [
      { id: 'hop', when: [{ sense: 'on-ground' }], do: { act: 'jump', speed: 8 } },
      { id: 'rest', when: [], do: { act: 'stay' } },
    ],
  }
  const sim = await simOf(
    await miniGame({
      things: [critterAt('critter-1', 12.5, 3)],
      characters: [critterFile],
      behaviours: [hop],
    }),
  )
  // It takes about 33 ticks to fall to the floor, and nothing sends it up on the way.
  for (let i = 0; i < 25; i++) {
    sim.step([])
    expect(thing(sim, 'critter-1')?.get(Body).vy).toBeGreaterThanOrEqual(0)
  }
  let jumped = false
  for (let i = 0; i < 100; i++) {
    sim.step([])
    if ((thing(sim, 'critter-1')?.get(Body).vy ?? 0) < 0) jumped = true
  }
  expect(jumped).toBe(true)
})

test('a thing with a behaviour the game lacks stands still and does not throw', async () => {
  const content = await miniGame(withCritters([critterAt('critter-1', 12.5)]))
  const sim = await simOf({ ...content, behaviours: {} })
  for (let i = 0; i < 60; i++) sim.step([])
  expect(xOf(sim, 'critter-1')).toBeCloseTo(12.5, 2)
})

test('two critters and two heroes: each runs from the nearer hero', async () => {
  const things = [critterAt('left', 5), critterAt('right', 10)]
  const sim = await simOf(await miniGame(withCritters(things, { starts: [2.5, 12.5] })), [1, 2])
  for (let i = 0; i < 3; i++) sim.step([])
  expect(ruleOf(sim, 'left')).toBe('run-away')
  expect(ruleOf(sim, 'right')).toBe('run-away')
  // The left one has hero 1 on its left and the right one has hero 2 on its right.
  expect(thing(sim, 'left')?.get(Body).vx).toBe(4)
  expect(thing(sim, 'right')?.get(Body).vx).toBe(-4)
})

test('a game with no behaviour has no Mind and no behaviour system', async () => {
  const sim = await createGameSim({ content: await loadFixtureGame() })
  made.push(sim)
  expect(() => sim.spawn([[Mind, {}]])).toThrow()
  for (let i = 0; i < 60; i++) sim.step([])
  expect(sim.hash()).toBe((golden as { idleHash60: string }).idleHash60)
})

test('straight, and restored at tick 45, a critter run agrees', async () => {
  const content = await miniGame(withCritters([critterAt('critter-1', 12.5)]))
  const straight = await simOf(content)
  straight.step([controlsCommand(0, 1, 0, ['right'])])
  for (let i = 1; i < 120; i++) straight.step([])

  const first = await simOf(content)
  first.step([controlsCommand(0, 1, 0, ['right'])])
  for (let i = 1; i < 45; i++) first.step([])
  const bytes = first.snapshot()
  const second = await simOf(content)
  second.restore(bytes)
  for (let i = 45; i < 120; i++) second.step([])
  expect(second.hash()).toBe(straight.hash())
})

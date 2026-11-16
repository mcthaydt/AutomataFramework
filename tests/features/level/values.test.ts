// A thing's values, read from game code (plan W, task 5): on the links game opened at room-2.
import { afterEach, expect, test } from 'vitest'
import { createGameSim, Thing, valuesOf, Where } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { definePlugin, defineSystem, type Sim, type SimContext } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import { loadLinksGame } from '../../fixtures/links-game/read.ts'
import golden from '../../golden/push-crate.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** Runs `look` inside a system on the sim's first tick (a sim's resources are filled by then) and returns what it gave. */
async function inside<T>(look: (ctx: SimContext) => T, level = 'room-2'): Promise<T> {
  let found: { value: T } | undefined
  const probe = definePlugin({
    name: 'probe',
    dependsOn: ['level', 'where'],
    systems: [
      defineSystem({
        name: 'probe.look',
        phase: 'gameplay',
        run(ctx) {
          found = { value: look(ctx) }
        },
      }),
    ],
  })
  const sim = await createGameSim({ content: await loadLinksGame(), level, plugins: [probe] })
  made.push(sim)
  sim.step([])
  if (found === undefined) throw new Error('the probe did not run')
  return found.value
}

const sidOf = (ctx: SimContext, id: string): number => {
  const found = ctx.query(Thing).find((e) => e.get(Thing).id === id)
  if (found === undefined) throw new Error(`no thing ${id}`)
  return found.sid
}

test('a button that stays says so, and its links are the gate it opens', async () => {
  const read = await inside((ctx) => {
    const values = valuesOf(ctx, sidOf(ctx, 'button-1'))
    return { stays: values.switch('stays'), opens: values.things('opens'), gate: sidOf(ctx, 'gate-1') }
  })
  expect(read.stays).toBe(true)
  expect(read.opens).toEqual([read.gate])
})

test('a number left out is its default, and a path is read with the level offset added', async () => {
  const read = await inside((ctx) => {
    const values = valuesOf(ctx, sidOf(ctx, 'critter-1'))
    return { reach: values.number('reach'), walk: values.path('walk') }
  })
  expect(read.reach).toBe(3)
  expect(read.walk).toEqual([
    { x: 7.5, y: 7.5 },
    { x: 9.5, y: 7.5 },
  ])
})

test('a door says where it leads', async () => {
  const to = await inside((ctx) => valuesOf(ctx, sidOf(ctx, 'door-in')).leadsTo('to'))
  expect(to).toEqual({ level: 'room-1', thing: 'exit' })
})

test('a value the character does not declare with that type throws, and says what it has', async () => {
  const message = await inside((ctx) => {
    try {
      valuesOf(ctx, sidOf(ctx, 'critter-1')).number('hits')
    } catch (error) {
      return (error as Error).message
    }
    return ''
  })
  expect(message).toBe('The character "critter" has no number called "hits". It has: reach.')
  const wrongType = await inside((ctx) => {
    try {
      valuesOf(ctx, sidOf(ctx, 'critter-1')).switch('reach')
    } catch (error) {
      return (error as Error).message
    }
    return ''
  })
  expect(wrongType).toBe('The character "critter" has no switch called "reach". It has: nothing.')
})

test('a hero and a tile are not things of a level', async () => {
  const messages = await inside((ctx) => {
    const tile = ctx.query(Transform).find((e) => !e.has(Thing))
    const out: string[] = []
    for (const sid of [sidOf(ctx, 'player-1'), tile?.sid ?? -1]) {
      try {
        valuesOf(ctx, sid)
      } catch (error) {
        out.push((error as Error).message)
      }
    }
    return out
  })
  const sentence = 'This entity is not a thing from a level.'
  expect(messages).toEqual([sentence, sentence])
})

test('a game with no values has no Where, and sixty idle ticks end on the recorded hash', async () => {
  const sim = await createGameSim({ content: await loadFixtureGame() })
  made.push(sim)
  expect(() => sim.resource(Where)).toThrow()
  for (let i = 0; i < 60; i++) sim.step([])
  expectRecorded('idleHash60', sim.hash(), (golden as { idleHash60?: string }).idleHash60)
})

test('the where resource holds the one level, unprefixed, at the corner', async () => {
  const where = await inside((ctx) => ({ ...ctx.resource(Where) }))
  expect(where).toEqual({ levels: [{ level: 'room-2', x: 0, y: 0, w: 16, h: 9 }], prefixed: false })
})

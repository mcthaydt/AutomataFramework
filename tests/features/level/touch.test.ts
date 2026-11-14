import { afterEach, expect, test } from 'vitest'
import { controlsCommand } from '#src/features/commands/commands.ts'
import { createGameSim, leaveCommand, Thing, touchEvent } from '#src/features/level/level.ts'
import { Collider } from '#src/features/physics/physics.ts'
import { type Command, definePlugin, defineSystem, type PluginDef, type Sim } from '#src/features/sim/sim.ts'
import { character, type Extra, loadFixtureWith } from '../../fixtures/game/extra.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'

// Touch events in the sim (plan P): a character with `touch` lets things through, and the sim says what touched it.

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

const HERO = character('hero', { size: { w: 0.8, h: 1 }, upright: true, kind: 'hero', color: '#e4572e' })
const SPARK = character('spark', { body: 'fixed', size: { w: 0.5, h: 0.5 }, kind: 'spark', touch: 'take' })
const DOOR = character('door', { body: 'fixed', size: { w: 1, h: 2 }, kind: 'door', touch: 'sense' })
const thing = (id: string, characterId: string, x: number, y: number) => ({
  id,
  character: characterId,
  x,
  y,
})

interface Setup {
  readonly extra?: Extra
  readonly things: unknown[]
  readonly starts?: unknown[]
  readonly players?: readonly number[]
  readonly plugins?: PluginDef[]
}

async function game(setup: Setup): Promise<Sim> {
  const content = await loadFixtureWith({
    ...setup.extra,
    characters: { hero: HERO, spark: SPARK, door: DOOR, ...setup.extra?.characters },
    level1: (l) => {
      l.things = setup.things
      if (setup.starts) l.starts = setup.starts
    },
  })
  const sim = await createGameSim({
    content,
    plugins: [heroPlugin, ...(setup.plugins ?? [])],
    ...(setup.players ? { players: setup.players } : {}),
  })
  made.push(sim)
  return sim
}

const RIGHT = (tick: number) => (tick === 10 ? [controlsCommand(tick, 1, 0, ['right'])] : [])

/** Steps `ticks` ticks and returns every touch event the sim said, as the step gave it. */
function play(sim: Sim, ticks: number, script: (tick: number) => Command[] = RIGHT) {
  const said: Array<{ tick: number; type: string; payload: Record<string, unknown> }> = []
  for (let i = 0; i < ticks; i++) {
    const tick = sim.tick
    for (const e of sim.step(script(tick)).events)
      if (/^(spark|door|big-spark)\./.test(e.type))
        said.push({ tick, type: e.type, payload: e.payload as never })
  }
  return said
}
const sidOf = (sim: Sim, id: string): number => {
  const found = sim.query(Thing).find((e) => e.get(Thing).id === id)
  if (!found) throw new Error(`no thing ${id}`)
  return found.sid
}
const types = (said: { type: string }[]) => said.map((e) => e.type)

test('a hero takes a spark: touched, then taken, once, and the spark is gone', async () => {
  const sim = await game({ things: [thing('spark-1', 'spark', 4.5, 7.5)] })
  const sid = sidOf(sim, 'spark-1')
  const said = play(sim, 60)
  const payload = {
    thing: 'spark-1',
    sid,
    by: 'player-1',
    bySid: sidOf(sim, 'player-1'),
    byKind: 'hero',
    player: 1,
  }
  expect(said.map(({ type, payload: p }) => ({ type, payload: p }))).toEqual([
    { type: 'spark.touched', payload },
    { type: 'spark.taken', payload },
  ])
  expect(sim.entity(sid)).toBeUndefined()
})

test('a door says touched once while the hero stands in it, and left when the hero walks out', async () => {
  const sim = await game({ things: [thing('door-1', 'door', 10.5, 7)] })
  const said = play(sim, 130)
  expect(types(said)).toEqual(['door.touched', 'door.left'])
  expect(said[0]?.payload).toMatchObject({ thing: 'door-1', by: 'player-1', player: 1 })
  expect(said[1]?.payload).toMatchObject({ thing: 'door-1', by: 'player-1', player: 1 })
})

test('a crate pushed into a spark touches it and does not take it', async () => {
  const sim = await game({
    things: [thing('crate-1', 'crate', 6.5, 7.5), thing('spark-1', 'spark', 9.5, 7.5)],
  })
  const said = play(sim, 200)
  const first = said.find((e) => e.type === 'spark.touched')
  expect(first?.payload).toMatchObject({ thing: 'spark-1', by: 'crate-1', byKind: '', player: 0 })
  for (const e of said.filter((x) => x.type === 'spark.taken')) expect(e.payload.player).toBeGreaterThan(0)
  expect(said.findIndex((e) => e.type === 'spark.taken')).toBeGreaterThan(0)
})

test('two heroes on a spark in one tick: both touched, taken once', async () => {
  const sim = await game({
    things: [thing('spark-1', 'spark', 4.5, 7.5)],
    starts: [
      { player: 1, x: 4, y: 7.5 },
      { player: 2, x: 5, y: 7.5 },
    ],
    players: [1, 2],
  })
  const said = play(sim, 5, () => [])
  expect(said.map((e) => [e.type, e.payload.player])).toEqual([
    ['spark.touched', 1],
    ['spark.taken', 1],
    ['spark.touched', 2],
  ])
})

test('a tile never touches, and two touched things never touch each other', async () => {
  const sim = await game({
    things: [
      thing('door-1', 'door', 10.5, 7),
      thing('spark-1', 'spark', 10.5, 7.5),
      thing('crate-1', 'crate', 13.5, 7.5),
    ],
  })
  expect(play(sim, 60, () => [])).toEqual([])
})

test('game code reads a touch in the tick it happens', async () => {
  const seen: number[] = []
  const reader = definePlugin({
    name: 'sparks-reader',
    systems: [
      defineSystem({
        name: 'sparks.read',
        phase: 'gameplay',
        run(ctx) {
          const taken = ctx.events.of(touchEvent('spark', 'taken')).length
          if (taken > 0) seen.push(ctx.tick)
        },
      }),
    ],
  })
  const sim = await game({ things: [thing('spark-1', 'spark', 4.5, 7.5)], plugins: [reader] })
  const said = play(sim, 60)
  const takenAt = said.find((e) => e.type === 'spark.taken')?.tick
  expect(takenAt).toBeDefined()
  expect(seen).toEqual([takenAt])
})

test('a hero whose box is rebuilt while in the door makes no event', async () => {
  const resize = definePlugin({
    name: 'resizer',
    systems: [
      defineSystem({
        name: 'resizer.shrink',
        phase: 'input',
        run(ctx) {
          if (ctx.tick === 5)
            for (const e of ctx.query(Collider)) if (e.sid === 3) e.set(Collider, { hy: 0.45 })
        },
      }),
    ],
  })
  const sim = await game({
    things: [thing('door-1', 'door', 4.5, 7)],
    starts: [{ player: 1, x: 4.5, y: 7.5 }],
    plugins: [resize],
  })
  expect(sidOf(sim, 'player-1')).toBe(3)
  const said = play(sim, 130, (tick) => (tick === 20 ? [controlsCommand(tick, 1, 0, ['right'])] : []))
  expect(said.map((e) => [e.type, e.tick])).toEqual([
    ['door.touched', 0],
    ['door.left', expect.any(Number)],
  ])
})

test('two characters of one kind, one sensed and one taken, both work', async () => {
  const sim = await game({
    extra: {
      characters: {
        'big-spark': character('big-spark', {
          body: 'fixed',
          size: { w: 0.5, h: 0.5 },
          kind: 'spark',
          touch: 'sense',
        }),
      },
    },
    things: [thing('spark-1', 'spark', 4.5, 7.5), thing('big-1', 'big-spark', 7.5, 7.5)],
  })
  const said = play(sim, 60)
  expect(said.map((e) => [e.type, e.payload.thing])).toEqual([
    ['spark.touched', 'spark-1'],
    ['spark.taken', 'spark-1'],
    ['spark.touched', 'big-1'],
  ])
  expect(sim.entity(sidOf(sim, 'big-1'))).toBeDefined()
})

test('a hero who leaves the game while in the door makes no door.left', async () => {
  const sim = await game({
    extra: { players: 2 },
    things: [thing('door-1', 'door', 4.5, 7)],
    starts: [
      { player: 1, x: 4.5, y: 7.5 },
      { player: 2, x: 2.5, y: 7.5 },
    ],
  })
  const said = play(sim, 30, (tick) => (tick === 10 ? [leaveCommand(tick, 1, 0)] : []))
  expect(types(said)).toEqual(['door.touched'])
})

test('touchEvent gives the same object every time', () =>
  expect(touchEvent('spark', 'taken')).toBe(touchEvent('spark', 'taken')))

test('a game with no touched character has no touch plugin: its events are not there to read', async () => {
  const reader = definePlugin({
    name: 'sparks-reader',
    systems: [
      defineSystem({
        name: 'sparks.read',
        phase: 'gameplay',
        run: (ctx) => {
          ctx.events.of(touchEvent('spark', 'taken'))
        },
      }),
    ],
  })
  const plain = await createGameSim({ content: await loadFixtureGame(), plugins: [reader] })
  made.push(plain)
  expect(() => plain.step([])).toThrow('unknown event "spark.taken": register it in a plugin')
  // The sim a game with none gets is exactly the one push-crate.parity.test.ts proves, against idleHash60.
})

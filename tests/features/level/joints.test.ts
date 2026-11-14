import { afterEach, expect, test } from 'vitest'
import { createGameSim, LevelError, Thing } from '#src/features/level/level.ts'
import { Collider, Joint, joint } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { character, loadFixtureWith } from '../../fixtures/game/extra.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'

// A level's joints and touched characters in the sim (plan P): what is spawned, in which order, and what is given to
// Rapier's side of things.

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})
async function sim(content: Awaited<ReturnType<typeof loadFixtureGame>>, level?: string): Promise<Sim> {
  const s = await createGameSim({ content, ...(level === undefined ? {} : { level }) })
  made.push(s)
  return s
}
const sidOf = (s: Sim, id: string): number => {
  const found = s.query(Thing).find((e) => e.get(Thing).id === id)
  if (!found) throw new Error(`no thing ${id}`)
  return found.sid
}

const plank = character('plank', { size: { w: 4, h: 0.25 } })

test('a pin to the level: one joint, from the plank to the level’s own anchor', async () => {
  const content = await loadFixtureWith({
    characters: { plank },
    level1: (l) => {
      ;(l.things as unknown[]).push({ id: 'plank-1', character: 'plank', x: 8, y: 6 })
      l.joints = [{ id: 'seesaw', kind: 'pin', thing: 'plank-1', x: 8, y: 6, turn: { min: -20, max: 20 } }]
    },
  })
  const s = await sim(content)
  const plankSid = sidOf(s, 'plank-1')
  // tiles, crate-1, plank-1, then the anchor, the joint and the hero
  expect(s.query(Joint).map((e) => e.sid)).toEqual([plankSid + 2])
  expect(s.query(Joint)[0]?.get(Joint)).toEqual({
    kind: 0,
    a: plankSid,
    b: plankSid + 1,
    ax: 0,
    ay: 0,
    bx: 8,
    by: 6,
    limited: true,
    min: Math.fround((-20 * Math.PI) / 180),
    max: Math.fround((20 * Math.PI) / 180),
  })
  expect(sidOf(s, 'player-1')).toBe(plankSid + 3)
})

test('a rope between two things: its length is the gap plus the slack, and no anchor is made', async () => {
  const content = await loadFixtureWith({
    characters: { plank },
    level1: (l) => {
      l.things = [
        { id: 'crate-1', character: 'crate', x: 6.5, y: 2.5 },
        { id: 'plank-1', character: 'plank', x: 8, y: 6 },
      ]
      l.joints = [
        {
          id: 'swing',
          kind: 'rope',
          thing: 'plank-1',
          holder: 'crate-1',
          from: { x: 7, y: 6 },
          to: { x: 7, y: 3 },
          slack: 0.5,
        },
      ]
    },
  })
  const s = await sim(content)
  expect(s.query(Joint)[0]?.get(Joint)).toEqual({
    kind: 1,
    a: sidOf(s, 'plank-1'),
    b: sidOf(s, 'crate-1'),
    ax: -1,
    ay: 0,
    bx: 0.5,
    by: 0.5,
    limited: false,
    min: 0,
    max: 3.5,
  })
  // the floor, the crate, the plank, the joint, the hero: nothing else was spawned
  expect(s.query(Collider)).toHaveLength(4)
  expect(sidOf(s, 'player-1')).toBe(5)
})

test('joints change no sid that was there before', async () => {
  const plain = await sim(await loadFixtureGame())
  const withJoint = await sim(
    await loadFixtureWith({
      level1: (l) => {
        l.joints = [{ id: 'hang', kind: 'pin', thing: 'crate-1', x: 6.5, y: 7.5 }]
      },
    }),
  )
  expect(sidOf(withJoint, 'crate-1')).toBe(sidOf(plain, 'crate-1'))
  // the floor 1, the crate 2, then the level's anchor 3 and its joint 4, and only then the hero
  expect(sidOf(plain, 'player-1')).toBe(3)
  expect(sidOf(withJoint, 'player-1')).toBe(5)
})

test('a touched character lets things through, and a crate does not', async () => {
  const content = await loadFixtureWith({
    characters: { spark: character('spark', { body: 'fixed', kind: 'spark', touch: 'take' }) },
    level1: (l) => {
      ;(l.things as unknown[]).push({ id: 'spark-1', character: 'spark', x: 10.5, y: 7.5 })
    },
  })
  const s = await sim(content)
  expect(s.entity(sidOf(s, 'spark-1'))?.get(Collider).sensor).toBe(true)
  expect(s.entity(sidOf(s, 'crate-1'))?.get(Collider).sensor).toBe(false)
})

test('a game with no joint has no Joint component', async () => {
  const s = await sim(await loadFixtureGame())
  expect(() => s.spawn([joint.pin(1, 2)])).toThrow()
})

test('one level with a joint switches joints on for the whole game', async () => {
  const content = await loadFixtureWith({
    levels: {
      'level-2': {
        format: 1,
        id: 'level-2',
        tiles: ['................', '################'],
        things: [],
        starts: [{ player: 1, x: 2.5, y: 0.5 }],
        joints: [],
      },
    },
    level1: (l) => {
      l.joints = [{ id: 'hang', kind: 'pin', thing: 'crate-1', x: 6.5, y: 7.5 }]
    },
  })
  const s = await sim(content, 'level-2')
  expect(s.query(Joint)).toEqual([])
  expect(() => s.spawn([joint.pin(1, 2)])).not.toThrow()
})

test('a joint that names a missing thing says so', async () => {
  const loaded = await loadFixtureGame()
  const level = loaded.levels['level-1'] as NonNullable<(typeof loaded.levels)[string]>
  const content = {
    ...loaded,
    levels: {
      ...loaded.levels,
      'level-1': { ...level, joints: [{ id: 'seesaw', kind: 'pin' as const, thing: 'plnk', x: 1, y: 1 }] },
    },
  }
  await expect(sim(content)).rejects.toThrow(LevelError)
  await expect(sim(content)).rejects.toThrow(
    'Joint "seesaw" holds "plnk", and level "level-1" has no such thing.',
  )
})

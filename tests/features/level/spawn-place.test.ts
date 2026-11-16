// A place put into the sim (plan W, task 8): room 2 and room 3 of the links game are one place, 32 tiles wide, with a
// floor that runs on through the seam as one body. Every test opens the links game.
import { afterEach, expect, test } from 'vitest'
import { Player } from '#src/features/commands/commands.ts'
import { type Arrive, createGameSim, joinCommand, Look, Thing } from '#src/features/level/level.ts'
import { Collider, Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { editLevel, type LevelJson, loadLinksGame } from '../../fixtures/links-game/read.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

async function open(
  level: string,
  options: {
    arrive?: Arrive
    players?: readonly number[]
    overrides?: Record<string, string | undefined>
  } = {},
): Promise<Sim> {
  const sim = await createGameSim({
    content: await loadLinksGame(options.overrides),
    level,
    players: options.players ?? [1, 2],
    ...(options.arrive === undefined ? {} : { arrive: options.arrive }),
  })
  made.push(sim)
  return sim
}

const thingIds = (sim: Sim): string[] =>
  sim
    .query(Thing)
    .sort((a, b) => a.sid - b.sid)
    .map((e) => e.get(Thing).id)
const hero = (sim: Sim, number: number) => sim.query(Player).find((e) => e.get(Player).number === number)
const heroAt = (sim: Sim, number: number): [number, number] => {
  const at = hero(sim, number)?.get(Transform)
  return [at?.x ?? Number.NaN, at?.y ?? Number.NaN]
}

test('the place of room-2 and room-3: the floor is one body 32 wide, with one Look for each level, and the sim steps', async () => {
  const sim = await open('room-2', {
    overrides: editLevel('room-3', (l: LevelJson) => {
      l.ground = '#112233'
    }),
  })
  const bodies = sim.query(Collider).filter((e) => !e.has(Thing))
  const floors = bodies.filter((e) => e.get(Collider).hx === 16)
  expect(floors).toHaveLength(1)
  const floor = floors[0]
  expect(floor?.get(Transform)).toMatchObject({ x: 16, y: 8.5 })
  expect(floor?.get(Collider).hy).toBe(0.5)
  // A box that crosses an edge has no Look of its own: each level's part of it is a Look-only entity, in level order.
  expect(floor?.has(Look)).toBe(false)
  const looks = sim
    .query(Look)
    .filter((e) => !e.has(Collider) && e.get(Transform).y === 8.5)
    .sort((a, b) => a.sid - b.sid)
  expect(looks.map((e) => [e.get(Transform).x, e.get(Look).w, e.get(Look).h])).toEqual([
    [8, 16, 1],
    [24, 16, 1],
  ])
  expect(looks[1]?.get(Look).color).toBe(0x112233)
  expect(looks[0]?.get(Look).color).not.toBe(0x112233)
  // The wall where the two walls meet is one body two tiles wide, shared the same way.
  expect(bodies.some((e) => e.get(Collider).hx === 1 && e.get(Collider).hy === 2.5)).toBe(true)
  // A box wholly inside one level is one entity with that level's colour: room-2's left wall.
  const wall = bodies.find((e) => e.get(Transform).x === 0.5 && e.get(Collider).hy === 4)
  expect(wall?.has(Look)).toBe(true)
  for (let i = 0; i < 10; i++) sim.step([])
  expect(sim.tick).toBe(10)
})

test('things keep their level in front: room-2.crate-1 and room-3.goal-1; heroes are player-1', async () => {
  const sim = await open('room-2')
  expect(thingIds(sim)).toEqual([
    'room-2.door-in',
    'room-2.crate-1',
    'room-2.critter-1',
    'room-2.button-1',
    'room-2.gate-1',
    'room-3.goal-1',
    'room-3.back',
    'player-1',
    'player-2',
  ])
  // A thing of room-3 stands at room-3's own place plus its offset: the goal is at 13.5 in the level, 29.5 in the place.
  const goal = sim.query(Thing).find((e) => e.get(Thing).id === 'room-3.goal-1')
  expect(goal?.get(Transform).x).toBeCloseTo(29.5, 4)
})

test('room-1 alone is spawned as a level alone always was: ids are not prefixed and the heroes are at the starts', async () => {
  const sim = await open('room-1')
  expect(thingIds(sim)).toEqual(['crate-1', 'plate-1', 'gate-1', 'exit', 'player-1', 'player-2'])
  expect(heroAt(sim, 1)[0]).toBeCloseTo(2.5, 4)
  expect(heroAt(sim, 2)[0]).toBeCloseTo(3.5, 4)
})

test("without arrive the heroes of a place stand at the opened level's starts, with its offset", async () => {
  const sim = await open('room-3')
  expect(heroAt(sim, 1)[0]).toBeCloseTo(18.5, 4)
  expect(heroAt(sim, 2)[0]).toBeCloseTo(19.5, 4)
})

test('arriving beside door-in (x 2 to 3), two heroes stand clear of it at (3.45, 7.5) and (4.45, 7.5)', async () => {
  const sim = await open('room-2', { arrive: { thing: 'door-in' } })
  expect(heroAt(sim, 1)[0]).toBeCloseTo(3.45, 4)
  expect(heroAt(sim, 1)[1]).toBeCloseTo(7.5, 4)
  expect(heroAt(sim, 2)[0]).toBeCloseTo(4.45, 4)
})

test('arriving beside a door of a level alone puts the heroes there too', async () => {
  const sim = await open('room-1', { arrive: { thing: 'exit' } })
  // The exit is at x 13.5, right of the middle: the heroes come in on its left.
  expect(heroAt(sim, 1)[0]).toBeCloseTo(12.55, 4)
  expect(heroAt(sim, 2)[0]).toBeCloseTo(11.55, 4)
})

test("arriving beside a door in room-3, which has an offset, stands in the place's tiles", async () => {
  const sim = await open('room-3', { arrive: { thing: 'back' } })
  expect(heroAt(sim, 1)[0]).toBeCloseTo(16 + 13.55, 4)
})

/** The number of `door.touched` events in the next `ticks` ticks. */
function doorTouches(sim: Sim, ticks: number): number {
  let touched = 0
  for (let i = 0; i < ticks; i++)
    touched += sim.step([]).events.filter((e) => e.type === 'door.touched').length
  return touched
}

test('arriving beside door-in, which leads back to room-1: no door.touched in the next 60 ticks', async () => {
  expect(doorTouches(await open('room-2', { arrive: { thing: 'door-in' } }), 60)).toBe(0)
  // The same game opened at its starts has player 1 inside the door, which is what arriving beside it is for.
  expect(doorTouches(await open('room-2'), 60)).toBeGreaterThan(0)
})

test("a pinned crate in room-3 is held at its own place, 16 tiles on from room-3's corner", async () => {
  const sim = await open('room-2', {
    players: [1],
    overrides: editLevel('room-3', (l: LevelJson) => {
      l.things.push({ id: 'swing-1', character: 'crate', x: 11.5, y: 2.5 })
      l.joints = [{ id: 'pin-1', kind: 'pin', thing: 'swing-1', x: 10.5, y: 2.5 }]
    }),
  })
  const crate = sim.query(Thing).find((e) => e.get(Thing).id === 'room-3.swing-1')
  // The pin is at (26.5, 2.5) in the place, a tile to the left of the crate, which swings but never leaves it.
  for (const tick of [20, 40, 80]) {
    while (sim.tick < tick) sim.step([])
    const at = crate?.get(Transform)
    expect(Math.hypot((at?.x ?? 0) - 26.5, (at?.y ?? 0) - 2.5)).toBeCloseTo(1, 1)
    // It has swung down from beside the pin by the first check: it hangs from it and is not still where it was put.
    if (tick === 20) expect(at?.y).toBeGreaterThan(3)
  }
})

test('a late joiner comes in the way the first heroes did: at their start, or beside the same door', async () => {
  for (const [arrive, x] of [
    [undefined, 3.5],
    [{ thing: 'door-in' }, 4.45],
  ] as const) {
    const sim = await open('room-2', { players: [1], ...(arrive === undefined ? {} : { arrive }) })
    sim.step([joinCommand(0, 2, 0)])
    expect(heroAt(sim, 2)[0]).toBeCloseTo(x, 1)
  }
  // In room-3 the offset is in it.
  const sim = await open('room-3', { players: [1] })
  sim.step([joinCommand(0, 2, 0)])
  expect(heroAt(sim, 2)[0]).toBeCloseTo(19.5, 1)
})

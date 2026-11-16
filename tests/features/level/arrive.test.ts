// Where heroes come in (plan W, task 8; audit H1): beside the door they came through, never inside it. Every test runs on
// the links game: room 2's `door-in` stands at x 2.5 (it is 1 wide, so it spans 2 to 3) and leads back to room 1, and
// the hero is 0.8 wide, so the first spot beside it is 2.5 + 0.5 + 0.4 + 0.05 = 3.45.
import { expect, test } from 'vitest'
import { arrivalSpots, arriveLine, arriveOf, levelsOf } from '#src/features/level/level.ts'
import { editLevel, type LevelJson, loadLinksGame } from '../../fixtures/links-game/read.ts'

/** The spots of `players` in `opened`, as {1: [x, y], 2: [x, y]}. */
async function spots(
  opened: string,
  arrive: Parameters<typeof arrivalSpots>[4],
  overrides: Readonly<Record<string, string | undefined>> = {},
  players: readonly number[] = [1, 2],
): Promise<Record<number, [number, number]>> {
  const content = await loadLinksGame(overrides)
  const found = arrivalSpots(content, levelsOf(content, opened), opened, players, arrive)
  return Object.fromEntries([...found].map(([n, s]) => [n, [s.x, s.y]]))
}

/** Puts a row of the level's tiles to `row`. */
const setRow = (level: LevelJson, index: number, row: string): void => {
  ;(level.tiles as string[])[index] = row
}

test("with no arrive each hero is at their own start; in a place the level's offset is added", async () => {
  expect(await spots('room-2', undefined)).toEqual({ 1: [2.5, 7.5], 2: [3.5, 7.5] })
  expect(await spots('room-3', undefined)).toEqual({ 1: [18.5, 7.5], 2: [19.5, 7.5] })
})

test('arriving beside door-in (x 2 to 3), two heroes stand clear of it at (3.45, 7.5) and (4.45, 7.5)', async () => {
  const found = await spots('room-2', { thing: 'door-in' })
  expect(found[1]?.[0]).toBeCloseTo(3.45, 9)
  expect(found[1]?.[1]).toBeCloseTo(7.5, 9)
  expect(found[2]?.[0]).toBeCloseTo(4.45, 9)
  expect(found[2]?.[1]).toBeCloseTo(7.5, 9)
})

test('a thing at the middle comes in on its right, and one right of the middle on its left', async () => {
  const at = (x: number) =>
    editLevel('room-2', (l) => {
      const door = l.things.find((t) => t.id === 'door-in')
      if (door !== undefined) door.x = x
    })
  expect((await spots('room-2', { thing: 'door-in' }, at(8)))[1]?.[0]).toBeCloseTo(8.95, 9)
  expect((await spots('room-2', { thing: 'door-in' }, at(12)))[1]?.[0]).toBeCloseTo(11.05, 9)
})

test('a solid tile on the near side: the far side is used; solid on both, each hero takes its own start', async () => {
  // Row 7 is "#...............": a block at column 3 stops player 1's near spot, and player 2's (4.45) is clear of it.
  const near = editLevel('room-2', (l) => setRow(l, 7, '#..#............'))
  const one = await spots('room-2', { thing: 'door-in' }, near)
  expect(one[1]?.[0]).toBeCloseTo(1.55, 9)
  expect(one[2]?.[0]).toBeCloseTo(4.45, 9)
  // Blocks at columns 1, 3 and 4 shut both sides for both heroes: each is where its own start is.
  const both = editLevel('room-2', (l) => setRow(l, 7, '##.##...........'))
  expect(await spots('room-2', { thing: 'door-in' }, both)).toEqual({ 1: [2.5, 7.5], 2: [3.5, 7.5] })
})

test('a door is not a place to arrive: a spot on any thing that leads into a level is passed over', async () => {
  // The spot (2.8, 7.5) puts player 1 in door-in; player 2 (one tile on, at 3.8) is clear of it.
  const found = await spots('room-2', { x: 2.8, y: 7.5 })
  expect(found[1]).toEqual([2.5, 7.5])
  expect(found[2]?.[0]).toBeCloseTo(3.8, 9)
})

test('arriving at a thing the level no longer has opens its starts', async () => {
  expect(await spots('room-2', { thing: 'gone' })).toEqual({ 1: [2.5, 7.5], 2: [3.5, 7.5] })
})

test('arriving at a spot: player 2 is as far from it as their starts are apart; room-3 adds its offset', async () => {
  expect(await spots('room-2', { x: 10.5, y: 7.5 })).toEqual({ 1: [10.5, 7.5], 2: [11.5, 7.5] })
  expect(await spots('room-3', { x: 4.5, y: 7.5 })).toEqual({ 1: [20.5, 7.5], 2: [21.5, 7.5] })
  // A spot outside the level (an edge was crossed and the level is not the one the spot is in) is not used.
  expect(await spots('room-2', { x: -3, y: 7.5 })).toEqual({ 1: [2.5, 7.5], 2: [3.5, 7.5] })
})

test('a player the level has no start for is left out, and an unknown level has no spots', async () => {
  expect(Object.keys(await spots('room-2', undefined, {}, [1, 3]))).toEqual(['1'])
  const content = await loadLinksGame()
  expect(arrivalSpots(content, levelsOf(content, 'nowhere'), 'nowhere', [1]).size).toBe(0)
})

test('arriveLine and arriveOf round-trip both forms, and read nothing else', () => {
  expect(arriveLine({ thing: 'door-in' })).toBe('thing:door-in')
  expect(arriveLine({ x: 3.5, y: 7.5 })).toBe('at:3.5,7.5')
  expect(arriveOf('thing:door-in')).toEqual({ thing: 'door-in' })
  expect(arriveOf('at:3.5,7.5')).toEqual({ x: 3.5, y: 7.5 })
  expect(arriveOf(arriveLine({ x: -1, y: 0 }))).toEqual({ x: -1, y: 0 })
  for (const line of ['', 'thing:', 'at:3', 'at:3,x', 'door-in', 'sideways', 'at: 3,4'])
    expect(arriveOf(line), line).toBeUndefined()
})

import { expect, test } from 'vitest'
import { doorsOf } from '#src/features/content/content.ts'
import { loadLinksGame } from '../../fixtures/links-game/read.ts'

test('every thing that holds a way into a level is a door, level by level', async () => {
  expect(doorsOf(await loadLinksGame())).toEqual([
    { from: { level: 'room-1', thing: 'exit' }, to: { level: 'room-2', thing: 'door-in' } },
    { from: { level: 'room-2', thing: 'door-in' }, to: { level: 'room-1', thing: 'exit' } },
    { from: { level: 'room-3', thing: 'back' }, to: { level: 'room-1', thing: 'exit' } },
  ])
})

test('a door that names only a level leads to the level, and a door with no way is not a door', async () => {
  const content = await loadLinksGame()
  const room1 = content.levels['room-1'] as (typeof content.levels)[string]
  const things = room1.things.map((thing) =>
    thing.id === 'exit' ? { ...thing, values: { to: { level: 'room-3' } } } : thing,
  )
  const room3 = content.levels['room-3'] as (typeof content.levels)[string]
  const bare = room3.things.map((thing) =>
    thing.id === 'back' ? { id: 'back', character: 'door', x: 1, y: 1 } : thing,
  )
  const doors = doorsOf({
    ...content,
    levels: { ...content.levels, 'room-1': { ...room1, things }, 'room-3': { ...room3, things: bare } },
  } as typeof content)
  expect(doors.map((door) => [door.from.thing, door.to])).toEqual([
    ['exit', { level: 'room-3' }],
    ['door-in', { level: 'room-1', thing: 'exit' }],
  ])
})

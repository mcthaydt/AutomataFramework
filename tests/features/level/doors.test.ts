// Which door a hero went through (plan W, task 11): one pure answer from the events of a step. Every test runs on the
// links game: room 1 alone, room 2 and room 3 one place.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand } from '#src/features/commands/commands.ts'
import { createGameSim, doorTaken } from '#src/features/level/level.ts'
import type { Sim, SimEvent } from '#src/features/sim/sim.ts'
import { editLevel, loadLinksGame } from '../../fixtures/links-game/read.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** A `door.touched` event as the sim raises it: `by` touched the thing called `thing`; `player` is 0 for a non-hero. */
const touched = (thing: string, by: string, player: number): SimEvent => ({
  type: 'door.touched',
  payload: { thing, sid: 1, by, bySid: 2, byKind: player > 0 ? '' : 'crate', player },
})

test('a hero who walked into exit in room-1 went through it, to door-in in room-2', async () => {
  const content = await loadLinksGame(
    editLevel('room-1', (l) => {
      l.starts[0] = { player: 1, x: 12.5, y: 7.5 }
    }),
  )
  const sim = await createGameSim({ content, level: 'room-1', players: [1] })
  made.push(sim)
  const events: SimEvent[] = []
  for (let tick = 0; tick < 120; tick++)
    events.push(...sim.step([controlsCommand(tick, 1, tick, ['right'])]).events)
  expect(events.some((e) => e.type === 'door.touched')).toBe(true)
  expect(doorTaken(content, 'room-1', events)).toEqual({
    level: 'room-2',
    thing: 'door-in',
    through: { level: 'room-1', thing: 'exit' },
  })
})

test('a crate pushed into the door takes nobody anywhere', async () => {
  const content = await loadLinksGame()
  expect(doorTaken(content, 'room-1', [touched('exit', 'crate-1', 0)])).toBeUndefined()
})

test('a door that leads nowhere (no `to`) takes nobody anywhere, and a step with no touch has no door', async () => {
  const content = await loadLinksGame(
    editLevel('room-1', (l) => {
      const exit = l.things.find((t) => t.id === 'exit')
      if (exit !== undefined) delete exit.values
    }),
  )
  expect(doorTaken(content, 'room-1', [touched('exit', 'player-1', 1)])).toBeUndefined()
  expect(doorTaken(content, 'room-1', [])).toBeUndefined()
})

test('a touch of a thing that is no door, or of a thing the game does not have, is no door', async () => {
  const content = await loadLinksGame()
  const events = [
    touched('plate-1', 'player-1', 1),
    touched('nothing-here', 'player-1', 1),
    { type: 'door.touched', payload: 'not a touch' },
    { type: 'door.left', payload: { thing: 'exit', player: 1 } },
  ]
  expect(doorTaken(content, 'room-1', events)).toBeUndefined()
})

test("in a place the touched thing's id has its level in front, and it is read", async () => {
  const content = await loadLinksGame()
  expect(doorTaken(content, 'room-2', [touched('room-3.back', 'player-1', 1)])).toEqual({
    level: 'room-1',
    thing: 'exit',
    through: { level: 'room-3', thing: 'back' },
  })
  expect(doorTaken(content, 'room-2', [touched('room-2.door-in', 'player-1', 1)])).toEqual({
    level: 'room-1',
    thing: 'exit',
    through: { level: 'room-2', thing: 'door-in' },
  })
})

test('two heroes through two doors in one step: the first event decides', async () => {
  const content = await loadLinksGame()
  const events = [touched('room-3.back', 'player-2', 2), touched('room-2.door-in', 'player-1', 1)]
  expect(doorTaken(content, 'room-2', events)?.through).toEqual({ level: 'room-3', thing: 'back' })
})

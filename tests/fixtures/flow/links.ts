// The links game for the flow's browser tests (plan W, task 12): three rooms, room 2 and room 3 one place, doors that
// lead back, a button that stays down. A hero walks through room 1's `exit` into room 2 with nothing in the way, and
// room 2 has only what its journey needs: its door, its button and its gate. Words are English, with a name for each room.
import { writeContent } from '#src/features/content/content.ts'
import { editLevel, linksFiles } from '../links-game/read.ts'

/** The links game's files, changed for a walk: room 1 starts the hero beside `exit`; room 2 has no crate or critter. */
export function linksJourney(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Record<string, string | undefined> {
  return linksFiles({
    ...editLevel('room-1', (level) => {
      level.starts = [
        { player: 1, x: 12.5, y: 7.5 },
        { player: 2, x: 11.5, y: 7.5 },
      ]
    }),
    ...editLevel('room-2', (level) => {
      level.things = level.things.filter((thing) => ['door-in', 'button-1', 'gate-1'].includes(thing.id))
    }),
    'content/messages/en.json': writeContent('messages', {
      format: 1,
      id: 'en',
      messages: {
        'sign.welcome': 'Welcome to the links game.',
        'level.room-1.name': 'Room One',
        'level.room-2.name': 'Room Two',
        'level.room-3.name': 'Room Three',
      },
    } as never),
    ...overrides,
  })
}

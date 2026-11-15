import { describe, expect, test } from 'vitest'
import { parseContent, withDefaults, writeContent } from '#src/features/content/content.ts'
import { changed, expectRoundTrip, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'
import { linksFiles, loadLinksGame } from '../../fixtures/links-game/read.ts'

type Json = Record<string, unknown>

const FILES = linksFiles()
const levelPath = (id: string): string => `content/levels/${id}.json`
const characterPath = (id: string): string => `content/characters/${id}.json`

/** The links game with one level's things changed. */
const editLevel = (id: string, change: (things: Json[]) => void): Record<string, string> => ({
  [levelPath(id)]: changed('level', FILES[levelPath(id)], (level) => change(level.things as Json[])),
})

/** The links game with one character changed. */
const editCharacter = (id: string, change: (character: Json) => void): Record<string, string> => ({
  [characterPath(id)]: changed('character', FILES[characterPath(id)], change),
})

/** What a person reads when the links game has these files changed: one sentence per problem. */
const problems = (...overrides: Record<string, string | undefined>[]): Promise<string[]> =>
  gameProblems(linksFiles(Object.assign({}, ...overrides)))

/** Room 1's crate is given `declared` and `given`, so a kind of value can be tried on a character with no other. */
const onCrate = (declared: Json, given: unknown): Record<string, string>[] => [
  editCharacter('crate', (crate) => {
    crate.values = [declared]
  }),
  editLevel('room-1', (things) => {
    const crate = things[0] as Json
    crate.values = { [declared.id as string]: given }
  }),
]

const R1 = levelPath('room-1')
const R2 = levelPath('room-2')
const R3 = levelPath('room-3')

test('the links game loads with no problem', async () => {
  expect(await problems()).toEqual([])
})

describe('a value the character does not declare, or of the wrong kind', () => {
  test('an id the character does not declare', async () =>
    expect(
      await problems(
        editLevel('room-2', (things) => {
          ;(things[3] as Json).values = { opens: ['gate-1'], stays: true, open: true }
        }),
      ),
    ).toEqual([
      `${R2}: things[3].values.open: The character "button" has no value "open". It has: opens, stays.`,
    ]))

  test('a number that is not a number, out of its limits, or off its step', async () => {
    const reach = (value: unknown) =>
      editLevel('room-2', (things) => {
        ;(things[2] as Json).values = {
          walk: [
            { x: 7.5, y: 7.5 },
            { x: 9.5, y: 7.5 },
          ],
          reach: value,
        }
      })
    expect(await problems(reach('three'))).toEqual([
      `${R2}: things[2].values.reach: "reach" is a number, like 3.`,
    ])
    expect(await problems(reach(9))).toEqual([
      `${R2}: things[2].values.reach: "reach" must be from 1 to 8. Got 9.`,
    ])
    expect(await problems(reach(1.3))).toEqual([
      `${R2}: things[2].values.reach: "reach" must be 1 plus a whole number of steps of 0.5. Got 1.3.`,
    ])
    expect(await problems(reach(4.5))).toEqual([])
  })

  test('a switch that is not true or false', async () =>
    expect(
      await problems(
        editLevel('room-2', (things) => {
          ;(things[3] as Json).values = { opens: ['gate-1'], stays: 'yes' }
        }),
      ),
    ).toEqual([`${R2}: things[3].values.stays: "stays" is a yes or no: write true or false.`]))

  test('a choice that is not text, or not one of the options', async () => {
    const choice = {
      id: 'colour',
      name: 'Colour',
      type: 'choice',
      from: [
        { id: 'red', name: 'Red' },
        { id: 'blue', name: 'Blue' },
      ],
      default: 'red',
    }
    expect(await problems(...onCrate(choice, 5))).toEqual([
      `${R1}: things[0].values.colour: "colour" is one of: blue, red.`,
    ])
    expect(await problems(...onCrate(choice, 'green'))).toEqual([
      `${R1}: things[0].values.colour: "colour" must be one of: blue, red. Got "green".`,
    ])
    expect(await problems(...onCrate(choice, 'blue'))).toEqual([])
  })

  test('words that are not a key, or a key the source language lacks', async () => {
    const says = { id: 'says', name: 'Says', type: 'words' }
    expect(await problems(...onCrate(says, 3))).toEqual([
      `${R1}: things[0].values.says: "says" is a message key, like "sign.welcome".`,
    ])
    expect(await problems(...onCrate(says, 'sign.nope'))).toEqual([
      `${R1}: things[0].values.says: The game's words have no "sign.nope". Add it to content/messages/en.json.`,
    ])
    expect(await problems(...onCrate(says, 'sign.welcome'))).toEqual([])
  })

  test('a thing value that holds one thing, and one that holds a list', async () => {
    const target = { id: 'target', name: 'Target', type: 'thing' }
    expect(await problems(...onCrate(target, ['gate-1']))).toEqual([
      `${R1}: things[0].values.target: "target" holds one thing, like "gate-1".`,
    ])
    expect(await problems(...onCrate(target, 'gate-1'))).toEqual([])
    expect(
      await problems(
        editLevel('room-1', (things) => {
          ;(things[1] as Json).values = { opens: 'gate-1' }
        }),
      ),
    ).toEqual([`${R1}: things[1].values.opens: "opens" holds a list of things, like ["gate-1"].`])
  })

  test('a path that is not a list of places', async () =>
    expect(
      await problems(
        editLevel('room-2', (things) => {
          ;(things[2] as Json).values = { walk: 'there' }
        }),
      ),
    ).toEqual([
      `${R2}: things[2].values.walk: "walk" is a list of places, like [{ "x": 4, "y": 7.5 }, { "x": 7, "y": 7.5 }].`,
    ]))

  test('a way into a level that is not one', async () =>
    expect(
      await problems(
        editLevel('room-1', (things) => {
          ;(things[3] as Json).values = { to: 'room-2' }
        }),
      ),
    ).toEqual([
      `${R1}: things[3].values.to: "to" is a way into a level, like { "level": "level-2", "thing": "door-in" }.`,
    ]))

  test('a value no shape fits is told in one sentence', async () =>
    expect(
      await problems(
        editLevel('room-1', (things) => {
          ;(things[0] as Json).values = { colour: [1, 2] }
        }),
      ),
    ).toEqual([
      `${R1}: things[0].values.colour: A value is a number, true or false, text, a list of ids like ["gate-1"], a list of places like [{ "x": 4, "y": 7.5 }], or a way into a level like { "level": "level-2" }.`,
    ]))
})

describe('links', () => {
  const link = (opens: unknown) =>
    editLevel('room-1', (things) => {
      ;(things[1] as Json).values = { opens }
    })

  test('to a thing that is not in the level', async () =>
    expect(await problems(link(['gate-9']))).toEqual([
      `${R1}: things[1].values.opens: There is no thing called "gate-9". This level has: crate-1, exit, gate-1, plate-1.`,
    ]))

  test('to itself', async () =>
    expect(await problems(link(['plate-1']))).toEqual([
      `${R1}: things[1].values.opens: A thing cannot link to itself.`,
    ]))

  test('to a kind the value does not allow', async () =>
    expect(await problems(link(['crate-1']))).toEqual([
      `${R1}: things[1].values.opens: "crate-1" is a crate, and "opens" links only to: gate.`,
    ]))

  test('to more things than it may', async () =>
    expect(await problems(link(['gate-1', 'gate-1', 'gate-1', 'gate-1', 'gate-1']))).toEqual([
      `${R1}: things[1].values.opens: "opens" holds at most 4 things. This has 5.`,
    ]))

  test('an empty list is fine, until the value is needed', async () => {
    expect(await problems(link([]))).toEqual([])
    const needed = editCharacter('plate', (plate) => {
      const opens = (plate.values as Json[])[0] as Json
      opens.needed = true
    })
    expect(await problems(needed, link([]))).toEqual([
      `${R1}: things[1].values.opens: "opens" needs at least one thing, like ["gate-1"].`,
    ])
  })

  test('a switch to a thing that cannot be opened', async () => {
    const anything = editCharacter('plate', (plate) => {
      const opens = (plate.values as Json[])[0] as Json
      opens.kinds = undefined
    })
    expect(await problems(anything, link(['crate-1']))).toEqual([
      `${R1}: things[1].values.opens: "crate-1" is a crate, which cannot be opened. Give its character "opens": "walk-through", or link something else.`,
    ])
    expect(await problems(anything, link(['gate-1']))).toEqual([])
  })
})

describe('paths and doors', () => {
  const walk = (places: unknown) =>
    editLevel('room-2', (things) => {
      ;(things[2] as Json).values = { walk: places }
    })
  const door = (to: unknown) =>
    editLevel('room-1', (things) => {
      ;(things[3] as Json).values = { to }
    })

  test('a path with too few places', async () =>
    expect(await problems(walk([{ x: 7.5, y: 7.5 }]))).toEqual([
      `${R2}: things[2].values.walk: "walk" needs from 2 to 64 places. This has 1.`,
    ]))

  test('a place outside the level', async () =>
    expect(
      await problems(
        walk([
          { x: 7.5, y: 7.5 },
          { x: 40, y: 7.5 },
        ]),
      ),
    ).toEqual([`${R2}: things[2].values.walk[1].x: 40 is outside the level, which is 16 tiles wide.`]))

  test('a way into a level the game does not have', async () =>
    expect(await problems(door({ level: 'room-9' }))).toEqual([
      `${R1}: things[3].values.to: There is no level called "room-9". This game has: room-1, room-2, room-3.`,
    ]))

  test('a way to a thing the level does not have', async () =>
    expect(await problems(door({ level: 'room-2', thing: 'door-out' }))).toEqual([
      `${R1}: things[3].values.to: There is no thing called "door-out". The level "room-2" has: button-1, crate-1, critter-1, door-in, gate-1.`,
    ]))

  test('a way into a level with no thing to come out beside is fine', async () =>
    expect(await problems(door({ level: 'room-2' }))).toEqual([]))
})

describe('what is needed, and what a level may hold once', () => {
  test('a needed value that is left out', async () => {
    const needed = editCharacter('door', (door) => {
      const to = (door.values as Json[])[0] as Json
      to.needed = true
    })
    const without = editLevel('room-1', (things) => {
      delete (things[3] as Json).values
    })
    expect(await problems(needed, without)).toEqual([
      `${R1}: things[3].values: Every "door" needs "to". Add it to this thing's "values".`,
    ])
  })

  test('a second goal', async () =>
    expect(
      await problems(
        editLevel('room-3', (things) => {
          things.push({ id: 'goal-2', character: 'goal', x: 12.5, y: 7.5 })
        }),
      ),
    ).toEqual([
      `${R3}: things[2].character: This level already has a "goal", and there can be only one. Move that one, or take this one out.`,
    ]))
})

test('a behaviour that walks a path its character does not have', async () =>
  expect(
    await problems({
      'content/behaviours/patrol.json': writeContent('behaviour', {
        format: 1,
        id: 'patrol',
        rules: [{ id: 'walk', when: [], do: { act: 'walk-path', path: 'wander', speed: 2 } }],
      } as never),
    }),
  ).toEqual([
    `${characterPath('critter')}: behaviour: The behaviour "patrol" walks the path "wander", and this character has no "path" value called "wander". It has: walk.`,
  ]))

describe('what a thing ends up holding', () => {
  test('its character fills in what it leaves out', async () => {
    const game = await loadLinksGame()
    const button = game.levels['room-2']?.things.find((thing) => thing.id === 'button-1')
    const critter = game.levels['room-2']?.things.find((thing) => thing.id === 'critter-1')
    const plate = game.levels['room-1']?.things.find((thing) => thing.id === 'plate-1')
    expect(withDefaults(game.characters.button as never, button as never)).toEqual({
      opens: ['gate-1'],
      stays: true,
    })
    expect(withDefaults(game.characters.critter as never, critter as never)).toEqual({
      walk: [
        { x: 7.5, y: 7.5 },
        { x: 9.5, y: 7.5 },
      ],
      reach: 3,
    })
    expect(withDefaults(game.characters.plate as never, plate as never)).toEqual({ opens: ['gate-1'] })
  })

  test('a value equal to its default survives writeContent as written', () => {
    const level = JSON.parse(FILES[R2] ?? '') as Json
    const critter = (level.things as Json[])[2] as Json
    critter.values = { ...(critter.values as Json), reach: 3 }
    expectRoundTrip('level', level)
    expect(JSON.parse(writeContent('level', level as never)).things[2].values.reach).toBe(3)
  })

  test('a level with no values anywhere parses to what it always did', () => {
    const text = fixtureFiles['content/levels/level-1.json'] ?? ''
    const parsed = parseContent('level', text, 'content/levels/level-1.json')
    expect(parsed.ok && parsed.value).toEqual(JSON.parse(text))
    expect(Object.keys((parsed.ok && parsed.value.things[0]) || {})).toEqual(['id', 'character', 'x', 'y'])
  })
})

test('a level that is not valid says where, in the same words as before', () => {
  expect(
    problemsOf('level', {
      format: 1,
      id: 'x',
      tiles: ['..'],
      things: [{ id: 'a', character: 'c', x: 5, y: 0 }],
      starts: [{ player: 1, x: 0, y: 0 }],
    }),
  ).toEqual(['content/x/level.json: things[0].x: 5 is outside the level, which is 2 tiles wide.'])
})

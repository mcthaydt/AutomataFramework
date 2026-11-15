import { describe, expect, test } from 'vitest'
import { loadGame, writeContent } from '#src/features/content/content.ts'
import { changed, expectRoundTrip, gameProblems, problemsOf, readFiles } from '../../fixtures/content/kind.ts'
import { linksFiles, loadLinksGame } from '../../fixtures/links-game/read.ts'

const WORLD = 'content/worlds/world.json'
const world = () => ({
  format: 1 as const,
  id: 'world',
  levels: [
    { level: 'room-1', at: { x: 0, y: 0 } },
    { level: 'room-2', at: { x: 20, y: 0 } },
  ],
})

describe('the world file', () => {
  test('reads, and writes back to the same bytes twice', () => expectRoundTrip('world', world()))

  test('a level may be on the map once', () =>
    expect(
      problemsOf('world', {
        ...world(),
        levels: [...world().levels, { level: 'room-2', at: { x: 40, y: 0 } }],
      }),
    ).toEqual(['content/x/world.json: levels[2].level: "room-2" is already on the map.']))

  test('a missing field says what to write', () => {
    expect(problemsOf('world', { ...world(), levels: undefined })).toEqual([
      'content/x/world.json: levels: This is missing. Write the levels on the map, like [{ "level": "room-1", "at": { "x": 0, "y": 0 } }].',
    ])
    expect(problemsOf('world', { ...world(), levels: [{ level: 'room-1' }] })).toEqual([
      'content/x/world.json: levels[0].at: This is missing. Say where its top left corner is on the map, like { "x": 0, "y": 0 }.',
    ])
  })

  test('an unknown key', () =>
    expect(problemsOf('world', { ...world(), colour: 'red' })).toEqual([
      'content/x/world.json: colour: This is not something a world has. Remove it or check the spelling.',
    ]))

  test('a map of no levels is fine', () => expectRoundTrip('world', { ...world(), levels: [] }))
})

describe('the world in a game', () => {
  test('a level it names that the game does not have', async () =>
    expect(
      await gameProblems(
        linksFiles({
          [WORLD]: changed('world', linksFiles()[WORLD], (v) => {
            ;(v.levels as unknown[]).push({ level: 'room-9', at: { x: 60, y: 0 } })
          }),
        }),
      ),
    ).toEqual([`${WORLD}: levels[3].level: There is no level called "room-9". This game has: room-1, room-2, room-3.`]))

  test('a level that touches another, open on one side and solid on the other', async () =>
    expect(
      await gameProblems(
        linksFiles({
          'content/levels/room-3.json': changed('level', linksFiles()['content/levels/room-3.json'], (v) => {
            v.tiles = [...Array.from({ length: 8 }, () => '#..............#'), '################']
          }),
        }),
      ),
    ).toEqual([
      `${WORLD}: levels[1].at: room-2's right edge is open at rows 5 to 7, but room-3, which touches it, is solid there. Open room-3's left edge at those rows, or move it.`,
    ]))

  test('two world files', async () => {
    const files = linksFiles()
    const listed = (files['automata.toml']?.match(/\[\[content\]\]/g) ?? []).length
    expect(
      await gameProblems({
        ...files,
        'automata.toml': `${files['automata.toml']}\n[[content]]\ntype = "world"\npath = "content/worlds/other.json"\n`,
        'content/worlds/other.json': writeContent('world', { format: 1, id: 'other', levels: [] } as never),
      }),
    ).toEqual([`automata.toml: content[${listed}]: A game has one world file, and ${WORLD} is already listed.`])
  })

  test('a world file listed as another kind is said in one sentence', async () => {
    const files = linksFiles()
    const text = files['automata.toml']?.replace('type = "world"', 'type = "level"')
    expect(await gameProblems({ ...files, 'automata.toml': text })).toEqual([
      `${WORLD}: This file is listed as a level, but it reads as a world. Change its type in automata.toml.`,
    ])
  })
})

describe('the places a game is made of', () => {
  test('two levels that touch and are open there make one place; one that is far away makes none', async () => {
    const game = await loadLinksGame()
    expect(game.places).toEqual({
      'room-2': [
        { level: 'room-2', x: 0, y: 0 },
        { level: 'room-3', x: 16, y: 0 },
      ],
    })
    expect(Object.keys(game.worlds ?? {})).toEqual(['world'])
  })

  test('a game with no world file, or whose levels do not touch, has no places at all', async () => {
    const files = linksFiles()
    const toml = (files['automata.toml'] ?? '').replace(
      '\n[[content]]\ntype = "world"\npath = "content/worlds/world.json"\n',
      '',
    )
    expect(toml).not.toContain('world')
    const without = await loadGame(readFiles({ ...files, 'automata.toml': toml }))
    expect(without.ok).toBe(true)
    if (without.ok) {
      expect(Object.hasOwn(without.value, 'places')).toBe(false)
      expect(Object.hasOwn(without.value, 'worlds')).toBe(false)
    }

    const apart = await loadLinksGame({
      [WORLD]: changed('world', files[WORLD], (v) => {
        v.levels = [
          { level: 'room-1', at: { x: 0, y: 0 } },
          { level: 'room-2', at: { x: 20, y: 0 } },
          { level: 'room-3', at: { x: 37, y: 0 } },
        ]
      }),
    })
    expect(Object.hasOwn(apart, 'places')).toBe(false)
    expect(Object.hasOwn(apart, 'worlds')).toBe(true)
  })

  test('moving a place around the map gives the same places', async () => {
    const files = linksFiles()
    const moved = await loadLinksGame({
      [WORLD]: changed('world', files[WORLD], (v) => {
        v.levels = [
          { level: 'room-1', at: { x: 0, y: 0 } },
          { level: 'room-2', at: { x: 120, y: -40 } },
          { level: 'room-3', at: { x: 136, y: -40 } },
        ]
      }),
    })
    expect(moved.places).toEqual((await loadLinksGame()).places)
  })
})

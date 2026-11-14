import { expect, test } from 'vitest'
import { writeContent } from '#src/features/content/content.ts'
import { expectRoundTrip, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const meadow = () => ({
  format: 1 as const,
  id: 'meadow',
  image: 'art/meadow.png',
  tileSize: 16,
  columns: 4,
  tiles: [
    {
      id: 'grass',
      letter: 'G',
      solid: true,
      pictures: [{ frame: 0, when: { up: 'other' } }, { frame: 1, when: { left: 'other' } }, { frame: 2 }],
    },
    { id: 'flowers', letter: '~', solid: false, pictures: [{ frame: 3 }] },
  ],
})
type Tile = { id: string; letter: string; solid: boolean; pictures: Record<string, unknown>[] }
/** The example tileset with one change made to its tiles. */
const withTiles = (change: (tiles: Tile[]) => void): ReturnType<typeof meadow> => {
  const value = meadow()
  change(value.tiles as Tile[])
  return value
}
const tileAt = (tiles: Tile[], i: number): Tile => tiles[i] as Tile
const file = 'content/tilesets/meadow.json'
const said = (value: unknown): string[] => problemsOf('tileset', value, file)

test('a tileset reads, and writes back to the same bytes twice', () => expectRoundTrip('tileset', meadow()))

test('a tileset is written in the schema’s order', () =>
  expect(Object.keys(JSON.parse(writeContent('tileset', meadow() as never)))).toEqual([
    'format',
    'id',
    'image',
    'tileSize',
    'columns',
    'tiles',
  ]))

test('two tiles with one id', () => {
  const t = withTiles((tiles) => Object.assign(tileAt(tiles, 1), { id: 'grass' }))
  expect(said(t)).toEqual([`${file}: tiles[1].id: "grass" is used twice. Each tile needs its own id.`])
})

test('two tiles with one letter', () => {
  const t = withTiles((tiles) => Object.assign(tileAt(tiles, 1), { letter: 'G' }))
  expect(said(t)).toEqual([
    `${file}: tiles[1].letter: The letter "G" is already used by the tile "grass". Each tile needs its own letter.`,
  ])
})

test('the letter . is always empty air', () => {
  const t = withTiles((tiles) => Object.assign(tileAt(tiles, 1), { letter: '.' }))
  expect(said(t)).toEqual([
    `${file}: tiles[1].letter: The letter . always means empty air. Pick another letter.`,
  ])
})

test('a letter has to be one visible character', () => {
  const t = withTiles((tiles) => Object.assign(tileAt(tiles, 1), { letter: 'gg' }))
  expect(said(t)).toEqual([
    `${file}: tiles[1].letter: Write one letter, digit or sign from ! to ~, like "G".`,
  ])
})

test('the last picture has no "when"', () => {
  const t = withTiles((tiles) => {
    tileAt(tiles, 0).pictures[2] = { frame: 2, when: { up: 'same' } }
  })
  expect(said(t)).toEqual([
    `${file}: tiles[0].pictures[2].when: The last picture is the one drawn when no other fits, so it cannot have a "when".`,
  ])
})

test('a picture path outside the game, or that is not a .png', () => {
  const use = 'Use a path inside the game that ends in .png, like art/tiles.png.'
  expect(said({ ...meadow(), image: '../meadow.png' })).toEqual([`${file}: image: ${use}`])
  expect(said({ ...meadow(), image: 'art/meadow.jpg' })).toEqual([`${file}: image: ${use}`])
})

test('a size or a count out of range', () => {
  expect(said({ ...meadow(), tileSize: 2 })).toEqual([`${file}: tileSize: This must be 4 or more.`])
  expect(said({ ...meadow(), columns: 65 })).toEqual([`${file}: columns: This must be 64 or less.`])
})

test('a missing field says what to write', () => {
  const t: Record<string, unknown> = meadow()
  delete t.image
  expect(said(t)).toEqual([
    `${file}: image: This is missing. Write where the picture is, like "art/meadow.png".`,
  ])
  const u = withTiles((tiles) => {
    delete (tileAt(tiles, 0) as Partial<Tile>).solid
  })
  expect(said(u)).toEqual([
    `${file}: tiles[0].solid: This is missing. Write true if things stand on this tile, or false if they pass through.`,
  ])
})

test('an unknown key', () =>
  expect(said({ ...meadow(), scale: 2 })).toEqual([
    `${file}: scale: This is not something a tileset has. Remove it or check the spelling.`,
  ]))

test('a tileset listed in the game is found by a level that names it', async () => {
  const toml = `${fixtureFiles['automata.toml'] ?? ''}\n[[content]]\ntype = "tileset"\npath = "content/tilesets/meadow.json"\n`
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] ?? '')
  level.tileset = 'meadow'
  level.tiles = level.tiles.map((row: string) => row.replaceAll('#', 'G'))
  const t = meadow()
  const files = {
    ...fixtureFiles,
    'automata.toml': toml,
    'content/tilesets/meadow.json': writeContent('tileset', t as never),
    'content/levels/level-1.json': `${JSON.stringify(level, null, 2)}\n`,
  }
  expect(await gameProblems(files)).toEqual([])
})

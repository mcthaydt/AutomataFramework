import { expect, test } from 'vitest'
import {
  CONTENT_TYPES,
  DUEL_COLOURS,
  inkOf,
  LIBRARY_PALETTE,
  lightness,
  type PaletteFile,
  PaletteSchema,
  writeContent,
} from '#src/features/content/content.ts'
import { expectRoundTrip, gameFiles, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const meadow = () => ({
  format: 1 as const,
  id: 'meadow',
  ramps: [
    { id: 'moss', colors: ['#174a1b', '#225918', '#2f690c', '#518822'] },
    { id: 'tan', colors: ['#885041', '#9a624c', '#ad6e51'] },
  ],
})
const file = 'content/palettes/meadow.json'
const said = (value: unknown): string[] => problemsOf('palette', value, file)

test('a palette reads, and writes back to the same bytes twice', () => expectRoundTrip('palette', meadow()))

test('a palette is written in the schema’s order', () =>
  expect(Object.keys(JSON.parse(writeContent('palette', { ...meadow(), ink: '#222323' } as never)))).toEqual([
    'format',
    'id',
    'ink',
    'ramps',
  ]))

test('lightness is whole numbers, 2126 r + 7152 g + 722 b', () => {
  expect(lightness('#000000')).toBe(0)
  expect(lightness('#ffffff')).toBe(255 * (2126 + 7152 + 722))
  expect(lightness('#010000')).toBe(2126)
  expect(lightness('#000100')).toBe(7152)
  expect(lightness('#000001')).toBe(722)
  expect(Number.isInteger(lightness('#9a624c'))).toBe(true)
})

test('shades that do not get lighter are refused, naming the two', () => {
  const darker = meadow()
  darker.ramps[1] = { id: 'tan', colors: ['#9a624c', '#885041', '#ad6e51'] }
  expect(said(darker)).toEqual([
    `${file}: ramps[1].colors[1]: These shades must go from dark to light, and "#885041" is not lighter than "#9a624c".`,
  ])
  const same = meadow()
  same.ramps[0] = { id: 'moss', colors: ['#174a1b', '#174a1b', '#2f690c'] }
  expect(said(same)).toEqual([
    `${file}: ramps[0].colors[1]: These shades must go from dark to light, and "#174a1b" is not lighter than "#174a1b".`,
  ])
})

test('a ramp has three to six shades, each a colour', () => {
  const few = meadow()
  few.ramps[1] = { id: 'tan', colors: ['#885041', '#9a624c'] }
  expect(said(few)).toEqual([`${file}: ramps[1].colors: This needs at least 3 items.`])
  const many = meadow()
  many.ramps[1] = {
    id: 'tan',
    colors: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777'],
  }
  expect(said(many)).toEqual([
    `${file}: ramps[1].colors: This has more than 6 items, which is the most allowed.`,
  ])
  const wrong = meadow()
  wrong.ramps[1] = { id: 'tan', colors: ['#885041', 'tan', '#ad6e51'] }
  expect(said(wrong)).toEqual([
    `${file}: ramps[1].colors[1]: Write a colour as # and six digits, like #885041.`,
  ])
})

test('two ramps with one id', () => {
  const twice = meadow()
  twice.ramps[1] = { id: 'moss', colors: ['#885041', '#9a624c', '#ad6e51'] }
  expect(said(twice)).toEqual([`${file}: ramps[1].id: "moss" is used twice. Each colour needs its own id.`])
})

test('a palette has at least one ramp and at most 64', () => {
  expect(said({ ...meadow(), ramps: [] })).toEqual([`${file}: ramps: This needs at least 1 item.`])
  const sixtyFive = Array.from({ length: 65 }, (_, i) => ({
    id: `c${i}`,
    colors: ['#111111', '#222222', '#333333'],
  }))
  expect(said({ ...meadow(), ramps: sixtyFive })).toEqual([
    `${file}: ramps: This has more than 64 items, which is the most allowed.`,
  ])
})

test('a missing field says what to write', () => {
  const p: Record<string, unknown> = meadow()
  delete p.ramps
  expect(said(p)).toEqual([
    `${file}: ramps: This is missing. List the colours, each with an id and its shades, like [{ "id": "moss", "colors": ["#174a1b", "#225918", "#2f690c"] }].`,
  ])
})

test('an unknown key', () =>
  expect(said({ ...meadow(), mood: 'dark' })).toEqual([
    `${file}: mood: This is not something a palette has. Remove it or check the spelling.`,
  ]))

test('the ink is the one named, or else the darkest shade of the darkest ramp', () => {
  expect(inkOf(meadow())).toBe('#174a1b')
  expect(inkOf({ ...meadow(), ink: '#222323' })).toBe('#222323')
  const first: PaletteFile = {
    format: 1,
    id: 'two',
    ramps: [
      { id: 'light', colors: ['#885041', '#9a624c', '#ad6e51'] },
      { id: 'dark', colors: ['#001b40', '#03315f', '#07487c'] },
    ],
  }
  expect(inkOf(first)).toBe('#001b40')
})

test('the library’s palette reads through the schema, with 32 ramps of 5 and these ids in order', () => {
  expect(PaletteSchema.safeParse(LIBRARY_PALETTE).success).toBe(true)
  expect(LIBRARY_PALETTE.id).toBe('automata')
  expect(LIBRARY_PALETTE.ramps).toHaveLength(32)
  for (const ramp of LIBRARY_PALETTE.ramps) expect(ramp.colors, ramp.id).toHaveLength(5)
  expect(LIBRARY_PALETTE.ramps.map((ramp) => ramp.id)).toEqual(
    'slate cream brown sea ember lilac moss navy sage rose steel clay bark plum teal sand tan violet crimson russet olive gold dusk leaf umber mint cobalt sunset amethyst indigo mauve flame'.split(
      ' ',
    ),
  )
  expect(writeContent('palette', LIBRARY_PALETTE as never)).toBe(
    `${JSON.stringify(LIBRARY_PALETTE, null, 2)}\n`,
  )
})

test('every colour of the library, its ink included, is in Lospec’s DUEL palette', () => {
  expect(DUEL_COLOURS).toHaveLength(256)
  expect(new Set(DUEL_COLOURS).size).toBe(256)
  for (const colour of DUEL_COLOURS) expect(colour).toMatch(/^#[0-9a-f]{6}$/)
  const duel = new Set(DUEL_COLOURS)
  for (const ramp of LIBRARY_PALETTE.ramps)
    for (const colour of ramp.colors) expect(duel.has(colour), `${ramp.id} ${colour}`).toBe(true)
  expect(duel.has(inkOf(LIBRARY_PALETTE))).toBe(true)
  // The edge colour is the old painter's outline, never a ramp's lilac, and no ramp is called ink (audit I5).
  expect(LIBRARY_PALETTE.ink).toBe('#002219')
  expect(LIBRARY_PALETTE.ramps.map((ramp) => ramp.id)).not.toContain('ink')
})

test('DUEL starts and ends where Lospec lists it', () => {
  expect(DUEL_COLOURS[0]).toBe('#000000')
  expect(DUEL_COLOURS[8]).toBe('#625d54')
  expect(DUEL_COLOURS[255]).toBe('#f7f4bf')
})

test('the content table lists palette right after figure', () => {
  const kinds = Object.keys(CONTENT_TYPES)
  expect(kinds[kinds.indexOf('figure') + 1]).toBe('palette')
  expect(CONTENT_TYPES.palette).toMatchObject({ plural: 'palettes', editor: 'characters', part: 'palette' })
})

test('a game with no palette has no palettes key, so its content hashes as it did', async () => {
  const loaded = await import('#src/features/content/content.ts').then(({ loadGame }) =>
    loadGame(async (path) => {
      const text = fixtureFiles[path]
      if (text === undefined) throw new Error(`${path}: no such file`)
      return text
    }),
  )
  expect(loaded.ok).toBe(true)
  expect(loaded.ok && Object.hasOwn(loaded.value, 'palettes')).toBe(false)
})

test('a palette listed in the game is loaded under palettes, with its id the file name', async () => {
  const files = gameFiles(fixtureFiles, [
    { type: 'palette', path: file, text: writeContent('palette', meadow()) },
  ])
  expect(await gameProblems(files)).toEqual([])
  expect(
    await gameProblems({ ...files, [file]: writeContent('palette', { ...meadow(), id: 'other' }) }),
  ).toEqual([`${file}: id: This must be "meadow", the same as the file name.`])
})

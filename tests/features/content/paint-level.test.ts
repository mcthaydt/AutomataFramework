import { expect, test } from 'vitest'
import type { GameContent, Painted } from '#src/features/content/content.ts'
import { paintLevel, paintWorld } from '#src/features/content/content.ts'
import { makePalette } from '#src/features/content/paint-level.ts'
import { SKY_COLOR, TILE_COLOR } from '#src/features/level/level.ts'
import { loadLinksGame } from '../../fixtures/links-game/read.ts'

/** The colour of the pixel at `x`, `y`, as `0xrrggbb` (0 for clear). */
const colourAt = (painted: Painted, x: number, y: number): number =>
  painted.picture.palette[painted.picture.pixels[y * painted.picture.width + x] as number] as number

/** How many pixels hold this colour. */
const count = (painted: Painted, colour: number): number => {
  let n = 0
  for (let y = 0; y < painted.picture.height; y++)
    for (let x = 0; x < painted.picture.width; x++) if (colourAt(painted, x, y) === colour) n++
  return n
}

const PAPER = 0xfff1a8
const REACH = 0xf77f00
const PATH = 0x7b2cbf
const ARROW = 0xd62828
const BAR = 0xffd166

test('a level as it plays is 16 pixels a tile, the sky and the ground the level has, and a thing in its colour', async () => {
  const painted = paintLevel(await loadLinksGame(), 'room-2')
  expect([painted.picture.width, painted.picture.height]).toEqual([256, 144])
  expect(painted.legend).toEqual([])
  // The first colour used is the sky, then the slate of the ground: the same two a level without colours is drawn in.
  expect(painted.picture.palette.slice(0, 3)).toEqual([0, SKY_COLOR, TILE_COLOR])
  expect(colourAt(painted, 128, 40)).toBe(SKY_COLOR)
  expect(colourAt(painted, 128, 140)).toBe(TILE_COLOR)
  // The crate stands at 5.5, 7.5 and is gold.
  expect(colourAt(painted, 88, 120)).toBe(0xc9a227)
})

test('a level that names its own colours is drawn in them', async () => {
  const content = await loadLinksGame()
  const level = { ...content.levels['room-2'], sky: '#102030', ground: '#405060' }
  const painted = paintLevel(
    { ...content, levels: { ...content.levels, 'room-2': level } } as GameContent,
    'room-2',
  )
  expect([colourAt(painted, 128, 40), colourAt(painted, 128, 140)]).toEqual([0x102030, 0x405060])
})

test('each hero stands at its start', async () => {
  const painted = paintLevel(await loadLinksGame(), 'room-2')
  expect(colourAt(painted, Math.round(2.5 * 16), Math.round(7.5 * 16))).toBe(0xe4572e)
  expect(colourAt(painted, Math.round(3.5 * 16), Math.round(7.5 * 16))).toBe(0xe4572e)
})

test('a level that is not there is a mistake, named', async () => {
  expect(() => paintLevel({ levels: {} } as unknown as GameContent, 'nowhere')).toThrow(
    'There is no level called "nowhere".',
  )
})

test('what it is: the ground is one flat tint, and the legend names every number, in the order of the things', async () => {
  const painted = paintLevel(await loadLinksGame(), 'room-2', { whatItIs: true })
  expect([painted.picture.width, painted.picture.height]).toEqual([256, 144])
  expect(colourAt(painted, 128, 140)).toBe(0x8d99a6)
  expect(painted.legend).toEqual([
    { n: 1, level: 'room-2', thing: 'door-in', value: 'to', shown: 'tag', says: 'to room-1, beside exit' },
    {
      n: 2,
      level: 'room-2',
      thing: 'critter-1',
      value: 'walk',
      shown: 'path',
      says: 'a path of 2 points: 7.5, 7.5 then 9.5, 7.5',
    },
    { n: 3, level: 'room-2', thing: 'critter-1', value: 'reach', shown: 'reach', says: '3' },
    { n: 4, level: 'room-2', thing: 'button-1', value: 'opens', shown: 'arrow', says: 'gate-1' },
    { n: 5, level: 'room-2', thing: 'button-1', value: 'stays', shown: 'tag', says: 'yes' },
  ])
})

test('a reach is a ring that many tiles out, a path is a line with a dot at each place, an arrow a line to its end', async () => {
  const painted = paintLevel(await loadLinksGame(), 'room-2', { whatItIs: true })
  // The critter stands at 7.5, 7.5 (120, 120): its ring is 3 tiles (48 pixels) out, and its path ends in dots.
  expect(colourAt(painted, 168, 120)).toBe(REACH)
  expect(colourAt(painted, 120, 120)).toBe(PATH)
  expect(colourAt(painted, 152, 120)).toBe(PATH)
  expect(colourAt(painted, 137, 120)).toBe(PATH)
  // The button at 11.5, 7.875 (184, 126) is linked to the gate at 13.25, 4 (212, 64): a line goes between them.
  expect(count(painted, ARROW)).toBeGreaterThan(50)
})

test('a switch left at its default has no tag, and a number is a tag whatever it is', async () => {
  const content = await loadLinksGame()
  const level = content.levels['room-2'] as GameContent['levels'][string]
  const things = level.things.map((thing) =>
    thing.id === 'button-1' ? { ...thing, values: { opens: ['gate-1'], stays: false } } : thing,
  )
  const painted = paintLevel(
    { ...content, levels: { ...content.levels, 'room-2': { ...level, things } } } as GameContent,
    'room-2',
    { whatItIs: true },
  )
  expect(painted.legend.map((line) => [line.thing, line.value])).toEqual([
    ['door-in', 'to'],
    ['critter-1', 'walk'],
    ['critter-1', 'reach'],
    ['button-1', 'opens'],
  ])
})

test('a switch is yes or no in the words of the game, a choice its name and a words value its text', async () => {
  const content = await loadLinksGame()
  const level = content.levels['room-1'] as GameContent['levels'][string]
  const sign = {
    ...(content.characters.crate as GameContent['characters'][string]),
    id: 'sign',
    values: [
      { id: 'says', name: 'Says', type: 'words', default: 'sign.welcome' },
      {
        id: 'colour',
        name: 'Colour',
        type: 'choice',
        from: [
          { id: 'red', name: 'Red' },
          { id: 'blue', name: 'Blue' },
        ],
        default: 'red',
      },
      { id: 'dial', name: 'Dial', type: 'number', least: 0, most: 9, default: 5 },
      { id: 'lit', name: 'Lit', type: 'switch', default: false },
    ],
  }
  const things = [
    ...level.things,
    { id: 'sign-1', character: 'sign', x: 8, y: 3, values: { colour: 'blue', lit: true } },
  ]
  const made = (source: string): GameContent =>
    ({
      ...content,
      project: { ...content.project, source },
      characters: { ...content.characters, sign },
      levels: { ...content.levels, 'room-1': { ...level, things } },
    }) as unknown as GameContent
  const says = (source: string): string[] =>
    paintLevel(made(source), 'room-1', { whatItIs: true })
      .legend.filter((line) => line.thing === 'sign-1')
      .map((line) => line.says)
  expect(says('en')).toEqual(['Welcome to the links game.', 'Blue', '5', 'yes'])
  // A game in another language says yes the way its players do, and a word with no text in it is the key.
  expect(says('es')).toEqual(['sign.welcome', 'Blue', '5', 'sí'])
})

test('two tags on one thing are two badges that do not cover each other', async () => {
  const content = await loadLinksGame()
  const level = content.levels['room-1'] as GameContent['levels'][string]
  const dial = {
    ...(content.characters.crate as GameContent['characters'][string]),
    id: 'dial',
    values: [
      { id: 'one', name: 'One', type: 'number', least: 0, most: 9, default: 7 },
      { id: 'two', name: 'Two', type: 'number', least: 0, most: 9, default: 9 },
    ],
  }
  const made = {
    ...content,
    characters: { ...content.characters, dial },
    levels: {
      ...content.levels,
      'room-1': { ...level, things: [{ id: 'dial-1', character: 'dial', x: 8, y: 4 }] },
    },
  } as unknown as GameContent
  const painted = paintLevel(made, 'room-1', { whatItIs: true })
  expect(painted.legend.map((line) => line.says)).toEqual(['7', '9'])
  // A badge is 10 by 14 pixels, its digit in ink: a 7 has 7 pixels of ink and a 9 has 12, each four pixels big. Apart, the
  // paper left is 140 - 28 and 140 - 48; had one covered the other, there would be less.
  expect(count(painted, PAPER)).toBe(140 - 28 + (140 - 48))
})

test('the world is each level at its place, a bar across each join, and a numbered arrow from each door', async () => {
  const painted = paintWorld(await loadLinksGame()) as Painted
  // 52 tiles across and 9 down at 8 pixels a tile, with 8 pixels round.
  expect([painted.picture.width, painted.picture.height]).toEqual([432, 88])
  expect(painted.legend).toEqual([
    { n: 1, level: 'room-1', thing: '', value: 'level', shown: 'tag', says: 'at 0, 0' },
    { n: 2, level: 'room-2', thing: '', value: 'level', shown: 'tag', says: 'at 20, 0' },
    { n: 3, level: 'room-3', thing: '', value: 'level', shown: 'tag', says: 'at 36, 0' },
    {
      n: 4,
      level: 'room-1',
      thing: 'exit',
      value: 'door',
      shown: 'arrow',
      says: 'to room-2, beside door-in',
    },
    {
      n: 5,
      level: 'room-2',
      thing: 'door-in',
      value: 'door',
      shown: 'arrow',
      says: 'to room-1, beside exit',
    },
    { n: 6, level: 'room-3', thing: 'back', value: 'door', shown: 'arrow', says: 'to room-1, beside exit' },
  ])
  // The one join is rows 5 to 7 where room-2 meets room-3, at x = 8 + 36 * 8 = 296: a bar 8 pixels wide across it.
  for (const [x, y] of [
    [292, 50],
    [299, 50],
    [296, 70],
  ] as const)
    expect(colourAt(painted, x, y), `${x},${y}`).toBe(BAR)
  for (const [x, y] of [
    [291, 50],
    [300, 50],
    [296, 47],
    [296, 72],
  ] as const)
    expect(colourAt(painted, x, y), `${x},${y}`).not.toBe(BAR)
  // A line runs from the door of room-3 to the door it leads to in room-1.
  expect(count(painted, ARROW)).toBeGreaterThan(200)
})

test('the world is drawn as big as it can be in 2,048 pixels, and not at all when it cannot be', async () => {
  const content = await loadLinksGame()
  const [world] = Object.values(content.worlds ?? {})
  const far = (x: number): GameContent =>
    ({
      ...content,
      worlds: {
        world: {
          ...world,
          levels: [
            { level: 'room-1', at: { x: 0, y: 0 } },
            { level: 'room-2', at: { x, y: 0 } },
          ],
        },
      },
    }) as unknown as GameContent
  expect(paintWorld(far(300))?.picture.width).toBe((300 + 16) * 4 + 16)
  expect(paintWorld(far(1000))?.picture.width).toBe((1000 + 16) * 2 + 16)
  expect(paintWorld(far(2016))?.picture.width).toBe(2048)
  expect(paintWorld(far(2017))).toBeUndefined()
})

test('a game with no world file, or one that places no level, has no map', async () => {
  const content = await loadLinksGame()
  expect(paintWorld({ ...content, worlds: undefined } as unknown as GameContent)).toBeUndefined()
  const empty = {
    ...content,
    worlds: { world: { format: 1, id: 'world', levels: [] } },
  } as unknown as GameContent
  expect(paintWorld(empty)).toBeUndefined()
})

test('the palette is every colour in the order it is first used, and past 255 a colour is the nearest earlier one', () => {
  const palette = makePalette()
  expect(palette.place(0x102030)).toBe(1)
  expect(palette.place(0x405060)).toBe(2)
  expect(palette.place(0x102030)).toBe(1)
  for (let grey = 1; grey <= 253; grey++) palette.place(grey * 0x010101)
  expect(palette.colours).toHaveLength(256)
  // 0x808081 is one step from the grey 0x808080, which has the place its number is plus 2.
  expect(palette.place(0x808081)).toBe(0x80 + 2)
  expect(palette.colours).toHaveLength(256)
  // Asked again, it is the same place.
  expect(palette.place(0x808081)).toBe(0x80 + 2)
})

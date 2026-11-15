import { readdirSync, readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import {
  type FigureFile,
  isRigged,
  parseContent,
  posesOf,
  writeContent,
} from '#src/features/content/content.ts'
import { noPose } from '#src/features/content/figure.ts'
import { heroFigure } from '../../fixtures/content/art.ts'
import { expectRoundTrip, gameFiles, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'
import { keeperPerson, plainPerson } from '../../fixtures/figures/person.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

type Json = Record<string, unknown>
const file = 'content/figures/keeper.json'
const said = (value: unknown): string[] => problemsOf('figure', value, file)
/** The keeper with one change made to it. */
const edit = (change: (value: Json) => void, from: () => Json = keeperPerson): Json => {
  const value = from()
  change(value)
  return value
}
/** The keeper with these keys written over its own. */
const given = (keys: Json, from: () => Json = keeperPerson): Json => ({ ...from(), ...keys })

test('a rigged figure reads, and writes back to the same bytes twice', () =>
  expectRoundTrip('figure', keeperPerson()))

test('a rigged figure with only what it must have reads', () => {
  expectRoundTrip('figure', plainPerson())
  expect(said(plainPerson())).toEqual([])
})

test('a rigged figure is written in the schema’s order, whatever order it was given in', () => {
  const shuffled = Object.fromEntries(Object.entries(keeperPerson()).reverse())
  expect(Object.keys(JSON.parse(writeContent('figure', shuffled as never)))).toEqual([
    'format',
    'id',
    'body',
    'tile',
    'frame',
    'sliders',
    'face',
    'paints',
    'palette',
    'outline',
    'variants',
  ])
  const sliders = JSON.parse(writeContent('figure', shuffled as never)).sliders as Json
  expect(Object.keys(sliders)).toEqual(Object.keys(keeperPerson().sliders as Json))
})

test('a slider at its normal still writes when written: the file is kept as written', () => {
  const written = writeContent('figure', given({ sliders: { build: 0.5, fat: 0.4 } }) as never)
  expect(JSON.parse(written).sliders).toEqual({ build: 0.5, fat: 0.4 })
})

test('a rigged figure is told apart from a free one by its format, and isRigged says which', () => {
  const rigged = parseContent('figure', JSON.stringify(plainPerson()), file)
  const free = parseContent('figure', JSON.stringify(heroFigure()), file)
  expect(rigged.ok && isRigged(rigged.value)).toBe(true)
  expect(free.ok && isRigged(free.value)).toBe(false)
  if (rigged.ok && free.ok) {
    expect(posesOf(rigged.value)).toEqual(['idle-1'])
    expect(posesOf(free.value)).toEqual(['idle', 'run-1', 'run-2', 'jump', 'fall', 'land', 'push'])
  }
})

test('noPose lists the poses it is given', () =>
  expect(noPose({ id: 'keeper' }, ['idle-1', 'walk-1'], 'idle')).toBe(
    'The figure "keeper" has no pose called "idle". It has: idle-1, walk-1.',
  ))

test('a number out of range says its end', () => {
  expect(said(given({ sliders: { build: 1.3 } }))).toEqual([
    `${file}: sliders.build: This must be 1.2 or less.`,
  ])
  expect(said(given({ sliders: { build: -0.3 } }))).toEqual([
    `${file}: sliders.build: This must be -0.2 or more.`,
  ])
  expect(said(given({ sliders: { height: 7 } }))).toEqual([
    `${file}: sliders.height: This must be 8 or more.`,
  ])
  expect(said(given({ sliders: { headTilt: 31 } }))).toEqual([
    `${file}: sliders.headTilt: This must be 30 or less.`,
  ])
  expect(said(given({ face: { eyeSize: 1.1 } }))).toEqual([`${file}: face.eyeSize: This must be 1 or less.`])
})

test('a slider that is not a slider, and a face choice that is not one', () => {
  expect(said(given({ sliders: { strength: 1 } }))).toEqual([
    `${file}: sliders.strength: This is not something a figure has. Remove it or check the spelling.`,
  ])
  expect(said(given({ face: { eyes: 'round' } }))).toEqual([
    `${file}: face.eyes: This must be one of: dots, ovals, wide, sleepy, closed.`,
  ])
  expect(said(given({ face: { mouth: 'grin' } }))).toEqual([
    `${file}: face.mouth: This must be one of: none, line, smile, frown, open.`,
  ])
})

test('a figure taller than its frame says which to change', () => {
  expect(said(given({ frame: { w: 32, h: 32 }, sliders: { height: 40 } }))).toEqual([
    `${file}: sliders.height: This figure is 40 pixels tall but its frame is 32. Make "height" 30 or less, or the frame taller.`,
  ])
  // Two pixels are kept for the ground, and one for the edge.
  expect(said(given({ frame: { w: 32, h: 32 }, sliders: { height: 30 } }))).toEqual([])
  expect(said(given({ frame: { w: 32, h: 32 }, sliders: { height: 31 } }))).toHaveLength(1)
})

test('a figure with no height is as tall as a normal one, and its frame has to hold that', () => {
  expect(said(given({ frame: { w: 32, h: 20 } }, plainPerson))).toEqual([
    `${file}: frame.h: A figure with no "height" stands 24 pixels tall, but its frame is 20. Write a "height" of 18 or less, or make the frame taller.`,
  ])
  expect(said(given({ frame: { w: 32, h: 26 } }, plainPerson))).toEqual([])
})

test('a frame too short for any figure says so', () =>
  expect(said(given({ frame: { w: 32, h: 8 }, sliders: { height: 8 } }))).toEqual([
    `${file}: sliders.height: A frame 8 pixels tall is too short for a figure. Make the frame at least 10 pixels tall.`,
  ]))

test('a variant cannot be named for a view', () => {
  for (const name of ['side', 'front', 'back'])
    expect(said(given({ variants: [{ id: name, paints: { skin: 'sand' } }] }))).toEqual([
      `${file}: variants[0].id: "${name}" is the name of a view. Give these colours another name, like "two".`,
    ])
})

test('two variants with one id, and more than eight', () => {
  expect(said(given({ variants: [{ id: 'two' }, { id: 'two' }] }))).toEqual([
    `${file}: variants[1].id: "two" is used twice. Each variant needs its own id.`,
  ])
  const nine = Array.from({ length: 9 }, (_, i) => ({ id: `v-${i}` }))
  expect(said(given({ variants: nine }))).toEqual([
    `${file}: variants: This has more than 8 items, which is the most allowed.`,
  ])
})

test('an outline is "dark" or "ink"', () =>
  expect(said(given({ outline: 'light' }))).toEqual([`${file}: outline: This must be one of: dark, ink.`]))

test('a figure of a format that does not exist', () =>
  expect(said(given({ format: 3 }))).toEqual([`${file}: format: This must be one of: 1, 2.`]))

// Review Focus 1: a file between the two formats gets one sentence that says which format has the key.
test('a format 1 file with "body" gets one sentence', () =>
  expect(said({ ...heroFigure(), body: 'person' })).toEqual([
    `${file}: body: This is only in a figure with "format": 2, and this one has "format": 1. Remove it, or write "format": 2.`,
  ]))

test('a format 2 file with "parts" gets one sentence', () =>
  expect(said(given({ parts: [{ id: 'a' }] }))).toEqual([
    `${file}: parts: This is only in a figure with "format": 1, and this one has "format": 2. Remove it, or write "format": 1.`,
  ]))

test('a format 2 file with no "body" gets one sentence', () =>
  expect(said(edit((v) => delete v.body))).toEqual([`${file}: body: This is missing. Write "person".`]))

test('a missing field says what to write in the words of its format', () => {
  expect(said(edit((v) => delete v.paints))).toEqual([
    `${file}: paints: This is missing. Write the colours as { "skin": "tan" }, each the id of a colour in the palette.`,
  ])
  expect(said(given({ paints: { hair: 'slate' } }))).toEqual([
    `${file}: paints.skin: This is missing. Write the id of a colour in the palette for the skin, like "tan".`,
  ])
  // The same key in a format 1 file keeps today's words.
  const free = heroFigure() as Json
  delete free.paints
  expect(said(free)).toEqual([
    `${file}: paints: This is missing. List the colours the parts use, each with an id and a color.`,
  ])
  expect(said(edit((v) => delete v.frame))).toEqual([
    `${file}: frame: This is missing. Write the size of one pose in pixels, like { "w": 24, "h": 24 }.`,
  ])
})

// What a rigged figure names in other files is read with the game (the palette).
const keeperGame = (palettes: Record<string, unknown> = {}, change: (v: Json) => void = () => {}) => {
  const extra = [
    { type: 'figure' as const, path: file, text: writeContent('figure', edit(change) as never) },
    ...Object.entries(palettes).map(([id, value]) => ({
      type: 'palette' as const,
      path: `content/palettes/${id}.json`,
      text: writeContent('palette', value as never),
    })),
  ]
  return gameFiles(fixtureFiles, extra)
}

test('a figure on the framework palette loads', async () =>
  expect(await gameProblems(keeperGame())).toEqual([]))

test('a colour that is not in the palette lists the colours it has', async () => {
  const problems = await gameProblems(
    keeperGame({}, (v) => Object.assign(v, { paints: { skin: 'tann', hair: 'slate', eyes: 'bark' } })),
  )
  expect(problems).toHaveLength(1)
  expect(problems[0]).toMatch(
    /^content\/figures\/keeper\.json: paints\.skin: There is no colour called "tann" in the palette "automata"\. It has: amethyst, bark, brown, /,
  )
})

test('a variant is held to the palette too', async () => {
  const problems = await gameProblems(
    keeperGame({}, (v) => Object.assign(v, { variants: [{ id: 'two', paints: { hair: 'goldd' } }] })),
  )
  expect(problems).toHaveLength(1)
  expect(problems[0]).toContain(
    'variants[0].paints.hair: There is no colour called "goldd" in the palette "automata".',
  )
})

test('a palette that is not there lists the ones that are', async () => {
  const problems = await gameProblems(keeperGame({}, (v) => Object.assign(v, { palette: 'meadow' })))
  expect(problems).toEqual([
    `${file}: palette: There is no palette called "meadow". This game and the framework has: automata.`,
  ])
})

test('the game’s own palette is used, and its colours are the ones asked for', async () => {
  const meadow = {
    format: 1,
    id: 'meadow',
    ramps: [
      { id: 'tan', colors: ['#885041', '#9a624c', '#ad6e51'] },
      { id: 'moss', colors: ['#174a1b', '#225918', '#2f690c'] },
    ],
  }
  const own = (v: Json): void => {
    Object.assign(v, { palette: 'meadow', paints: { skin: 'tan', hair: 'moss' }, variants: [] })
    delete v.variants
  }
  expect(await gameProblems(keeperGame({ meadow }, own))).toEqual([])
  // `slate` is the framework's, not this palette's.
  const wrong = await gameProblems(
    keeperGame({ meadow }, (v) => {
      own(v)
      Object.assign(v, { paints: { skin: 'tan', hair: 'slate' } })
    }),
  )
  expect(wrong).toEqual([
    `${file}: paints.hair: There is no colour called "slate" in the palette "meadow". It has: moss, tan.`,
  ])
})

test('the game’s palette with the framework’s name wins over the framework’s', async () => {
  const own = {
    format: 1,
    id: 'automata',
    ramps: [{ id: 'tan', colors: ['#885041', '#9a624c', '#ad6e51'] }],
  }
  const problems = await gameProblems(
    keeperGame({ automata: own }, (v) => {
      Object.assign(v, { paints: { skin: 'tan' }, variants: [{ id: 'two' }] })
    }),
  )
  expect(problems).toEqual([])
})

test('a palette with no hair or eye ramps and no ink ramp has no problem when a figure leaves them out', async () => {
  const bare = {
    format: 1,
    id: 'bare',
    ramps: [{ id: 'tan', colors: ['#885041', '#9a624c', '#ad6e51'] }],
  }
  const problems = await gameProblems(
    keeperGame({ bare }, (v) => {
      Object.assign(v, { palette: 'bare', paints: { skin: 'tan' } })
      delete v.variants
    }),
  )
  expect(problems).toEqual([])
})

// Free figures are not touched: every one the repository has reads to the value it always read to.
test('every format 1 figure in the fixtures and the template reads to the value in its own file', () => {
  const folders = ['tests/fixtures/full-game/content/figures', 'template/content/figures']
  let count = 0
  for (const folder of folders)
    for (const name of readdirSync(folder).filter((n) => n.endsWith('.json'))) {
      const text = readFileSync(`${folder}/${name}`, 'utf8')
      const parsed = parseContent('figure', text, `${folder}/${name}`)
      expect(parsed.ok, `${folder}/${name} reads`).toBe(true)
      if (!parsed.ok) continue
      expect(JSON.stringify(parsed.value), name).toBe(JSON.stringify(JSON.parse(text)))
      expect((parsed.value as FigureFile).format).toBe(1)
      count++
    }
  expect(count).toBe(6)
})

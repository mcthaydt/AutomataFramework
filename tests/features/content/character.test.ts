import { describe, expect, test } from 'vitest'
import { formatDiagnostic, parseContent, writeContent } from '#src/features/content/content.ts'
import { artGame } from '../../fixtures/content/art.ts'
import { gameProblems } from '../../fixtures/content/kind.ts'

const hero = () => ({
  format: 1,
  id: 'hero',
  body: 'dynamic',
  size: { w: 0.8, h: 1 },
  color: '#e4572e',
  upright: true,
})
const crate = () => ({ format: 1, id: 'crate', body: 'dynamic', size: { w: 1, h: 1 }, color: '#c9a227' })

const problems = (file: string, value: unknown): string[] => {
  const parsed = parseContent('character', JSON.stringify(value), file)
  return parsed.ok ? [] : parsed.diagnostics.map(formatDiagnostic)
}

test('the example characters parse, and upright defaults to false', () => {
  const heroParsed = parseContent('character', JSON.stringify(hero()), 'content/characters/hero.json')
  const crateParsed = parseContent('character', JSON.stringify(crate()), 'content/characters/crate.json')
  expect(heroParsed.ok && heroParsed.value).toEqual(hero())
  expect(crateParsed.ok && crateParsed.value).toEqual({ ...crate(), upright: false })
})

test('a bad colour', () =>
  expect(problems('content/characters/hero.json', { ...hero(), color: 'red' })).toEqual([
    'content/characters/hero.json: color: Write a colour as # and six digits, like #e4572e.',
  ]))

test('a body that is neither dynamic nor fixed', () =>
  expect(problems('content/characters/hero.json', { ...hero(), body: 'floaty' })).toEqual([
    'content/characters/hero.json: body: This must be one of: dynamic, fixed.',
  ]))

test('a size that is zero or too big', () => {
  expect(problems('content/characters/hero.json', { ...hero(), size: { w: 0, h: 1 } })).toEqual([
    'content/characters/hero.json: size.w: This must be more than 0.',
  ])
  expect(problems('content/characters/hero.json', { ...hero(), size: { w: 1, h: 17 } })).toEqual([
    'content/characters/hero.json: size.h: This must be 16 or less.',
  ])
})

test('a missing field says what to write', () =>
  expect(problems('content/characters/hero.json', { ...hero(), color: undefined })).toEqual([
    'content/characters/hero.json: color: This is missing. Write the colour as # and six digits, like #e4572e.',
  ]))

test('an unknown key', () =>
  expect(problems('content/characters/hero.json', { ...hero(), speed: 3 })).toEqual([
    'content/characters/hero.json: speed: This is not something a character has. Remove it or check the spelling.',
  ]))

test('a character may say what kind of thing it is and which behaviour decides what it does', () => {
  const critter = { ...crate(), id: 'critter', kind: 'critter', behaviour: 'critter' }
  const parsed = parseContent('character', JSON.stringify(critter), 'content/characters/critter.json')
  expect(parsed.ok && parsed.value).toEqual({ ...critter, upright: false })
  expect(Object.keys(JSON.parse(writeContent('character', critter as never)))).toEqual([
    'format',
    'id',
    'body',
    'size',
    'color',
    'upright',
    'kind',
    'behaviour',
  ])
})

test('a tuning is named by id, and written last', () => {
  const hero2 = { ...hero(), tuning: 'hero' }
  const parsed = parseContent('character', JSON.stringify(hero2), 'content/characters/hero.json')
  expect(parsed.ok && parsed.value).toEqual(hero2)
  expect(Object.keys(JSON.parse(writeContent('character', hero2 as never))).at(-1)).toBe('tuning')
})

test('a character with neither is written as it was before, byte for byte', () =>
  expect(Object.keys(JSON.parse(writeContent('character', crate() as never)))).toEqual([
    'format',
    'id',
    'body',
    'size',
    'color',
    'upright',
  ]))

test('a kind that is not an id', () =>
  expect(problems('content/characters/hero.json', { ...hero(), kind: 'Big Crate' })).toEqual([
    'content/characters/hero.json: kind: Use lower-case words joined by dashes, like "level-1".',
  ]))

const spark = () => ({
  format: 1,
  id: 'spark',
  body: 'fixed',
  size: { w: 0.5, h: 0.5 },
  color: '#f2c14e',
  upright: false,
  kind: 'spark',
  touch: 'take',
})

test('a touched character is written with touch last, and reads back the same', () => {
  const parsed = parseContent('character', JSON.stringify(spark()), 'content/characters/spark.json')
  expect(parsed.ok && parsed.value).toEqual(spark())
  expect(Object.keys(JSON.parse(writeContent('character', spark() as never))).at(-1)).toBe('touch')
  expect(problems('content/characters/spark.json', { ...spark(), touch: 'sense' })).toEqual([])
})

test('touch is one of sense and take', () =>
  expect(problems('content/characters/spark.json', { ...spark(), touch: 'grab' })).toEqual([
    'content/characters/spark.json: touch: This must be one of: sense, take.',
  ]))

test('a character that is touched needs a kind', () => {
  const { kind: _kind, ...noKind } = spark()
  expect(problems('content/characters/spark.json', noKind)).toEqual([
    'content/characters/spark.json: kind: A character that is touched needs a "kind", so the game can say what was touched.',
  ])
})

test('a character that is touched cannot be dynamic', () =>
  expect(problems('content/characters/spark.json', { ...spark(), body: 'dynamic' })).toEqual([
    'content/characters/spark.json: body: A character that is touched lets everything through, so it would fall out of the level. Make its body "fixed".',
  ]))

const withArt = () => ({
  ...hero(),
  figure: 'hero',
  clips: [
    { id: 'idle', poses: ['idle'], fps: 1, loop: true },
    { id: 'run', poses: ['run-1', 'run-2'], fps: 8, loop: true },
  ],
})

test('a figure and clips are written right after the kind, before the behaviour and the tuning', () => {
  const full = { ...withArt(), kind: 'hero', behaviour: 'hero', tuning: 'hero' }
  const parsed = parseContent('character', JSON.stringify(full), 'content/characters/hero.json')
  expect(parsed.ok && parsed.value).toEqual(full)
  expect(Object.keys(JSON.parse(writeContent('character', full as never)))).toEqual([
    'format',
    'id',
    'body',
    'size',
    'color',
    'upright',
    'kind',
    'figure',
    'clips',
    'behaviour',
    'tuning',
  ])
})

test('clips without a figure', () => {
  const { figure: _figure, ...noFigure } = withArt()
  expect(problems('content/characters/hero.json', noFigure)).toEqual([
    'content/characters/hero.json: clips: Clips play a figure\'s poses, so this character needs a "figure" too.',
  ])
})

test('a clip needs poses, a speed and whether it goes round again', () => {
  const clip = { id: 'run', poses: ['run-1'], fps: 8, loop: true }
  expect(problems('content/characters/hero.json', { ...withArt(), clips: [{ ...clip, poses: [] }] })).toHaveLength(1)
  expect(problems('content/characters/hero.json', { ...withArt(), clips: [{ ...clip, fps: 0 }] })).toHaveLength(1)
  expect(
    problems('content/characters/hero.json', {
      ...withArt(),
      clips: [{ id: 'run', poses: ['run-1'], loop: true }],
    }),
  ).toEqual([
    'content/characters/hero.json: clips[0].fps: This is missing. Write how many pictures a second it shows, like 8.',
  ])
})

test('two clips with one id', () => {
  const one = { id: 'run', poses: ['run-1'], fps: 8, loop: true }
  expect(problems('content/characters/hero.json', { ...withArt(), clips: [one, one] })).toHaveLength(1)
})

test('a character with a figure and clips is written as it was, byte for byte', () => {
  const text = writeContent('character', withArt() as never)
  expect(writeContent('character', JSON.parse(text))).toBe(text)
})

describe('in a game', () => {
  const heroText = (value: unknown): Record<string, string | undefined> =>
    artGame([], { 'content/characters/hero.json': writeContent('character', value as never) })

  test('a figure the game has, and clips of its poses, load', async () =>
    expect(await gameProblems(artGame())).toEqual([]))

  test('a figure the game does not have', async () =>
    expect(await gameProblems(heroText({ ...withArt(), figure: 'hera' }))).toEqual([
      'content/characters/hero.json: figure: There is no figure called "hera". This game has: hero, keeper.',
    ]))

  test('a clip that shows a pose the figure does not have', async () =>
    expect(
      await gameProblems(
        heroText({ ...withArt(), clips: [{ id: 'run', poses: ['run-1', 'sprint'], fps: 8, loop: true }] }),
      ),
    ).toEqual([
      'content/characters/hero.json: clips[0].poses[1]: The figure "hero" has no pose called "sprint". It has: idle, run-1, run-2, jump, fall, land, push.',
    ]))
})

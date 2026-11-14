import { expect, test } from 'vitest'
import { formatDiagnostic, parseContent, writeContent } from '#src/features/content/content.ts'

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

import { expect, test } from 'vitest'
import { z } from 'zod'
import { formatDiagnostic } from '#src/features/content/content.ts'
import { checkData } from '#src/features/content/parse.ts'
import {
  EventName,
  isGamePath,
  list,
  MessageKey,
  noSuch,
  picturePath,
  ticks,
  unique,
  variants,
} from '#src/features/content/shared.ts'

const Shape = z.strictObject({
  act: variants('do', [
    z.strictObject({ do: z.literal('stay') }),
    z.strictObject({ do: z.literal('wander'), speed: z.number().gt(0) }),
  ]),
  words: z.record(MessageKey, z.string()),
  size: z.number(),
})
const VOICE = { noun: 'test', missing: {} }
const said = (data: unknown): string[] => {
  const r = checkData(Shape, data, 'f.json', VOICE)
  return r.ok ? [] : r.diagnostics.map(formatDiagnostic)
}

test('a wrong variant names the choices', () =>
  expect(said({ act: { do: 'fly' }, words: {}, size: 1 })).toEqual([
    'f.json: act.do: This must be one of: stay, wander.',
  ]))

test('a missing variant field says it is missing', () =>
  expect(said({ act: {}, words: {}, size: 1 })).toEqual([
    'f.json: act.do: This is missing. This must be one of: stay, wander.',
  ]))

test('a field of the wrong variant is not something it has', () =>
  expect(said({ act: { do: 'stay', speed: 2 }, words: {}, size: 1 })).toEqual([
    'f.json: act.speed: This is not something a test has. Remove it or check the spelling.',
  ]))

test('a bad key in a list of free keys', () =>
  expect(said({ act: { do: 'stay' }, words: { 'Bad Key': 'x' }, size: 1 })).toEqual([
    'f.json: words.Bad Key: This name cannot be used. Use lower-case words joined by dots or dashes, like "keeper.hello".',
  ]))

test('a key that is too long is told so in plain words', () =>
  expect(said({ act: { do: 'stay' }, words: { [`k${'a'.repeat(96)}`]: 'x' }, size: 1 })).toEqual([
    'f.json: words.' +
      `k${'a'.repeat(96)}` +
      ': This name cannot be used. This has more than 96 characters, which is the most allowed.',
  ]))

test('message keys and event names are lower-case words joined by dots or dashes', () => {
  for (const good of ['keeper.hello', 'a', 'level-1.won', 'constructor'])
    expect(MessageKey.safeParse(good).success, good).toBe(true)
  for (const bad of ['Keeper', 'a..b', '.a', 'a.', '1a', 'a b', '', 'a_b'])
    expect(MessageKey.safeParse(bad).success, bad).toBe(false)
  expect(EventName.safeParse('hero.landed').success).toBe(true)
  expect(EventName.safeParse('Hero Landed').success).toBe(false)
  expect(EventName.safeParse('x').success).toBe(true)
})

test('ticks are whole, at least one and at most the limit', () => {
  const three = ticks('How long it lasts', 3)
  expect(three.safeParse(3).success).toBe(true)
  expect(three.safeParse(0).success).toBe(false)
  expect(three.safeParse(4).success).toBe(false)
  expect(three.safeParse(1.5).success).toBe(false)
  expect(three.description).toBe('How long it lasts, in ticks. 60 ticks is one second.')
})

test('a game path stays inside the game and has the right ending', () => {
  expect(isGamePath('content/a.json', '.json')).toBe(true)
  expect(isGamePath('art/tiles.png', '.png')).toBe(true)
  expect(isGamePath('art/tiles.png', '.json')).toBe(false)
  for (const bad of ['../a.json', '/a.json', 'a/./b.json', 'a//b.json', 'a\\b.json', 'c:/a.json'])
    expect(isGamePath(bad, '.json'), bad).toBe(false)
})

test('a picture path has its own sentence', () => {
  const schema = z.strictObject({ image: picturePath('The picture') })
  const r = checkData(schema, { image: 'tiles.jpg' }, 'f.json', VOICE)
  expect(r.ok ? [] : r.diagnostics.map(formatDiagnostic)).toEqual([
    'f.json: image: Use a path inside the game that ends in .png, like art/tiles.png.',
  ])
})

test('two items with one id are told apart in the list', () => {
  const schema = z
    .strictObject({ items: z.array(z.strictObject({ id: z.string() })) })
    .superRefine((v, ctx) => unique(v.items, 'id', 'item', ['items'], ctx))
  const r = checkData(schema, { items: [{ id: 'a' }, { id: 'b' }, { id: 'a' }] }, 'f.json', VOICE)
  expect(r.ok ? [] : r.diagnostics.map(formatDiagnostic)).toEqual([
    'f.json: items[2].id: "a" is used twice. Each item needs its own id.',
  ])
})

test('the sentence for a name that is not there', () => {
  expect(noSuch('sound', 'dor', ['land', 'door'])).toBe(
    'There is no sound called "dor". This game has: door, land.',
  )
  expect(noSuch('sound', 'x', [])).toBe('There is no sound called "x". This game has: nothing.')
  expect(noSuch('layer', 'far', ['sky', 'hills'], 'This backdrop')).toBe(
    'There is no layer called "far". This backdrop has: hills, sky.',
  )
  expect(list(['b', 'a'])).toBe('a, b')
})

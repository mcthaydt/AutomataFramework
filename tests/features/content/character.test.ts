import { expect, test } from 'vitest'
import { formatDiagnostic, parseContent, writeContent } from '#src/features/content/content.ts'
import { gameProblems } from '../../fixtures/content/kind.ts'
import { english, keeperTalk, storyGame } from '../../fixtures/content/story.ts'
import { fullGameFiles } from '../../fixtures/full-game/read.ts'

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

test('a character may be named and may open a conversation, and both are written last', () => {
  const keeper = {
    ...crate(),
    id: 'keeper',
    kind: 'keeper',
    tuning: 'hero',
    name: 'keeper.name',
    conversation: 'keeper',
  }
  const parsed = parseContent('character', JSON.stringify(keeper), 'content/characters/keeper.json')
  expect(parsed.ok && parsed.value).toEqual({ ...keeper, upright: false })
  expect(Object.keys(JSON.parse(writeContent('character', keeper as never)))).toEqual([
    'format',
    'id',
    'body',
    'size',
    'color',
    'upright',
    'kind',
    'tuning',
    'name',
    'conversation',
  ])
})

test('a name that is not a message key, and a conversation that is not an id', () => {
  const file = 'content/characters/hero.json'
  expect(problems(file, { ...hero(), name: 'The Keeper' })).toEqual([
    `${file}: name: Use lower-case words joined by dots or dashes, like "keeper.hello".`,
  ])
  expect(problems(file, { ...hero(), conversation: 'The Keeper' })).toEqual([
    `${file}: conversation: Use lower-case words joined by dashes, like "level-1".`,
  ])
})

const KEEPER_PATH = 'content/characters/keeper.json'

/** The story game's keeper, given these fields, with English words for its name and a conversation to open. */
const keeperGame = (fields: Record<string, unknown>, extra: Parameters<typeof storyGame>[0] = []) =>
  storyGame(
    [
      {
        type: 'messages',
        path: 'content/messages/en.json',
        text: writeContent('messages', {
          ...english(),
          messages: { ...english().messages, 'keeper.name': 'Keeper' },
        }),
      },
      {
        type: 'conversation',
        path: 'content/conversations/keeper.json',
        text: writeContent('conversation', keeperTalk() as never),
      },
      ...extra,
    ],
    {
      [KEEPER_PATH]: writeContent('character', {
        format: 1,
        id: 'keeper',
        body: 'fixed',
        size: { w: 0.8, h: 1 },
        color: '#7a9e3b',
        ...fields,
      } as never),
    },
  )

test('a keeper with a name English has and a conversation the game has loads', async () =>
  expect(await gameProblems(keeperGame({ name: 'keeper.name', conversation: 'keeper' }))).toEqual([]))

test('a name English does not have', async () =>
  expect(await gameProblems(keeperGame({ name: 'keeper.nam' }))).toEqual([
    `${KEEPER_PATH}: name: English has no message called "keeper.nam". Add it to the English file or fix the spelling.`,
  ]))

test('a conversation the game does not have', async () =>
  expect(await gameProblems(keeperGame({ conversation: 'keper' }))).toEqual([
    `${KEEPER_PATH}: conversation: There is no conversation called "keper". This game has: keeper.`,
  ]))

test('a character with a behaviour has to move', async () => {
  const behaviour = {
    type: 'behaviour' as const,
    path: 'content/behaviours/critter.json',
    text: fullGameFiles['content/behaviours/critter.json'],
  }
  // The behaviour looks for a hero, so some character has to be of that kind: here, the keeper.
  const walker = { behaviour: 'critter', kind: 'hero' }
  expect(await gameProblems(keeperGame(walker, [behaviour]))).toEqual([
    `${KEEPER_PATH}: body: A character with a behaviour has to move, so its body must be "dynamic".`,
  ])
  expect(await gameProblems(keeperGame({ ...walker, body: 'dynamic' }, [behaviour]))).toEqual([])
})

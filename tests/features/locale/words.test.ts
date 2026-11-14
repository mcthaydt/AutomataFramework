// Words by key: the game's, then the framework's own, then English, then the key itself.
import { describe, expect, expectTypeOf, test } from 'vitest'
import { LANGUAGES } from '#src/features/content/content.ts'
import enFile from '#src/features/locale/library/en.json' with { type: 'json' }
import { frameworkWords, languagesOf, typed, type Words, wordsOf } from '#src/features/locale/locale.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { wordsGame } from '../../fixtures/locale/content.ts'

const hello = 'keeper.hello'

test('the language asked for, then English, then the key', async () => {
  const content = await wordsGame({
    en: { [hello]: 'Hello', 'keeper.tip': 'A tip' },
    ko: { [hello]: '안녕' },
  })
  const ko = wordsOf(content, 'ko')
  expect(ko(hello)).toBe('안녕')
  expect(ko('keeper.tip')).toBe('A tip')
  expect(ko('keeper.nothing')).toBe('keeper.nothing')
  // A language with no file at all is read as English.
  expect(wordsOf(content, 'ja')(hello)).toBe('Hello')
})

test("the framework's own words are there in a game that says nothing of them", async () => {
  const content = await loadFixtureGame()
  expect(wordsOf(content, 'es')('automata.touch.label')).toBe('Controles táctiles')
  expect(wordsOf(content, 'en')('automata.touch.label')).toBe('Touch controls')
  expect(frameworkWords('pt')('automata.touch.label')).toBe('Controles de toque')
})

test("a game may say a framework sentence its own way; a language it leaves out keeps the framework's", async () => {
  const content = await wordsGame({ en: { 'automata.touch.label': 'Buttons' } })
  expect(wordsOf(content, 'en')('automata.touch.label')).toBe('Buttons')
  expect(wordsOf(content, 'ko')('automata.touch.label')).toBe('터치 조작')
})

test("a game's own English stands in before the framework's, whatever the language", async () => {
  const content = await wordsGame({
    en: { 'automata.touch.label': 'Buttons', [hello]: 'Hi' },
    es: { [hello]: 'Hola' },
  })
  // Spanish has no say on the label: the framework's Spanish comes before the game's English.
  expect(wordsOf(content, 'es')('automata.touch.label')).toBe('Controles táctiles')
})

test('values are put in, in the language asked for', () => {
  expect(frameworkWords('en')('automata.online.waiting.many', { count: 3, code: 'ABCD' })).toBe(
    'Waiting for 3 more players. Share this code so friends can join: ABCD',
  )
  expect(frameworkWords('en')('automata.online.away.many', { players: [1, 2, 4] })).toBe(
    'Players 1, 2 and 4 lost their connection. The game goes on.',
  )
})

describe("the game's languages", () => {
  test('in order, whatever order the files were listed in', async () => {
    const content = await wordsGame({
      pt: { [hello]: 'Olá' },
      en: { [hello]: 'Hi' },
      ko: { [hello]: '안녕' },
    })
    expect(languagesOf(content)).toEqual(['en', 'ko', 'pt'])
  })

  test('all six for a game with no words', async () => {
    expect(languagesOf(await loadFixtureGame())).toEqual([...LANGUAGES])
  })
})

test('a key no file has, and "constructor", give the key back', async () => {
  const content = await loadFixtureGame()
  const words = wordsOf(content, 'en')
  for (const key of ['no.such.key', 'constructor', 'toString', '__proto__', '']) expect(words(key)).toBe(key)
})

test('typed holds a key to the file it was given', () => {
  const say = typed(enFile, frameworkWords('en'))
  expect(say('automata.touch.label')).toBe('Touch controls')
  // @ts-expect-error a key the file does not have
  say('automata.touch.lable')
  expectTypeOf(say).parameter(0).toEqualTypeOf<keyof typeof enFile.messages & string>()
  expectTypeOf(frameworkWords('en')).toEqualTypeOf<Words>()
})

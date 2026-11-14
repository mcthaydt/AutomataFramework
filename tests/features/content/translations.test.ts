// "A check fails when a message is missing in any of the six languages": a check of its own, not part of loadGame, so a
// game with a missing word still loads and plays. Every sentence names the file, the key and what to write.
import { describe, expect, test } from 'vitest'
import { formatDiagnostic, type GameContent, loadGame, translationProblems } from '#src/features/content/content.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { type Words, wordsGame } from '../../fixtures/locale/content.ts'

const said = (content: GameContent): string[] => translationProblems(content).map(formatDiagnostic)
const sayWords = async (words: Words): Promise<string[]> => said(await wordsGame(words))

const en = { 'keeper.hello': 'Hello there!' }
const korean = '가'
const missingFile = (name: string, file: string): string =>
  `automata.toml: content: This game has no words in ${name}. Add content/messages/${file}.json with every word English has, and list it here.`

test('a game with no words has nothing to translate', async () =>
  expect(translationProblems(await loadFixtureGame())).toEqual([]))

test('the full game is translated in full', async () => {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  expect(said(loaded.value)).toEqual([])
})

test('English alone: five sentences, one for each language it lacks, in order', async () =>
  expect(await sayWords({ en })).toEqual([
    missingFile('Spanish', 'es'),
    missingFile('Korean', 'ko'),
    missingFile('Japanese', 'ja'),
    missingFile('Chinese', 'zh'),
    missingFile('Portuguese', 'pt'),
  ]))

describe('one language is missing words', () => {
  const others = { es: en, ja: en, zh: en, pt: en }
  test('a file lacks an English key', async () =>
    expect(await sayWords({ en, ko: { 'keeper.bye': 'x' }, ...others })).toEqual([
      'content/messages/ko.json: messages: This file has no "keeper.hello". English says "Hello there!". Write it in Korean.',
    ]))

  test('an English text longer than 60 characters is cut in the sentence', async () => {
    const long = 'a'.repeat(70)
    expect(await sayWords({ en: { 'keeper.hello': long }, ko: { 'keeper.bye': 'x' }, ...others })).toContain(
      `content/messages/ko.json: messages: This file has no "keeper.hello". English says "${'a'.repeat(60)}...". Write it in Korean.`,
    )
  })

  test('English asks for a value the text lacks', async () => {
    const wait = (text: string): Record<string, string> => ({ 'room.wait': text })
    expect(
      await sayWords({
        en: wait('Waiting for {count} more'),
        es: wait('Esperando a {count}'),
        ko: wait('기다리는 중'),
        ja: wait('{count}'),
        zh: wait('{count}'),
        pt: wait('{count}'),
      }),
    ).toEqual([
      'content/messages/ko.json: messages.room.wait: English has {count} in this text and this one does not. Put {count} where the number or name belongs.',
    ])
  })

  test('the text asks for a value English lacks', async () =>
    expect(
      await sayWords({
        en: { 'room.wait': 'Waiting' },
        ko: { 'room.wait': '{code} 기다리는 중' },
        es: { 'room.wait': 'Esperando' },
        ja: { 'room.wait': 'x' },
        zh: { 'room.wait': 'x' },
        pt: { 'room.wait': 'x' },
      }),
    ).toEqual([
      'content/messages/ko.json: messages.room.wait: This text has {code}, which English does not. Take it out, or fix its spelling.',
    ]))
})

describe('lengths and level names', () => {
  const all = (key: string, text: string, english = text): Words => ({
    en: { [key]: english },
    es: { [key]: text },
    ko: { [key]: text },
    ja: { [key]: text },
    zh: { [key]: text },
    pt: { [key]: text },
  })

  test('a level name of exactly 40 characters passes, and English is held to it too', async () => {
    expect(await sayWords(all('level.level-1.name', korean.repeat(40)))).toEqual([])
    expect(await sayWords(all('level.level-1.name', korean.repeat(40), 'e'.repeat(41)))).toEqual([
      "content/messages/en.json: messages.level.level-1.name: A level's name is at most 40 characters, so it fits on a save. This one has 41.",
    ])
  })

  test('a level name over 40 characters', async () =>
    expect(await sayWords(all('level.level-1.name', korean.repeat(52)))).toEqual(
      ['en', 'es', 'ko', 'ja', 'zh', 'pt'].map(
        (id) =>
          `content/messages/${id}.json: messages.level.level-1.name: A level's name is at most 40 characters, so it fits on a save. This one has 52.`,
      ),
    ))

  test('characters are counted, not code units: a 40-character name with an emoji passes', async () =>
    expect(await sayWords(all('level.level-1.name', `${'a'.repeat(39)}👋`))).toEqual([]))

  test("a button's words over 12 characters", async () => {
    const problems = await sayWords(all('controls.jump', 'x'.repeat(13)))
    expect(problems).toHaveLength(6)
    expect(problems[0]).toBe(
      "content/messages/en.json: messages.controls.jump: A button's words are at most 12 characters, so they fit on the button. This one has 13.",
    )
    expect(await sayWords(all('controls.jump', 'x'.repeat(12)))).toEqual([])
  })

  test('a level name for a level the game does not have', async () => {
    const problems = await sayWords(all('level.level-9.name', 'Nine'))
    expect(problems).toHaveLength(6)
    expect(problems[0]).toBe(
      'content/messages/en.json: messages.level.level-9.name: This game has no level called "level-9". Take this line out, or fix the level\'s name in the key.',
    )
  })
})

test('a key named "constructor" or "toString" is a key like any other', async () => {
  const words = { constructor: 'Hello' }
  expect(await sayWords({ en: words, es: words, ko: words, ja: words, zh: words, pt: words })).toEqual([])
  // English has `constructor` and Korean does not: the sentence is the ordinary one, not "every object has one".
  expect(await sayWords({ en: words, es: words, ko: { 'keeper.bye': 'x' }, ja: words, zh: words, pt: words })).toEqual([
    'content/messages/ko.json: messages: This file has no "constructor". English says "Hello". Write it in Korean.',
  ])
})

test('a thousand missing words are a thousand sentences, sorted', async () => {
  const many = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`word.${String(i).padStart(4, '0')}`, 'x']))
  const problems = translationProblems(await wordsGame({ en: many, ko: { 'word.0000': 'x' } }))
  const korean = problems.filter((d) => d.file === 'content/messages/ko.json')
  expect(korean).toHaveLength(999)
  expect(korean.map((d) => d.message)).toEqual([...korean.map((d) => d.message)].sort())
  expect(problems.filter((d) => d.file === 'automata.toml')).toHaveLength(4)
  expect(problems[0]?.file).toBe('automata.toml')
})

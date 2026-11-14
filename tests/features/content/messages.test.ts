import { expect, test } from 'vitest'
import {
  LANGUAGES,
  languageName,
  loadGame,
  parseContent,
  placeholdersOf,
  writeContent,
} from '#src/features/content/content.ts'
import { expectRoundTrip, gameProblems, problemsOf, readFiles } from '../../fixtures/content/kind.ts'
import { english, keeperTalk, storyGame } from '../../fixtures/content/story.ts'

const file = 'content/messages/en.json'
const said = (value: unknown): string[] => problemsOf('messages', value, file)

test('the six languages a game ships in', () =>
  expect(LANGUAGES).toEqual(['en', 'es', 'ko', 'ja', 'zh', 'pt']))

test('a messages file reads, and writes back to the same bytes twice', () =>
  expectRoundTrip('messages', english()))

test('messages are written in one order whatever order they were given in', () => {
  const forwards = writeContent('messages', { format: 1, id: 'en', messages: { a: 'A', b: 'B' } })
  const backwards = writeContent('messages', { format: 1, id: 'en', messages: { b: 'B', a: 'A' } })
  expect(backwards).toBe(forwards)
  expect(Object.keys(JSON.parse(backwards).messages)).toEqual(['a', 'b'])
})

test('a key named like something every object has is an ordinary key', () => {
  const text = writeContent('messages', {
    format: 1,
    id: 'en',
    messages: { constructor: 'one', 'to-string': 'two', 'value-of': 'three' },
  })
  const parsed = parseContent('messages', text, file)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return
  expect(Object.hasOwn(parsed.value.messages, 'constructor')).toBe(true)
  expect(Object.hasOwn(parsed.value.messages, 'to-string')).toBe(true)
  expect(Object.hasOwn(parsed.value.messages, 'toString')).toBe(false)
  expect(parsed.value.messages.constructor).toBe('one')
})

test('Korean, Japanese, Chinese and an emoji come back unchanged', () => {
  for (const [language, text] of [
    ['ko', '안녕하세요! 만나서 반가워요.'],
    ['ja', 'こんにちは！はじめまして。'],
    ['zh', '你好！很高兴认识你。'],
    ['pt', 'Olá! Tudo bem? 🌟'],
  ] as const) {
    const value = { format: 1 as const, id: language, messages: { 'keeper.hello': text } }
    const written = writeContent('messages', value)
    const parsed = parseContent('messages', written, `content/messages/${language}.json`)
    expect(parsed.ok && parsed.value.messages['keeper.hello'], language).toBe(text)
    expect(writeContent('messages', value), language).toBe(written)
  }
})

test('a language that is not one of the six', () =>
  expect(said({ ...english(), id: 'fr' })).toEqual([
    `${file}: id: This must be one of: en, es, ko, ja, zh, pt.`,
  ]))

test('a key that is not lower-case words, and a text that is empty', () => {
  expect(said({ ...english(), messages: { 'Bad Key': 'x' } })).toEqual([
    `${file}: messages.Bad Key: This name cannot be used. Use lower-case words joined by dots or dashes, like "keeper.hello".`,
  ])
  expect(said({ ...english(), messages: { 'keeper.hello': '' } })).toEqual([
    `${file}: messages.keeper.hello: This needs at least 1 character.`,
  ])
  expect(said({ ...english(), messages: { 'keeper.hello': 'x'.repeat(2001) } })).toEqual([
    `${file}: messages.keeper.hello: This has more than 2000 characters, which is the most allowed.`,
  ])
})

test('more than 5000 messages', () => {
  const messages = Object.fromEntries(Array.from({ length: 5001 }, (_, i) => [`key.${i.toString(36)}a`, 'x']))
  expect(said({ ...english(), messages })).toEqual([
    `${file}: messages: This has more than 5000 items, which is the most allowed.`,
  ])
})

test('a missing field says what to write', () =>
  expect(said({ format: 1, id: 'en' })).toEqual([
    `${file}: messages: This is missing. Write the words as keys and texts, like { "keeper.hello": "Hello!" }.`,
  ]))

test('an unknown key', () =>
  expect(said({ ...english(), mood: 1 })).toEqual([
    `${file}: mood: This is not something a messages file has. Remove it or check the spelling.`,
  ]))

const withLanguages = (...extra: { id: string; messages: Record<string, string> }[]) =>
  storyGame(
    [
      { type: 'messages', path: 'content/messages/en.json', text: writeContent('messages', english()) },
      ...extra.map((m) => ({
        type: 'messages' as const,
        path: `content/messages/${m.id}.json`,
        text: writeContent('messages', { format: 1, ...m } as never),
      })),
    ],
    {},
  )

test('a language that has a message English does not', async () =>
  expect(
    await gameProblems(
      withLanguages({ id: 'es', messages: { 'keeper.hello': 'Hola', 'keeper.helo': 'Hola' } }),
    ),
  ).toEqual([
    'content/messages/es.json: messages.keeper.helo: English has no message called "keeper.helo". Add it to the English file or fix the spelling.',
  ]))

test('a message missing from another language is not a problem: a game is playable while it is translated', async () =>
  expect(await gameProblems(withLanguages({ id: 'es', messages: { 'keeper.hello': 'Hola' } }))).toEqual([]))

test('messages with no English file say so, once', async () => {
  const files = storyGame(
    [
      {
        type: 'messages',
        path: 'content/messages/es.json',
        text: writeContent('messages', { format: 1, id: 'es', messages: { 'keeper.hello': 'Hola' } }),
      },
    ],
    {},
  )
  expect(await gameProblems(files)).toEqual([
    'automata.toml: content: A game with words needs them in English first. List a messages file called en.json.',
  ])
})

test('an English file that does not read is not checked against, and does not make every key look wrong', async () => {
  const files = withLanguages({ id: 'es', messages: { 'keeper.hello': 'Hola' } })
  files['content/messages/en.json'] = '{ "format": 1,'
  expect(await gameProblems(files)).toEqual([
    'content/messages/en.json: This file is not valid JSON. Check for a missing comma, quote or bracket.',
  ])
})

test('the file name has to be the language', async () => {
  const files = withLanguages()
  files['content/messages/en.json'] = writeContent('messages', { ...english(), id: 'es' })
  expect(await gameProblems(files)).toEqual([
    'content/messages/en.json: id: This must be "en", the same as the file name.',
  ])
})

test('a conversation line named like something every object has is reported when English has no such message', async () => {
  const talk = { ...keeperTalk(), nodes: [{ id: 'hello', lines: ['constructor'] }] }
  const files = storyGame(
    [
      { type: 'messages', path: 'content/messages/en.json', text: writeContent('messages', english()) },
      {
        type: 'conversation',
        path: 'content/conversations/keeper.json',
        text: writeContent('conversation', talk as never),
      },
    ],
    {},
  )
  expect(await gameProblems(files)).toEqual([
    'content/conversations/keeper.json: nodes[0].lines[0]: English has no message called "constructor". Add it to the English file or fix the spelling.',
  ])
  expect((await loadGame(readFiles(files))).ok).toBe(false)
})

test('the names in a text, each once, in order', () =>
  expect(placeholdersOf('Waiting for {count} more. Code: {code}. {count}!')).toEqual(['count', 'code']))

test('what is not a name is not one', () => {
  for (const text of [
    '{}',
    '{ count }',
    '{Count}',
    '{1st}',
    '{count',
    'count}',
    '{a-b}',
    `{${'a'.repeat(33)}}`,
  ])
    expect(placeholdersOf(text), text).toEqual([])
  expect(placeholdersOf(`{${'a'.repeat(32)}}`)).toEqual(['a'.repeat(32)])
})

test('a text of 2000 braces is read without trouble', () => {
  expect(placeholdersOf('{'.repeat(2000))).toEqual([])
  expect(placeholdersOf(`${'{'.repeat(2000)}x`)).toEqual([])
  expect(placeholdersOf(`${'{'.repeat(2000)}x}`)).toEqual(['x'])
})

test('each language has an English name', () =>
  expect(LANGUAGES.map(languageName)).toEqual([
    'English',
    'Spanish',
    'Korean',
    'Japanese',
    'Chinese',
    'Portuguese',
  ]))

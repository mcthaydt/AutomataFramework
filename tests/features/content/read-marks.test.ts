// "Marked for a native speaker's read before Release 1": a mark is the hash of what was read, so a word changed
// afterwards is unread again with nobody remembering to say so.
import { describe, expect, test } from 'vitest'
import {
  formatDiagnostic,
  type GameContent,
  loadGame,
  markRead,
  parseReadMarks,
  READ_MARKS_FILE,
  type ReadMarks,
  readMark,
  unreadWords,
  writeReadMarks,
} from '#src/features/content/content.ts'
import { fullGameFiles, fullGameMarks, readFullGame } from '../../fixtures/full-game/read.ts'

async function full(overrides: Record<string, string | undefined> = {}): Promise<GameContent> {
  const loaded = await loadGame(readFullGame(overrides))
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

const unreadCount = (content: GameContent, marks: ReadMarks, language: string): number =>
  unreadWords(content, marks).filter((word) => word.language === language).length

test('the marks file is named, and the full game ships one that marks nothing', () => {
  expect(READ_MARKS_FILE).toBe('automata.translations.toml')
  const parsed = parseReadMarks(fullGameMarks)
  expect(parsed).toEqual({ ok: true, value: {} })
})

test('with no marks, every translated word waits for a read, and English never does', async () => {
  const unread = unreadWords(await full(), {})
  // Five languages, nine words each: the keeper's five, the level's name and three buttons.
  expect(unread).toHaveLength(45)
  expect(unread.some((word) => word.language === 'en')).toBe(false)
  expect(unread.slice(0, 9).map((word) => word.language)).toEqual(Array(9).fill('es'))
  const keys = unread.slice(0, 9).map((word) => word.key)
  expect(keys).toEqual([...keys].sort())
})

test('marking a language reads all of it, and only it', async () => {
  const content = await full()
  const marks = markRead(content, {}, 'ko')
  expect(unreadCount(content, marks, 'ko')).toBe(0)
  expect(unreadWords(content, marks)).toHaveLength(36)
  expect(Object.keys(marks)).toEqual(['ko'])
})

test('marking some keys reads those and no others', async () => {
  const content = await full()
  const marks = markRead(content, {}, 'es', ['keeper.hello', 'keeper.bye'])
  expect(unreadCount(content, marks, 'es')).toBe(7)
})

describe('a mark is of what was read', () => {
  const changeKo = (key: string, text: string): Record<string, string> => {
    const file = JSON.parse(fullGameFiles['content/messages/ko.json'] ?? '') as {
      messages: Record<string, string>
    }
    file.messages[key] = text
    return { 'content/messages/ko.json': JSON.stringify(file) }
  }

  test('a word changed after its read waits again', async () => {
    const marks = markRead(await full(), {}, 'ko')
    const changed = await full(changeKo('keeper.hello', '안녕하세요, 손님!'))
    expect(unreadWords(changed, marks)).toEqual([{ language: 'ko', key: 'keeper.hello' }])
  })

  test('so does a word whose English changed', async () => {
    const marks = markRead(await full(), {}, 'es')
    const file = JSON.parse(fullGameFiles['content/messages/en.json'] ?? '') as {
      messages: Record<string, string>
    }
    file.messages['keeper.tip'] = 'Push the crate up the ledge.'
    const changed = await full({ 'content/messages/en.json': JSON.stringify(file) })
    // Marked es: only es is read, so the other four languages wait for every word and es waits for the changed one.
    expect(unreadWords(changed, marks).filter((word) => word.language === 'es')).toEqual([
      { language: 'es', key: 'keeper.tip' },
    ])
    expect(unreadCount(changed, marks, 'ko')).toBe(9)
  })

  test('a mark is 16 hex digits of the two texts, and either changing changes it', () => {
    const mark = readMark('Hello', 'Hola')
    expect(mark).toMatch(/^[0-9a-f]{16}$/)
    expect(readMark('Hello', 'Hola')).toBe(mark)
    expect(readMark('Hello!', 'Hola')).not.toBe(mark)
    expect(readMark('Hello', 'Hola!')).not.toBe(mark)
    // The two texts are kept apart: moving a character from one to the other is a different pair.
    expect(readMark('ab', 'c')).not.toBe(readMark('a', 'bc'))
  })
})

test('a mark for a word the game no longer has is dropped when its language is marked', async () => {
  const stale: ReadMarks = { es: { 'gone.key': '0123456789abcdef' }, ko: { 'gone.key': '0123456789abcdef' } }
  const marks = markRead(await full(), stale, 'es')
  expect(Object.hasOwn(marks.es ?? {}, 'gone.key')).toBe(false)
  expect(Object.hasOwn(marks.ko ?? {}, 'gone.key')).toBe(true)
})

describe('the file', () => {
  const one: ReadMarks = { es: { 'keeper.hello': '5d3f9a1c2b4e6f70' } }

  test('is written the same whatever order the marks were made in, and reads back the same', () => {
    const text = writeReadMarks(one)
    expect(text).toBe('format = 1\n\n[read.es]\n"keeper.hello" = "5d3f9a1c2b4e6f70"\n')
    const backwards: ReadMarks = {
      pt: { b: '0000000000000002', a: '0000000000000001' },
      es: { 'keeper.hello': '5d3f9a1c2b4e6f70' },
    }
    expect(writeReadMarks(backwards)).toBe(
      'format = 1\n\n[read.es]\n"keeper.hello" = "5d3f9a1c2b4e6f70"\n\n[read.pt]\n"a" = "0000000000000001"\n"b" = "0000000000000002"\n',
    )
    expect(parseReadMarks(writeReadMarks(backwards))).toEqual({ ok: true, value: backwards })
  })

  test('with no marks is the format line and a newline, and a language with none has no table', () => {
    expect(writeReadMarks({})).toBe('format = 1\n')
    expect(writeReadMarks({ ko: {} })).toBe('format = 1\n')
  })

  test('an empty file, and one with only format = 1, both mean nothing is read', () => {
    expect(parseReadMarks('format = 1\n')).toEqual({ ok: true, value: {} })
    expect(parseReadMarks('format = 1\n\n[read]\n')).toEqual({ ok: true, value: {} })
  })

  const problems = (text: string): string[] => {
    const parsed = parseReadMarks(text)
    return parsed.ok ? [] : parsed.diagnostics.map(formatDiagnostic)
  }

  test('says plainly when it is not TOML, has no format, or has a mark that is not 16 hex digits', () => {
    expect(problems('format = ')[0]).toMatch(/^automata\.translations\.toml: This file is not valid TOML\. /)
    expect(problems('')).toEqual(['automata.translations.toml: format: This is missing. Write format = 1.'])
    expect(problems('format = 1\n[read.es]\n"keeper.hello" = "nope"')).toEqual([
      'automata.translations.toml: read.es.keeper.hello: A mark is 16 letters and digits, written by the tool. Take this line out.',
    ])
  })

  test('refuses a [read.en] or [read.fr] table in words', () => {
    expect(problems('format = 1\n[read.fr]\n"a" = "0123456789abcdef"')).toEqual([
      'automata.translations.toml: read.fr: This is not a language a game has words in. Use es, ko, ja, zh or pt.',
    ])
    expect(problems('format = 1\n[read.en]\n"a" = "0123456789abcdef"')).toEqual([
      'automata.translations.toml: read.en: This is not a language a game has words in. Use es, ko, ja, zh or pt.',
    ])
  })

  test('a key named "constructor" is an ordinary key', () => {
    const marks: ReadMarks = { es: { constructor: '0123456789abcdef' } }
    const parsed = parseReadMarks(writeReadMarks(marks))
    expect(parsed.ok && Object.hasOwn(parsed.value.es ?? {}, 'constructor')).toBe(true)
  })
})

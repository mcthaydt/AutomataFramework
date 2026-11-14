// "Marked for a native speaker's read before Release 1": a mark is the hash of what was read, so a word changed
// afterwards is unread again with nobody remembering to say so. Marks are made against the language the game's own
// words are written in (`source`), so a game written in Korean has marks of Korean and each other language.
import { describe, expect, test } from 'vitest'
import {
  emptyReadMarks,
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
import { withSource } from '../../fixtures/content/kind.ts'
import { fullGameFiles, fullGameMarks, readFullGame } from '../../fixtures/full-game/read.ts'

async function full(overrides: Record<string, string | undefined> = {}): Promise<GameContent> {
  const loaded = await loadGame(readFullGame(overrides))
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

/** The full game written in Korean: its project file names `ko` as its own language. */
const korean = (): Promise<GameContent> =>
  full({ 'automata.toml': withSource(fullGameFiles['automata.toml'] ?? '', 'ko') })

const unreadCount = (content: GameContent, marks: ReadMarks | undefined, language: string): number =>
  unreadWords(content, marks).filter((word) => word.language === language).length

const none = (source: 'en' | 'ko'): ReadMarks => emptyReadMarks(source)

/** The game with no messages file in `language`. */
function without(content: GameContent, language: string): GameContent {
  const kept = Object.entries(content.messages ?? {}).filter(([name]) => name !== language)
  return { ...content, messages: Object.fromEntries(kept) }
}

/** The game with no words at all. */
function wordless(content: GameContent): GameContent {
  const { messages: _messages, ...rest } = content
  return rest
}

test('the marks file is named, and the full game ships one that marks nothing', () => {
  expect(READ_MARKS_FILE).toBe('automata.translations.toml')
  const parsed = parseReadMarks(fullGameMarks)
  expect(parsed).toEqual({ ok: true, value: { source: 'en', read: {} } })
})

test('with no marks, every translated word waits for a read, and the game own language never does', async () => {
  const unread = unreadWords(await full(), undefined)
  // Five languages, nine words each: the keeper's five, the level's name and three buttons.
  expect(unread).toHaveLength(45)
  expect(unread.some((word) => word.language === 'en')).toBe(false)
  expect(unread.slice(0, 9).map((word) => word.language)).toEqual(Array(9).fill('zh'))
  const keys = unread.slice(0, 9).map((word) => word.key)
  expect(keys).toEqual([...keys].sort())
})

test('a game written in Korean asks for a read of every language but Korean', async () => {
  const unread = unreadWords(await korean(), undefined)
  expect(unread).toHaveLength(45)
  expect(unread.some((word) => word.language === 'ko')).toBe(false)
  expect(unread.some((word) => word.language === 'en')).toBe(true)
})

test('a game with no words has nothing to read', async () => {
  expect(unreadWords(wordless(await full()), undefined)).toEqual([])
})

test('marking a language reads all of it, and only it', async () => {
  const content = await full()
  const marks = markRead(content, none('en'), 'ko')
  expect(unreadCount(content, marks, 'ko')).toBe(0)
  expect(unreadWords(content, marks)).toHaveLength(36)
  expect(Object.keys(marks.read)).toEqual(['ko'])
})

test('marking some keys reads those and no others', async () => {
  const content = await full()
  const marks = markRead(content, none('en'), 'es', ['keeper.hello', 'keeper.bye'])
  expect(unreadCount(content, marks, 'es')).toBe(7)
})

test('with no marks at all, a language is marked from nothing', async () => {
  const content = await full()
  const marks = markRead(content, undefined, 'pt')
  expect(marks.source).toBe('en')
  expect(unreadCount(content, marks, 'pt')).toBe(0)
})

test("the game's own language is not read against anything", async () => {
  const content = await korean()
  expect(() => markRead(content, none('ko'), 'ko')).toThrow(RangeError)
  expect(() => markRead(content, none('ko'), 'ko')).toThrow(
    'This game is written in Korean, so Korean is not read against anything.',
  )
})

test('a language the game has no words in is not marked', async () => {
  const content = await full()
  expect(() => markRead(without(content, 'ko'), none('en'), 'ko')).toThrow(RangeError)
  expect(() => markRead(wordless(content), none('en'), 'es')).toThrow(RangeError)
})

describe('marks made against another language are not trusted', () => {
  test('every word waits again, even when every mark is there', async () => {
    const english = await full()
    const marks = markRead(english, none('en'), 'es')
    expect(unreadCount(english, marks, 'es')).toBe(0)
    const stale: ReadMarks = { ...marks, source: 'ko' }
    expect(unreadCount(english, stale, 'es')).toBe(9)
    expect(unreadWords(english, stale)).toHaveLength(45)
  })

  test('marking one starts again from nothing, with the game own language', async () => {
    const content = await korean()
    const against = markRead(await full(), none('en'), 'es')
    const marks = markRead(content, against, 'pt')
    expect(marks.source).toBe('ko')
    expect(Object.keys(marks.read)).toEqual(['pt'])
  })
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
    const marks = markRead(await full(), none('en'), 'ko')
    const changed = await full(changeKo('keeper.hello', '안녕하세요, 손님!'))
    expect(unreadWords(changed, marks).filter((word) => word.language === 'ko')).toEqual([
      { language: 'ko', key: 'keeper.hello' },
    ])
  })

  test('so does a word whose own-language text changed', async () => {
    const marks = markRead(await full(), none('en'), 'es')
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
  const stale: ReadMarks = {
    source: 'en',
    read: { es: { 'gone.key': '0123456789abcdef' }, ko: { 'gone.key': '0123456789abcdef' } },
  }
  const marks = markRead(await full(), stale, 'es')
  expect(Object.hasOwn(marks.read.es ?? {}, 'gone.key')).toBe(false)
  expect(Object.hasOwn(marks.read.ko ?? {}, 'gone.key')).toBe(true)
})

test('a table for a language the game has since dropped is kept, and never asked for', async () => {
  const content = await full()
  const fewer = without(content, 'ja')
  const old: ReadMarks = { source: 'en', read: { ja: { 'keeper.hello': '0123456789abcdef' } } }
  const marks = markRead(fewer, old, 'es')
  expect(Object.hasOwn(marks.read, 'ja')).toBe(true)
  expect(unreadWords(fewer, marks).some((word) => word.language === 'ja')).toBe(false)
})

describe('the file', () => {
  const one: ReadMarks = { source: 'en', read: { es: { 'keeper.hello': '5d3f9a1c2b4e6f70' } } }

  test('format 2 is written and read back byte for byte', () => {
    const text = 'format = 2\nsource = "ko"\n\n[read.es]\n"keeper.hello" = "3f0c9a1e5b7d2c44"\n'
    const parsed = parseReadMarks(text)
    expect(parsed).toEqual({
      ok: true,
      value: { source: 'ko', read: { es: { 'keeper.hello': '3f0c9a1e5b7d2c44' } } },
    })
    if (parsed.ok) expect(writeReadMarks(parsed.value)).toBe(text)
  })

  test('a format 1 file is read as made against English, and written back as format 2', () => {
    const parsed = parseReadMarks('format = 1\n\n[read.es]\n"keeper.hello" = "3f0c9a1e5b7d2c44"\n')
    expect(parsed.ok && parsed.value.source).toBe('en')
    if (parsed.ok) expect(writeReadMarks(parsed.value).startsWith('format = 2\nsource = "en"\n')).toBe(true)
  })

  test('an empty marks file is two lines', () => {
    expect(writeReadMarks(emptyReadMarks('ko'))).toBe('format = 2\nsource = "ko"\n')
  })

  test('is written the same whatever order the marks were made in, and reads back the same', () => {
    const text = writeReadMarks(one)
    expect(text).toBe('format = 2\nsource = "en"\n\n[read.es]\n"keeper.hello" = "5d3f9a1c2b4e6f70"\n')
    const backwards: ReadMarks = {
      source: 'en',
      read: {
        pt: { b: '0000000000000002', a: '0000000000000001' },
        es: { 'keeper.hello': '5d3f9a1c2b4e6f70' },
      },
    }
    // Tables go in `LANGUAGES` order (zh, es, en, pt, ja, ko), so es comes before pt, and keys are sorted.
    expect(writeReadMarks(backwards)).toBe(
      'format = 2\nsource = "en"\n\n[read.es]\n"keeper.hello" = "5d3f9a1c2b4e6f70"\n\n[read.pt]\n"a" = "0000000000000001"\n"b" = "0000000000000002"\n',
    )
    expect(parseReadMarks(writeReadMarks(backwards))).toEqual({ ok: true, value: backwards })
  })

  test('a language with no marks has no table', () => {
    expect(writeReadMarks({ source: 'en', read: { ko: {} } })).toBe('format = 2\nsource = "en"\n')
  })

  test('an empty file, and one with only a format line, both mean nothing is read', () => {
    const nothing = { ok: true, value: { source: 'en', read: {} } }
    expect(parseReadMarks('format = 1\n')).toEqual(nothing)
    expect(parseReadMarks('format = 1\n\n[read]\n')).toEqual(nothing)
    expect(parseReadMarks('format = 2\nsource = "pt"\n')).toEqual({
      ok: true,
      value: { source: 'pt', read: {} },
    })
  })

  const problems = (text: string): string[] => {
    const parsed = parseReadMarks(text)
    return parsed.ok ? [] : parsed.diagnostics.map(formatDiagnostic)
  }

  test('says plainly when it is not TOML, has no format, or has a mark that is not 16 hex digits', () => {
    expect(problems('format = ')[0]).toMatch(/^automata\.translations\.toml: This file is not valid TOML\. /)
    expect(problems('')).toEqual(['automata.translations.toml: format: This is missing. Write format = 2.'])
    expect(problems('format = 1\n[read.es]\n"keeper.hello" = "nope"')).toEqual([
      'automata.translations.toml: read.es.keeper.hello: A mark is 16 letters and digits, written by the tool. Take this line out.',
    ])
  })

  test('format 2 with no source is refused, and so is a source in format 1', () => {
    expect(problems('format = 2\n')).toEqual([
      'automata.translations.toml: source: Write the language the marks were made against, like source = "es".',
    ])
    expect(problems('format = 1\nsource = "ko"\n')).toEqual([
      'automata.translations.toml: source: Format 1 has no source line. Write format = 2, or take this line out.',
    ])
  })

  test('a source that is not one of the six is refused', () => {
    expect(problems('format = 2\nsource = "fr"\n')).toEqual([
      'automata.translations.toml: source: Write one of zh, es, en, pt, ja or ko, like source = "es".',
    ])
  })

  test('a table for the language the marks were made against is refused', () => {
    expect(problems('format = 2\nsource = "ko"\n[read.ko]\n"a" = "0123456789abcdef"')).toEqual([
      'automata.translations.toml: read.ko: These marks were made against Korean, so Korean has none of its own. Take this table out.',
    ])
    expect(problems('format = 1\n[read.en]\n"a" = "0123456789abcdef"')).toEqual([
      'automata.translations.toml: read.en: These marks were made against English, so English has none of its own. Take this table out.',
    ])
  })

  test('a table for a language that is not one of the six is refused', () => {
    expect(problems('format = 2\nsource = "en"\n[read.fr]\n"a" = "0123456789abcdef"')).toEqual([
      'automata.translations.toml: read.fr: This is not a language a game has words in. Use zh, es, en, pt, ja or ko.',
    ])
  })

  test('a key named "constructor" is an ordinary key', () => {
    const marks: ReadMarks = { source: 'en', read: { es: { constructor: '0123456789abcdef' } } }
    const parsed = parseReadMarks(writeReadMarks(marks))
    expect(parsed.ok && Object.hasOwn(parsed.value.read.es ?? {}, 'constructor')).toBe(true)
  })
})

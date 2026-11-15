// The framework's own sentences: six files, written the way `writeContent` writes them, complete in every language,
// and plain enough to read aloud.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  LANGUAGES,
  type Language,
  parseContent,
  parseReadMarks,
  translationProblems,
  unreadWords,
  writeContent,
} from '#src/features/content/content.ts'
import marksRaw from '#src/features/locale/library/automata.translations.toml?raw'
import enRaw from '#src/features/locale/library/en.json?raw'
import esRaw from '#src/features/locale/library/es.json?raw'
import jaRaw from '#src/features/locale/library/ja.json?raw'
import koRaw from '#src/features/locale/library/ko.json?raw'
import ptRaw from '#src/features/locale/library/pt.json?raw'
import zhRaw from '#src/features/locale/library/zh.json?raw'
import { wordsGame } from '../../fixtures/locale/content.ts'

const RAW: Readonly<Record<Language, string>> = {
  en: enRaw,
  es: esRaw,
  ko: koRaw,
  ja: jaRaw,
  zh: zhRaw,
  pt: ptRaw,
}
const wordsIn = (language: Language): Record<string, string> =>
  (JSON.parse(RAW[language]) as { messages: Record<string, string> }).messages

describe.each(LANGUAGES)('the %s file', (language) => {
  const path = `src/features/locale/library/${language}.json`

  test('is a messages file, in the bytes writeContent gives', () => {
    const parsed = parseContent('messages', RAW[language], path)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.id).toBe(language)
    expect(writeContent('messages', parsed.value)).toBe(RAW[language])
  })
})

/** A game with the six library files as its words. */
const everyLanguage = (): ReturnType<typeof wordsGame> =>
  wordsGame(
    {
      en: wordsIn('en'),
      es: wordsIn('es'),
      ko: wordsIn('ko'),
      ja: wordsIn('ja'),
      zh: wordsIn('zh'),
      pt: wordsIn('pt'),
    },
    'en',
  )

test('the six files are translated in full', async () => {
  expect(translationProblems(await everyLanguage())).toEqual([])
})

test("every file has every key the others have, none is 'the first', and the picker's two words are among them", () => {
  const keys = (language: Language): string[] => Object.keys(wordsIn(language)).sort()
  for (const a of LANGUAGES) {
    expect(keys(a), a).toEqual(expect.arrayContaining(['automata.picker.go', 'automata.picker.title']))
    for (const b of LANGUAGES) expect(keys(a), `${a} against ${b}`).toEqual(keys(b))
  }
})

test('the picker names its own language in that language, so each flag reads its own title', () => {
  expect(LANGUAGES.map((language) => wordsIn(language)['automata.picker.title'])).toEqual([
    '用中文玩',
    'Jugar en español',
    'Play in English',
    'Jogar em português',
    '日本語でプレイ',
    '한국어로 플레이',
  ])
  expect(LANGUAGES.map((language) => wordsIn(language)['automata.picker.go'])).toEqual([
    '开始',
    'Vamos',
    'Go',
    'Vamos',
    'スタート',
    '시작',
  ])
})

// A key on a keyboard is a word a player knows ("Pick another key"); the key of a message is not, and is said as
// "a word's name" if ever. So "key" is not banned here, and "message key", "translation" and "fallback" are.
test('no sentence names a colour or says locale, message key, translation, fallback, socket or tick', () => {
  const banned =
    /\b(red|green|blue|yellow|orange|purple|pink|black|white|gr[ae]y|colou?rs?|locale|message keys?|translations?|fallback|socket|ticks?)\b/i
  for (const [key, text] of Object.entries(wordsIn('en'))) expect(text, key).not.toMatch(banned)
})

test('the marks file is format 2 and says it was made against English, the language the words are written in', () => {
  expect(marksRaw).toBe('format = 2\nsource = "en"\n')
})

test("how many of the framework's words wait for a native read is printed, and never fails", async () => {
  const marks = parseReadMarks(marksRaw)
  expect(marks.ok).toBe(true)
  if (!marks.ok) return
  const waiting = unreadWords(await everyLanguage(), marks.value).length
  const total = (LANGUAGES.length - 1) * Object.keys(wordsIn('en')).length
  console.log(`native read: ${waiting} of ${total} framework words wait`)
  // With an empty marks file, every translated word waits and English never does.
  expect(waiting).toBe(total)
})

/** Every `.ts` file under `dir`. */
function sourcesIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourcesIn(path)
    return entry.name.endsWith('.ts') ? [path] : []
  })
}

/**
 * A quoted `automata.<part>.…`: a whole key, or the start of one when what follows is a `${` (a key built from a
 * variable). `automata.back` and `automata.keep` are the two keys with no second part, shared by the screens.
 */
const KEY = /(['"`])(automata\.(?:back|keep|[a-z][a-z0-9-]*\.[a-z0-9.-]*?))(\$\{|\1)/g

/** The words plan Q adds (Task 5): in all six files, said the same way in each. Never shortened. */
const PLAN_Q_WORDS: readonly string[] = [
  'automata.lost.title',
  'automata.lost.again',
  'automata.pause.again',
  'automata.pause.again-ask',
  'automata.menu.how',
  'automata.how.walk',
  'automata.how.jump',
  'automata.how.double-jump',
  'automata.how.wall-jump',
  'automata.how.dash',
  'automata.how.slide-left',
  'automata.how.slide-right',
  'automata.how.tap-left',
  'automata.how.tap-right',
  'automata.how.dash-button',
  'automata.hud.score',
  'automata.hud.best',
  'automata.loading.slow',
  'automata.settings.delete',
  'automata.settings.delete-ask',
  'automata.settings.delete-yes',
  'automata.settings.delete-no',
]

/**
 * The words of `PLAN_Q_WORDS` no code asks for yet. Each of plan Q's tasks 6 to 11 takes its own keys off this list in
 * the commit that first writes them; Task 13 asserts it is empty. A key on it that code already asks for fails the
 * second test below, so the list cannot go stale.
 */
const OWED: string[] = [
  'automata.menu.how',
  'automata.how.walk',
  'automata.how.jump',
  'automata.how.double-jump',
  'automata.how.wall-jump',
  'automata.how.dash',
  'automata.how.slide-left',
  'automata.how.slide-right',
  'automata.how.tap-left',
  'automata.how.tap-right',
  'automata.how.dash-button',
  'automata.loading.slow',
  'automata.settings.delete',
  'automata.settings.delete-ask',
  'automata.settings.delete-yes',
  'automata.settings.delete-no',
]

test("plan Q's words are in all six files, none empty, none its own key, and each keeps its {placeholders}", () => {
  const holes = (text: string): string[] => [...text.matchAll(/\{[a-z]+\}/g)].map((m) => m[0]).sort()
  for (const key of PLAN_Q_WORDS) {
    const english = wordsIn('en')[key]
    expect(english, `${key} is not in en.json`).toBeDefined()
    for (const language of LANGUAGES) {
      const text = wordsIn(language)[key]
      expect(text, `${key} in ${language}`).toBeDefined()
      expect((text ?? '').trim(), `${key} in ${language} is empty`).not.toBe('')
      expect(text, `${key} in ${language} is its own key`).not.toBe(key)
      expect(holes(text ?? ''), `${key} in ${language}`).toEqual(holes(english ?? ''))
    }
  }
})

test('every automata.* key written in src/ is in en.json, and every key of en.json is written in src/', () => {
  const written = new Set<string>()
  const stems = new Set<string>()
  for (const file of sourcesIn(join(import.meta.dirname, '../../../src')))
    for (const match of readFileSync(file, 'utf8').matchAll(KEY)) {
      const key = match[2] as string
      // A file's name is not a key: `automata.translations.toml`.
      if (/\.(toml|json)$/.test(key)) continue
      // Ended by its own quote: a whole key. Ended by a `${`: the start of one.
      ;(match[3] === match[1] ? written : stems).add(key)
    }
  const keys = Object.keys(wordsIn('en'))
  for (const key of written) expect(keys, `${key} is written in src/ but not in en.json`).toContain(key)
  for (const key of keys) {
    const used = written.has(key) || [...stems].some((stem) => key.startsWith(stem))
    expect(used || OWED.includes(key), `${key} is in en.json but no code asks for it`).toBe(true)
    // An owed word that code now asks for is taken off the list, so the list only ever holds what is still owed.
    if (OWED.includes(key)) expect(used, `${key} is used now: take it off OWED`).toBe(false)
  }
})

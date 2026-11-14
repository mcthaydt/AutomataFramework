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
  wordsGame({
    en: wordsIn('en'),
    es: wordsIn('es'),
    ko: wordsIn('ko'),
    ja: wordsIn('ja'),
    zh: wordsIn('zh'),
    pt: wordsIn('pt'),
  })

test('the six files are translated in full', async () => {
  expect(translationProblems(await everyLanguage())).toEqual([])
})

test('no sentence names a colour or says locale, key, fallback, socket or tick', () => {
  const banned =
    /\b(red|green|blue|yellow|orange|purple|pink|black|white|gr[ae]y|colou?rs?|locale|key|fallback|socket|ticks?)\b/i
  for (const [key, text] of Object.entries(wordsIn('en'))) expect(text, key).not.toMatch(banned)
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

/** A quoted `automata.<part>.…`: a whole key, or the start of one when what follows is a `${` (a key built from a variable). */
const KEY = /(['"`])(automata\.[a-z][a-z0-9-]*\.[a-z0-9.-]*?)(\$\{|\1)/g

test('every automata.* key written in src/ is in en.json, and every key of en.json is written in src/', () => {
  const written = new Set<string>()
  const stems = new Set<string>()
  for (const file of sourcesIn(join(import.meta.dirname, '../../../src')))
    for (const match of readFileSync(file, 'utf8').matchAll(KEY)) {
      const key = match[2] as string
      // A file's name is not a key: `automata.translations.toml`.
      if (/\.(toml|json)$/.test(key)) continue
      ;(match[3] === '$' + '{' ? stems : written).add(key)
    }
  const keys = Object.keys(wordsIn('en'))
  for (const key of written) expect(keys, `${key} is written in src/ but not in en.json`).toContain(key)
  for (const key of keys) {
    const used = written.has(key) || [...stems].some((stem) => key.startsWith(stem))
    expect(used, `${key} is in en.json but no code asks for it`).toBe(true)
  }
})

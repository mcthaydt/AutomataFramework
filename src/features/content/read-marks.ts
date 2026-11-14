import { parse as parseToml } from 'smol-toml'
import { canonicalJson, utf8 } from '../../lib/canonical.ts'
import { hex64, xxhash64 } from '../../lib/xxhash64.ts'
import { z } from '../../lib/zod.ts'
import type { Diagnostic, Voice } from './diagnostics.ts'
import type { GameContent } from './load.ts'
import { LANGUAGES, type Language, languageCodes, languageName } from './messages.ts'
import { checkData, type Parsed, withoutMark } from './parse.ts'
import { MessageKey } from './shared.ts'

/** The marks file's name, at the top of a game: which translated words a native speaker has read. */
export const READ_MARKS_FILE = 'automata.translations.toml'

/** Format 1 had no `source` line: every such file was made against English. */
const FORMAT_1_SOURCE: Language = 'en'

/**
 * The marks of a game's translated words. They were made against the language the game's own words are written in
 * (`source`), so the same file means nothing for a game written in another language.
 */
export interface ReadMarks {
  /** The language the marks were made against. */
  readonly source: Language
  /** For each other language, each read key and the mark of the two texts that were read. */
  readonly read: Readonly<Partial<Record<Language, Readonly<Record<string, string>>>>>
}

/** Marks with nothing read, made against `source`. */
export function emptyReadMarks(source: Language): ReadMarks {
  return { source, read: {} }
}

const MARK_HINT = 'A mark is 16 letters and digits, written by the tool. Take this line out.'
const LANGUAGE_HINT = `This is not a language a game has words in. Use ${languageCodes}.`
const SOURCE_HINT = `Write one of ${languageCodes}, like source = "es".`

const Mark = z.string().regex(/^[0-9a-f]{16}$/, MARK_HINT)

const isLanguage = (value: unknown): value is Language => LANGUAGES.some((language) => language === value)

const ReadMarksFileSchema = z
  .strictObject({
    format: z.literal([1, 2]).describe('The version of this file format. Write 2.'),
    source: z.custom<Language>(isLanguage, SOURCE_HINT).optional(),
    read: z.record(z.string(), z.record(MessageKey, Mark)).optional(),
  })
  .superRefine((file, ctx) => {
    if (file.format === 2 && file.source === undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['source'],
        message: 'Write the language the marks were made against, like source = "es".',
      })
    if (file.format === 1 && file.source !== undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['source'],
        message: 'Format 1 has no source line. Write format = 2, or take this line out.',
      })
    const source = file.source ?? FORMAT_1_SOURCE
    for (const language of Object.keys(file.read ?? {})) {
      if (!isLanguage(language))
        ctx.addIssue({ code: 'custom', path: ['read', language], message: LANGUAGE_HINT })
      else if (language === source)
        ctx.addIssue({
          code: 'custom',
          path: ['read', language],
          message: `These marks were made against ${languageName(source)}, so ${languageName(source)} has none of its own. Take this table out.`,
        })
    }
  })

/** What the file holds as the schema reads it. */
interface MarksFile {
  format: 1 | 2
  source?: Language
  read?: Record<string, Record<string, string>>
}

const VOICE: Voice = { noun: 'marks file', missing: { format: 'Write format = 2.' } }

/** Reads the text of `automata.translations.toml`. Never throws; every problem names the file. */
export function parseReadMarks(text: string): Parsed<ReadMarks> {
  let data: unknown
  try {
    data = parseToml(withoutMark(text))
  } catch (error) {
    const first = (error instanceof Error ? error.message : String(error)).split('\n')[0]?.trim()
    const problem: Diagnostic = {
      file: READ_MARKS_FILE,
      path: '',
      message: `This file is not valid TOML. ${first || 'Check for a missing quote or bracket.'}`,
    }
    return { ok: false, diagnostics: [problem] }
  }
  const checked = checkData<MarksFile>(ReadMarksFileSchema, data, READ_MARKS_FILE, VOICE)
  if (!checked.ok) return checked
  const read: Partial<Record<Language, Record<string, string>>> = {}
  for (const language of LANGUAGES) {
    const table = checked.value.read === undefined ? undefined : checked.value.read[language]
    if (table !== undefined && Object.keys(table).length > 0) read[language] = { ...table }
  }
  return { ok: true, value: { source: checked.value.source ?? FORMAT_1_SOURCE, read } }
}

/**
 * The text of a marks file: `format = 2`, the `source`, then one `[read.<language>]` table for each language that has
 * marks, in `LANGUAGES` order, its keys sorted, one `"<key>" = "<mark>"` per line. The same marks are always the same
 * bytes, and a file made in format 1 is written back as format 2.
 */
export function writeReadMarks(marks: ReadMarks): string {
  let text = `format = 2\nsource = ${JSON.stringify(marks.source)}\n`
  for (const language of LANGUAGES) {
    const table = language === marks.source ? undefined : marks.read[language]
    if (table === undefined) continue
    const keys = Object.keys(table).sort()
    if (keys.length === 0) continue
    text += `\n[read.${language}]\n`
    for (const key of keys) text += `${JSON.stringify(key)} = ${JSON.stringify(table[key])}\n`
  }
  return text
}

/**
 * The mark of one word as it is now: 16 hex digits from the English text and the translated one, so a word changed
 * after its read (in either language) has a different mark and is unread again with nobody saying so.
 */
export function readMark(english: string, translated: string): string {
  return hex64(xxhash64(utf8(canonicalJson([english, translated]))))
}

/** The words a native speaker is asked to read: `language`'s texts the game's own file (`source`) also has, by key. */
function wordsOf(
  content: GameContent,
  source: Language,
  language: Language,
): readonly { key: string; mark: string }[] {
  const files = content.messages
  const own = files !== undefined && Object.hasOwn(files, source) ? files[source] : undefined
  const file = files !== undefined && Object.hasOwn(files, language) ? files[language] : undefined
  if (own === undefined || file === undefined) return []
  return Object.keys(file.messages)
    .sort()
    .filter((key) => Object.hasOwn(own.messages, key))
    .map((key) => ({ key, mark: readMark(own.messages[key] as string, file.messages[key] as string) }))
}

/**
 * `marks` with every word of `language` (or only `keys`) marked as it is now. A mark for a word that language no
 * longer has is dropped, and the other languages are left as they were. Marks made against another language than the
 * game's own are not carried over: the result starts from nothing. Throws a `RangeError` for the game's own language
 * and for one the game has no words in.
 */
export function markRead(
  content: GameContent,
  marks: ReadMarks | undefined,
  language: Language,
  keys?: readonly string[],
): ReadMarks {
  const source = content.project.source
  if (source !== undefined && language === source)
    throw new RangeError(
      `This game is written in ${languageName(source)}, so ${languageName(language)} is not read against anything.`,
    )
  const files = content.messages
  if (source === undefined || files === undefined || !Object.hasOwn(files, language))
    throw new RangeError(`This game has no words in ${languageName(language)}, so there is nothing to read.`)
  const base = marks !== undefined && marks.source === source ? marks : emptyReadMarks(source)
  const current = wordsOf(content, source, language)
  const now = new Set(current.map((word) => word.key))
  const table: Record<string, string> = {}
  // What was read before and is still a word of the game stays, unless this call marks it again.
  for (const [key, mark] of Object.entries(base.read[language] ?? {})) if (now.has(key)) table[key] = mark
  for (const word of current) if (keys === undefined || keys.includes(word.key)) table[word.key] = word.mark
  return { source, read: { ...base.read, [language]: table } }
}

/**
 * Every translated word with no mark, or a mark of older texts: language order, then key order. A game with no words
 * has none. Marks made against another language than the game's own count for nothing, so every word is unread.
 */
export function unreadWords(
  content: GameContent,
  marks: ReadMarks | undefined,
): readonly { readonly language: Language; readonly key: string }[] {
  const source = content.project.source
  if (source === undefined) return []
  const read = marks !== undefined && marks.source === source ? marks.read : {}
  const unread: { language: Language; key: string }[] = []
  for (const language of LANGUAGES) {
    if (language === source) continue
    const table = read[language]
    for (const word of wordsOf(content, source, language)) {
      const mark = table !== undefined && Object.hasOwn(table, word.key) ? table[word.key] : undefined
      if (mark !== word.mark) unread.push({ language, key: word.key })
    }
  }
  return unread
}

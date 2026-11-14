import { parse as parseToml } from 'smol-toml'
import { canonicalJson, utf8 } from '../../lib/canonical.ts'
import { hex64, xxhash64 } from '../../lib/xxhash64.ts'
import { z } from '../../lib/zod.ts'
import type { Diagnostic, Voice } from './diagnostics.ts'
import type { GameContent } from './load.ts'
import { LANGUAGES, type Language } from './messages.ts'
import { checkData, type Parsed, withoutMark } from './parse.ts'
import { MessageKey } from './shared.ts'

/** The marks file's name, at the top of a game: which translated words a native speaker has read. */
export const READ_MARKS_FILE = 'automata.translations.toml'

/** The languages that can have marks: every one but English, which is the source and is never "read". */
type Translated = Exclude<Language, 'en'>
const TRANSLATED: readonly Translated[] = LANGUAGES.filter((l): l is Translated => l !== 'en')

/** For each language but English, each read key and the mark of the two texts that were read. */
export type ReadMarks = Readonly<Partial<Record<Translated, Readonly<Record<string, string>>>>>

const MARK_HINT = 'A mark is 16 letters and digits, written by the tool. Take this line out.'
const LANGUAGE_HINT = 'This is not a language a game has words in. Use es, ko, ja, zh or pt.'

const Mark = z.string().regex(/^[0-9a-f]{16}$/, MARK_HINT)

const ReadMarksFileSchema = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    read: z.record(z.string(), z.record(MessageKey, Mark)).optional(),
  })
  .superRefine((file, ctx) => {
    for (const language of Object.keys(file.read ?? {}))
      if (!(TRANSLATED as readonly string[]).includes(language))
        ctx.addIssue({ code: 'custom', path: ['read', language], message: LANGUAGE_HINT })
  })

const VOICE: Voice = { noun: 'marks file', missing: { format: 'Write format = 1.' } }

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
  const checked = checkData<{ format: 1; read?: Record<string, Record<string, string>> }>(
    ReadMarksFileSchema,
    data,
    READ_MARKS_FILE,
    VOICE,
  )
  if (!checked.ok) return checked
  const marks: Partial<Record<Translated, Record<string, string>>> = {}
  for (const language of TRANSLATED) {
    const table = checked.value.read === undefined ? undefined : checked.value.read[language]
    if (table !== undefined && Object.keys(table).length > 0) marks[language] = { ...table }
  }
  return { ok: true, value: marks }
}

/**
 * The text of a marks file: `format = 1`, then one `[read.<language>]` table for each language that has marks, in
 * `LANGUAGES` order, its keys sorted, one `"<key>" = "<mark>"` per line. The same marks are always the same bytes.
 */
export function writeReadMarks(marks: ReadMarks): string {
  let text = 'format = 1\n'
  for (const language of TRANSLATED) {
    const table = marks[language]
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

/** The words a native speaker is asked to read: `language`'s texts that English also has, key by key. */
function wordsOf(content: GameContent, language: Translated): readonly { key: string; mark: string }[] {
  const files = content.messages
  const english = files !== undefined && Object.hasOwn(files, 'en') ? files.en : undefined
  const file = files !== undefined && Object.hasOwn(files, language) ? files[language] : undefined
  if (english === undefined || file === undefined) return []
  return Object.keys(file.messages)
    .sort()
    .filter((key) => Object.hasOwn(english.messages, key))
    .map((key) => ({ key, mark: readMark(english.messages[key] as string, file.messages[key] as string) }))
}

/**
 * `marks` with every word of `language` (or only `keys`) marked as it is now. A mark for a word that language no
 * longer has is dropped, and the other languages are left as they were.
 */
export function markRead(
  content: GameContent,
  marks: ReadMarks,
  language: Translated,
  keys?: readonly string[],
): ReadMarks {
  const current = wordsOf(content, language)
  const now = new Set(current.map((word) => word.key))
  const table: Record<string, string> = {}
  // What was read before and is still a word of the game stays, unless this call marks it again.
  for (const [key, mark] of Object.entries(marks[language] ?? {})) if (now.has(key)) table[key] = mark
  for (const word of current) if (keys === undefined || keys.includes(word.key)) table[word.key] = word.mark
  return { ...marks, [language]: table }
}

/** Every translated word with no mark, or a mark of older texts: language order, then key order. */
export function unreadWords(
  content: GameContent,
  marks: ReadMarks,
): readonly { readonly language: Language; readonly key: string }[] {
  const unread: { language: Language; key: string }[] = []
  for (const language of TRANSLATED) {
    const read = marks[language]
    for (const word of wordsOf(content, language)) {
      const mark = read !== undefined && Object.hasOwn(read, word.key) ? read[word.key] : undefined
      if (mark !== word.mark) unread.push({ language, key: word.key })
    }
  }
  return unread
}

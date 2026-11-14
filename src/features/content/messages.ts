import { sortedKeys } from '../../lib/sorted.ts'
import { z } from '../../lib/zod.ts'
import { MessageKey } from './shared.ts'
import type { ContentTypeInfo, Listed, Report } from './type-info.ts'

/**
 * The languages a game ships in: Chinese, Spanish, English, Portuguese, Japanese and Korean. The order is fixed and is
 * by how many people speak each as a first language, as Ethnologue (28th edition, 2025) ranks them; no count is kept
 * here, only the order. Every list a person reads follows it, and no list puts the game's own language first.
 */
export const LANGUAGES = ['zh', 'es', 'en', 'pt', 'ja', 'ko'] as const

/** The codes as a sentence lists them: `zh, es, en, pt, ja or ko`. */
export const languageCodes = `${LANGUAGES.slice(0, -1).join(', ')} or ${LANGUAGES[LANGUAGES.length - 1]}`

/** One of the languages a game ships in. */
export type Language = (typeof LANGUAGES)[number]

const LANGUAGE_NAMES_IN_ENGLISH: Readonly<Record<Language, string>> = {
  zh: 'Chinese',
  es: 'Spanish',
  en: 'English',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
}

/** A language's name in English, for a check's sentence: `Korean`. A player's own names are `locale`'s. */
export function languageName(language: Language): string {
  return LANGUAGE_NAMES_IN_ENGLISH[language]
}

/**
 * A name between braces: lower-case first, then letters and digits, at most 32. One expression with no nested
 * repeat, so a text of thousands of braces is read in one pass.
 */
const PLACEHOLDER = /\{([a-z][a-zA-Z0-9]{0,31})\}/g

/**
 * The names a text asks for, each once, in the order they first come: `Waiting for {count}` gives `['count']`. A brace
 * that does not hold a name (`{}`, `{ count }`, `{Count}`) is an ordinary character, so every messages file that read
 * before still reads.
 */
export function placeholdersOf(text: string): readonly string[] {
  const names = new Set<string>()
  for (const match of text.matchAll(PLACEHOLDER)) names.add(match[1] as string)
  return [...names]
}

/** The most messages one language's file may hold. */
const MAX_MESSAGES = 5000

/** A messages file once read: every word a player reads, in one language, by key. */
export interface MessagesFile {
  readonly format: 1
  /** The language, which is also the file's name: `zh`, `es`, `en`, `pt`, `ja` or `ko`. */
  readonly id: Language
  readonly messages: Readonly<Record<string, string>>
}

/** The rules for a messages file; unknown keys are refused. */
export const MessagesSchema: z.ZodType<MessagesFile, MessagesFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: z
      .enum(LANGUAGES)
      .describe('The language this file is in: zh, es, en, pt, ja or ko. It matches the file name.'),
    messages: z
      .record(MessageKey, z.string().min(1).max(2000))
      .describe(
        'Every word a player reads, by key, like "keeper.hello": "Hello!". Each text is 1 to 2000 characters.',
      ),
  })
  .superRefine((file, ctx) => {
    if (Object.keys(file.messages ?? {}).length > MAX_MESSAGES)
      ctx.addIssue({
        code: 'custom',
        path: ['messages'],
        message: `This has more than ${MAX_MESSAGES} items, which is the most allowed.`,
      })
  })

/**
 * True when the game's own language (`source`) has no such key in its file, so a line that asks for the key is wrong.
 * A game with no words at all (no `source` and no messages file) lacks every key. With a `source` whose file is not
 * listed, or listed but not read, it is not known, and the check is skipped: the project's own problem, or the file's,
 * is already said. Looked up with `Object.hasOwn`: a key like "constructor" is an ordinary key, not every object's own.
 */
export function sourceLacks(game: Listed, key: string): boolean {
  if (game.source === undefined) return game.ids('messages').length === 0
  if (!game.has('messages', game.source)) return false
  const own = game.get('messages', game.source)
  return own !== undefined && !Object.hasOwn(own.messages, key)
}

/** The sentence for a key the game's own language does not have. */
export function sourceMissing(game: Listed, key: string): string {
  if (game.source === undefined)
    return `This game has no words yet, so it has no message called "${key}". Add a messages file or fix the spelling.`
  const name = languageName(game.source)
  return `${name} has no message called "${key}". Add it to the ${name} file or fix the spelling.`
}

/** Every key of a language other than the game's own must be a key of the game's own. A missing translation is plan L's. */
function checkAgainstSource(file: MessagesFile, game: Listed, report: Report): void {
  if (game.source === undefined || file.id === game.source || !game.has('messages', game.source)) return
  for (const key of sortedKeys(file.messages))
    if (sourceLacks(game, key)) report(`messages.${key}`, sourceMissing(game, key))
}

/** The messages' row of the content table. */
export const messagesInfo: ContentTypeInfo<MessagesFile, MessagesFile> = {
  schema: MessagesSchema,
  title: 'Messages',
  plural: 'messages',
  editor: 'story',
  part: 'writer',
  noun: 'messages file',
  missing: {
    format: 'Write "format": 1.',
    id: 'Write the language this file is in: zh, es, en, pt, ja or ko.',
    messages: 'Write the words as keys and texts, like { "keeper.hello": "Hello!" }.',
  },
  // Free keys in one order, so two writers of the same messages make the same bytes.
  tidy: (file) => ({
    ...file,
    messages: Object.fromEntries(sortedKeys(file.messages).map((key) => [key, file.messages[key] as string])),
  }),
  check: checkAgainstSource,
}

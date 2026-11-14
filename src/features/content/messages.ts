import { sortedKeys } from '../../lib/sorted.ts'
import { z } from '../../lib/zod.ts'
import { MessageKey } from './shared.ts'
import type { ContentTypeInfo, Listed, Report } from './type-info.ts'

/** The languages a game ships in: English, Spanish, Korean, Japanese, Chinese and Portuguese. */
export const LANGUAGES = ['en', 'es', 'ko', 'ja', 'zh', 'pt'] as const

/** One of the languages a game ships in. */
export type Language = (typeof LANGUAGES)[number]

/** The most messages one language's file may hold. */
const MAX_MESSAGES = 5000

/** A messages file once read: every word a player reads, in one language, by key. */
export interface MessagesFile {
  readonly format: 1
  /** The language, which is also the file's name: `en`, `es`, `ko`, `ja`, `zh` or `pt`. */
  readonly id: Language
  readonly messages: Readonly<Record<string, string>>
}

/** The rules for a messages file; unknown keys are refused. */
export const MessagesSchema: z.ZodType<MessagesFile, MessagesFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: z
      .enum(LANGUAGES)
      .describe('The language this file is in: en, es, ko, ja, zh or pt. It matches the file name.'),
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
 * True when the English file does not have the key. With no `en.json` listed
 * every key is missing; with `en.json` listed but not read, it is not known, and the check is skipped (its own problems are
 * already said). Looked up with `Object.hasOwn`: a key like "constructor" is an ordinary key, not every object's own.
 */
export function englishLacks(game: Listed, key: string): boolean {
  if (!game.has('messages', 'en')) return true
  const english = game.get('messages', 'en')
  return english !== undefined && !Object.hasOwn(english.messages, key)
}

/** The sentence for a key English does not have. */
export const englishMissing = (key: string): string =>
  `English has no message called "${key}". Add it to the English file or fix the spelling.`

/** Every key of a language other than English must be a key of English. A missing translation is plan L's. */
function checkAgainstEnglish(file: MessagesFile, game: Listed, report: Report): void {
  if (file.id === 'en' || !game.has('messages', 'en')) return
  for (const key of sortedKeys(file.messages))
    if (englishLacks(game, key)) report(`messages.${key}`, englishMissing(key))
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
    id: 'Write the language this file is in: en, es, ko, ja, zh or pt.',
    messages: 'Write the words as keys and texts, like { "keeper.hello": "Hello!" }.',
  },
  // Free keys in one order, so two writers of the same messages make the same bytes.
  tidy: (file) => ({
    ...file,
    messages: Object.fromEntries(sortedKeys(file.messages).map((key) => [key, file.messages[key] as string])),
  }),
  check: checkAgainstEnglish,
}

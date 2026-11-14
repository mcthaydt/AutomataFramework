// Putting values into a text: `Waiting for {count} more` and `{ count: 2 }` give `Waiting for 2 more`.
import type { Value, Values } from '../../lib/message.ts'
import { type Language, placeholdersOf } from '../content/content.ts'
import { LANGUAGE_TAGS } from './names.ts'

/** The tag a list is joined by: English is joined as the level's own errors say it, "1, 2 and 4", not "1, 2, and 4". */
const listTag = (language: Language): string => (language === 'en' ? 'en-GB' : LANGUAGE_TAGS[language])

/** "1, 2 and 4" in the language; with commas where an engine has no `Intl.ListFormat`. */
function list(items: readonly (string | number)[], language: Language): string {
  const texts = items.map(String)
  if (typeof Intl.ListFormat === 'function')
    return new Intl.ListFormat(listTag(language), { style: 'long', type: 'conjunction' }).format(texts)
  return texts.join(', ')
}

/** One value as the text it becomes: a word or a number as written, a list joined the way the language joins one. */
function show(value: Value, language: Language): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : list(value, language)
}

/**
 * The text with each `{name}` it asks for replaced by that name's value. One pass: a value is never looked at again, so
 * a value that holds `{other}` stays as it is. A name with no value is left as typed (so the gap shows), and a value
 * nobody asked for is ignored. Only the game's own values count: `{constructor}` with none is just text.
 */
export function fill(text: string, values: Values | undefined, language: Language): string {
  if (values === undefined) return text
  const names = placeholdersOf(text)
  if (names.length === 0) return text
  // The names are letters and digits only, so they are safe to put in an expression; the one pass is what it finds.
  const pattern = new RegExp(`\\{(${names.join('|')})\\}`, 'g')
  return text.replace(pattern, (whole, name: string) =>
    Object.hasOwn(values, name) ? show(values[name] as Value, language) : whole,
  )
}

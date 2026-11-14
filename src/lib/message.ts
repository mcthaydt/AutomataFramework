// What a feature that never holds a sentence answers with. `locale` (above every feature that speaks) turns it into
// words in the player's language; a feature below it only names the sentence and what goes into it.

/** What may be put into a text: a word, a number, or a list of them ("1, 2 and 4"). */
export type Value = string | number | readonly (string | number)[]

/** The values of one sentence, by the name the text asks for: `{ count: 2 }` fills `{count}`. */
export type Values = Readonly<Record<string, Value>>

/** A sentence not yet in any language: its key and what goes into it. */
export interface Message {
  readonly key: string
  readonly values?: Values
}

/** Says a sentence in a language: the key and what goes into it in, the text out. A key nobody wrote comes back as itself. */
export type Words = (key: string, values?: Values) => string

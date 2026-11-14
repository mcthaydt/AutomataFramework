// Words by key. A game writes its own in `content/messages/<language>.json`; the framework's own sentences (the touch
// overlay, why a join was refused, what a room is waiting for) are in `library/`, and a game may say any of them its own way.
import type { Values, Words } from '../../lib/message.ts'
import { type GameContent, LANGUAGES, type Language, type MessagesFile } from '../content/content.ts'
import { fill } from './fill.ts'
import en from './library/en.json' with { type: 'json' }
import es from './library/es.json' with { type: 'json' }
import ja from './library/ja.json' with { type: 'json' }
import ko from './library/ko.json' with { type: 'json' }
import pt from './library/pt.json' with { type: 'json' }
import zh from './library/zh.json' with { type: 'json' }

/** A library file as the messages file it is: the JSON is read as text and types, so it is held in one here. */
const held = (file: object): MessagesFile => file as MessagesFile

/** The framework's own sentences, one file per language. */
const LIBRARY: Readonly<Record<Language, MessagesFile>> = {
  en: held(en),
  es: held(es),
  ko: held(ko),
  ja: held(ja),
  zh: held(zh),
  pt: held(pt),
}

/** The text a file has for a key, if it has one of its own. A key like `constructor` is a key, never an inherited one. */
const textOf = (file: MessagesFile | undefined, key: string): string | undefined =>
  file !== undefined && Object.hasOwn(file.messages, key) ? file.messages[key] : undefined

/** Words in `language`: the game's file, the framework's, the game's English, the framework's English, then the key. */
function say(language: Language, game: Readonly<Record<string, MessagesFile>> | undefined): Words {
  const own = (code: Language): MessagesFile | undefined =>
    game !== undefined && Object.hasOwn(game, code) ? game[code] : undefined
  const chain: readonly (MessagesFile | undefined)[] = [
    own(language),
    LIBRARY[language],
    own('en'),
    LIBRARY.en,
  ]
  return (key: string, values?: Values): string => {
    for (const file of chain) {
      const text = textOf(file, key)
      if (text !== undefined) return fill(text, values, language)
    }
    return key
  }
}

/** Words in a language for a game: its own, then the framework's, then English, then the key itself. */
export function wordsOf(content: GameContent, language: Language): Words {
  return say(language, content.messages)
}

/** The framework's own sentences alone, for a page that has no game loaded yet. */
export function frameworkWords(language: Language): Words {
  return say(language, undefined)
}

/** The languages a game has words in, in the order the framework lists them; all six for a game with no words at all. */
export function languagesOf(content: GameContent): readonly Language[] {
  const files = content.messages
  return files === undefined ? LANGUAGES : LANGUAGES.filter((language) => Object.hasOwn(files, language))
}

/**
 * Words that only take a key the given messages file has, for a game's own code: a misspelt key is a mistake the
 * compiler shows, not a key shown to a player. `file` only gives the keys; the words are `words`.
 */
export function typed<M extends Readonly<Record<string, string>>>(
  _file: { readonly messages: M },
  words: Words,
): (key: Extract<keyof M, string>, values?: Values) => string {
  return words
}

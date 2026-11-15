// A game with words, made in memory: the M1 fixture game and one messages file per language a test names.
import {
  type GameContent,
  LANGUAGES,
  type Language,
  loadGame,
  writeContent,
} from '#src/features/content/content.ts'
import { gameFiles, readFiles, withSource } from '../content/kind.ts'
import { fixtureFiles } from '../game/read.ts'

/** The words of each language a test gives, by key. A language left out has no file. */
export type Words = Readonly<Partial<Record<Language, Readonly<Record<string, string>>>>>

/** The path of a language's messages file. */
export const messagesPath = (language: Language): string => `content/messages/${language}.json`

/**
 * The files of the M1 fixture game with a messages file for each language in `words`, listed in `LANGUAGES` order,
 * and `source` as the language the game's words are written in.
 */
export function wordsFiles(words: Words, source: Language): Record<string, string | undefined> {
  const extra = LANGUAGES.flatMap((language) => {
    const messages = words[language]
    return messages === undefined
      ? []
      : [
          {
            type: 'messages' as const,
            path: messagesPath(language),
            text: writeContent('messages', { format: 1, id: language, messages }),
          },
        ]
  })
  const files = gameFiles(fixtureFiles, extra)
  return { ...files, 'automata.toml': withSource(files['automata.toml'] ?? '', source) }
}

/** The loaded game of `wordsFiles`. Throws, naming every problem, when it does not load. */
export async function wordsGame(words: Words, source: Language): Promise<GameContent> {
  const loaded = await loadGame(readFiles(wordsFiles(words, source)))
  if (!loaded.ok) throw new Error(loaded.diagnostics.map((d) => `${d.file}: ${d.message}`).join('\n'))
  return loaded.value
}

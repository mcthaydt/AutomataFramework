// A small game's folder with words, for the cli feature's tests of `automata words` and the `files` step's notes: the
// fixture game written in `source`, with a messages file for each language asked for. Every file is written exactly as
// `writeContent` writes it, so the `files` step finds nothing to rewrite.
import { type Language, writeContent } from '#src/features/content/content.ts'
import { withSource } from '../content/kind.ts'
import { smallGame } from './game.ts'

/** Three words in each language: the same keys everywhere, and a text that is plainly that language's. */
export const WORDS: Readonly<Record<Language, Readonly<Record<string, string>>>> = {
  zh: { 'controls.jump': '跳', 'keeper.bye': '再见！', 'keeper.hello': '你好！' },
  es: { 'controls.jump': 'Saltar', 'keeper.bye': '¡Adiós!', 'keeper.hello': '¡Hola!' },
  en: { 'controls.jump': 'Jump', 'keeper.bye': 'Goodbye!', 'keeper.hello': 'Hello there!' },
  pt: { 'controls.jump': 'Pular', 'keeper.bye': 'Tchau!', 'keeper.hello': 'Olá!' },
  ja: { 'controls.jump': 'ジャンプ', 'keeper.bye': 'さようなら！', 'keeper.hello': 'こんにちは！' },
  ko: { 'controls.jump': '점프', 'keeper.bye': '안녕히 가세요!', 'keeper.hello': '안녕하세요!' },
}

/** The words of one language as its messages file. */
export const messagesFile = (language: Language): string =>
  writeContent('messages', { format: 1, id: language, messages: WORDS[language] })

/** The folder's files: the small game, written in `source`, with a messages file for each of `languages`. */
export function wordsGame(source: Language, languages: readonly Language[]): Record<string, string> {
  const game = smallGame()
  const listed = languages.map(
    (language) => `\n[[content]]\ntype = "messages"\npath = "content/messages/${language}.json"\n`,
  )
  const files: Record<string, string> = {
    ...game,
    'automata.toml': withSource(`${(game['automata.toml'] ?? '').trimEnd()}\n${listed.join('')}`, source),
  }
  for (const language of languages) files[`content/messages/${language}.json`] = messagesFile(language)
  return files
}

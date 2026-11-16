// The words a game still has to finish: found in every language, at the key, and said in words.
import { expect, test } from 'vitest'
import { unfinishedWords } from '#src/features/cli/check-words.ts'
import { type GameContent, type Language, loadGame } from '#src/features/content/content.ts'
import { wordsGame } from '../../fixtures/cli/words.ts'
import { readFiles } from '../../fixtures/content/kind.ts'

/** The small game written in English, its messages files in memory replaced by these, by language. */
async function contentWith(words: Partial<Record<Language, Record<string, string>>>): Promise<GameContent> {
  const files = wordsGame('en', ['zh', 'es', 'en', 'pt', 'ja', 'ko'])
  const loaded = await loadGame(readFiles(files))
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics))
  const messages = { ...loaded.value.messages }
  for (const [language, own] of Object.entries(words) as [Language, Record<string, string>][])
    messages[language] = { format: 1, id: language, messages: own }
  return { ...loaded.value, messages }
}

const says = (key: string, language: string, value: string): string =>
  `"${key}" in ${language} still says "${value}". Write what the player should read.`

test('a game with no unfinished words has none', async () => {
  expect(unfinishedWords(await contentWith({}))).toEqual([])
})

test('an empty message, one of only spaces, and one equal to its own key are found', async () => {
  // An empty message cannot be written to a file, so it is put in the content as it is.
  const content = await contentWith({
    en: { 'controls.jump': '', 'keeper.bye': '   ', 'keeper.hello': 'keeper.hello' },
  })
  const found = (key: string, value: string) => ({
    rule: 'words',
    file: 'content/messages/en.json',
    path: `messages.${key}`,
    message: says(key, 'English', value),
  })
  expect(unfinishedWords(content)).toEqual([
    found('controls.jump', ''),
    found('keeper.bye', '   '),
    found('keeper.hello', 'keeper.hello'),
  ])
})

test.each(['TODO', 'fixme', 'Lorem ipsum', 'xxx', 'PlaceHolder', 'a test', 'Test.'])(
  '%s is a word that is not finished',
  async (value) => {
    const found = unfinishedWords(await contentWith({ en: { 'keeper.hello': `Hi ${value}` } }))
    expect(found.map((f) => f.path)).toEqual(['messages.keeper.hello'])
  },
)

test('"contest" and "latest" are not "test"', async () => {
  const content = await contentWith({ en: { 'keeper.hello': 'The latest contest' } })
  expect(unfinishedWords(content)).toEqual([])
})

test('a game in three languages reports a TODO in each language it is in', async () => {
  const content = await contentWith({
    en: { 'keeper.hello': 'TODO' },
    es: { 'keeper.hello': 'TODO' },
    ko: { 'keeper.hello': 'TODO' },
  })
  expect(unfinishedWords(content).map((f) => `${f.file} ${f.path}`)).toEqual([
    'content/messages/es.json messages.keeper.hello',
    'content/messages/en.json messages.keeper.hello',
    'content/messages/ko.json messages.keeper.hello',
  ])
})

test('a level name holding "test" is still found', async () => {
  const content = await contentWith({ en: { 'level.level-1.name': 'Test level' } })
  expect(unfinishedWords(content).map((f) => f.path)).toEqual(['messages.level.level-1.name'])
})

// The template's words: six languages, each with every word English has, and every word the page asks for is there.
import { expect, test } from 'vitest'
import {
  LANGUAGES,
  loadGame,
  parseReadMarks,
  translationProblems,
  unreadWords,
} from '#src/features/content/content.ts'
import { testHost } from '#src/features/host/host.ts'
import { createLocale } from '#src/features/locale/locale.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import { keyName } from '../../template/src/features/page/controls.ts'
import { readTemplate, templateTree } from './tree.ts'

const tree = templateTree()

async function loaded() {
  const game = await loadGame(readTemplate())
  if (!game.ok) throw new Error(game.diagnostics.map((d) => d.message).join('\n'))
  return game.value
}

test('the template has words in all six languages, listed in automata.toml', async () => {
  const content = await loaded()
  expect(Object.keys(content.messages ?? {}).sort()).toEqual([...LANGUAGES].sort())
})

test('no language lacks a word English has, and none has one English does not', async () => {
  expect(translationProblems(await loaded())).toEqual([])
})

test('every word the template asks for is in its English file', async () => {
  const english = (await loaded()).messages?.en?.messages ?? {}
  const sources = Object.entries(tree).filter(([path]) => path.startsWith('src/') && path.endsWith('.ts'))
  const asked = new Set<string>()
  for (const [, text] of sources)
    for (const m of text.matchAll(/words\(\s*['`]([\w.-]+)['`]/g)) asked.add(m[1] ?? '')
  // The names a key's code turns into: `key.arrow-left` for ArrowLeft and so on.
  for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
    asked.add(`key.arrow-${code.slice(5).toLowerCase()}`)
  for (const key of asked) expect(Object.hasOwn(english, key), key).toBe(true)
  // And every control is on a button: `controls.<action>`.
  for (const action of ['left', 'right', 'jump']) expect(english[`controls.${action}`], action).toBeDefined()
})

test('a key says its name in the language of the player, a letter says itself', async () => {
  const content = await loaded()
  const say = async (device: string, code: string): Promise<string> => {
    const host = testHost({ deviceLanguages: [device] })
    const settings = await openSettings({ game: 'my-game', store: host.store })
    return keyName(code, createLocale({ content, host, settings }).words)
  }
  expect(await say('en', 'ArrowLeft')).toBe('Left arrow')
  expect(await say('ja', 'ArrowLeft')).toBe('左矢印')
  expect(await say('pt', 'Space')).toBe('Espaço')
  expect(await say('ko', 'KeyA')).toBe('A')
})

test('the marks file is there, reads, and says no word has been read yet', async () => {
  const marks = parseReadMarks(tree['automata.translations.toml'] ?? '')
  expect(marks.ok).toBe(true)
  if (!marks.ok) return
  const unread = unreadWords(await loaded(), marks.value)
  // Five languages, every key of each.
  const keys = Object.keys((await loaded()).messages?.en?.messages ?? {}).length
  expect(unread.length).toBe(5 * keys)
})

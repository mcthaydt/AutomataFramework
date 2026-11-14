import { expect, test } from 'vitest'
import { wordsOf } from '#src/features/story/words.ts'
import { loadStory } from '../../fixtures/story/game.ts'
import { storyFiles } from '../../fixtures/story/read.ts'

const en = JSON.parse(storyFiles['content/messages/en.json'] as string).messages as Record<string, string>
const es = JSON.parse(storyFiles['content/messages/es.json'] as string).messages as Record<string, string>

test('Spanish when asked and it has the key, English when it has not, the key when nobody has', async () => {
  const content = await loadStory()
  expect(wordsOf(content, 'es')('keeper.hello')).toBe(es['keeper.hello'])
  expect(wordsOf(content, 'en')('keeper.hello')).toBe(en['keeper.hello'])
  // Without a language: English.
  expect(wordsOf(content)('keeper.hello')).toBe(en['keeper.hello'])
  expect(wordsOf(content)('no.such')).toBe('no.such')

  const { 'keeper.hello': _gone, ...rest } = es
  const withoutKey = await loadStory({
    'content/messages/es.json': JSON.stringify({ format: 1, id: 'es', messages: rest }),
  })
  expect(wordsOf(withoutKey, 'es')('keeper.hello')).toBe(en['keeper.hello'])
})

test('a language the game has no file for falls back to English', async () => {
  expect(wordsOf(await loadStory(), 'ko')('keeper.hello')).toBe(en['keeper.hello'])
})

test('a game with no messages shows the key', async () => {
  const content = { ...(await loadStory()), messages: undefined }
  expect(wordsOf(content)('keeper.hello')).toBe('keeper.hello')
})

test('a key like "constructor" is an ordinary key, not every object’s own', async () => {
  expect(wordsOf(await loadStory(), 'es')('constructor')).toBe('constructor')
})

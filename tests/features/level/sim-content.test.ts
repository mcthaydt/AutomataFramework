// A game's words are not what the sim is given: a translation is content a replay never notices, two players with
// different translations of one game can share a room, and a word changed in a file moves no hash.
import { afterEach, expect, test } from 'vitest'
import { loadGame } from '#src/features/content/content.ts'
import { createRecorder, verifyReplay } from '#src/features/commands/commands.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { simContent } from '#src/features/level/sim-content.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { fullGameFiles, readFullGame } from '../../fixtures/full-game/read.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'
import golden from '../../golden/push-crate.json' with { type: 'json' }

// Koota allows 16 live worlds in a process, so every sim a test makes is disposed when it ends.
const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

async function loadFull(overrides: Record<string, string | undefined> = {}) {
  const loaded = await loadGame(readFullGame(overrides))
  if (!loaded.ok) throw new Error(`the full game did not load:\n${loaded.diagnostics.map((d) => d.message).join('\n')}`)
  return loaded.value
}

async function simOf(content: Awaited<ReturnType<typeof loadFull>>): Promise<Sim> {
  const sim = await createGameSim({ content })
  made.push(sim)
  return sim
}

/** The project file without one messages file's `[[content]]` block. */
function withoutLanguage(language: string): string {
  const block = `[[content]]\ntype = "messages"\npath = "content/messages/${language}.json"\n\n`
  const text = fullGameFiles['automata.toml'] ?? ''
  if (!text.includes(block)) throw new Error(`the full game's project file has no block for ${language}`)
  return text.replace(block, '')
}

test('changing a word moves no hash', async () => {
  const before = await simOf(await loadFull())
  const ko = JSON.parse(fullGameFiles['content/messages/ko.json'] ?? '') as { messages: Record<string, string> }
  ko.messages['keeper.hello'] = '안녕하세요, 여행자님!'
  const after = await simOf(await loadFull({ 'content/messages/ko.json': JSON.stringify(ko) }))
  expect(after.contentHash).toBe(before.contentHash)
  expect(after.hash()).toBe(before.hash())
  for (let i = 0; i < 60; i++) {
    before.step([])
    after.step([])
  }
  expect(after.hash()).toBe(before.hash())
})

test('taking a language away, or every language but English, moves no hash', async () => {
  const full = await simOf(await loadFull())
  const noKorean = await simOf(await loadFull({ 'automata.toml': withoutLanguage('ko') }))
  expect(noKorean.contentHash).toBe(full.contentHash)
  // Audit C1: the list of files is hashed too, so it has to lose the entries as well as the maps.
  let onlyEnglish = fullGameFiles['automata.toml'] ?? ''
  for (const language of ['es', 'ko', 'ja', 'zh', 'pt']) {
    const block = `[[content]]\ntype = "messages"\npath = "content/messages/${language}.json"\n`
    onlyEnglish = onlyEnglish.replace(`${block}\n`, '').replace(block, '')
  }
  const english = await simOf(await loadFull({ 'automata.toml': onlyEnglish.trimEnd() + '\n' }))
  expect(english.contentHash).toBe(full.contentHash)
  expect(english.hash()).toBe(full.hash())
})

test('the list of words files is not hashed either', async () => {
  const full = await loadFull()
  const given = simContent(full)
  expect(given.project.content.some((entry) => entry.type === 'messages')).toBe(false)
  expect(given.project.content).toEqual(full.project.content.filter((entry) => entry.type !== 'messages'))
})

test('changing a level still moves the content hash', async () => {
  const before = await simOf(await loadFixtureGame())
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] ?? '') as { things: { x: number }[] }
  ;(level.things[0] as { x: number }).x = 9.5
  const after = await simOf(await loadFixtureGame({ 'content/levels/level-1.json': JSON.stringify(level) }))
  expect(after.contentHash).not.toBe(before.contentHash)
})

test('the sim is given no words, and the game keeps them', async () => {
  const full = await loadFull()
  const given = simContent(full)
  expect(given.messages).toBeUndefined()
  expect(Object.keys(full.messages ?? {}).sort()).toEqual(['en', 'es', 'ja', 'ko', 'pt', 'zh'])
  expect(Object.isFrozen(full.messages)).toBe(true)
  expect(Object.isFrozen(given)).toBe(true)
  expect(Object.isFrozen(given.project.content)).toBe(true)
  // Everything else is the very same value, not a copy.
  expect(given.levels).toBe(full.levels)
  expect(given.characters).toBe(full.characters)
})

test('a game with no words is given the very same content', async () => {
  const content = await loadFixtureGame()
  expect(simContent(content)).toBe(content)
})

test('adding six words files to a game that had none moves no hash', async () => {
  // Audit C1, plan D's change to Examples: the M1 game gains messages files and its recorded run stays as it was.
  const languages = ['en', 'es', 'ko', 'ja', 'zh', 'pt']
  const files: Record<string, string> = {
    'automata.toml':
      (fixtureFiles['automata.toml'] ?? '') +
      languages.map((l) => `\n[[content]]\ntype = "messages"\npath = "content/messages/${l}.json"\n`).join(''),
  }
  for (const l of languages)
    files[`content/messages/${l}.json`] = JSON.stringify({ format: 1, id: l, messages: { 'game.title': `Title ${l}` } })
  const withWords = await simOf(await loadFixtureGame(files))
  expect(withWords.contentHash).toBe((await simOf(await loadFixtureGame())).contentHash)
  for (let i = 0; i < 60; i++) withWords.step([])
  expect(withWords.hash()).toBe((golden as { idleHash60?: string }).idleHash60)
})

test('a replay recorded before a word changed still plays', async () => {
  const recorder = createRecorder(await simOf(await loadFull()))
  for (let i = 0; i < 60; i++) recorder.step([])
  const replay = recorder.replay()
  const es = JSON.parse(fullGameFiles['content/messages/es.json'] ?? '') as { messages: Record<string, string> }
  es.messages['keeper.hello'] = '¡Hola, viajero!'
  const changed = await simOf(await loadFull({ 'content/messages/es.json': JSON.stringify(es) }))
  expect(verifyReplay(changed, replay)).toEqual({ ok: true })
})

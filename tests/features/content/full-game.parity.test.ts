// The full game, every kind of file M2 has, reads and writes to the very same bytes in Node and in every browser. The
// committed files are the reference, so no golden is recorded and none can drift.
import { expect, test } from 'vitest'
import {
  formatDiagnostic,
  loadGame,
  parseContent,
  parseProject,
  writeContent,
} from '#src/features/content/content.ts'
import { fullGameFiles, readFullGame } from '../../fixtures/full-game/read.ts'
import { readFixture } from '../../fixtures/game/read.ts'

test('every file of the full game reads, and is written back to the very same bytes', async () => {
  const loaded = await loadGame(readFullGame())
  expect(loaded.ok ? [] : loaded.diagnostics.map(formatDiagnostic)).toEqual([])
  const project = parseProject(fullGameFiles['automata.toml'] ?? '')
  if (!project.ok) throw new Error('the project file did not read')
  expect(project.value.content.length).toBe(Object.keys(fullGameFiles).length - 1)
  for (const ref of project.value.content) {
    const text = fullGameFiles[ref.path] ?? ''
    const parsed = parseContent(ref.type, text, ref.path)
    expect(parsed.ok && writeContent(ref.type, parsed.value as never), ref.path).toBe(text)
  }
})

test('messages are written in one order whatever order they were given in', () => {
  const ko = JSON.parse(fullGameFiles['content/messages/ko.json'] ?? '') as {
    messages: Record<string, string>
  }
  const backwards = { ...ko, messages: Object.fromEntries(Object.entries(ko.messages).reverse()) }
  expect(writeContent('messages', backwards as never)).toBe(fullGameFiles['content/messages/ko.json'])
})

test('the M1 game is untouched: its files still read', async () => {
  // The byte check for these files is in load.test.ts and stays there.
  expect((await loadGame(readFixture())).ok).toBe(true)
})

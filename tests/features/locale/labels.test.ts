// A level's name for a save, and a label a save takes.
import { afterEach, expect, test, vi } from 'vitest'
import { loadGame } from '#src/features/content/content.ts'
import { fitLabel, frameworkWords, levelName, wordsOf } from '#src/features/locale/locale.ts'
import { createSaves, memoryStore } from '#src/features/saves/saves.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { progress } from '../../fixtures/saves/progress.ts'

afterEach(() => vi.unstubAllGlobals())

/** A family of four as one emoji: eleven UTF-16 units, seven code points. */
const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}'

test("a level's name in the player's language; the id when the game names nothing", async () => {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  expect(levelName(wordsOf(loaded.value, 'ko'), 'level-1')).toBe('레벨 1')
  expect(levelName(wordsOf(loaded.value, 'en'), 'level-1')).toBe('Level 1')
  expect(levelName(wordsOf(loaded.value, 'ko'), 'level-9')).toBe('level-9')
  expect(levelName(wordsOf(await loadFixtureGame(), 'ja'), 'level-1')).toBe('level-1')
  expect(levelName(frameworkWords('en'), 'level-1')).toBe('level-1')
})

test('a label that fits is left alone; a long one is cut to 80 with nothing split', () => {
  expect(fitLabel('Level 1')).toBe('Level 1')
  expect(fitLabel('a'.repeat(80))).toBe('a'.repeat(80))
  expect(fitLabel('a'.repeat(81))).toBe('a'.repeat(80))
  expect(fitLabel('가'.repeat(200))).toBe('가'.repeat(80))
  expect(FAMILY).toHaveLength(11)
  // The family would end at 90 units: it is dropped whole, not left in halves.
  expect(fitLabel('a'.repeat(79) + FAMILY)).toBe('a'.repeat(79))
  expect(fitLabel('a'.repeat(78) + FAMILY)).toBe('a'.repeat(78))
  expect(fitLabel('')).toBe('')
})

test('a cut label is one a save takes', async () => {
  const saves = createSaves({ def: progress, store: memoryStore() })
  const label = fitLabel('가'.repeat(200))
  expect(await saves.save(0, { level: 'level-1', doors: 0 }, { label })).toEqual({ ok: true })
})

test('an engine with no Intl.Segmenter cuts between code points', () => {
  vi.stubGlobal('Intl', Object.create(Intl, { Segmenter: { value: undefined } }))
  expect(fitLabel('a'.repeat(78) + FAMILY)).toBe(`${'a'.repeat(78)}\u{1F468}`)
  expect(fitLabel('가'.repeat(200))).toBe('가'.repeat(80))
})

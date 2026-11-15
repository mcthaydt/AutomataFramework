// The saved games as sentences: one row for each kind of place, and one sentence for each reason a place cannot be used.
import { expect, test } from 'vitest'
import { frameworkWords } from '#src/features/locale/locale.ts'
import type { SaveProblem, SlotState } from '#src/features/saves/saves.ts'
import { saveRows, saveSentence } from '#src/features/screens/saves-rows.ts'

const en = frameworkWords('en')

test('a row for each of the five kinds of place, numbered from 1', () => {
  const slots: SlotState[] = [
    { slot: 0, kind: 'ready', savedAt: 1, label: 'Level Two' },
    { slot: 1, kind: 'empty' },
    { slot: 2, kind: 'damaged', problem: { kind: 'damaged', detail: 'not json' } },
    { slot: 3, kind: 'newer', problem: { kind: 'newer', version: 9 } },
    { slot: 4, kind: 'too-old', problem: { kind: 'too-old', version: 0 } },
  ]
  expect(saveRows(slots, en)).toEqual([
    { slot: 0, name: 'Game 1', says: 'Level Two', empty: false, can: ['continue', 'new', 'erase'] },
    { slot: 1, name: 'Game 2', says: 'Empty', empty: true, can: ['new'] },
    { slot: 2, name: 'Game 3', says: en('automata.saves.damaged'), empty: false, can: ['erase'] },
    { slot: 3, name: 'Game 4', says: en('automata.saves.newer'), empty: false, can: ['erase'] },
    { slot: 4, name: 'Game 5', says: en('automata.saves.too-old'), empty: false, can: ['erase'] },
  ])
})

test('a saved game with no label says nothing about the level, and can still be opened', () => {
  const [row] = saveRows([{ slot: 0, kind: 'ready', savedAt: 1 }], en)
  expect(row?.says).toBe('')
  expect(row?.can).toContain('continue')
})

test('a sentence for each refusal and each problem', () => {
  const sentence = (problem: SaveProblem): string => saveSentence(problem, en)
  expect(sentence({ kind: 'refused', refusal: 'unavailable', detail: '' })).toBe(
    en('automata.saves.refused.unavailable'),
  )
  expect(sentence({ kind: 'refused', refusal: 'full', detail: '' })).toBe(en('automata.saves.refused.full'))
  expect(sentence({ kind: 'refused', refusal: 'failed', detail: '' })).toBe(
    en('automata.saves.refused.failed'),
  )
  expect(sentence({ kind: 'damaged', detail: '' })).toBe(en('automata.saves.damaged'))
  expect(sentence({ kind: 'newer', version: 2 })).toBe(en('automata.saves.newer'))
  expect(sentence({ kind: 'too-old', version: 0 })).toBe(en('automata.saves.too-old'))
})

import { describe, expect, test } from 'vitest'
import type { StoreResult } from '#src/features/saves/saves.ts'
import { warningsFor } from '#src/features/screens/warnings.ts'

/** Says a key as itself in angle brackets, so a test sees which keys were asked for and in what order. */
const words = (key: string): string => `<${key}>`

const allowed: StoreResult<void> = { ok: true, value: undefined }
const refused = (refusal: 'unavailable' | 'full' | 'failed'): StoreResult<void> => ({
  ok: false,
  refusal,
  detail: 'a test says so',
})

describe('what there is to warn about', () => {
  test('a game with no warnings, on a browser that keeps things, has no lines', () => {
    expect(warningsFor({ project: {}, saving: allowed, words })).toEqual([])
  })

  test("a browser that will not keep anything adds the framework's sentence, last", () => {
    expect(warningsFor({ project: {}, saving: refused('unavailable'), words })).toEqual([
      '<automata.warnings.no-saving>',
    ])
    expect(
      warningsFor({ project: { warnings: ['flashing'] }, saving: refused('unavailable'), words }),
    ).toEqual(['<flashing>', '<automata.warnings.no-saving>'])
  })

  test("a game's own warnings come first, in the order its project file lists them", () => {
    const project = { warnings: ['flashing', 'loud'] }
    expect(warningsFor({ project, saving: allowed, words })).toEqual(['<flashing>', '<loud>'])
  })

  test('only a store that is not there warns: a full one or a failing one is told when a save is tried', () => {
    for (const refusal of ['full', 'failed'] as const)
      expect(warningsFor({ project: {}, saving: refused(refusal), words })).toEqual([])
  })
})

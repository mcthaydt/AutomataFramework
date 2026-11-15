// The best score, with no page (plan Q, Task 4): a settings section, `records`, and the one rule for keeping it.
import { expect, test } from 'vitest'
import { RECORDS_DEFAULT, RecordsSchema, withScore } from '#src/features/flow/flow.ts'
import { openSections } from '#src/features/flow/sections.ts'
import { testHost } from '#src/features/host/host.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import { z } from '#src/lib/zod.ts'

test('the first score is the best', () => expect(withScore({}, 3)).toEqual({ best: 3 }))

test('a higher score is the new best, and a score of 0 is a score', () => {
  expect(withScore({ best: 3 }, 5)).toEqual({ best: 5 })
  expect(withScore({}, 0)).toEqual({ best: 0 })
})

test('a lower or equal score gives the very same object', () => {
  const records = { best: 5 }
  expect(withScore(records, 4)).toBe(records)
  expect(withScore(records, 5)).toBe(records)
})

test('NaN, Infinity and undefined give the very same object', () => {
  const records = { best: 5 }
  for (const score of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, undefined])
    expect(withScore(records, score)).toBe(records)
  expect(withScore(RECORDS_DEFAULT, undefined)).toBe(RECORDS_DEFAULT)
})

test('the schema takes none and a finite best, and refuses anything else', () => {
  const ok = (value: unknown): boolean => RecordsSchema.safeParse(value).success
  expect(ok({})).toBe(true)
  expect(ok({ best: 12 })).toBe(true)
  for (const bad of [{ best: 'high' }, { best: Number.NaN }, { best: Number.POSITIVE_INFINITY }, { best: 1, x: 2 }])
    expect(ok(bad), JSON.stringify(bad)).toBe(false)
})

test('a records section holding garbage reads as the default', async () => {
  const host = testHost()
  // Written the way a newer or a damaged build might have left it: through the settings' own door, with a shape the
  // real schema refuses.
  const stored = await openSettings({ game: 'crate-game', store: host.store })
  await stored.section({ name: 'records', schema: z.unknown(), initial: {} }).set({ best: 'high' })
  const sections = await openSections({ game: 'crate-game', host })
  expect(sections.records.get()).toEqual(RECORDS_DEFAULT)
  // And it keeps a new best like any section.
  await sections.records.set(withScore(sections.records.get(), 7))
  const again = await openSections({ game: 'crate-game', host })
  expect(again.records.get()).toEqual({ best: 7 })
})

test('settings kept before this section existed read with no best', async () => {
  const host = testHost()
  const sections = await openSections({ game: 'crate-game', host })
  expect(sections.records.get()).toEqual({})
  expect(sections.sound.get()).toEqual({ format: 1, music: 0.7, sound: 1 })
})

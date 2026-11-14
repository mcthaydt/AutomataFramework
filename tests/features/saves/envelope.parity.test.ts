// A save's stored form is canonical JSON, so the same save is the same bytes in Node, Chromium, WebKit and Firefox:
// a save made in one browser's storage reads back in another's, and a diff of two saves shows only what changed.
import { expect, test } from 'vitest'
import { readEnvelope, writeEnvelope } from '#src/features/saves/envelope.ts'

const base = { format: 1, version: 2, savedAt: 1700000000000, data: { level: 'level-2', doors: 1 } } as const

test('a save is written as canonical JSON', () => {
  expect(writeEnvelope(base)).toBe(
    '{"data":{"doors":1,"level":"level-2"},"format":1,"savedAt":1700000000000,"version":2}',
  )
})

test('a label is written when there is one', () => {
  expect(writeEnvelope({ ...base, label: 'Level 2' })).toBe(
    '{"data":{"doors":1,"level":"level-2"},"format":1,"label":"Level 2","savedAt":1700000000000,"version":2}',
  )
})

test('what is written reads back the same', () => {
  for (const envelope of [base, { ...base, label: 'Level 2' }, { ...base, data: null }])
    expect(readEnvelope(writeEnvelope(envelope))).toEqual({ ok: true, envelope })
})

test('text that is not a save says why', () => {
  const why = (text: string): string | undefined => {
    const read = readEnvelope(text)
    return read.ok ? undefined : read.detail
  }
  const text = (change: Record<string, unknown>): string => JSON.stringify({ ...base, ...change })
  expect(why('')).toBe('This is not JSON.')
  expect(why('{')).toBe('This is not JSON.')
  expect(why('[]')).toBe('This is not a save.')
  expect(why('7')).toBe('This is not a save.')
  expect(why('null')).toBe('This is not a save.')
  expect(why(text({ format: 2 }))).toBe('This save is in a format this game does not know (2).')
  for (const version of [0, 1.5, '2'])
    expect(why(text({ version })), `version ${version}`).toBe('This save has no version.')
  expect(why(JSON.stringify({ format: 1, savedAt: 1, data: {} }))).toBe('This save has no version.')
  expect(why(JSON.stringify({ format: 1, version: 1, data: {} }))).toBe('This save has no date.')
  expect(why(text({ savedAt: 'yesterday' }))).toBe('This save has no date.')
  expect(why(JSON.stringify({ format: 1, version: 1, savedAt: 1 }))).toBe('This save has nothing in it.')
  expect(why(text({ label: 'x'.repeat(81) }))).toBe('This save has a label that cannot be read.')
  expect(why(text({ label: 7 }))).toBe('This save has a label that cannot be read.')
  expect(why(text({ label: '' }))).toBe('This save has a label that cannot be read.')
})

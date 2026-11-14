// A save definition says what a game saves and how older saves become this build's. These tests prove the checks on
// the definition, the stored keys, and each way a stored envelope can fail to become data this build can use.
import { expect, test } from 'vitest'
import { z } from 'zod'
import { defineSave, settingsKey, slotKey, upgrade } from '#src/features/saves/define.ts'
import type { Envelope } from '#src/features/saves/envelope.ts'
import { progress } from '../../fixtures/saves/progress.ts'

const envelope = (version: number, data: unknown): Envelope => ({ format: 1, version, savedAt: 1, data })
const schema = z.object({ n: z.number() })

test('defineSave gives back a good definition', () => {
  const def = { game: 'crate-game', version: 1, schema, slots: 1 }
  expect(defineSave(def)).toBe(def)
})

test('defineSave refuses a bad game id, version or slot count, in plain words', () => {
  const bad = (change: object): string => {
    try {
      defineSave({ game: 'crate-game', version: 1, schema, slots: 1, ...change })
    } catch (error) {
      expect(error).toBeInstanceOf(RangeError)
      return (error as Error).message
    }
    return 'did not throw'
  }
  expect(bad({ game: 'Crate Game' })).toBe(
    'A save\'s game id is 1 to 40 of a-z, 0-9 and "-", like "crate-game". Got "Crate Game".',
  )
  expect(bad({ game: '' })).toContain('Got "".')
  expect(bad({ game: 'a'.repeat(41) })).toContain('1 to 40')
  expect(bad({ version: 0 })).toBe("A save's version is a whole number from 1. Got 0.")
  expect(bad({ version: 1.5 })).toBe("A save's version is a whole number from 1. Got 1.5.")
  expect(bad({ slots: 0 })).toBe('A save has 1 to 9 slots. Got 0.')
  expect(bad({ slots: 10 })).toBe('A save has 1 to 9 slots. Got 10.')
})

test('keys', () => {
  expect(slotKey(progress, 0)).toBe('automata.fixture-game.save.0')
  expect(slotKey(progress, 2)).toBe('automata.fixture-game.save.2')
  expect(() => slotKey(progress, 3)).toThrow(new RangeError('This game has slots 0 to 2. Got 3.'))
  expect(() => slotKey(progress, 1.5)).toThrow(RangeError)
  expect(() => slotKey(progress, -1)).toThrow(RangeError)
  expect(settingsKey('fixture-game')).toBe('automata.fixture-game.settings')
  expect(() => settingsKey('Fixture Game')).toThrow(RangeError)
})

test('data at this version passes straight through the schema', () => {
  expect(upgrade(progress, envelope(2, { level: 'level-1', doors: 3 }))).toEqual({
    ok: true,
    data: { level: 'level-1', doors: 3 },
  })
})

test('older data is upgraded one version at a time', () => {
  expect(upgrade(progress, envelope(1, { level: 'level-1' }))).toEqual({
    ok: true,
    data: { level: 'level-1', doors: 0 },
  })
  const calls: number[] = []
  const three = defineSave({
    game: 'steps',
    version: 3,
    slots: 1,
    schema: z.object({ n: z.number() }),
    upgrades: {
      1: (data) => {
        calls.push(1)
        return { n: (data as { n: number }).n + 1 }
      },
      2: (data) => {
        calls.push(2)
        return { n: (data as { n: number }).n * 10 }
      },
    },
  })
  expect(upgrade(three, envelope(1, { n: 1 }))).toEqual({ ok: true, data: { n: 20 } })
  expect(calls).toEqual([1, 2])
})

test('a newer save is never touched', () => {
  expect(upgrade(progress, envelope(3, { anything: true }))).toEqual({
    ok: false,
    problem: { kind: 'newer', version: 3 },
  })
})

test('no upgrade from that version is too-old', () => {
  const three = defineSave({
    game: 'gap',
    version: 3,
    slots: 1,
    schema,
    upgrades: { 1: (data) => data },
  })
  expect(upgrade(three, envelope(2, { n: 1 }))).toEqual({
    ok: false,
    problem: { kind: 'too-old', version: 2 },
  })
})

test('an upgrade that throws is too-old, not a crash', () => {
  const broken = defineSave({
    game: 'broken',
    version: 2,
    slots: 1,
    schema,
    upgrades: {
      1: () => {
        throw new Error('no')
      },
    },
  })
  expect(upgrade(broken, envelope(1, { n: 1 }))).toEqual({
    ok: false,
    problem: { kind: 'too-old', version: 1 },
  })
})

test('data the schema refuses is damaged', () => {
  expect(upgrade(progress, envelope(2, { level: 7 }))).toEqual({
    ok: false,
    problem: { kind: 'damaged', detail: 'This save does not hold what this game saves.' },
  })
  // Upgraded data is checked too: an upgrade that makes the wrong shape is damage, not a pass.
  expect(upgrade(progress, envelope(1, { level: 7 }))).toMatchObject({
    ok: false,
    problem: { kind: 'damaged' },
  })
})

test('an upgrade is not given the stored object itself', () => {
  const stored = { level: 'level-1' }
  const mutating = defineSave({
    game: 'mutating',
    version: 2,
    slots: 1,
    schema: z.object({ level: z.string(), doors: z.number() }),
    upgrades: {
      1: (data) => {
        ;(data as { doors?: number }).doors = 0
        return data
      },
    },
  })
  expect(upgrade(mutating, envelope(1, stored))).toEqual({ ok: true, data: { level: 'level-1', doors: 0 } })
  expect(stored).toEqual({ level: 'level-1' })
})

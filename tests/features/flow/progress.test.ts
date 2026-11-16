// The progress a game keeps when it names no save of its own (plan U, Task 4): the level reached, in three places.
import { expect, test } from 'vitest'
import {
  cameIn,
  continueAt,
  defaultSave,
  firstEmpty,
  newest,
  type Progress,
  progressDef,
  progressFields,
  progressLabel,
  reached,
  remembered,
} from '#src/features/flow/flow.ts'
import { slotKey } from '#src/features/saves/define.ts'
import { createSaves, memoryStore, type SlotState } from '#src/features/saves/saves.ts'
import { z } from '#src/lib/zod.ts'

const ready = (slot: number, savedAt: number): SlotState => ({ slot, kind: 'ready', savedAt })
const empty = (slot: number): SlotState => ({ slot, kind: 'empty' })
const problem = { kind: 'damaged', detail: 'x' } as const

const ORDER = ['level-1', 'level-2', 'level-3'] as const

test('the save a game gets when it names none has three places, at version 2, under the game', () => {
  const def = progressDef('crate-game')
  expect(def).toMatchObject({ game: 'crate-game', version: 2, slots: 3 })
  expect(def.schema.safeParse({ level: 'level-2' }).success).toBe(true)
  for (const bad of [{}, { level: 2 }, { level: '' }, { level: 'level-2', extra: 1 }, null])
    expect(def.schema.safeParse(bad).success, JSON.stringify(bad)).toBe(false)
})

test('a fresh progress is just the level, and it is kept and read back', async () => {
  const save = defaultSave('crate-game')
  expect(save.fresh('level-2')).toEqual({ level: 'level-2' })
  const saves = createSaves({ def: save.def, store: memoryStore() })
  expect(await saves.save(0, save.fresh('level-2'))).toEqual({ ok: true })
  const loaded = await saves.load(0)
  expect(loaded.ok && loaded.data).toEqual({ level: 'level-2' })
})

test('newest picks the ready place saved last, and skips what cannot be read', () => {
  const slots: SlotState[] = [
    ready(0, 100),
    { slot: 1, kind: 'damaged', problem },
    ready(2, 300),
    { slot: 3, kind: 'newer', problem: { kind: 'newer', version: 9 } },
  ]
  expect(newest(slots)).toBe(2)
  // Nothing ready is nothing to continue.
  const old: SlotState = { slot: 1, kind: 'too-old', problem: { kind: 'too-old', version: 0 } }
  expect(newest([empty(0), old])).toBeUndefined()
  expect(newest([])).toBeUndefined()
})

test('firstEmpty is the lowest empty place, and nothing when every place holds something', () => {
  expect(firstEmpty([ready(0, 1), empty(1), empty(2)])).toBe(1)
  expect(firstEmpty([empty(0), ready(1, 1)])).toBe(0)
  expect(firstEmpty([ready(0, 1), { slot: 1, kind: 'damaged', problem }, ready(2, 3)])).toBeUndefined()
})

test('reached moves a save forward along the order, never back, and keeps the object when it stays', () => {
  const at1 = { level: 'level-1' }
  const at2 = { level: 'level-2' }
  expect(reached(at1, 'level-2', ORDER)).toEqual(at2)
  expect(reached(at2, 'level-3', ORDER)).toEqual({ level: 'level-3' })
  expect(reached(at2, 'level-1', ORDER)).toBe(at2)
  expect(reached(at2, 'level-2', ORDER)).toBe(at2)
  // A level the game has never heard of is not progress.
  expect(reached(at2, 'level-9', ORDER)).toBe(at2)
})

test('reached keeps what else a game saved beside the level', () => {
  const data = { level: 'level-1', coins: 12 }
  expect(reached(data, 'level-2', ORDER)).toEqual({ level: 'level-2', coins: 12 })
})

test('a level the game no longer has counts as the first level', () => {
  const lost = { level: 'level-removed' }
  expect(reached(lost, 'level-1', ORDER)).toBe(lost)
  expect(reached(lost, 'level-2', ORDER)).toEqual({ level: 'level-2' })
})

test('a progress label is the name of the level in the player language, or the id when there is none', () => {
  const words = (key: string): string => (key === 'level.level-2.name' ? 'The cave' : key)
  expect(progressLabel(words, 'level-2')).toBe('The cave')
  expect(progressLabel(words, 'level-3')).toBe('level-3')
})

test('a progress label is at most 80 units', () => {
  const long = 'x'.repeat(200)
  const words = (key: string): string => (key === 'level.level-1.name' ? long : key)
  expect(progressLabel(words, 'level-1')).toHaveLength(80)
})

// Doors and what is remembered (plan W, task 12).
const LEVELS = ['room-1', 'room-2', 'room-3'] as const

test('a version 1 save, which holds only the level, reads under version 2 as it is', async () => {
  const def = progressDef('crate-game')
  const old = { format: 1, version: 1, savedAt: 1, data: { level: 'room-2' } }
  const saves = createSaves({ def, store: memoryStore({ [slotKey(def, 0)]: JSON.stringify(old) }) })
  expect(await saves.load(0)).toMatchObject({ ok: true, data: { level: 'room-2' } })
})

test('the save takes where the player was last and what was done for good, and refuses anything else', () => {
  const { schema } = progressDef('crate-game')
  const full = { level: 'room-2', last: { level: 'room-3', x: 1, y: 7.5 }, facts: ['room-2.gate-1.open'] }
  expect(schema.safeParse(full).success).toBe(true)
  expect(schema.safeParse({ level: 'room-2', last: { level: 'room-2', thing: 'door-in' } }).success).toBe(
    true,
  )
  for (const bad of [
    { level: 'room-2', last: { level: 'room-3', extra: 1 } },
    { level: 'room-2', last: { thing: 'door-in' } },
    { level: 'room-2', facts: [1] },
    { level: 'room-2', facts: 'room-2.gate-1.open' },
  ])
    expect(schema.safeParse(bad).success, JSON.stringify(bad)).toBe(false)
})

test('a game with a save of its own takes the two fields from progressFields', () => {
  const schema = z.strictObject({ level: z.string(), coins: z.number(), ...progressFields })
  expect(schema.safeParse({ level: 'room-1', coins: 2 }).success).toBe(true)
  expect(
    schema.safeParse({ level: 'room-1', coins: 2, last: { level: 'room-3', x: 1, y: 2 }, facts: ['a'] })
      .success,
  ).toBe(true)
})

test('cameIn writes where the player came in, and is the very same object when it is already so', () => {
  const data: Progress = { level: 'room-2' }
  const through = cameIn(data, { level: 'room-2', thing: 'door-in' })
  expect(through).toEqual({ level: 'room-2', last: { level: 'room-2', thing: 'door-in' } })
  expect(cameIn(through, { level: 'room-2', thing: 'door-in' })).toBe(through)
  expect(cameIn(through, { level: 'room-3', x: 1, y: 7.5 }).last).toEqual({ level: 'room-3', x: 1, y: 7.5 })
  expect(data).toEqual({ level: 'room-2' })
})

test('remembered keeps each fact once, sorted, and is the very same object for one it knows', () => {
  const base: Progress = { level: 'room-1' }
  const first = remembered(base, 'room-2.gate-1.open')
  const both = remembered(first, 'room-1.gate-1.open')
  expect(both.facts).toEqual(['room-1.gate-1.open', 'room-2.gate-1.open'])
  expect(remembered(both, 'room-2.gate-1.open')).toBe(both)
})

test('Continue opens where the player was last, beside the door or at the spot, else the level reached, else the start', () => {
  const at = (data: Progress) => continueAt(data, LEVELS, 'room-1')
  expect(at({ level: 'room-1' })).toEqual({ level: 'room-1' })
  expect(at({ level: 'room-2', last: { level: 'room-2', thing: 'door-in' } })).toEqual({
    level: 'room-2',
    arrive: { thing: 'door-in' },
  })
  expect(at({ level: 'room-2', last: { level: 'room-3', x: 1, y: 7.5 } })).toEqual({
    level: 'room-3',
    arrive: { x: 1, y: 7.5 },
  })
  // A level the game dropped: the level reached, and when that is gone too, the start.
  expect(at({ level: 'room-2', last: { level: 'gone', thing: 'x' } })).toEqual({ level: 'room-2' })
  expect(at({ level: 'gone', last: { level: 'gone-too', x: 1, y: 1 } })).toEqual({ level: 'room-1' })
})

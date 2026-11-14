// Save slots: what a saves screen lists, what "Continue" loads, and the promise that nothing here loses a save by
// itself. Every test runs on a store in memory with a clock that counts up, so dates are exact.
import { expect, test, vi } from 'vitest'
import { z } from 'zod'
import { defineSave } from '#src/features/saves/define.ts'
import { writeEnvelope } from '#src/features/saves/envelope.ts'
import {
  createSaves,
  latestSlot,
  memoryStore,
  type SaveDef,
  type SlotState,
} from '#src/features/saves/saves.ts'
import { type Progress, progress } from '../../fixtures/saves/progress.ts'

const T0 = 1700000000000
/** A clock that counts up from `T0` by 1000 each time it is asked. */
function counter(): () => number {
  let next = T0 - 1000
  return () => {
    next += 1000
    return next
  }
}
function setup(def: SaveDef<Progress> = progress, initial: Record<string, string> = {}) {
  const store = memoryStore(initial)
  return { store, saves: createSaves({ def, store, now: counter() }) }
}
const level2: Progress = { level: 'level-2', doors: 1 }
const key = (n: number): string => `automata.fixture-game.save.${n}`

test('a new game lists three empty slots, in order', async () => {
  const { saves } = setup()
  expect(await saves.list()).toEqual({
    ok: true,
    value: [
      { slot: 0, kind: 'empty' },
      { slot: 1, kind: 'empty' },
      { slot: 2, kind: 'empty' },
    ],
  })
})

test('a saved slot lists as ready with its date and label, and loads back', async () => {
  const { saves } = setup()
  expect(await saves.save(1, level2, { label: 'Level 2' })).toEqual({ ok: true })
  expect(await saves.list()).toEqual({
    ok: true,
    value: [
      { slot: 0, kind: 'empty' },
      { slot: 1, kind: 'ready', savedAt: T0, label: 'Level 2' },
      { slot: 2, kind: 'empty' },
    ],
  })
  expect(await saves.load(1)).toEqual({ ok: true, data: level2, savedAt: T0, label: 'Level 2' })
  // No label given: none listed, none loaded.
  await saves.save(0, level2)
  expect(await saves.load(0)).toEqual({ ok: true, data: level2, savedAt: T0 + 1000 })
})

test('save writes exactly the canonical envelope under the slot key', async () => {
  const { saves, store } = setup()
  await saves.save(1, level2)
  expect(store.entries()[key(1)]).toBe(
    '{"data":{"doors":1,"level":"level-2"},"format":1,"savedAt":1700000000000,"version":2}',
  )
  expect(Object.keys(store.entries())).toEqual([key(1)])
})

test('an empty slot loads as null, not as a problem', async () => {
  const { saves } = setup()
  expect(await saves.load(2)).toEqual({ ok: true, data: null })
})

test('a version 1 save lists as ready and loads upgraded; the stored text is not changed by loading', async () => {
  const old = writeEnvelope({ format: 1, version: 1, savedAt: 5, data: { level: 'level-1' } })
  const { saves, store } = setup(progress, { [key(0)]: old })
  expect(await saves.list()).toEqual({
    ok: true,
    value: [
      { slot: 0, kind: 'ready', savedAt: 5 },
      { slot: 1, kind: 'empty' },
      { slot: 2, kind: 'empty' },
    ],
  })
  expect(await saves.load(0)).toEqual({ ok: true, data: { level: 'level-1', doors: 0 }, savedAt: 5 })
  expect(store.entries()[key(0)]).toBe(old)
})

/** A game at version 3 that only knows how to upgrade from 1: slot 0 is newer, 1 too old, 2 damaged. */
function troubled() {
  const def = defineSave<Progress>({
    game: 'fixture-game',
    version: 3,
    slots: 3,
    schema: z.strictObject({ level: z.string(), doors: z.number().int().min(0) }),
    upgrades: { 1: (data: unknown): unknown => ({ ...(data as object), doors: 0 }) },
  })
  const text = [
    writeEnvelope({ format: 1, version: 4, savedAt: 1, data: { future: true } }),
    writeEnvelope({ format: 1, version: 2, savedAt: 2, data: { level: 'level-1', doors: 0 } }),
    '{"oops',
  ]
  const initial = Object.fromEntries(text.map((t, n) => [key(n), t]))
  return { ...setup(def, initial), text }
}

test('a newer, a too-old and a damaged slot each list with their problem and do not load', async () => {
  const { saves } = troubled()
  const problems = [
    { kind: 'newer', version: 4 },
    { kind: 'too-old', version: 2 },
    { kind: 'damaged', detail: 'This is not JSON.' },
  ] as const
  expect(await saves.list()).toEqual({
    ok: true,
    value: problems.map((problem, slot) => ({ slot, kind: problem.kind, problem })),
  })
  for (const [slot, problem] of problems.entries())
    expect(await saves.load(slot)).toEqual({ ok: false, problem })
})

test('save does not write over a damaged, newer or too-old slot', async () => {
  const { saves, store, text } = troubled()
  for (const slot of [0, 1, 2]) {
    const answer = await saves.save(slot, level2)
    expect(answer.ok, `slot ${slot}`).toBe(false)
    // The answer is that slot's own problem, and the text is byte for byte what it was.
    expect(answer).toEqual(await saves.load(slot))
    expect(store.entries()[key(slot)], `slot ${slot}`).toBe(text[slot])
  }
})

test('with replace, save writes over it', async () => {
  const { saves, store, text } = troubled()
  for (const slot of [0, 1, 2]) {
    const data = { level: 'level-3', doors: slot }
    expect(await saves.save(slot, data, { replace: true })).toEqual({ ok: true })
    expect(store.entries()[key(slot)]).not.toBe(text[slot])
    // Written at this build's version (3), so it loads as it was given.
    expect(await saves.load(slot)).toMatchObject({ ok: true, data })
  }
})

test('erase empties a slot, whatever was in it', async () => {
  const { saves, store } = troubled()
  for (const slot of [0, 1, 2]) {
    expect(await saves.erase(slot)).toEqual({ ok: true, value: undefined })
    expect(await saves.load(slot)).toEqual({ ok: true, data: null })
  }
  expect(store.entries()).toEqual({})
})

test('list reads the host afresh each time', async () => {
  const { saves, store } = setup()
  expect(await saves.list()).toMatchObject({
    ok: true,
    value: [{ kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' }],
  })
  // A value put in behind the saves' back, the way another page of the same game would.
  await store.set(key(2), writeEnvelope({ format: 1, version: 2, savedAt: 9, data: level2 }))
  expect(await saves.list()).toMatchObject({
    ok: true,
    value: [{ kind: 'empty' }, { kind: 'empty' }, { kind: 'ready', savedAt: 9 }],
  })
})

test('a refused store: list, load, save and erase all say so', async () => {
  const { saves, store } = setup()
  store.refuse('unavailable')
  const refusal = { refusal: 'unavailable', detail: 'The test store was told to refuse.' }
  expect(await saves.check()).toEqual({ ok: false, ...refusal })
  expect(await saves.list()).toEqual({ ok: false, ...refusal })
  expect(await saves.load(0)).toEqual({ ok: false, problem: { kind: 'refused', ...refusal } })
  expect(await saves.save(0, level2)).toEqual({ ok: false, problem: { kind: 'refused', ...refusal } })
  expect(await saves.erase(0)).toEqual({ ok: false, ...refusal })
  // Nothing was kept anywhere else: once the host lets calls through, the slot is still empty.
  store.refuse(undefined)
  expect(await saves.load(0)).toEqual({ ok: true, data: null })
})

test('a refused write leaves the save that was there whole', async () => {
  const { saves, store } = setup()
  await saves.save(0, level2)
  const before = store.entries()[key(0)]
  // The slot is read first and a read is let through; only the write is refused.
  const set = store.set.bind(store)
  store.set = async (k, v) => {
    store.refuse('full')
    return set(k, v)
  }
  expect(await saves.save(0, { level: 'level-3', doors: 5 })).toMatchObject({
    ok: false,
    problem: { kind: 'refused', refusal: 'full' },
  })
  store.refuse(undefined)
  expect(store.entries()[key(0)]).toBe(before)
})

test('a slot number that is not one of the slots throws', async () => {
  const { saves } = setup()
  await expect(saves.load(3)).rejects.toThrow(new RangeError('This game has slots 0 to 2. Got 3.'))
  await expect(saves.save(-1, level2)).rejects.toThrow(RangeError)
  await expect(saves.erase(1.5)).rejects.toThrow(RangeError)
})

test('data that is not what the game saves throws before anything is written', async () => {
  const { saves, store } = setup()
  await expect(saves.save(0, { level: 7 } as never)).rejects.toThrow(RangeError)
  expect(store.entries()).toEqual({})
})

test('data JSON cannot keep throws in plain words before anything is written', async () => {
  const def = defineSave({ game: 'fixture-game', version: 1, slots: 1, schema: z.object({ at: z.date() }) })
  const store = memoryStore()
  const saves = createSaves({ def, store })
  const error = await saves.save(0, { at: new Date() }).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(RangeError)
  const message = (error as Error).message
  expect(
    message.startsWith('A save holds plain data only (text, numbers, true or false, lists and objects).'),
  ).toBe(true)
  expect(message).toContain('unsupported Date')
  expect(store.entries()).toEqual({})
})

test('save finishes without waiting on a timer, an event or a frame', async () => {
  vi.useFakeTimers()
  try {
    const { saves, store } = setup()
    // The fake timers never advance: if any step waited on one, this would hang.
    expect(await saves.save(0, level2)).toEqual({ ok: true })
    expect(Object.keys(store.entries())).toEqual([key(0)])
  } finally {
    vi.useRealTimers()
  }
})

test('latestSlot picks the ready slot saved last', () => {
  const ready = (slot: number, savedAt: number): SlotState => ({ slot, kind: 'ready', savedAt })
  const empty = (slot: number): SlotState => ({ slot, kind: 'empty' })
  expect(latestSlot([empty(0), empty(1)])).toBeUndefined()
  expect(latestSlot([ready(0, 5), empty(1), ready(2, 9)])).toBe(2)
  expect(latestSlot([ready(0, 9), ready(1, 9), ready(2, 3)])).toBe(0)
  const damaged: SlotState = { slot: 1, kind: 'damaged', problem: { kind: 'damaged', detail: 'x' } }
  expect(latestSlot([damaged, ready(2, 1)])).toBe(2)
  expect(latestSlot([damaged])).toBeUndefined()
})

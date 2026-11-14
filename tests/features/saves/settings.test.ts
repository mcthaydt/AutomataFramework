// Settings are one record per game, with a section per feature (sound, controls, language). Losing a preference is
// acceptable, losing progress is not, so the rules here are the gentler ones: a section that cannot be read starts
// again from its first values. A value the player just chose is still kept in the game even if the host will not.
import { expect, test } from 'vitest'
import { z } from 'zod'
import { memoryStore, openSettings, type SaveStore, type SettingsSection } from '#src/features/saves/saves.ts'

const KEY = 'automata.fixture-game.settings'
const sound: SettingsSection<{ music: number }> = {
  name: 'sound',
  schema: z.strictObject({ music: z.number().min(0).max(1) }),
  initial: { music: 0.8 },
}
const open = (store: SaveStore = memoryStore()) => openSettings({ game: 'fixture-game', store })

test("a new player gets each section's first values, and nothing is written until something is set", async () => {
  const store = memoryStore()
  const settings = await open(store)
  expect(settings.problem).toBeUndefined()
  expect(settings.section(sound).get()).toEqual({ music: 0.8 })
  expect(store.entries()).toEqual({})
})

test('a set value is there at once, is stored, and is there the next time the settings are opened', async () => {
  const store = memoryStore()
  const handle = (await open(store)).section(sound)
  const done = handle.set({ music: 0.5 })
  expect(handle.get()).toEqual({ music: 0.5 })
  expect(await done).toEqual({ ok: true, value: undefined })
  expect(store.entries()[KEY]).toBe('{"format":1,"sections":{"sound":{"music":0.5}}}')
  expect((await open(store)).section(sound).get()).toEqual({ music: 0.5 })
})

test('the same name gives the same handle', async () => {
  const settings = await open()
  expect(settings.section(sound)).toBe(settings.section(sound))
})

test('listeners hear each set, and not after they stop listening', async () => {
  const handle = (await open()).section(sound)
  const heard: number[] = []
  const stop = handle.onChange((value) => heard.push(value.music))
  await handle.set({ music: 0.1 })
  await handle.set({ music: 0.2 })
  stop()
  await handle.set({ music: 0.3 })
  expect(heard).toEqual([0.1, 0.2])
})

test('setting one section keeps the others, known or not', async () => {
  const store = memoryStore({ [KEY]: '{"format":1,"sections":{"controls":{"jump":"Space"}}}' })
  const handle = (await open(store)).section(sound)
  await handle.set({ music: 0.5 })
  // The "controls" section was never registered by this test: it is kept, untouched, and written back.
  expect(store.entries()[KEY]).toBe(
    '{"format":1,"sections":{"controls":{"jump":"Space"},"sound":{"music":0.5}}}',
  )
})

test('a section stored in a shape its schema refuses starts again from its first values', async () => {
  const store = memoryStore({ [KEY]: '{"format":1,"sections":{"sound":{"music":"loud"}}}' })
  const settings = await open(store)
  expect(settings.section(sound).get()).toEqual({ music: 0.8 })
  expect(settings.problem).toBeUndefined()
})

test('settings that cannot be read: every section starts from its first values, and problem says why', async () => {
  const damaged = await open(memoryStore({ [KEY]: 'not json' }))
  expect(damaged.problem).toEqual({ kind: 'damaged', detail: 'This is not JSON.' })
  expect(damaged.section(sound).get()).toEqual({ music: 0.8 })
  const shapeless = await open(memoryStore({ [KEY]: '{"format":1,"sections":[]}' }))
  expect(shapeless.problem?.kind).toBe('damaged')
  const refusing = memoryStore()
  refusing.refuse('unavailable')
  const refused = await open(refusing)
  expect(refused.problem).toEqual({
    kind: 'refused',
    refusal: 'unavailable',
    detail: 'The test store was told to refuse.',
  })
  expect(refused.section(sound).get()).toEqual({ music: 0.8 })
})

test('settings damaged on open are written over by the first set', async () => {
  const store = memoryStore({ [KEY]: 'not json' })
  await (await open(store)).section(sound).set({ music: 0.2 })
  expect(store.entries()[KEY]).toBe('{"format":1,"sections":{"sound":{"music":0.2}}}')
})

test('a refused write says so, and the value is still the one set', async () => {
  const store = memoryStore()
  const handle = (await open(store)).section(sound)
  store.refuse('full')
  expect(await handle.set({ music: 0.4 })).toEqual({
    ok: false,
    refusal: 'full',
    detail: 'The test store was told to refuse.',
  })
  // The player hears the new volume now; a screen says it was not kept.
  expect(handle.get()).toEqual({ music: 0.4 })
  expect(store.entries()).toEqual({})
})

test('two sets in a row leave the second one stored', async () => {
  const inner = memoryStore()
  let first = true
  const slowFirst: SaveStore = {
    check: () => inner.check(),
    get: (key) => inner.get(key),
    remove: (key) => inner.remove(key),
    async set(key, value) {
      // The first write is slow to finish; the second must not overtake it.
      if (first) {
        first = false
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
      return inner.set(key, value)
    },
  }
  const handle = (await open(slowFirst)).section(sound)
  void handle.set({ music: 0.1 })
  await handle.set({ music: 0.9 })
  expect(inner.entries()[KEY]).toBe('{"format":1,"sections":{"sound":{"music":0.9}}}')
})

test('a value its schema refuses throws and changes nothing', async () => {
  const store = memoryStore()
  const handle = (await open(store)).section(sound)
  const heard: unknown[] = []
  handle.onChange((value) => heard.push(value))
  await expect(handle.set({ music: 7 })).rejects.toThrow(RangeError)
  expect(handle.get()).toEqual({ music: 0.8 })
  expect(heard).toEqual([])
  expect(store.entries()).toEqual({})
})

test('a value JSON cannot keep throws and changes nothing', async () => {
  const when: SettingsSection<{ at: Date }> = {
    name: 'when',
    schema: z.object({ at: z.date() }),
    initial: { at: new Date(0) },
  }
  const store = memoryStore()
  const handle = (await open(store)).section(when)
  const error = await handle.set({ at: new Date(5) }).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(RangeError)
  expect((error as Error).message).toContain('A save holds plain data only')
  expect(handle.get().at.getTime()).toBe(0)
  expect(store.entries()).toEqual({})
})

test('get gives a frozen value', async () => {
  const handle = (await open()).section(sound)
  expect(Object.isFrozen(handle.get())).toBe(true)
  await handle.set({ music: 0.5 })
  expect(Object.isFrozen(handle.get())).toBe(true)
  // The section's own first values are not frozen for it: they are copied.
  expect(Object.isFrozen(sound.initial)).toBe(false)
})

test('a bad section name throws', async () => {
  const settings = await open()
  expect(() => settings.section({ ...sound, name: 'Sound FX' })).toThrow(RangeError)
  expect(() => settings.section({ ...sound, name: '' })).toThrow(/1 to 40 of a-z/)
})

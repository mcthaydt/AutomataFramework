// The storage port is how a game keeps text through a host. The store in memory is what the test host and the tests
// use: it behaves like a good host, and can be told to refuse like a bad one.
import { expect, test } from 'vitest'
import { memoryStore } from '#src/features/saves/saves.ts'

test('a value set is the value got, and a key never set is null', async () => {
  const store = memoryStore()
  expect(await store.get('a')).toEqual({ ok: true, value: null })
  expect(await store.set('a', '1')).toEqual({ ok: true, value: undefined })
  expect(await store.get('a')).toEqual({ ok: true, value: '1' })
})

test('remove makes a key null again, and removing a missing key is fine', async () => {
  const store = memoryStore({ a: '1' })
  expect(await store.remove('a')).toEqual({ ok: true, value: undefined })
  expect(await store.get('a')).toEqual({ ok: true, value: null })
  expect(await store.remove('never-set')).toEqual({ ok: true, value: undefined })
})

test('check says yes', async () => {
  expect(await memoryStore().check()).toEqual({ ok: true, value: undefined })
})

test('initial values are there from the start', async () => {
  expect(await memoryStore({ a: '1' }).get('a')).toEqual({ ok: true, value: '1' })
})

test('told to refuse, every call answers that refusal and nothing changes', async () => {
  const store = memoryStore({ a: '1' })
  store.refuse('full')
  const refused = { ok: false, refusal: 'full', detail: 'The test store was told to refuse.' }
  expect(await store.set('a', '2')).toEqual(refused)
  expect(await store.get('a')).toEqual(refused)
  expect(await store.remove('a')).toEqual(refused)
  expect(await store.check()).toEqual(refused)
  expect(store.entries()).toEqual({ a: '1' })
  store.refuse(undefined)
  expect(await store.get('a')).toEqual({ ok: true, value: '1' })
})

test('entries is a copy: changing it changes nothing', async () => {
  const store = memoryStore({ a: '1' })
  const entries = store.entries() as Record<string, string>
  entries.a = '2'
  entries.b = '3'
  expect(store.entries()).toEqual({ a: '1' })
})

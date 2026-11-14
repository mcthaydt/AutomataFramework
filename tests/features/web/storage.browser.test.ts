// The browser's `localStorage` as a save store. These run in the three real browsers against their real storage; the
// browser's "no" (a blocked or full storage) is made with a made-up Storage, since a test cannot make a browser say it.
// Test files can run at the same time in one browser and share its `localStorage`, so every key here starts
// `automata.web-storage-test.` and nothing here reads a key another file writes.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { webStore } from '#src/features/web/storage.ts'

const P = 'automata.web-storage-test.'
const clear = (): void => {
  for (const key of Object.keys(localStorage)) if (key.startsWith(P)) localStorage.removeItem(key)
}
beforeEach(clear)
afterEach(clear)

/** A Storage that does what `real` does except for the calls it is given, and writes down every write. */
function wrapped(real: Storage, over: Partial<Pick<Storage, 'setItem' | 'getItem' | 'removeItem'>> = {}) {
  const calls: string[] = []
  const storage = {
    getItem: (key: string) => real.getItem(key),
    setItem(key: string, value: string) {
      calls.push(`set ${key}`)
      real.setItem(key, value)
    },
    removeItem(key: string) {
      calls.push(`remove ${key}`)
      real.removeItem(key)
    },
    ...over,
  } as unknown as Storage
  return { storage, calls }
}

test('a value set is in the real localStorage under that key, and comes back', async () => {
  const store = webStore(() => localStorage)
  expect(await store.set(`${P}a`, '{"x":1}')).toEqual({ ok: true, value: undefined })
  expect(localStorage.getItem(`${P}a`)).toBe('{"x":1}')
  expect(await store.get(`${P}a`)).toEqual({ ok: true, value: '{"x":1}' })
})

test('a key never set is null; remove makes it null again', async () => {
  const store = webStore(() => localStorage)
  expect(await store.get(`${P}never`)).toEqual({ ok: true, value: null })
  await store.set(`${P}a`, '1')
  expect(await store.remove(`${P}a`)).toEqual({ ok: true, value: undefined })
  expect(await store.get(`${P}a`)).toEqual({ ok: true, value: null })
  expect(localStorage.getItem(`${P}a`)).toBeNull()
})

test('check says yes, and leaves nothing behind', async () => {
  // Recorded over a Storage that passes each call to the real one: reading the real `automata.check` back would race
  // the pages of other test files, which call check too.
  const { storage, calls } = wrapped(localStorage)
  expect(await webStore(() => storage).check()).toEqual({ ok: true, value: undefined })
  expect(calls).toEqual(['set automata.check', 'remove automata.check'])
})

test('the write is done before the promise is', async () => {
  const pending = webStore(() => localStorage).set(`${P}a`, '1')
  // Nothing has been awaited: a save asked for as the page closes is already kept.
  expect(localStorage.getItem(`${P}a`)).toBe('1')
  await pending
})

test('a browser that will not hand over its storage: every call answers unavailable', async () => {
  const store = webStore(() => {
    throw new DOMException('The operation is insecure.', 'SecurityError')
  })
  const no = { ok: false, refusal: 'unavailable', detail: 'The operation is insecure.' }
  expect(await store.check()).toEqual(no)
  expect(await store.get(`${P}a`)).toEqual(no)
  expect(await store.set(`${P}a`, '1')).toEqual(no)
  expect(await store.remove(`${P}a`)).toEqual(no)
})

test('a storage whose own calls say SecurityError is unavailable too', async () => {
  const { storage } = wrapped(localStorage, {
    getItem: () => {
      throw new DOMException('Blocked.', 'SecurityError')
    },
  })
  expect(await webStore(() => storage).get(`${P}a`)).toEqual({
    ok: false,
    refusal: 'unavailable',
    detail: 'Blocked.',
  })
})

test('nothing is kept when the browser refuses', async () => {
  let allowed = false
  const store = webStore(() => {
    if (!allowed) throw new DOMException('The operation is insecure.', 'SecurityError')
    return localStorage
  })
  expect(await store.set(`${P}a`, '1')).toMatchObject({ ok: false, refusal: 'unavailable' })
  // No copy in memory: a read is refused too, and once the browser lets the page in, there is nothing there.
  expect(await store.get(`${P}a`)).toMatchObject({ ok: false, refusal: 'unavailable' })
  allowed = true
  expect(await store.get(`${P}a`)).toEqual({ ok: true, value: null })
})

test('a full storage answers full, and what was there before is still there', async () => {
  localStorage.setItem(`${P}a`, 'before')
  const { storage } = wrapped(localStorage, {
    setItem: () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    },
  })
  const store = webStore(() => storage)
  expect(await store.set(`${P}a`, 'after')).toEqual({
    ok: false,
    refusal: 'full',
    detail: 'The quota has been exceeded.',
  })
  expect(await store.check()).toMatchObject({ ok: false, refusal: 'full' })
  expect(localStorage.getItem(`${P}a`)).toBe('before')
})

test("any other error answers failed with the error's words", async () => {
  const { storage } = wrapped(localStorage, {
    setItem: () => {
      throw new Error('The disk is on fire.')
    },
  })
  expect(await webStore(() => storage).set(`${P}a`, '1')).toEqual({
    ok: false,
    refusal: 'failed',
    detail: 'The disk is on fire.',
  })
})

// Audit M1: a browser that hands over no storage at all is "off", not a surprise: the title screen says saving is off
// only for `unavailable`.
test('a getter that throws anything at all answers unavailable', async () => {
  const store = webStore(() => {
    throw new Error('no storage here')
  })
  expect(await store.set(`${P}a`, '1')).toEqual({
    ok: false,
    refusal: 'unavailable',
    detail: 'no storage here',
  })
  expect(await store.check()).toMatchObject({ ok: false, refusal: 'unavailable' })
})

test('a browser whose storage is switched off (null) answers unavailable', async () => {
  const store = webStore(() => null as unknown as Storage)
  for (const answer of [
    await store.get(`${P}a`),
    await store.set(`${P}a`, '1'),
    await store.remove(`${P}a`),
    await store.check(),
  ])
    expect(answer).toMatchObject({ ok: false, refusal: 'unavailable' })
})

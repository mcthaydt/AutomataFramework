// The web host reads one thing about the page: is it on screen. A made-up document stands in, so a test can hide it.
import { expect, test, vi } from 'vitest'
import { type WebSeams, webHost } from '#src/features/web/web.ts'

/** A document that only knows what the host asks of it. */
function fakeDocument(state: DocumentVisibilityState): {
  doc: Document
  set(next: DocumentVisibilityState): void
} {
  const events = new EventTarget()
  const doc = Object.assign(events, { visibilityState: state }) as unknown as Document & {
    visibilityState: DocumentVisibilityState
  }
  return {
    doc,
    set(next) {
      ;(doc as { visibilityState: DocumentVisibilityState }).visibilityState = next
      events.dispatchEvent(new Event('visibilitychange'))
    },
  }
}

test('it says it is the web', () => {
  expect(webHost({ document: fakeDocument('visible').doc }).target).toBe('web')
})

test('visible() follows the page', () => {
  const { doc, set } = fakeDocument('visible')
  const host = webHost({ document: doc })
  expect(host.visible()).toBe(true)
  set('hidden')
  expect(host.visible()).toBe(false)
})

test('listeners hear about changes, and not after they stop listening', () => {
  const { doc, set } = fakeDocument('visible')
  const heard = vi.fn()
  const stop = webHost({ document: doc }).onVisibility(heard)
  set('hidden')
  set('visible')
  expect(heard.mock.calls).toEqual([[false], [true]])
  stop()
  set('hidden')
  expect(heard).toHaveBeenCalledTimes(2)
})

test('the real document works too', () => {
  expect(typeof webHost().visible()).toBe('boolean')
})

/** What the page's navigator says, and a `window.open` and a storage a test can look at. */
function seams(overrides: Partial<WebSeams> = {}): WebSeams {
  const kept = new Map<string, string>()
  const storage = {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => void kept.set(key, value),
    removeItem: (key: string) => void kept.delete(key),
  } as unknown as Storage
  return {
    document: fakeDocument('visible').doc,
    navigator: { language: 'en', languages: ['en'] },
    open: () => ({ opener: 'the game' }),
    storage: () => storage,
    ...overrides,
  }
}

test("it has no language of its own, and gives the browser's list", () => {
  const host = webHost(seams({ navigator: { language: 'es-MX', languages: ['es-MX', 'en'] } }))
  expect(host.language()).toBeUndefined()
  expect(host.deviceLanguages()).toEqual(['es-MX', 'en'])
})

test("with an empty list it gives the browser's one language", () => {
  expect(webHost(seams({ navigator: { language: 'pt-BR', languages: [] } })).deviceLanguages()).toEqual([
    'pt-BR',
  ])
})

test('an https link opens in a new tab and the tab cannot reach back', async () => {
  const tab = { opener: 'the game' as unknown }
  const open = vi.fn(() => tab)
  expect(await webHost(seams({ open })).openLink('https://example.com/a')).toBe('opened')
  expect(open).toHaveBeenCalledExactlyOnceWith('https://example.com/a', '_blank')
  expect(tab.opener).toBeNull()
})

test('a blocked tab answers blocked; an address that is not https opens nothing', async () => {
  const blocked = webHost(seams({ open: () => null }))
  expect(await blocked.openLink('https://example.com')).toBe('blocked')
  const open = vi.fn(() => ({ opener: null as unknown }))
  const host = webHost(seams({ open }))
  expect(await host.openLink('http://example.com')).toBe('refused')
  expect(await host.openLink('javascript:alert(1)')).toBe('refused')
  expect(open).not.toHaveBeenCalled()
})

test('there is nowhere to quit to', async () => {
  const host = webHost(seams())
  expect(host.canQuit).toBe(false)
  expect(await host.quit()).toBe(false)
})

test("its saves are the browser's storage", async () => {
  const kept = new Map<string, string>()
  const storage = {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => void kept.set(key, value),
    removeItem: (key: string) => void kept.delete(key),
  } as unknown as Storage
  const host = webHost(seams({ storage: () => storage }))
  expect(await host.store.set('automata.x.save.0', '{}')).toEqual({ ok: true, value: undefined })
  expect(kept.get('automata.x.save.0')).toBe('{}')
})

test('with no seams it reads the real page', () => {
  const host = webHost()
  expect(typeof host.visible()).toBe('boolean')
  expect(Array.isArray(host.deviceLanguages())).toBe(true)
})

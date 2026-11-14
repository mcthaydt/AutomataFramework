// The web host reads one thing about the page: is it on screen. A made-up document stands in, so a test can hide it.
import { expect, test, vi } from 'vitest'
import { webHost } from '#src/features/web/web.ts'

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
  expect(webHost(fakeDocument('visible').doc).target).toBe('web')
})

test('visible() follows the page', () => {
  const { doc, set } = fakeDocument('visible')
  const host = webHost(doc)
  expect(host.visible()).toBe(true)
  set('hidden')
  expect(host.visible()).toBe(false)
})

test('listeners hear about changes, and not after they stop listening', () => {
  const { doc, set } = fakeDocument('visible')
  const heard = vi.fn()
  const stop = webHost(doc).onVisibility(heard)
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

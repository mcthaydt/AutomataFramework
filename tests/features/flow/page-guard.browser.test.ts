// The page holds still under the game (plan Q, call 12): the page does not scroll or bounce, a double tap does not zoom,
// a long press selects no text, a list inside Settings still scrolls, and `stop()` puts every style back.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { guardPage } from '#src/features/flow/page-guard.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

const styles = (): string[] =>
  [document.documentElement, document.body, drive.mount].map((one) => one.getAttribute('style') ?? '')

/** A finger drags from `from` to `to` over the mount. */
function swipe(from: [number, number], to: [number, number]): void {
  const event = (type: string, at: [number, number]): PointerEvent =>
    new PointerEvent(type, {
      pointerId: 7,
      pointerType: 'touch',
      clientX: at[0],
      clientY: at[1],
      bubbles: true,
      cancelable: true,
    })
  drive.mount.dispatchEvent(event('pointerdown', from))
  drive.mount.dispatchEvent(event('pointermove', to))
  drive.mount.dispatchEvent(event('pointerup', to))
}

test('the mount says no touch gestures, no selection and no callout; the page says no rubber band and no scroll', async () => {
  await drive.open()
  const mount = getComputedStyle(drive.mount)
  expect(mount.touchAction).toBe('none')
  expect(mount.userSelect).toBe('none')
  expect(getComputedStyle(document.documentElement).overscrollBehaviorY).toBe('none')
  expect(getComputedStyle(document.documentElement).overflowY).toBe('hidden')
})

test('a swipe up, down and sideways on the game at 390x844 moves neither window.scrollY nor the mount', async () => {
  await drive.toMenu()
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  const box = drive.mount.getBoundingClientRect()
  swipe([200, 700], [200, 100])
  swipe([200, 100], [200, 700])
  swipe([20, 400], [380, 400])
  expect(window.scrollY).toBe(0)
  expect(window.scrollX).toBe(0)
  expect(drive.mount.scrollTop).toBe(0)
  expect(drive.mount.getBoundingClientRect().top).toBe(box.top)
})

test('a double tap does not change visualViewport.scale; a long press selects no text', async () => {
  await drive.toMenu()
  const scale = window.visualViewport?.scale ?? 1
  const tap = (): void => {
    drive.mount.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }))
    drive.mount.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }))
  }
  tap()
  tap()
  expect(window.visualViewport?.scale ?? 1).toBe(scale)
  expect(getComputedStyle(drive.mount).userSelect).toBe('none')
  expect(String(window.getSelection())).toBe('')
})

test('a list inside Settings still scrolls', async () => {
  await drive.toMenu()
  await drive.press(es('automata.menu.settings'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="settings"]')).not.toBeNull()
  const list = [...drive.mount.querySelectorAll<HTMLElement>('[data-screen="settings"] *')].find(
    (one) => getComputedStyle(one).overflowY === 'auto' || getComputedStyle(one).overflowY === 'scroll',
  )
  expect(list).toBeDefined()
  // A scroller is its own: the mount's `touch-action` does not stop it, and the page's `overflow` does not reach it.
  expect(getComputedStyle(list as HTMLElement).touchAction).not.toBe('none')
  expect((list as HTMLElement).scrollHeight).toBeGreaterThan((list as HTMLElement).clientHeight)
  ;(list as HTMLElement).scrollTop = 40
  expect((list as HTMLElement).scrollTop).toBeGreaterThan(0)
})

test("stop() puts the document's and the mount's styles back exactly", async () => {
  document.documentElement.style.setProperty('overflow', 'scroll', 'important')
  document.body.style.setProperty('overscroll-behavior', 'contain')
  drive.mount.style.setProperty('user-select', 'text')
  const before = styles()
  const flow = await drive.open()
  expect(styles()).not.toEqual(before)
  flow.stop()
  expect(styles()).toEqual(before)
  document.documentElement.style.removeProperty('overflow')
  document.body.style.removeProperty('overscroll-behavior')
})

test('a page that is longer than the game (the mount is 300 px high in an article) still scrolls outside the mount', () => {
  const article = document.createElement('div')
  article.style.cssText = 'height:2000px'
  const small = document.createElement('div')
  small.style.cssText = 'height:300px'
  article.append(small)
  document.body.append(article)
  const before = styles()
  const stop = guardPage(small)
  expect(getComputedStyle(document.documentElement).overflowY).not.toBe('hidden')
  expect(small.style.getPropertyValue('touch-action')).toBe('none')
  expect(small.style.getPropertyValue('user-select')).toBe('none')
  // Only a browser that knows the property keeps it (the iPhone's does; a desktop's does not).
  if (CSS.supports('-webkit-touch-callout', 'none'))
    expect(small.style.getPropertyValue('-webkit-touch-callout')).toBe('none')
  window.scrollTo(0, 100)
  expect(window.scrollY).toBeGreaterThan(0)
  window.scrollTo(0, 0)
  stop()
  expect(styles()).toEqual(before)
  article.remove()
})

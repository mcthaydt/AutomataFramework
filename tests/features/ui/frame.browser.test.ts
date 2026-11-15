// The frame measures its own box and lays the screen out by it; turning the phone changes the layout and keeps the focus.
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { Sheet } from '../../fixtures/ui/sheet.ts'

let target: HTMLDivElement
let sheet: ReturnType<typeof mount> | undefined

beforeEach(() => {
  target = document.createElement('div')
  target.style.cssText = 'position:fixed;inset:0'
  document.body.append(target)
})
afterEach(() => {
  if (sheet !== undefined) void unmount(sheet)
  sheet = undefined
  target.remove()
})

function open(): HTMLElement {
  sheet = mount(Sheet, { target, props: { log: () => {} } })
  flushSync()
  return target.querySelector('[data-width]') as HTMLElement
}

const SAYS = [
  ['narrow', 'tall'],
  ['wide', 'tall'],
  ['wide', 'short'],
  ['wide', 'tall'],
  ['wide', 'tall'],
] as const

test.each(SCREENS.map((screen, index) => [...screen, SAYS[index] ?? SAYS[0]] as const))(
  'at %s the frame says how much room it has',
  async (_name, w, h, [width, height]) => {
    await page.viewport(w, h)
    const frame = open()
    await expect.poll(() => [frame.dataset.width, frame.dataset.height]).toEqual([width, height])
  },
)

test('the frame measures its own box, not the window: a small box on a big page is narrow and short', async () => {
  await page.viewport(1280, 720)
  target.style.cssText = 'position:fixed;left:0;top:0;width:360px;height:400px'
  const frame = open()
  await expect.poll(() => [frame.dataset.width, frame.dataset.height]).toEqual(['narrow', 'short'])
})

test('a box that is resized by its style, with no window change, is measured again', async () => {
  await page.viewport(1280, 900)
  target.style.cssText = 'position:fixed;left:0;top:0;width:360px;height:800px'
  const frame = open()
  await expect.poll(() => [frame.dataset.width, frame.dataset.height]).toEqual(['narrow', 'tall'])
  target.style.width = '900px'
  target.style.height = '400px'
  await expect.poll(() => [frame.dataset.width, frame.dataset.height]).toEqual(['wide', 'short'])
})

test('the frame keeps everything inside the box it is given', async () => {
  await page.viewport(390, 844)
  target.style.cssText = 'position:fixed;left:20px;top:30px;width:350px;height:700px'
  const frame = open()
  const box = target.getBoundingClientRect()
  const edge = frame.getBoundingClientRect()
  expect([edge.left, edge.top, edge.width, edge.height]).toEqual([box.left, box.top, box.width, box.height])
})

test('the frame is turned from 390x844 to 844x390: the focused control still has the focus', async () => {
  await page.viewport(390, 844)
  const frame = open()
  await expect.poll(() => [frame.dataset.width, frame.dataset.height]).toEqual(['narrow', 'tall'])
  const focused = document.activeElement as HTMLElement
  expect(focused.textContent?.trim()).toBe('Play')
  const before = focused.getBoundingClientRect()
  await page.viewport(844, 390)
  await expect.poll(() => [frame.dataset.width, frame.dataset.height]).toEqual(['wide', 'short'])
  expect(document.activeElement).toBe(focused)
  expect(focused.isConnected).toBe(true)
  // The buttons that were one under the other are side by side now.
  const buttons = [...target.querySelectorAll('button')]
  const erase = buttons.find((button) => button.textContent?.trim() === 'Erase') as HTMLElement
  expect(erase.getBoundingClientRect().top).toBe(focused.getBoundingClientRect().top)
  expect(before.top).not.toBe(focused.getBoundingClientRect().top)
})

test('the back button is at the top on the leading side and 48 px high', async () => {
  await page.viewport(390, 844)
  const frame = open()
  const back = frame.querySelector('.top button') as HTMLElement
  const box = back.getBoundingClientRect()
  expect(box.height).toBeGreaterThanOrEqual(48)
  expect(box.top).toBeLessThan(80)
  expect(box.left).toBeLessThan(40)
  expect(back.textContent?.trim()).toBe('Back')
})

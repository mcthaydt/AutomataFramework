// The splash: two seconds of the game's own picture or name, ended early by any press, key or pad button, and never
// by one that was already down when it appeared.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { SPLASH_MS, splashScreen } from '#src/features/screens/splash.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'
import { testLocale } from '../../fixtures/screens/locale.ts'
import { keyboard } from '../../fixtures/ui/keys.ts'

const FRAME = 1000 / 60

let mount: HTMLDivElement
let screen: ReturnType<typeof splashScreen> | undefined
let frames: ManualFrames
let fake: FakeGamepads
let done: number

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;inset:0'
  document.body.append(mount)
  frames = manualFrames()
  fake = fakeGamepads()
  fake.connect(0)
  done = 0
})
afterEach(() => {
  screen?.destroy()
  screen = undefined
  mount.remove()
  vi.restoreAllMocks()
})

/** A small painted picture, as the renderer's art makes one: a figure's hero on a transparent ground. */
async function picture(): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 16
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  context.fillStyle = 'rgb(200, 80, 80)'
  context.fillRect(4, 2, 24, 12)
  return await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob as Blob)))
}

function open(options: { name?: string; picture?: Blob } = {}): void {
  const { locale } = testLocale('es')
  screen = splashScreen({
    mount,
    locale,
    frames,
    gamepads: fake.getGamepads,
    name: options.name ?? 'Crate Game',
    ...(options.picture === undefined ? {} : { picture: options.picture }),
    onDone: () => {
      done += 1
    },
  })
}

test('it goes on by itself after 2000 ms of frames, and not at 1999', () => {
  expect(SPLASH_MS).toBe(2000)
  open()
  // The first frame only sets the clock; the others are a hundred and some milliseconds apart.
  frames.at(0)
  for (let ms = 100; ms <= 1900; ms += 100) frames.at(ms)
  frames.at(1999)
  expect(done).toBe(0)
  frames.at(2000)
  expect(done).toBe(1)
  // And it is told once, whatever comes after.
  frames.at(2100)
  frames.at(5000)
  expect(done).toBe(1)
})

test('a tap ends it at once, and onDone is called once', async () => {
  open()
  frames.at(0)
  await userEvent.click(mount)
  expect(done).toBe(1)
  await userEvent.click(mount)
  frames.at(5000)
  expect(done).toBe(1)
})

test('a key ends it at once, and a key held from the last screen does not', async () => {
  open()
  frames.at(0)
  // A held key repeats, as it does when the last screen was ended by it.
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', repeat: true }))
  expect(done).toBe(0)
  await keyboard('{ArrowRight}')
  expect(done).toBe(1)
})

test('a pad button ends it at once', () => {
  open()
  frames.at(0)
  fake.press('south')
  frames.advance(FRAME)
  expect(done).toBe(1)
})

test('the button that closed the picker, still held, does not end it', () => {
  fake.press('south')
  open()
  frames.at(0)
  frames.advance(FRAME)
  frames.advance(FRAME)
  expect(done).toBe(0)
  fake.release('south')
  frames.advance(FRAME)
  expect(done).toBe(0)
  fake.press('south')
  frames.advance(FRAME)
  expect(done).toBe(1)
})

test('a time when the page is hidden is not counted', () => {
  open()
  frames.at(0)
  frames.at(1000)
  // The page is hidden: no frames come. When it is shown again the clock is whatever the display says.
  document.dispatchEvent(new Event('visibilitychange'))
  document.dispatchEvent(new Event('visibilitychange'))
  frames.at(61_000)
  expect(done).toBe(0)
  frames.at(61_999)
  expect(done).toBe(0)
  frames.at(62_000)
  expect(done).toBe(1)
})

test("with no picture the game's name is the heading", async () => {
  await page.viewport(390, 844)
  open({ name: 'Crate Game' })
  await expect.element(page.getByRole('heading', { name: 'Crate Game' })).toBeInTheDocument()
  expect(mount.querySelector('img')).toBeNull()
})

test.each(SCREENS)('at %s the picture is at most 60% of the shorter side', async (_name, w, h) => {
  await page.viewport(w, h)
  open({ picture: await picture() })
  const img = mount.querySelector('img') as HTMLImageElement
  // A screen reader says the game's name for it, and the pixels are kept crisp.
  expect(img.alt).toBe('Crate Game')
  expect(getComputedStyle(img).imageRendering).toBe('pixelated')
  const box = img.getBoundingClientRect()
  const screenBox = (mount.querySelector('.automata-screen') as HTMLElement).getBoundingClientRect()
  const shorter = Math.min(screenBox.width, screenBox.height)
  expect(Math.max(box.width, box.height)).toBeLessThanOrEqual(shorter * 0.6 + 1)
  expect([box.left >= 0, box.top >= 0, box.right <= w, box.bottom <= h]).toEqual([true, true, true, true])
})

test.each(SCREENS)('at %s a long name fits on the screen without scrolling', async (_name, w, h) => {
  await page.viewport(w, h)
  open({ name: 'The Very Long Adventures of the Crate Pushing Hero' })
  const heading = mount.querySelector('h1') as HTMLElement
  const box = heading.getBoundingClientRect()
  expect([box.left >= 0, box.top >= 0, box.right <= w, box.bottom <= h]).toEqual([true, true, true, true])
  const root = document.scrollingElement as Element
  expect([root.scrollWidth <= w, root.scrollHeight <= h]).toEqual([true, true])
})

test('destroy lets go of the picture and the listeners, and is safe to call twice', async () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL')
  open({ picture: await picture() })
  screen?.destroy()
  screen?.destroy()
  expect(revoke).toHaveBeenCalledTimes(1)
  expect(mount.querySelector('.automata-screen')).toBeNull()
  await keyboard('{ArrowRight}')
  frames.at(0)
  expect(done).toBe(0)
})

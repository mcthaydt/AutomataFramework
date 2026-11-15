// A screen's gamepad and keys: the pad walks the controls by where they are, presses the one in focus and goes back,
// and nothing that was held when the screen appeared presses anything on it.
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { menuKeys } from '#src/features/ui/ui.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'
import { keepDrawing } from '../../fixtures/ui/drawing.ts'
import { keyboard } from '../../fixtures/ui/keys.ts'
import { Sheet } from '../../fixtures/ui/sheet.ts'

const FRAME = 1000 / 60

let target: HTMLDivElement
let sheet: ReturnType<typeof mount> | undefined
let keys: ReturnType<typeof menuKeys> | undefined
let fake: FakeGamepads
let frames: ManualFrames
let log: string[]
let sounds: string[]
let backs: number

beforeEach(async () => {
  await page.viewport(390, 844)
  target = document.createElement('div')
  target.style.cssText = 'position:fixed;inset:0'
  document.body.append(target)
  fake = fakeGamepads()
  fake.connect(0)
  frames = manualFrames()
  log = []
  sounds = []
  backs = 0
})
afterEach(async () => {
  keys?.destroy()
  keys = undefined
  if (sheet !== undefined) void unmount(sheet)
  sheet = undefined
  target.remove()
  // A key a test left held must not follow the next test.
  await keyboard('{/Enter}')
  await keyboard('{/Space}')
})

/** The sheet, with its keys made at the same moment, as a screen does. */
function open(): void {
  sheet = mount(Sheet, { target, props: { log: (what) => log.push(what) } })
  // Mounting leaves its effects (the first focus, the first measure) for later; a test wants them now.
  flushSync()
  keys = menuKeys({
    root: target,
    frames,
    gamepads: fake.getGamepads,
    onBack: () => {
      backs += 1
    },
    onSound: (what) => sounds.push(what),
  })
  frames.at(0)
}

const focusedName = (): string => {
  const active = document.activeElement as HTMLElement
  return active.textContent?.trim() || active.getAttribute('aria-label') || active.tagName
}

/** Holds a pad button for one frame and lets it go for the next. */
function tap(button: Parameters<FakeGamepads['press']>[0]): void {
  fake.press(button)
  frames.advance(FRAME)
  fake.release(button)
  frames.advance(FRAME)
}

test('the pad walks down a column, up it again, and stops at the ends', () => {
  open()
  // The screen starts on its one primary button, with the other under it.
  expect(focusedName()).toBe('Play')
  tap('dpad-down')
  expect(focusedName()).toBe('Erase')
  tap('dpad-down')
  expect(focusedName()).toBe('Erase')
  tap('dpad-up')
  expect(focusedName()).toBe('Play')
  tap('dpad-up')
  // Above the buttons is the list, and its nearest row.
  expect(document.activeElement?.closest('[role="region"]')).not.toBeNull()
  expect(sounds.filter((what) => what === 'move')).toHaveLength(3)
})

test('the pad walks across a row when the screen is wide and short', async () => {
  await page.viewport(844, 390)
  open()
  // The frame hears its box when the page draws, so the page is kept drawing while this waits.
  const drawing = keepDrawing()
  try {
    await expect
      .poll(() => target.querySelector('[data-width]')?.getAttribute('data-height'), { timeout: 10_000 })
      .toBe('short')
  } finally {
    drawing.stop()
  }
  expect(focusedName()).toBe('Play')
  tap('dpad-right')
  expect(focusedName()).toBe('Erase')
  tap('dpad-right')
  expect(focusedName()).toBe('Erase')
  tap('dpad-left')
  expect(focusedName()).toBe('Play')
})

test("the pad's bottom button presses what has the focus, and its right button goes back", () => {
  open()
  tap('south')
  expect(log).toEqual(['play'])
  tap('east')
  expect(backs).toBe(1)
  expect(sounds).toContain('press')
  expect(sounds).toContain('back')
})

test('Escape goes back, and the arrow keys walk', async () => {
  open()
  await keyboard('{ArrowDown}')
  expect(focusedName()).toBe('Erase')
  await keyboard('{Escape}')
  expect(backs).toBe(1)
})

test('left and right on a slider change it and do not walk', () => {
  open()
  const slider = target.querySelector<HTMLElement>('[role="slider"]') as HTMLElement
  slider.focus()
  tap('dpad-right')
  expect(document.activeElement).toBe(slider)
  expect(log).toEqual(['change:0.55', 'release:0.55'])
  // Up and down do walk off it.
  tap('dpad-down')
  expect(document.activeElement).not.toBe(slider)
})

test('a held gamepad button that opened the screen presses nothing until it is let go', () => {
  // The bottom button that pressed "Play" on the last screen is still down when this one appears.
  fake.press('south')
  open()
  frames.advance(FRAME)
  frames.advance(FRAME)
  expect(log).toEqual([])
  fake.release('south')
  frames.advance(FRAME)
  expect(log).toEqual([])
  tap('south')
  expect(log).toEqual(['play'])
})

/** Whether the screen took a key event (kept the browser from acting on it), and whether anything after it heard it. */
interface Heard {
  readonly taken: boolean
  readonly reached: boolean
}

/** Sends a key event the way a held key sends it. */
function send(type: 'keydown' | 'keyup', code: string, repeat: boolean): Heard {
  let reached = false
  const listener = (): void => {
    reached = true
  }
  window.addEventListener(type, listener)
  const event = new KeyboardEvent(type, { code, key: code, repeat, bubbles: true, cancelable: true })
  window.dispatchEvent(event)
  window.removeEventListener(type, listener)
  return { taken: event.defaultPrevented, reached }
}

test('Enter held when the screen appears presses nothing, and a fresh Enter goes to the browser', async () => {
  open()
  expect(focusedName()).toBe('Play')
  // The held key repeats on the new screen: its repeats and its release are taken, so nothing is pressed.
  expect(send('keydown', 'Enter', true)).toEqual({ taken: true, reached: false })
  expect(send('keydown', 'Enter', true)).toEqual({ taken: true, reached: false })
  expect(send('keyup', 'Enter', false)).toEqual({ taken: true, reached: false })
  // A fresh press goes through to the browser, which presses the focused button once.
  expect(send('keydown', 'Enter', false)).toEqual({ taken: false, reached: true })
  expect(send('keydown', 'Enter', true)).toEqual({ taken: false, reached: true })
  expect(send('keyup', 'Enter', false)).toEqual({ taken: false, reached: true })
  await keyboard('{Enter}')
  expect(log).toEqual(['play'])
})

test('Space held when the screen appears presses nothing, and a fresh Space goes to the browser', async () => {
  open()
  expect(send('keydown', 'Space', true)).toEqual({ taken: true, reached: false })
  expect(send('keyup', 'Space', false)).toEqual({ taken: true, reached: false })
  expect(send('keydown', 'Space', false)).toEqual({ taken: false, reached: true })
  expect(send('keyup', 'Space', false)).toEqual({ taken: false, reached: true })
  await keyboard(' ')
  expect(log).toEqual(['play'])
})

test('with a dialog open, the pad walks only its buttons and its right button says no', async () => {
  open()
  tap('dpad-down')
  expect(focusedName()).toBe('Erase')
  tap('south')
  await expect.poll(() => target.querySelector('[role="alertdialog"]')).not.toBeNull()
  await expect.poll(focusedName).toBe('Keep')
  tap('dpad-up')
  expect(focusedName()).toBe('Erase')
  tap('dpad-up')
  // Nothing under the dialog is reachable.
  expect(target.querySelector('[role="alertdialog"]')?.contains(document.activeElement)).toBe(true)
  tap('east')
  expect(log).toEqual(['no'])
  expect(backs).toBe(0)
})

test('after destroy the pad and the keys do nothing', async () => {
  open()
  keys?.destroy()
  tap('south')
  expect(log).toEqual([])
  await keyboard('{Escape}')
  expect(backs).toBe(0)
})

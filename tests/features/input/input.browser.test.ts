// The input in each real browser: real DOM events in, `controls` commands out.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { controlsCommand } from '#src/features/commands/commands.ts'
import { createInput, type Input } from '#src/features/input/input.ts'
import { SKY_COLOR } from '#src/features/level/level.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'

let mount: HTMLDivElement
let input: Input | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;overflow:hidden'
  document.body.append(mount)
  // The test machines have a mouse; say so, so "hidden until a touch" does not depend on which one it is.
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  input?.destroy()
  input = undefined
  mount.remove()
  vi.restoreAllMocks()
})

const make = (player?: number): Input => {
  input = createInput({ mount, controls: fixtureControls, ...(player === undefined ? {} : { player }) })
  return input
}
/** Sends a key event to the window the way a browser does, and says whether the page's default was stopped. */
const key = (type: 'keydown' | 'keyup', code: string, init: KeyboardEventInit = {}): boolean => {
  const event = new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...init })
  window.dispatchEvent(event)
  return event.defaultPrevented
}
const pointer = (target: Element, type: string, id: number, pointerType = 'touch', buttons = 0): void => {
  target.dispatchEvent(
    new PointerEvent(type, { pointerId: id, pointerType, buttons, bubbles: true, cancelable: true }),
  )
}
const button = (label: string): HTMLButtonElement => {
  const found = [...mount.querySelectorAll('button')].find((b) => b.textContent === label)
  if (found === undefined) throw new Error(`no button says "${label}"`)
  return found
}
/** What the first finger on the screen does: the buttons show themselves. */
const firstTouch = (): void => pointer(mount, 'pointerdown', 99)

test('holding a key sends one command, and nothing more until it changes', () => {
  const i = make()
  key('keydown', 'ArrowRight')
  expect(i.poll(0)).toEqual([controlsCommand(0, 1, 0, ['right'])])
  expect(i.poll(1)).toEqual([])
  key('keyup', 'ArrowRight')
  expect(i.poll(2)).toEqual([controlsCommand(2, 1, 1, [])])
})

test('two keys for one action count once', () => {
  const i = make()
  key('keydown', 'ArrowLeft')
  key('keydown', 'KeyA')
  expect(i.poll(0)).toEqual([controlsCommand(0, 1, 0, ['left'])])
  key('keyup', 'KeyA')
  expect(i.poll(1)).toEqual([]) // ArrowLeft is still down
  key('keyup', 'ArrowLeft')
  expect(i.poll(2)).toEqual([controlsCommand(2, 1, 1, [])])
})

test('seq goes up by one per command sent', () => {
  const i = make()
  key('keydown', 'ArrowRight')
  key('keydown', 'Space')
  const first = i.poll(0)
  key('keyup', 'Space')
  const second = i.poll(1)
  expect(first.map((c) => c.seq)).toEqual([0])
  expect(second.map((c) => c.seq)).toEqual([1])
  expect(second[0]?.payload).toEqual({ held: ['right'] })
})

test('key repeat sends nothing new', () => {
  const i = make()
  key('keydown', 'ArrowRight')
  i.poll(0)
  key('keydown', 'ArrowRight', { repeat: true })
  key('keydown', 'ArrowRight', { repeat: true })
  expect(i.poll(1)).toEqual([])
})

test('the window losing focus lets go of every key', () => {
  const i = make()
  key('keydown', 'ArrowRight')
  expect(i.poll(0)).toHaveLength(1)
  window.dispatchEvent(new Event('blur'))
  expect(i.poll(1)).toEqual([controlsCommand(1, 1, 1, [])])
})

test('typing in a text field does not move the hero', () => {
  const i = make()
  const field = document.createElement('input')
  document.body.append(field)
  try {
    field.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', bubbles: true, cancelable: true }))
    expect(i.poll(0)).toEqual([])
  } finally {
    field.remove()
  }
})

test('bound keys do not scroll the page; other keys are left alone', () => {
  make()
  expect(key('keydown', 'Space')).toBe(true)
  expect(key('keydown', 'KeyQ')).toBe(false)
  key('keyup', 'Space')
})

test('a shortcut like Ctrl and a bound key is not taken from the browser', () => {
  const i = make()
  expect(key('keydown', 'KeyA', { ctrlKey: true })).toBe(false)
  expect(i.poll(0)).toEqual([])
})

test('touch buttons appear on first touch and say what they do', () => {
  make()
  expect(button('Jump').offsetWidth).toBe(0) // on a fine pointer they start hidden
  firstTouch()
  expect([...mount.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Left', 'Right', 'Jump'])
  expect(button('Jump').offsetWidth).toBeGreaterThan(0)
  expect(button('Jump').getAttribute('aria-label')).toBe('Jump')
  expect(getComputedStyle(button('Jump')).touchAction).toBe('none')
})

test('a mouse pointer does not bring the touch buttons up', () => {
  make()
  pointer(mount, 'pointerdown', 1, 'mouse')
  expect(button('Jump').offsetWidth).toBe(0)
})

test('a touch screen shows the buttons from the start', () => {
  vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList)
  make()
  expect(button('Jump').offsetWidth).toBeGreaterThan(0)
})

test.each([
  [390, 844],
  [320, 568],
])('every touch button is at least 48 px in both directions at %i x %i', (w, h) => {
  mount.style.width = `${w}px`
  mount.style.height = `${h}px`
  make()
  firstTouch()
  const area = mount.getBoundingClientRect()
  for (const b of mount.querySelectorAll('button')) {
    const box = b.getBoundingClientRect()
    expect(box.width, b.textContent ?? '').toBeGreaterThanOrEqual(48)
    expect(box.height, b.textContent ?? '').toBeGreaterThanOrEqual(48)
    // Nothing hangs off the screen, and the right thumb's button is on the right.
    expect(box.left).toBeGreaterThanOrEqual(area.left)
    expect(box.right).toBeLessThanOrEqual(area.right)
    expect(box.bottom).toBeLessThanOrEqual(area.bottom)
  }
  expect(button('Jump').getBoundingClientRect().left).toBeGreaterThan(
    button('Right').getBoundingClientRect().right,
  )
})

test('two fingers hold two buttons', () => {
  const i = make()
  firstTouch()
  pointer(button('Right'), 'pointerdown', 1)
  pointer(button('Jump'), 'pointerdown', 2)
  expect(i.poll(0)).toEqual([controlsCommand(0, 1, 0, ['jump', 'right'])])
  pointer(button('Right'), 'pointerup', 1)
  expect(i.poll(1)).toEqual([controlsCommand(1, 1, 1, ['jump'])])
})

test('two fingers on one button need both to let go', () => {
  const i = make()
  firstTouch()
  pointer(button('Jump'), 'pointerdown', 1)
  pointer(button('Jump'), 'pointerdown', 2)
  i.poll(0)
  pointer(button('Jump'), 'pointerup', 1)
  expect(i.poll(1)).toEqual([])
  pointer(button('Jump'), 'pointerup', 2)
  expect(i.poll(2)).toHaveLength(1)
})

test.each(['pointerleave', 'pointercancel'])('a touch ending with %s lets go', (ending) => {
  const i = make()
  firstTouch()
  pointer(button('Jump'), 'pointerdown', 1)
  expect(i.poll(0)).toHaveLength(1)
  pointer(button('Jump'), ending, 1)
  expect(i.poll(1)).toEqual([controlsCommand(1, 1, 1, [])])
})

test('a thumb sliding from one button onto the next holds the new one', () => {
  const i = make()
  firstTouch()
  pointer(button('Left'), 'pointerdown', 1, 'touch', 1)
  expect(i.poll(0)).toEqual([controlsCommand(0, 1, 0, ['left'])])
  pointer(button('Left'), 'pointerleave', 1)
  pointer(button('Right'), 'pointerenter', 1, 'touch', 1) // still touching the glass
  expect(i.poll(1)).toEqual([controlsCommand(1, 1, 1, ['right'])])
})

test('a mouse passing over a button without being pressed holds nothing', () => {
  const i = make()
  pointer(button('Right'), 'pointerenter', 1, 'mouse', 0)
  expect(i.poll(0)).toEqual([])
})

test('the window losing focus lets go of the buttons too', () => {
  const i = make()
  firstTouch()
  pointer(button('Jump'), 'pointerdown', 1)
  i.poll(0)
  window.dispatchEvent(new Event('blur'))
  expect(i.poll(1)).toEqual([controlsCommand(1, 1, 1, [])])
})

test('destroy removes the buttons and the listeners', () => {
  const i = make()
  firstTouch()
  i.destroy()
  expect(mount.querySelector('button')).toBeNull()
  expect(key('keydown', 'Space')).toBe(false)
  expect(i.poll(0)).toEqual([])
  expect(() => i.destroy()).not.toThrow()
})

test('player 2 input sends commands from source 2', () => {
  const i = make(2)
  key('keydown', 'ArrowLeft')
  expect(i.poll(0)).toEqual([controlsCommand(0, 2, 0, ['left'])])
})

test('a player who cannot exist, or controls that are wrong, stop it at the start', () => {
  expect(() => createInput({ mount, controls: fixtureControls, player: 5 })).toThrow(
    'Player 5 does not exist. Players are numbered 1 to 4.',
  )
  expect(() =>
    createInput({ mount, controls: { 'Jump!': { label: 'Jump', keys: [], side: 'right' } } }),
  ).toThrow('"Jump!" cannot be an action name')
})

/** The WCAG relative luminance of an [r, g, b] colour, each 0 to 255. */
const luminance = (rgb: readonly number[]): number => {
  const [r = 0, g = 0, b = 0] = rgb.map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// The words on a button sit on a see-through panel over the sky, the lightest thing they can be over. 18 px bold is
// just under "large text", so WCAG asks 4.5 to 1.
test('the words on a button can be read over the sky', () => {
  make()
  firstTouch()
  const panel = getComputedStyle(button('Jump')).backgroundColor.match(/[\d.]+/g)?.map(Number)
  const [r = 0, g = 0, b = 0, alpha = 1] = panel ?? []
  const sky = [(SKY_COLOR >> 16) & 255, (SKY_COLOR >> 8) & 255, SKY_COLOR & 255]
  const under = [r, g, b].map((c, i) => c * alpha + (sky[i] ?? 0) * (1 - alpha))
  const ratio = (luminance([255, 255, 255]) + 0.05) / (luminance(under) + 0.05)
  expect(ratio).toBeGreaterThanOrEqual(4.5)
})

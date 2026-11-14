// The input in each real browser: real DOM events in, `controls` commands out.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { controlsCommand } from '#src/features/commands/commands.ts'
import { createInput, type Input } from '#src/features/input/input.ts'
import { SKY_COLOR } from '#src/features/level/level.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'

let mount: HTMLDivElement
let input: Input | undefined
let fake: FakeGamepads
let frames: ManualFrames

beforeEach(() => {
  fake = fakeGamepads()
  frames = manualFrames()
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

const make = (): Input => {
  input = createInput({ mount, controls: fixtureControls, gamepads: fake.getGamepads, frames })
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

test('with nothing set, the buttons look as they always have', () => {
  make()
  firstTouch()
  const style = getComputedStyle(button('Jump'))
  expect(style.backgroundColor).toBe('rgba(20, 20, 30, 0.55)')
  expect(style.color).toBe('rgb(255, 255, 255)')
  expect(style.borderTopLeftRadius).toBe('16px')
  expect(style.borderTopWidth).toBe('2px')
  expect(style.fontWeight).toBe('700')
  expect(style.fontSize).toBe('18px')
})

test("a game sets the buttons' look with seven properties on the mount", () => {
  mount.style.setProperty('--automata-touch-background', 'rgb(10, 31, 60)')
  mount.style.setProperty('--automata-touch-color', 'rgb(255, 212, 71)')
  mount.style.setProperty('--automata-touch-border', '1px solid rgb(234, 242, 250)')
  mount.style.setProperty('--automata-touch-radius', '2px')
  mount.style.setProperty('--automata-touch-font', '600 15px/1.1 monospace')
  make()
  firstTouch()
  const style = getComputedStyle(button('Jump'))
  expect(style.backgroundColor).toBe('rgb(10, 31, 60)')
  expect(style.color).toBe('rgb(255, 212, 71)')
  expect(style.borderTopWidth).toBe('1px')
  expect(style.borderTopColor).toBe('rgb(234, 242, 250)')
  expect(style.borderTopLeftRadius).toBe('2px')
  expect(style.fontWeight).toBe('600')
  expect(style.fontSize).toBe('15px')
})

test('a held button takes the pressed colours and gives them back', () => {
  mount.style.setProperty('--automata-touch-background', 'rgb(10, 31, 60)')
  mount.style.setProperty('--automata-touch-color', 'rgb(234, 242, 250)')
  mount.style.setProperty('--automata-touch-pressed-background', 'rgb(255, 212, 71)')
  mount.style.setProperty('--automata-touch-pressed-color', 'rgb(10, 31, 60)')
  make()
  firstTouch()
  pointer(button('Jump'), 'pointerdown', 1)
  expect(getComputedStyle(button('Jump')).backgroundColor).toBe('rgb(255, 212, 71)')
  expect(getComputedStyle(button('Jump')).color).toBe('rgb(10, 31, 60)')
  pointer(button('Jump'), 'pointerup', 1)
  expect(getComputedStyle(button('Jump')).backgroundColor).toBe('rgb(10, 31, 60)')
  expect(getComputedStyle(button('Jump')).color).toBe('rgb(234, 242, 250)')
})

test('each button says which action it is, for a stylesheet', () => {
  make()
  firstTouch()
  expect(mount.querySelector('.automata-touch')).not.toBeNull()
  const buttons = [...mount.querySelectorAll<HTMLButtonElement>('.automata-touch .automata-touch-button')]
  expect(buttons.map((b) => b.dataset.action)).toEqual(['left', 'right', 'jump'])
})

test('a themed button is still big enough for a thumb', () => {
  mount.style.setProperty('--automata-touch-font', '600 10px/1 monospace')
  make()
  firstTouch()
  for (const b of mount.querySelectorAll('button')) {
    expect(b.offsetWidth, b.textContent ?? '').toBeGreaterThanOrEqual(64)
    expect(b.offsetHeight, b.textContent ?? '').toBeGreaterThanOrEqual(64)
  }
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

test('a player who cannot exist, or controls that are wrong, stop it at the start', () => {
  expect(() => make().setPlayers([5])).toThrow('Player 5 does not exist. Players are numbered 1 to 4.')
  expect(() =>
    createInput({ mount, controls: { 'Jump!': { label: 'Jump', keys: [], side: 'right' } } }),
  ).toThrow('"Jump!" cannot be an action name')
})

test('with two players on a shared keyboard, each key moves its own player', () => {
  const i = make()
  i.setPlayers([1, 2])
  i.claim(2, 'keyboard')
  key('keydown', 'KeyD')
  key('keydown', 'ArrowUp')
  expect(i.poll(0)).toEqual([controlsCommand(0, 1, 0, ['right']), controlsCommand(0, 2, 0, ['jump'])])
})

test('a gamepad plays for the one player with no setup', () => {
  const i = make()
  fake.connect(0)
  fake.press('south')
  expect(i.poll(0)).toEqual([controlsCommand(0, 1, 0, ['jump'])])
})

test('a stick held right and the right arrow are one "right"', () => {
  const i = make()
  fake.connect(0)
  fake.stick(1, 0)
  key('keydown', 'ArrowRight')
  expect(i.poll(0)).toEqual([controlsCommand(0, 1, 0, ['right'])])
  key('keyup', 'ArrowRight')
  expect(i.poll(1)).toEqual([]) // the stick still holds it
})

test("player 2's pad moves only player 2, and each player counts their own commands", () => {
  const i = make()
  fake.connect(0)
  fake.connect(1)
  i.setPlayers([1, 2])
  i.claim(2, 'pad-1')
  fake.press('dpad-right', 1)
  expect(i.poll(0)).toEqual([controlsCommand(0, 2, 0, ['right'])])
  key('keydown', 'ArrowLeft')
  expect(i.poll(1)).toEqual([controlsCommand(1, 1, 0, ['left'])])
  fake.release('dpad-right', 1)
  expect(i.poll(2)).toEqual([controlsCommand(2, 2, 1, [])])
})

test('a pad the browser could not map does nothing and is listed as not usable', () => {
  const i = make()
  fake.connect(0, { mapping: '', id: 'Odd Pad' })
  fake.press('south')
  expect(i.poll(0)).toEqual([])
  expect(i.pads()).toEqual([{ index: 0, id: 'Odd Pad', usable: false }])
})

/** Runs `body` with `navigator.getGamepads` replaced, and puts the browser's own back after. */
function withGetGamepads(value: unknown, body: () => void): void {
  Object.defineProperty(navigator, 'getGamepads', { value, configurable: true })
  try {
    body()
  } finally {
    Reflect.deleteProperty(navigator, 'getGamepads')
  }
}

test('a browser with no getGamepads has no pads and does not throw', () => {
  withGetGamepads(undefined, () => {
    const i = createInput({ mount, controls: fixtureControls, frames })
    input = i
    key('keydown', 'ArrowRight')
    expect(i.poll(0)).toEqual([controlsCommand(0, 1, 0, ['right'])])
    expect(i.pads()).toEqual([])
  })
})

test('a getGamepads that throws is no pads, and the keyboard still plays', () => {
  withGetGamepads(
    () => {
      throw new DOMException('Gamepads are not allowed here.', 'SecurityError')
    },
    () => {
      const i = createInput({ mount, controls: fixtureControls, frames })
      input = i
      key('keydown', 'ArrowRight')
      expect(i.poll(0)).toEqual([controlsCommand(0, 1, 0, ['right'])])
      expect(i.pads()).toEqual([])
      frames.advance(16)
    },
  )
})

test('a held bound key still does not scroll the page', () => {
  make()
  expect(key('keydown', 'Space', { repeat: true })).toBe(true)
})

test("unplugging player 2's pad lets go for them and marks the seat", () => {
  const i = make()
  fake.connect(0)
  fake.connect(1)
  i.setPlayers([1, 2])
  i.claim(2, 'pad-1')
  fake.press('dpad-right', 1)
  expect(i.poll(0)).toEqual([controlsCommand(0, 2, 0, ['right'])])
  fake.unplug(1)
  expect(i.poll(1)).toEqual([controlsCommand(1, 2, 1, [])])
  expect(i.seats()[1]?.connected).toBe(false)
})

test('a pad plugged in after one was lost goes to the player who lost theirs', () => {
  const i = make()
  fake.connect(0)
  fake.connect(1)
  i.setPlayers([1, 2])
  i.claim(2, 'pad-1')
  frames.advance(16)
  fake.unplug(1)
  frames.advance(16)
  expect(i.seats()[1]?.connected).toBe(false)
  fake.connect(3)
  frames.advance(16)
  expect(i.seats()[1]).toEqual({ player: 2, devices: ['pad-3'], connected: true })
})

test('the press that claims a pad does not act until it is let go', () => {
  const i = make()
  fake.connect(1)
  fake.press('south', 1)
  i.setPlayers([1, 2])
  i.claim(2, 'pad-1')
  expect(i.poll(0)).toEqual([])
  fake.release('south', 1)
  expect(i.poll(1)).toEqual([])
  fake.press('south', 1)
  expect(i.poll(2)).toEqual([controlsCommand(2, 2, 0, ['jump'])])
})

test('silence lets go for everyone, and keys still down afterwards wait for a fresh press', () => {
  const i = make()
  key('keydown', 'ArrowRight')
  expect(i.poll(0)).toEqual([controlsCommand(0, 1, 0, ['right'])])
  const release = i.silence()
  expect(i.poll(1)).toEqual([controlsCommand(1, 1, 1, [])])
  release()
  expect(i.poll(2)).toEqual([])
  key('keydown', 'ArrowRight', { repeat: true })
  expect(i.poll(3)).toEqual([])
  key('keyup', 'ArrowRight')
  key('keydown', 'ArrowRight')
  expect(i.poll(4)).toEqual([controlsCommand(4, 1, 2, ['right'])])
})

test('nested silences each need their own release', () => {
  const i = make()
  const first = i.silence()
  const second = i.silence()
  first()
  first()
  key('keydown', 'ArrowRight')
  expect(i.poll(0)).toEqual([])
  second()
  key('keyup', 'ArrowRight')
  key('keydown', 'ArrowRight')
  expect(i.poll(1)).toEqual([controlsCommand(1, 1, 0, ['right'])])
})

test('a player who leaves and comes back starts holding nothing', () => {
  const i = make()
  i.setPlayers([1, 2])
  i.claim(2, 'keyboard')
  key('keydown', 'ArrowUp')
  expect(i.poll(0)).toHaveLength(1)
  key('keyup', 'ArrowUp')
  i.setPlayers([1])
  i.setPlayers([1, 2])
  i.claim(2, 'keyboard')
  expect(i.poll(1)).toEqual([])
})

test('onSeats is told when a player, a claim or a pad changes', () => {
  const i = make()
  const told = vi.fn()
  i.onSeats(told)
  i.setPlayers([1, 2])
  expect(told).toHaveBeenCalledTimes(1)
  i.claim(2, 'keyboard')
  expect(told).toHaveBeenCalledTimes(2)
  fake.connect(0)
  frames.advance(16)
  expect(told).toHaveBeenCalledTimes(3)
  frames.advance(16)
  expect(told).toHaveBeenCalledTimes(3)
})

test('touch belongs to the first player only', () => {
  const i = make()
  fake.connect(0)
  i.setPlayers([2, 3])
  i.claim(3, 'pad-0')
  firstTouch()
  pointer(button('Jump'), 'pointerdown', 1)
  expect(i.poll(0)).toEqual([controlsCommand(0, 2, 0, ['jump'])])
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
  const panel = getComputedStyle(button('Jump'))
    .backgroundColor.match(/[\d.]+/g)
    ?.map(Number)
  const [r = 0, g = 0, b = 0, alpha = 1] = panel ?? []
  const sky = [(SKY_COLOR >> 16) & 255, (SKY_COLOR >> 8) & 255, SKY_COLOR & 255]
  const under = [r, g, b].map((c, i) => c * alpha + (sky[i] ?? 0) * (1 - alpha))
  const ratio = (luminance([255, 255, 255]) + 0.05) / (luminance(under) + 0.05)
  expect(ratio).toBeGreaterThanOrEqual(4.5)
})

// The game fits its picture above the buttons, so it asks how much room they take: none while hidden, and the height of
// the button strip once shown.
test('the buttons take no room while hidden, and their strip once shown', () => {
  const i = make()
  expect(i.inset()).toBe(0)
  firstTouch()
  const top = Math.min(...[...mount.querySelectorAll('button')].map((b) => b.getBoundingClientRect().top))
  expect(i.inset()).toBeGreaterThanOrEqual(mount.getBoundingClientRect().bottom - top)
  expect(i.inset()).toBeGreaterThanOrEqual(64)
})

test('a listener hears the room change when the buttons appear', async () => {
  const i = make()
  const heard: number[] = []
  i.onInset((px) => heard.push(px))
  firstTouch()
  await vi.waitFor(() => expect(heard.at(-1)).toBe(i.inset()))
  expect(heard.at(-1)).toBeGreaterThan(0)
})

test('destroy stops the room listener', async () => {
  const i = make()
  const heard: number[] = []
  i.onInset((px) => heard.push(px))
  firstTouch()
  await vi.waitFor(() => expect(heard.length).toBeGreaterThan(0))
  i.destroy()
  input = undefined
  const count = heard.length
  mount.style.width = '300px'
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  expect(heard).toHaveLength(count)
})

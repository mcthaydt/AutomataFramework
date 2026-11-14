// The speech box on the screens it is played on, in each real browser: whole, big enough to press, above the touch
// buttons, and drivable by tap, by focus and by key. It is a page feature, so it is checked in a page.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { type BoxPress, type BoxState, createBox, type StoryBox } from '#src/features/story/box.ts'

/** [width, height, how many pixels the touch buttons take at the bottom]. */
const SIZES = [
  [390, 844, 96],
  [844, 390, 96],
  [820, 1180, 0],
  [1180, 820, 0],
  [1280, 720, 0],
] as const

const FOUR: BoxState = {
  speaker: 'The keeper',
  text: 'Which way will you go, now that the glade is open and the morning is bright?',
  choices: ['The river', 'The hill', 'The old road', 'Nowhere, thank you'],
  next: false,
  skip: false,
}

let mount: HTMLDivElement
let box: StoryBox | undefined
let heard: string[]

const press: BoxPress = {
  next: () => heard.push('next'),
  choose: (n) => heard.push(`choose ${n}`),
  skip: () => heard.push('skip'),
}

beforeEach(() => {
  heard = []
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden'
  document.body.append(mount)
})
afterEach(() => {
  box?.destroy()
  box = undefined
  mount.remove()
  vi.restoreAllMocks()
})

const root = (): HTMLElement => mount.querySelector('.automata-story') as HTMLElement
const part = (name: string): HTMLElement => root().querySelector(`[data-story="${name}"]`) as HTMLElement
const choiceButtons = (): HTMLButtonElement[] => [
  ...root().querySelectorAll<HTMLButtonElement>('[data-choice]'),
]
const apart = (p: DOMRect, q: DOMRect): boolean =>
  p.right <= q.left + 1 || q.right <= p.left + 1 || p.bottom <= q.top + 1 || q.bottom <= p.top + 1
const settle = (): Promise<void> =>
  new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))
const key = (type: 'keydown' | 'keyup', code: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...init })
  window.dispatchEvent(event)
  return event
}

/** Makes the box with `inset` pixels of touch buttons under it, and shows `state`. */
async function shown(
  state: BoxState,
  inset = 0,
  options?: Parameters<typeof createBox>[3],
): Promise<StoryBox> {
  const made = createBox(mount, press, undefined, options)
  box = made
  made.setInset(inset)
  made.show(state)
  await settle()
  return made
}

for (const [w, h, inset] of SIZES) {
  test(`at ${w} by ${h} every button is whole, big and above the touch buttons`, async () => {
    await page.viewport(w, h)
    expect([window.innerWidth, window.innerHeight]).toEqual([w, h])
    await shown(FOUR, inset)
    const frame = root().getBoundingClientRect()
    expect(frame.left).toBeGreaterThanOrEqual(0)
    expect(frame.right).toBeLessThanOrEqual(w)
    expect(frame.top).toBeGreaterThanOrEqual(0)
    expect(frame.bottom, 'at or above the touch buttons').toBeLessThanOrEqual(h - inset - 12 + 1)
    expect(frame.width).toBeLessThanOrEqual(640 + 1)

    const buttons = choiceButtons()
    expect(buttons).toHaveLength(4)
    for (const b of buttons) {
      const r = b.getBoundingClientRect()
      expect(r.height, b.textContent ?? '').toBeGreaterThanOrEqual(48)
      expect(r.left).toBeGreaterThanOrEqual(frame.left - 1)
      expect(r.right).toBeLessThanOrEqual(frame.right + 1)
      expect(r.top).toBeGreaterThanOrEqual(frame.top - 1)
      expect(r.bottom).toBeLessThanOrEqual(frame.bottom + 1)
      expect(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)).toBe(b)
    }
    for (const a of buttons)
      for (const b of buttons) {
        if (a === b) continue
        const p = a.getBoundingClientRect()
        expect(apart(p, b.getBoundingClientRect()), 'answers do not overlap').toBe(true)
      }
    expect(Number.parseFloat(getComputedStyle(part('text')).fontSize)).toBeGreaterThanOrEqual(18)
    await page.screenshot({ element: mount, path: `__screenshots__/story-box-${w}x${h}.png` })
  })
}

test('at 844 by 390, four choices sit two to a row and every one is whole', async () => {
  await page.viewport(844, 390)
  await shown(FOUR, 96)
  const tops = new Set(choiceButtons().map((b) => Math.round(b.getBoundingClientRect().top)))
  expect(tops.size).toBe(2)
  for (const b of choiceButtons()) {
    const r = b.getBoundingClientRect()
    expect(r.height).toBeGreaterThanOrEqual(48)
    expect(r.bottom).toBeLessThanOrEqual(390 - 96 - 12 + 1)
  }
})

for (const [w, h] of [
  [390, 844],
  [844, 390],
] as const) {
  test(`a 2000-character line scrolls in the box and Next stays on screen at ${w} by ${h}`, async () => {
    await page.viewport(w, h)
    await shown({ text: 'word '.repeat(400).slice(0, 2000), choices: [], next: true, skip: true }, 96)
    const text = part('text')
    expect(text.scrollHeight).toBeGreaterThan(text.clientHeight)
    expect(text.getBoundingClientRect().height).toBeLessThanOrEqual(h * 0.4 + 1)
    const next = part('next').getBoundingClientRect()
    expect(next.bottom).toBeLessThanOrEqual(h - 96 - 12 + 1)
    expect(next.top).toBeGreaterThanOrEqual(0)
    expect(next.height).toBeGreaterThanOrEqual(48)
  })
}

test('words are shown as they were typed', async () => {
  await shown({ text: '<b>Hello</b> 👋', choices: [], next: true, skip: false })
  expect(part('text').textContent).toBe('<b>Hello</b> 👋')
  expect(part('text').querySelector('b')).toBeNull()
})

test('Next has the focus and Enter presses it once', async () => {
  await shown({ text: 'Hi', choices: [], next: true, skip: true })
  expect(document.activeElement).toBe(part('next'))
  key('keydown', 'Enter')
  key('keydown', 'Enter')
  expect(heard).toEqual(['next'])
})

test('with choices the first has the focus, Down moves, Enter picks, and 2 picks the second', async () => {
  const made = await shown(FOUR)
  expect(document.activeElement).toBe(choiceButtons()[0])
  key('keydown', 'ArrowDown')
  expect(document.activeElement).toBe(choiceButtons()[1])
  key('keydown', 'ArrowUp')
  key('keydown', 'ArrowUp')
  expect(document.activeElement, 'it stops at the first').toBe(choiceButtons()[0])
  key('keydown', 'ArrowDown')
  key('keydown', 'Enter')
  expect(heard).toEqual(['choose 1'])
  made.show(FOUR)
  key('keydown', 'Digit2')
  expect(heard).toEqual(['choose 1', 'choose 1'])
  made.show(FOUR)
  key('keydown', 'Digit4')
  expect(heard.at(-1)).toBe('choose 3')
})

test('a tap on a choice picks it, once', async () => {
  await shown(FOUR)
  choiceButtons()[1]?.click()
  choiceButtons()[1]?.click()
  expect(heard).toEqual(['choose 1'])
})

test('with only Skip showing, Enter skips and Space does not', async () => {
  await shown({ text: 'A scene', choices: [], next: false, skip: true })
  const space = key('keydown', 'Space')
  key('keyup', 'Space')
  expect(heard).toEqual([])
  expect(space.defaultPrevented, 'a native click on Skip is not let through either').toBe(false)
  key('keydown', 'Enter')
  expect(heard).toEqual(['skip'])
})

test('Space presses Next, and never Skip when Next is showing too', async () => {
  await shown({ text: 'Hi', choices: [], next: true, skip: true })
  key('keydown', 'Space')
  expect(heard).toEqual(['next'])
})

test('held, a press does nothing; watching, there are no buttons', async () => {
  const made = await shown({ text: 'Hi', choices: [], next: true, skip: true })
  made.setHeld(true)
  key('keydown', 'Enter')
  part('next').click()
  expect(heard).toEqual([])
  made.setHeld(false)
  made.destroy()
  box = createBox(mount, press, undefined, { watching: true })
  box.show(FOUR)
  expect(choiceButtons()).toHaveLength(0)
  expect(root().querySelector('button')).toBeNull()
  key('keydown', 'Digit1')
  expect(heard).toEqual([])
  expect(part('text').textContent).toBe(FOUR.text)
})

test('hiding the box gives the focus back', async () => {
  const other = document.createElement('button')
  mount.append(other)
  other.focus()
  const made = await shown({ text: 'Hi', choices: [], next: true, skip: false })
  expect(document.activeElement).toBe(part('next'))
  made.show(undefined)
  expect(root().hidden).toBe(true)
  expect(document.activeElement).toBe(other)
})

test('a held Enter repeats nothing', async () => {
  const made = await shown({ text: 'Hi', choices: [], next: true, skip: false })
  key('keydown', 'Enter', { repeat: true })
  expect(heard).toEqual([])
  made.show({ text: 'Again', choices: [], next: true, skip: false })
  key('keydown', 'Enter')
  expect(heard).toEqual(['next'])
})

test('keys another seat has bound are left alone', async () => {
  await shown(FOUR, 0, { ignores: (e) => e.code === 'ArrowDown' })
  const e = key('keydown', 'ArrowDown')
  expect(e.defaultPrevented).toBe(false)
  expect(document.activeElement).toBe(choiceButtons()[0])
  const other = key('keydown', 'KeyW')
  expect(other.defaultPrevented, 'keys the box does not use are left alone').toBe(false)
})

/** The contrast of two colours as the page computes them, with the first laid over `under` where it is see-through. */
function contrast(color: string, background: string, under: [number, number, number]): number {
  const parse = (css: string): [number, number, number, number] => {
    const m = css.match(/[\d.]+/g)?.map(Number) ?? []
    return [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0, m[3] ?? 1]
  }
  const [br, bg, bb, ba] = parse(background)
  const base = [br, bg, bb].map((c, i) => c * ba + (under[i] ?? 0) * (1 - ba))
  const [r, g, b] = parse(color)
  const light = (rgb: number[]): number => {
    const [lr, lg, lb] = rgb.map((c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * (lr ?? 0) + 0.7152 * (lg ?? 0) + 0.0722 * (lb ?? 0)
  }
  const a = light([r, g, b])
  const z = light(base)
  return (Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05)
}

test('the words can be read on the box', async () => {
  await shown(FOUR)
  const style = getComputedStyle(root())
  for (const under of [
    [255, 255, 255],
    [0, 0, 0],
  ] as [number, number, number][])
    expect(contrast(style.color, style.backgroundColor, under)).toBeGreaterThanOrEqual(4.5)
})

test('a game dresses it through the seven properties', async () => {
  mount.style.setProperty('--automata-story-background', 'rgb(1, 2, 3)')
  mount.style.setProperty('--automata-story-color', 'rgb(250, 240, 230)')
  mount.style.setProperty('--automata-story-border', '3px solid rgb(9, 9, 9)')
  mount.style.setProperty('--automata-story-radius', '4px')
  mount.style.setProperty('--automata-story-font', '700 20px serif')
  mount.style.setProperty('--automata-story-button-background', 'rgb(7, 8, 9)')
  mount.style.setProperty('--automata-story-button-color', 'rgb(200, 100, 50)')
  await shown({ text: 'Hi', choices: ['One'], next: true, skip: false })
  const style = getComputedStyle(root())
  expect(style.backgroundColor).toBe('rgb(1, 2, 3)')
  expect(style.color).toBe('rgb(250, 240, 230)')
  expect(style.borderTopLeftRadius).toBe('4px')
  expect(style.borderTopWidth).toBe('3px')
  expect(style.fontSize).toBe('20px')
  const b = getComputedStyle(choiceButtons()[0] as HTMLElement)
  expect(b.backgroundColor).toBe('rgb(7, 8, 9)')
  expect(b.color).toBe('rgb(200, 100, 50)')
})

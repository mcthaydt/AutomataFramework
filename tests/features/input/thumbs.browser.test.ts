// The two-thumb scheme on a page, driven by real pointer events with `pointerType: 'touch'`: what each half is called,
// what a thumb holds the moment it lands, the ring that follows it, and everything a thumb must not do (scroll, zoom,
// open a menu).
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { type Controls, createInput } from '#src/features/input/input.ts'
import { createThumbs } from '#src/features/input/thumbs.ts'
import type { Touch } from '#src/features/input/touch.ts'
import type { Words } from '#src/lib/message.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'

const controls: Controls = {
  ...fixtureControls,
  throw: { label: 'Throw', keys: ['KeyX'], side: 'right' },
}

let mount: HTMLDivElement
let touch: Touch | undefined

/** A phone on its side: the thumbs are over the game. */
const sideways = (): void => {
  mount.style.cssText = 'position:fixed;left:0;top:0;width:844px;height:390px;overflow:hidden'
}
beforeEach(async () => {
  // The page is as big as a phone on its side, so every point of the mount can be touched.
  await page.viewport(844, 390)
  mount = document.createElement('div')
  sideways()
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
})
afterEach(() => {
  touch?.destroy()
  touch = undefined
  mount.remove()
  vi.restoreAllMocks()
})

const said =
  (table: Readonly<Record<string, string>>): Words =>
  (key) =>
    Object.hasOwn(table, key) ? (table[key] as string) : key

const make = (options: { dash?: boolean; words?: Words; now?: () => number } = {}): Touch => {
  touch = createThumbs(mount, controls, {
    dash: options.dash ?? false,
    ...(options.words === undefined ? {} : { words: options.words }),
    ...(options.now === undefined ? {} : { now: options.now }),
  })
  return touch
}
const half = (name: 'walk' | 'jump'): HTMLElement => {
  const found = mount.querySelector<HTMLElement>(`.automata-thumb-half[data-half="${name}"]`)
  if (found === null) throw new Error(`no ${name} half`)
  return found
}
const button = (action: string): HTMLButtonElement => {
  const found = mount.querySelector<HTMLButtonElement>(`.automata-touch-button[data-action="${action}"]`)
  if (found === null) throw new Error(`no button for ${action}`)
  return found
}
const ring = (): HTMLElement => {
  const found = mount.querySelector<HTMLElement>('.automata-thumb-ring')
  if (found === null) throw new Error('no ring')
  return found
}
const hintBox = (kind: string): HTMLElement => {
  const found = mount.querySelector<HTMLElement>(`.automata-thumb-hint[data-hint="${kind}"]`)
  if (found === null) throw new Error(`no ${kind} hint`)
  return found
}
const finger = (el: Element, type: string, id: number, x: number, y: number): PointerEvent => {
  const event = new PointerEvent(type, {
    pointerId: id,
    pointerType: 'touch',
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  })
  el.dispatchEvent(event)
  return event
}
const sorted = (set: Set<string>): string[] => [...set].sort()

test('the two halves are groups named Walk and Jump, in the language the words are in', () => {
  make({ words: said({ 'automata.thumbs.walk': 'Caminar', 'automata.thumbs.jump': 'Saltar' }) })
  expect(half('walk').getAttribute('role')).toBe('group')
  expect(half('walk').getAttribute('aria-label')).toBe('Caminar')
  expect(half('jump').getAttribute('role')).toBe('group')
  expect(half('jump').getAttribute('aria-label')).toBe('Saltar')
  touch?.relabel(said({ 'automata.thumbs.walk': '走', 'automata.thumbs.jump': '跳' }))
  expect(half('walk').getAttribute('aria-label')).toBe('走')
  expect(half('jump').getAttribute('aria-label')).toBe('跳')
})

test("with no words the halves take the tuning file's labels and the hints show no sentence", () => {
  make({ dash: true })
  expect(half('walk').getAttribute('aria-label')).toBe('Left / Right')
  expect(half('jump').getAttribute('aria-label')).toBe('Jump')
  expect(hintBox('walk').textContent).toBe('')
  expect(hintBox('jump').textContent).toBe('')
  expect(hintBox('dash').textContent).toBe('')
})

test('the ring appears where the thumb lands and follows a thumb that slides far', () => {
  const t = make()
  expect(ring().style.display).toBe('none')
  finger(half('walk'), 'pointerdown', 1, 100, 300)
  expect(ring().style.display).toBe('block')
  // The ring is 112 across and centred on the landing.
  expect(ring().style.left).toBe('44px')
  expect(ring().style.top).toBe('244px')
  // Inside the dead zone nothing is held; past it the thumb walks.
  finger(half('walk'), 'pointermove', 1, 105, 300)
  expect(sorted(t.held())).toEqual([])
  finger(half('walk'), 'pointermove', 1, 130, 300)
  expect(sorted(t.held())).toEqual(['right'])
  // A long slide drags the ring after the thumb, so it never ends up far behind.
  finger(half('walk'), 'pointermove', 1, 330, 300)
  expect(Number.parseFloat(ring().style.left)).toBeGreaterThan(44)
  expect(sorted(t.held())).toEqual(['right'])
  finger(half('walk'), 'pointermove', 1, 20, 300)
  expect(sorted(t.held())).toEqual(['left'])
  finger(half('walk'), 'pointerup', 1, 20, 300)
  expect(sorted(t.held())).toEqual([])
  expect(ring().style.display).toBe('none')
})

test('a thumb down in the jump half is held before any pointerup', () => {
  const t = make()
  finger(half('jump'), 'pointerdown', 2, 600, 300)
  expect(sorted(t.held())).toEqual(['jump'])
  expect(sorted(t.drain())).toEqual(['jump'])
  finger(half('jump'), 'pointerup', 2, 600, 300)
  expect(sorted(t.held())).toEqual([])
})

test('down and up inside one frame is one jump for the next poll, and only one', () => {
  const t = make()
  finger(half('jump'), 'pointerdown', 3, 600, 300)
  finger(half('jump'), 'pointerup', 3, 600, 300)
  expect(sorted(t.held())).toEqual([])
  expect(sorted(t.drain())).toEqual(['jump'])
  expect(sorted(t.drain())).toEqual([])
})

test('a cancelled touch lets go', () => {
  const t = make()
  finger(half('walk'), 'pointerdown', 4, 100, 300)
  finger(half('walk'), 'pointermove', 4, 140, 300)
  finger(half('jump'), 'pointerdown', 5, 600, 300)
  expect(sorted(t.held())).toEqual(['jump', 'right'])
  finger(half('walk'), 'pointercancel', 4, 140, 300)
  expect(sorted(t.held())).toEqual(['jump'])
  finger(half('jump'), 'lostpointercapture', 5, 600, 300)
  expect(sorted(t.held())).toEqual([])
})

test('the screen turned with a thumb down: nothing is held, and the halves are redrawn', async () => {
  const t = make()
  expect(t.inset()).toBe(0)
  expect(t.room()).toBe(120)
  finger(half('walk'), 'pointerdown', 6, 100, 300)
  finger(half('walk'), 'pointermove', 6, 140, 300)
  expect(sorted(t.held())).toEqual(['right'])
  // Upright, narrower than 600: the band under the level.
  mount.style.width = '390px'
  mount.style.height = '844px'
  await vi.waitFor(() => expect(sorted(t.held())).toEqual([]))
  expect(t.room()).toBe(0)
  expect(t.inset()).toBeGreaterThan(200)
  expect(t.inset()).toBeLessThan(300)
  const root = mount.querySelector<HTMLElement>('.automata-thumbs')
  expect(Math.round(root?.getBoundingClientRect().height ?? 0)).toBe(t.inset())
  // A fresh thumb works in the new shape.
  const band = half('jump').getBoundingClientRect()
  finger(half('jump'), 'pointerdown', 7, band.left + 10, band.top + 10)
  expect(sorted(t.held())).toEqual(['jump'])
})

test('swapped, walking is on the right half and jumping on the left', () => {
  const t = make()
  expect(half('walk').getBoundingClientRect().left).toBe(0)
  expect(half('jump').getBoundingClientRect().left).toBe(422)
  t.setSwapped(true)
  expect(half('walk').getBoundingClientRect().left).toBe(422)
  expect(half('jump').getBoundingClientRect().left).toBe(0)
  finger(half('walk'), 'pointerdown', 8, 600, 300)
  finger(half('walk'), 'pointermove', 8, 640, 300)
  expect(sorted(t.held())).toEqual(['right'])
})

test('the hints fade after three uses and come back after twenty seconds of quiet', async () => {
  let clock = 0
  const t = make({ now: () => clock, words: said({ 'automata.thumbs.walk-hint': 'Slide to walk' }) })
  expect(hintBox('walk').style.display).toBe('flex')
  expect(hintBox('walk').textContent).toBe('Slide to walk')
  for (let i = 0; i < 3; i++) {
    clock += 1000
    finger(half('walk'), 'pointerdown', 10 + i, 100, 300)
    finger(half('walk'), 'pointermove', 10 + i, 140, 300)
    finger(half('walk'), 'pointerup', 10 + i, 140, 300)
  }
  expect(sorted(t.held())).toEqual([])
  expect(hintBox('walk').style.display).toBe('none')
  // The jump hint has not been used, so it stays.
  expect(hintBox('jump').style.display).toBe('flex')
  clock += 20_000
  await vi.waitFor(() => expect(hintBox('walk').style.display).toBe('flex'))
})

test('the dash hint stays after three walks and goes after three flicks', () => {
  let clock = 0
  make({
    dash: true,
    now: () => clock,
    words: said({ 'automata.thumbs.walk-hint': 'Slide to walk', 'automata.thumbs.dash-hint': 'Flick to dash' }),
  })
  for (let i = 0; i < 3; i++) {
    clock += 1000
    finger(half('walk'), 'pointerdown', 30 + i, 100, 300)
    finger(half('walk'), 'pointermove', 30 + i, 140, 300)
    finger(half('walk'), 'pointerup', 30 + i, 140, 300)
  }
  // The walk is learned: its picture and words are out of sight, the box and the dash words are still there.
  const picture = hintBox('walk').querySelector<HTMLElement>('.automata-thumb-hint-picture')
  expect(picture?.style.visibility).toBe('hidden')
  expect(hintBox('walk').style.display).toBe('flex')
  expect(hintBox('dash').style.display).toBe('block')
  expect(hintBox('dash').textContent).toBe('Flick to dash')
  // A flick is a quick, long slide: three of them teach it, and then the whole box goes.
  for (let i = 0; i < 3; i++) {
    clock += 1000
    finger(half('walk'), 'pointerdown', 40 + i, 100, 300)
    finger(half('walk'), 'pointermove', 40 + i, 170, 300)
    finger(half('walk'), 'pointerup', 40 + i, 170, 300)
  }
  expect(hintBox('dash').style.display).toBe('none')
  expect(hintBox('walk').style.display).toBe('none')
})

test('the hints stay away while a thumb is held down, still or not, however long', async () => {
  let clock = 0
  const t = make({ now: () => clock, words: said({ 'automata.thumbs.walk-hint': 'Slide to walk' }) })
  for (let i = 0; i < 3; i++) {
    clock += 1000
    finger(half('walk'), 'pointerdown', 50 + i, 100, 300)
    finger(half('walk'), 'pointermove', 50 + i, 140, 300)
    finger(half('walk'), 'pointerup', 50 + i, 140, 300)
  }
  expect(hintBox('walk').style.display).toBe('none')
  // Walking for 21 seconds without lifting or touching the jump half: the thumb is on the glass, so the game is not
  // being left alone.
  finger(half('walk'), 'pointerdown', 60, 100, 300)
  finger(half('walk'), 'pointermove', 60, 140, 300)
  clock += 21_000
  await new Promise((resolve) => setTimeout(resolve, 300))
  expect(hintBox('walk').style.display).toBe('none')
  expect(sorted(t.held())).toEqual(['right'])
  // Lift, and the twenty seconds start from now.
  finger(half('walk'), 'pointerup', 60, 140, 300)
  clock += 19_000
  await new Promise((resolve) => setTimeout(resolve, 300))
  expect(hintBox('walk').style.display).toBe('none')
  clock += 2000
  await vi.waitFor(() => expect(hintBox('walk').style.display).toBe('flex'))
})

test('a tap on the jump half just before a mask is not a jump when play resumes', () => {
  const t = make()
  finger(half('jump'), 'pointerdown', 70, 600, 300)
  finger(half('jump'), 'pointerup', 70, 600, 300)
  t.mask()
  expect(sorted(t.drain())).toEqual([])
  // A round button's tap is held back the same way.
  const own = button('throw')
  const box = own.getBoundingClientRect()
  finger(own, 'pointerdown', 71, box.left + 5, box.top + 5)
  finger(own, 'pointerup', 71, box.left + 5, box.top + 5)
  t.mask()
  expect(sorted(t.drain())).toEqual([])
})

test('a tablet turned from upright to sideways lets go of a held thumb', async () => {
  // Both are wider than 600 px, so both are `over`: the shape does not change, the screen does.
  mount.style.cssText = 'position:fixed;left:0;top:0;width:820px;height:1180px;overflow:hidden'
  await page.viewport(1180, 1180)
  const t = make()
  finger(half('walk'), 'pointerdown', 80, 100, 300)
  finger(half('walk'), 'pointermove', 80, 140, 300)
  expect(sorted(t.held())).toEqual(['right'])
  mount.style.width = '1180px'
  mount.style.height = '820px'
  await vi.waitFor(() => expect(sorted(t.held())).toEqual([]))
  expect(ring().style.display).toBe('none')
})

test('a browser bar sliding in and out does not let go of a held thumb', async () => {
  const t = make()
  finger(half('walk'), 'pointerdown', 90, 100, 300)
  finger(half('walk'), 'pointermove', 90, 140, 300)
  mount.style.height = '340px'
  await new Promise((resolve) => setTimeout(resolve, 150))
  expect(sorted(t.held())).toEqual(['right'])
})

test('a game with dash has the dash mark, 64 px, and a tap on it is a dash', () => {
  const t = make({ dash: true })
  const mark = button('dash')
  const box = mark.getBoundingClientRect()
  expect(box.width).toBeGreaterThanOrEqual(64)
  expect(box.height).toBeGreaterThanOrEqual(64)
  finger(mark, 'pointerdown', 20, box.left + 5, box.top + 5)
  expect(sorted(t.drain())).toEqual(['dash'])
  finger(mark, 'pointerup', 20, box.left + 5, box.top + 5)
  expect(sorted(t.drain())).toEqual([])
  expect(sorted(t.held())).toEqual([])
})

test('a game without dash has no dash mark, and its own action is a 64 px button above the jump half', () => {
  const t = make()
  expect(mount.querySelector('[data-action="dash"]')).toBeNull()
  const own = button('throw')
  const box = own.getBoundingClientRect()
  expect(box.width).toBeGreaterThanOrEqual(64)
  expect(box.height).toBeGreaterThanOrEqual(64)
  // Above the jump half's resting corner, and in the right half.
  expect(box.bottom).toBeLessThanOrEqual(390 - 195)
  expect(box.left).toBeGreaterThanOrEqual(422)
  // The thumbs' own actions are not buttons.
  for (const action of ['left', 'right', 'jump'])
    expect(mount.querySelector(`button[data-action="${action}"]`)).toBeNull()
  finger(own, 'pointerdown', 21, box.left + 5, box.top + 5)
  expect(sorted(t.held())).toEqual(['throw'])
  expect(sorted(t.drain())).toEqual(['throw'])
  finger(own, 'pointerup', 21, box.left + 5, box.top + 5)
})

test('nothing scrolls, zooms or opens a menu under a thumb', () => {
  make({ dash: true })
  for (const name of ['walk', 'jump'] as const) {
    const el = half(name)
    const style = getComputedStyle(el)
    expect(style.touchAction).toBe('none')
    expect(style.userSelect).toBe('none')
    expect(finger(el, 'pointerdown', 30, 100, 300).defaultPrevented).toBe(true)
    const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    el.dispatchEvent(menu)
    expect(menu.defaultPrevented).toBe(true)
    finger(el, 'pointerup', 30, 100, 300)
  }
  const mark = button('dash')
  expect(getComputedStyle(mark).touchAction).toBe('none')
  expect(finger(mark, 'pointerdown', 31, 0, 0).defaultPrevented).toBe(true)
  const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  mark.dispatchEvent(menu)
  expect(menu.defaultPrevented).toBe(true)
})

test('a game whose hero has no moves still gets the buttons, and one with moves gets the thumbs', () => {
  const frames = manualFrames()
  const plain = createInput({ mount, controls: fixtureControls, frames, words: said({}) })
  expect(mount.querySelector('.automata-touch')).not.toBeNull()
  expect(mount.querySelector('.automata-thumbs')).toBeNull()
  plain.destroy()
  const moving = createInput({
    mount,
    controls: fixtureControls,
    frames,
    words: said({}),
    thumbs: { dash: false },
  })
  expect(mount.querySelector('.automata-touch')).toBeNull()
  expect(mount.querySelector('.automata-thumbs')).not.toBeNull()
  expect(moving.thumbRoom()).toBe(120)
  moving.destroy()
  expect(mount.querySelector('.automata-thumbs')).toBeNull()
})

test('an element the page stacks over a half, outside the mount, takes its own touch and the half sees none', () => {
  const t = make()
  const pause = document.createElement('button')
  pause.style.cssText = 'position:fixed;left:600px;top:20px;width:80px;height:80px;z-index:10'
  document.body.append(pause)
  try {
    expect(document.elementFromPoint(640, 60)).toBe(pause)
    finger(pause, 'pointerdown', 40, 640, 60)
    expect(sorted(t.held())).toEqual([])
    expect(sorted(t.drain())).toEqual([])
  } finally {
    pause.remove()
  }
})

// What sits over the game: the pause button (48 px, inside the corner, on the side away from the jumping thumb, and no
// touch on it reaches the game), the numbers over the heroes when more than one plays, and the line for a game that
// plays itself.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { frameworkWords } from '#src/features/locale/locale.ts'
import type { HeroBox } from '#src/features/render/render.ts'
import { hud } from '#src/features/screens/hud.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { testLocale } from '../../fixtures/screens/locale.ts'

const words = frameworkWords('es')

let mount: HTMLDivElement
let under: HTMLDivElement
let screen: ReturnType<typeof hud> | undefined
let touched: number
let paused: number
let heroes: HeroBox[]
let jump: 'left' | 'right'

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;inset:0'
  // Stands for the game's own touch halves, which the HUD must never take a touch from.
  under = document.createElement('div')
  under.style.cssText = 'position:absolute;inset:0'
  under.addEventListener('pointerdown', () => {
    touched += 1
  })
  mount.append(under)
  document.body.append(mount)
  touched = 0
  paused = 0
  heroes = []
  jump = 'right'
})
afterEach(() => {
  screen?.destroy()
  screen = undefined
  mount.remove()
})

function open(options: { watching?: () => void } = {}): void {
  screen = hud({
    mount,
    locale: testLocale('es').locale,
    frames: manualFrames(),
    jumpSide: () => jump,
    onPause: () => {
      paused += 1
    },
    heroes: () => heroes,
    ...(options.watching === undefined ? {} : { watching: { onTake: options.watching } }),
  })
}

const pauseButton = (): HTMLButtonElement => mount.querySelector('button') as HTMLButtonElement
const numbers = (): string[] => [...mount.querySelectorAll('.number')].map((span) => span.textContent ?? '')

test.each(SCREENS)(
  'at %s the pause button is 48 px, in the corner away from the jumping thumb',
  async (_name, w, h) => {
    await page.viewport(w, h)
    open()
    const box = pauseButton().getBoundingClientRect()
    expect([box.width, box.height]).toEqual([48, 48])
    // The jump is on the right, so the button is at the top left, 12 px or more in from both edges.
    expect(box.left).toBeGreaterThanOrEqual(12)
    expect(box.top).toBeGreaterThanOrEqual(12)
    expect(box.right).toBeLessThan(window.innerWidth / 2)
    expect(pauseButton().getAttribute('aria-label')).toBe(words('automata.pause.button'))
  },
)

test('a touch on the pause button pauses and never reaches the game, and a touch elsewhere does', async () => {
  await page.viewport(390, 844)
  open()
  await userEvent.click(pauseButton())
  expect([paused, touched]).toEqual([1, 0])
  await userEvent.click(under)
  expect([paused, touched]).toEqual([1, 1])
})

test('with sides swapped the button moves to the other corner at the next draw', async () => {
  await page.viewport(390, 844)
  open()
  expect(pauseButton().getBoundingClientRect().left).toBeLessThan(window.innerWidth / 2)
  jump = 'left'
  screen?.draw()
  expect(pauseButton().getBoundingClientRect().right).toBeGreaterThan(window.innerWidth / 2)
})

test('with two players a number is over each hero and follows it after each draw', async () => {
  await page.viewport(390, 844)
  heroes = [
    { player: 1, x: 100, y: 300, w: 40, h: 40 },
    { player: 2, x: 200, y: 300, w: 40, h: 40 },
  ]
  open()
  screen?.draw()
  expect(numbers()).toEqual(['1', '2'])
  const first = (mount.querySelector('.number') as HTMLElement).getBoundingClientRect()
  expect(Math.round(first.left + first.width / 2)).toBe(120)
  expect(Math.round(first.bottom)).toBe(300)
  heroes = [
    { player: 1, x: 150, y: 250, w: 40, h: 40 },
    { player: 2, x: 200, y: 300, w: 40, h: 40 },
  ]
  screen?.draw()
  const moved = (mount.querySelector('.number') as HTMLElement).getBoundingClientRect()
  expect([Math.round(moved.left + moved.width / 2), Math.round(moved.bottom)]).toEqual([170, 250])
})

test('the score line is clear of the pause button and of the numbers over two heroes at the start', async () => {
  await page.viewport(390, 844)
  heroes = [
    { player: 1, x: 100, y: 400, w: 40, h: 40 },
    { player: 2, x: 200, y: 400, w: 40, h: 40 },
  ]
  screen = hud({
    mount,
    locale: testLocale('es').locale,
    frames: manualFrames(),
    jumpSide: () => jump,
    onPause: () => {},
    heroes: () => heroes,
    score: () => 3,
  })
  screen.draw()
  const line = (mount.querySelector('.score') as HTMLElement).getBoundingClientRect()
  const apart = (other: DOMRect): boolean =>
    line.right <= other.left ||
    other.right <= line.left ||
    line.bottom <= other.top ||
    other.bottom <= line.top
  expect(apart(pauseButton().getBoundingClientRect())).toBe(true)
  for (const one of mount.querySelectorAll('.number')) expect(apart(one.getBoundingClientRect())).toBe(true)
  expect(mount.querySelectorAll('.number')).toHaveLength(2)
})

test('with one player no number is drawn', () => {
  heroes = [{ player: 1, x: 100, y: 300, w: 40, h: 40 }]
  open()
  screen?.draw()
  expect(numbers()).toEqual([])
})

test('a number is never a thing to touch: a touch where one is reaches the game', async () => {
  await page.viewport(390, 844)
  heroes = [
    { player: 1, x: 100, y: 300, w: 40, h: 40 },
    { player: 2, x: 200, y: 300, w: 40, h: 40 },
  ]
  open()
  screen?.draw()
  const at = (mount.querySelector('.number') as HTMLElement).getBoundingClientRect()
  expect(document.elementFromPoint(at.left + 4, at.top + 4)).toBe(under)
})

test('while watching, the line of words is shown, there is no pause button, and a tap calls onTake once', async () => {
  await page.viewport(390, 844)
  let taken = 0
  open({
    watching: () => {
      taken += 1
    },
  })
  expect(mount.textContent).toContain(words('automata.watch.tap'))
  expect(mount.querySelector('[aria-label]')).toBeNull()
  await userEvent.click(mount.querySelector('.take') as HTMLElement)
  expect(taken).toBe(1)
})

// The main menu: every button is on the screen at every size with nothing scrolling, the first is the one to press and is
// where a thumb is, the pad and keys work it, and it says itself again in another language with the focus where it was.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { type MenuItem, menuItems, menuScreen } from '#src/features/screens/menu.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'
import { type TestLocale, testLocale } from '../../fixtures/screens/locale.ts'

const FRAME = 1000 / 60

let mount: HTMLDivElement
let screen: ReturnType<typeof menuScreen> | undefined
let frames: ManualFrames
let fake: FakeGamepads
let picked: MenuItem[]
let language: TestLocale

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;inset:0'
  document.body.append(mount)
  frames = manualFrames()
  fake = fakeGamepads()
  fake.connect(0)
  picked = []
})
afterEach(() => {
  screen?.destroy()
  screen = undefined
  mount.remove()
})

const ALL = menuItems({ saved: true, room: true, canQuit: true })

function open(items: readonly MenuItem[] = ALL, players?: readonly number[]): void {
  language = testLocale('es')
  screen = menuScreen({
    mount,
    locale: language.locale,
    frames,
    gamepads: fake.getGamepads,
    name: 'Crate Game',
    items,
    ...(players === undefined ? {} : { players }),
    onPick: (item) => picked.push(item),
  })
  frames.at(0)
}

const buttons = (): HTMLButtonElement[] => [...mount.querySelectorAll('button')]

function tap(button: Parameters<FakeGamepads['press']>[0]): void {
  fake.press(button)
  frames.advance(FRAME)
  fake.release(button)
  frames.advance(FRAME)
}

test.each(SCREENS)(
  'at %s every button is on screen with no scrolling, 48 px for the first and 44 for the rest',
  async (_name, w, h) => {
    await page.viewport(w, h)
    open()
    const all = buttons()
    expect(all).toHaveLength(ALL.length)
    for (const [at, button] of all.entries()) {
      const box = button.getBoundingClientRect()
      expect([box.left >= 0, box.right <= window.innerWidth]).toEqual([true, true])
      expect([box.top >= 0, box.bottom <= window.innerHeight]).toEqual([true, true])
      expect(box.height).toBeGreaterThanOrEqual(at === 0 ? 48 : 44)
    }
    // None sits on top of the next.
    const boxes = all.map((button) => button.getBoundingClientRect())
    for (const [at, box] of boxes.entries()) {
      const next = boxes[at + 1]
      if (next !== undefined) expect(box.bottom).toBeLessThanOrEqual(next.top)
    }
    const root = document.scrollingElement as Element
    expect(root.scrollHeight).toBeLessThanOrEqual(window.innerHeight)
    expect(mount.scrollHeight).toBeLessThanOrEqual(window.innerHeight)
  },
)

test('the first button has the focus, and the pad walks down to Settings and presses it', () => {
  open()
  expect(document.activeElement).toBe(buttons()[0])
  // Continue, New game, Saved games, Add a player, Settings: four steps down.
  for (let step = 0; step < 4; step++) tap('dpad-down')
  expect(document.activeElement?.textContent?.trim()).toBe(frameworkWords('es')('automata.menu.settings'))
  tap('south')
  expect(picked).toEqual(['settings'])
})

test("on a phone the first button's middle is in the lower half of the screen", async () => {
  await page.viewport(390, 844)
  open()
  const box = buttons()[0]?.getBoundingClientRect() as DOMRect
  expect(box.top + box.height / 2).toBeGreaterThan(window.innerHeight / 2)
})

test('on a phone on its side the name is on the left and the buttons are on the right', async () => {
  await page.viewport(844, 390)
  open()
  const title = (mount.querySelector('h1') as HTMLElement).getBoundingClientRect()
  for (const button of buttons())
    expect(button.getBoundingClientRect().left).toBeGreaterThanOrEqual(title.right)
})

test('Quit is there only for a host that can quit', () => {
  open(menuItems({ saved: false, room: false, canQuit: false }))
  expect(buttons().map((button) => button.textContent?.trim())).toEqual(['Jugar', 'Ajustes'])
  screen?.destroy()
  open(menuItems({ saved: false, room: false, canQuit: true }))
  expect(buttons().map((button) => button.textContent?.trim())).toEqual(['Jugar', 'Ajustes', 'Salir'])
})

test('a tap on each button tells which it was', async () => {
  await page.viewport(390, 844)
  open()
  for (const button of buttons()) await userEvent.click(button)
  expect(picked).toEqual(ALL)
})

test('the name is a heading, and a picture stands in for it with the name as its text', async () => {
  await page.viewport(390, 844)
  open()
  await expect.element(page.getByRole('heading', { name: 'Crate Game' })).toBeInTheDocument()
  screen?.destroy()
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 8
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((made) => resolve(made as Blob)))
  language = testLocale('es')
  screen = menuScreen({
    mount,
    locale: language.locale,
    frames,
    name: 'Crate Game',
    picture: blob,
    items: ALL,
    onPick: () => {},
  })
  expect(mount.querySelector('h1')).toBeNull()
  expect(mount.querySelector('img')?.alt).toBe('Crate Game')
})

test('with two players it says who is in, and with one it says nothing', () => {
  open(ALL, [1, 2])
  expect(mount.textContent).toContain(frameworkWords('es')('automata.players.in', { player: 2 }))
  screen?.destroy()
  open(ALL, [1])
  expect(mount.querySelector('p')).toBeNull()
})

test('it is said again in Korean when the language changes, with the same button focused', () => {
  open()
  tap('dpad-down')
  tap('dpad-down')
  const before = buttons().indexOf(document.activeElement as HTMLButtonElement)
  expect(before).toBe(2)
  language.set('ko')
  const after = buttons()
  expect(after.indexOf(document.activeElement as HTMLButtonElement)).toBe(before)
  expect(after[0]?.textContent?.trim()).toBe(frameworkWords('ko')('automata.menu.continue'))
  expect((mount.querySelector('[data-screen="menu"]') as HTMLElement).lang).toBe('ko')
})

// The pause screen: it fits at every size, "Keep playing" is first and has the focus, Escape and the pad's start and
// right buttons each keep playing, and "Main menu" asks first. A tap on it never reaches the game under it.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { type PauseItem, pauseScreen } from '#src/features/screens/pause.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'
import { testLocale } from '../../fixtures/screens/locale.ts'
import { keyboard } from '../../fixtures/ui/keys.ts'

const FRAME = 1000 / 60
const words = frameworkWords('es')

let mount: HTMLDivElement
let under: HTMLDivElement
let screen: ReturnType<typeof pauseScreen> | undefined
let frames: ManualFrames
let fake: FakeGamepads
let picked: PauseItem[]
let removed: number[]
let touched: number

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;inset:0'
  // Stands for the game's own touch halves, under the screen.
  under = document.createElement('div')
  under.style.cssText = 'position:absolute;inset:0'
  under.addEventListener('pointerdown', () => {
    touched += 1
  })
  mount.append(under)
  document.body.append(mount)
  frames = manualFrames()
  fake = fakeGamepads()
  fake.connect(0)
  picked = []
  removed = []
  touched = 0
})
afterEach(() => {
  screen?.destroy()
  screen = undefined
  mount.remove()
})

const ITEMS: readonly PauseItem[] = ['resume', 'add-player', 'settings', 'leave']

function open(removable: readonly number[] = []): void {
  screen = pauseScreen({
    mount,
    locale: testLocale('es').locale,
    frames,
    gamepads: fake.getGamepads,
    items: ITEMS,
    removable,
    onPick: (item) => picked.push(item),
    onRemove: (player) => removed.push(player),
  })
  frames.at(0)
}

const buttons = (): HTMLButtonElement[] => [...mount.querySelectorAll('button')]
const named = (label: string): HTMLButtonElement =>
  buttons().find((button) => button.textContent?.trim() === label) as HTMLButtonElement

function tap(button: Parameters<FakeGamepads['press']>[0]): void {
  fake.press(button)
  frames.advance(FRAME)
  fake.release(button)
  frames.advance(FRAME)
}

test.each(SCREENS)(
  'at %s it fits, and "Keep playing" is first, 48 px and has the focus',
  async (_name, w, h) => {
    await page.viewport(w, h)
    open([2])
    const all = buttons()
    expect(all[0]?.textContent?.trim()).toBe(words('automata.pause.resume'))
    expect(document.activeElement).toBe(all[0])
    expect(all[0]?.getBoundingClientRect().height).toBeGreaterThanOrEqual(48)
    // Every button is on the screen, or the one list that scrolls holds it: the page itself never scrolls.
    for (const button of all.slice(0, 3)) {
      const box = button.getBoundingClientRect()
      expect([box.top >= 0, box.bottom <= window.innerHeight, box.height >= 44]).toEqual([true, true, true])
    }
    const root = document.scrollingElement as Element
    expect(root.scrollHeight).toBeLessThanOrEqual(window.innerHeight)
    await expect
      .element(page.getByRole('heading', { name: words('automata.pause.title') }))
      .toBeInTheDocument()
  },
)

test('a tap on a button never reaches the game under it', async () => {
  await page.viewport(390, 844)
  open()
  await userEvent.click(named(words('automata.pause.resume')))
  expect(picked).toEqual(['resume'])
  expect(touched).toBe(0)
})

test("Escape, the pad's start and its right button each keep playing", async () => {
  await page.viewport(390, 844)
  open()
  await keyboard('{Escape}')
  tap('start')
  tap('east')
  expect(picked).toEqual(['resume', 'resume', 'resume'])
})

test('Add a player and Settings are told, and a player can be taken out', async () => {
  await page.viewport(390, 844)
  open([2])
  await userEvent.click(named(words('automata.menu.add-player')))
  await userEvent.click(named(words('automata.menu.settings')))
  await userEvent.click(named(words('automata.pause.remove', { player: 2 })))
  expect(picked).toEqual(['add-player', 'settings'])
  expect(removed).toEqual([2])
})

test('"Main menu" asks first, and "Keep playing" on the question goes back to the pause screen', async () => {
  await page.viewport(390, 844)
  open()
  await userEvent.click(named(words('automata.pause.leave')))
  const dialog = mount.querySelector('[role="alertdialog"]') as HTMLElement
  expect(dialog.textContent).toContain(words('automata.pause.leave-ask'))
  expect(picked).toEqual([])
  // The safe answer has the focus.
  expect(document.activeElement?.textContent?.trim()).toBe(words('automata.pause.resume'))
  expect(dialog.contains(document.activeElement)).toBe(true)
  await userEvent.click(document.activeElement as HTMLElement)
  expect(mount.querySelector('[role="alertdialog"]')).toBeNull()
  expect(picked).toEqual([])
  expect(document.activeElement).toBe(buttons()[0])
})

test('a yes on the question leaves, and the pad start does not keep playing while it is asked', async () => {
  await page.viewport(390, 844)
  open()
  await userEvent.click(named(words('automata.pause.leave')))
  tap('start')
  expect(picked).toEqual([])
  await userEvent.click(named(words('automata.pause.leave-yes')))
  expect(picked).toEqual(['leave'])
})

// "You lost.": it fits at every size with Try again 48 px and focused, Escape and the pad's right button do nothing, the
// score and the best show when given, and a tap on a button never reaches the game under it.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { lostScreen } from '#src/features/screens/lost.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'
import { testLocale } from '../../fixtures/screens/locale.ts'

const FRAME = 1000 / 60
const words = frameworkWords('es')

let mount: HTMLDivElement
let screen: ReturnType<typeof lostScreen> | undefined
let agains: number
let menus: number
const frames = manualFrames()
const fake = fakeGamepads()

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;inset:0'
  document.body.append(mount)
  fake.connect(0)
  agains = 0
  menus = 0
})
afterEach(() => {
  screen?.destroy()
  screen = undefined
  mount.remove()
})

function open(options: { score?: number; best?: number; notKept?: string } = {}): void {
  screen = lostScreen({
    mount,
    locale: testLocale('es').locale,
    frames,
    gamepads: fake.getGamepads,
    ...options,
    onAgain: () => {
      agains += 1
    },
    onMenu: () => {
      menus += 1
    },
  })
  frames.at(0)
}

const buttons = (): HTMLButtonElement[] => [...mount.querySelectorAll('button')]

test.each(SCREENS)(
  'at %s it fits with no scrolling and Try again is 48 px and has the focus',
  async (_name, w, h) => {
    await page.viewport(w, h)
    open()
    const all = buttons()
    expect(all.map((one) => one.textContent?.trim())).toEqual([
      words('automata.lost.again'),
      words('automata.done.menu'),
    ])
    expect(document.activeElement).toBe(all[0])
    for (const button of all) {
      const box = button.getBoundingClientRect()
      expect([box.top >= 0, box.bottom <= window.innerHeight, box.height >= 48]).toEqual([true, true, true])
    }
    expect((document.scrollingElement as Element).scrollHeight).toBeLessThanOrEqual(window.innerHeight)
    await expect
      .element(page.getByRole('heading', { name: words('automata.lost.title') }))
      .toBeInTheDocument()
  },
)

test('Try again and Main menu each call their own function once', async () => {
  await page.viewport(390, 844)
  open()
  await userEvent.click(buttons()[0] as HTMLElement)
  expect([agains, menus]).toEqual([1, 0])
  await userEvent.click(buttons()[1] as HTMLElement)
  expect([agains, menus]).toEqual([1, 1])
})

test("Escape and the pad's right button do nothing", async () => {
  await page.viewport(390, 844)
  open()
  await userEvent.keyboard('{Escape}')
  fake.press('east')
  frames.advance(FRAME)
  fake.release('east')
  frames.advance(FRAME)
  expect([agains, menus]).toEqual([0, 0])
  expect(mount.querySelector('[data-screen="lost"]')).not.toBeNull()
})

test('the score and the best show when given, and a sentence on the best not being kept never takes a button', async () => {
  await page.viewport(390, 844)
  open({ score: 3, best: 5, notKept: 'No se guardó.' })
  expect(mount.textContent).toContain(words('automata.hud.score', { score: 3 }))
  expect(mount.textContent).toContain(words('automata.hud.best', { best: 5 }))
  expect(mount.textContent).toContain('No se guardó.')
  expect(buttons()).toHaveLength(2)
})

test('with no score given, no score line shows', async () => {
  await page.viewport(390, 844)
  open()
  expect(mount.textContent).not.toContain(words('automata.hud.score', { score: 0 }).split('0')[0] ?? '#')
})

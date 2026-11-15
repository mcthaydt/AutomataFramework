// The warnings a player reads before they play: they fit at every size, OK is the one thing to press and it is where a
// thumb is, and it speaks the device's language before the player has chosen one.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { warningsScreen } from '#src/features/screens/warnings.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'
import { testLocale } from '../../fixtures/screens/locale.ts'
import { keyboard } from '../../fixtures/ui/keys.ts'

const FRAME = 1000 / 60

let mount: HTMLDivElement
let screen: ReturnType<typeof warningsScreen> | undefined
let frames: ManualFrames
let fake: FakeGamepads
let oks: number

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;inset:0'
  document.body.append(mount)
  frames = manualFrames()
  fake = fakeGamepads()
  fake.connect(0)
  oks = 0
})
afterEach(() => {
  screen?.destroy()
  screen = undefined
  mount.remove()
})

const LINES = [
  'Este navegador no guardará tu progreso. Aun así, puedes jugar.',
  'Este juego tiene luces que parpadean.',
]

function open(lines: readonly string[] = LINES, language: 'es' | null = 'es'): void {
  const { locale } = testLocale(language)
  screen = warningsScreen({
    mount,
    locale,
    words: frameworkWords('es'),
    lines,
    onOk: () => {
      oks += 1
    },
    frames,
    gamepads: fake.getGamepads,
  })
  frames.at(0)
}

const okButton = (): HTMLButtonElement => {
  const buttons = [...mount.querySelectorAll('button')]
  return buttons.find((button) => button.textContent?.trim() === 'OK') as HTMLButtonElement
}

test.each(SCREENS)(
  'at %s the warnings fit, OK is at least 48 px and is in the bottom half',
  async (_name, w, h) => {
    await page.viewport(w, h)
    open()
    const box = okButton().getBoundingClientRect()
    expect([box.width >= 48, box.height >= 48]).toEqual([true, true])
    expect(box.top).toBeGreaterThanOrEqual(window.innerHeight / 2)
    expect(box.bottom).toBeLessThanOrEqual(window.innerHeight)
    // Both sentences are on the screen, whole.
    for (const line of LINES) {
      const text = [...mount.querySelectorAll('p')].find((p) => p.textContent === line) as HTMLElement
      const at = text.getBoundingClientRect()
      expect([at.left >= 0, at.right <= window.innerWidth, at.bottom <= box.top]).toEqual([true, true, true])
    }
    // The page does not scroll.
    const root = document.scrollingElement as Element
    expect(root.scrollHeight).toBeLessThanOrEqual(window.innerHeight)
    // OK has the focus from the start, so a keyboard or a pad can press it at once.
    expect(document.activeElement).toBe(okButton())
  },
)

test("OK by a tap, by Enter and by the pad's bottom button each call onOk once", async () => {
  await page.viewport(390, 844)
  open()
  await userEvent.click(okButton())
  expect(oks).toBe(1)
  await keyboard('{Enter}')
  expect(oks).toBe(2)
  fake.press('south')
  frames.advance(FRAME)
  fake.release('south')
  frames.advance(FRAME)
  expect(oks).toBe(3)
})

test('eight long warnings scroll inside the list and OK stays on screen', async () => {
  await page.viewport(390, 844)
  const long = Array.from(
    { length: 8 },
    (_, n) => `Aviso ${n + 1}. Este juego usa luces que parpadean, sonidos fuertes y movimientos rápidos.`,
  )
  open(long)
  const list = mount.querySelector('[role="region"]') as HTMLElement
  expect(list.scrollHeight).toBeGreaterThan(list.clientHeight)
  const box = okButton().getBoundingClientRect()
  expect(box.bottom).toBeLessThanOrEqual(window.innerHeight)
  expect(box.height).toBeGreaterThanOrEqual(48)
  const root = document.scrollingElement as Element
  expect(root.scrollHeight).toBeLessThanOrEqual(window.innerHeight)
})

test("before a language is chosen it speaks the device's language, and its lang says so", async () => {
  // The player has none yet: the words are the device's (Japanese here), and so is the screen's `lang`.
  const { locale } = testLocale(null)
  screen = warningsScreen({
    mount,
    locale,
    words: frameworkWords('ja'),
    language: 'ja',
    lines: ['このゲームは点滅する光を使います。'],
    onOk: () => {},
    frames,
    gamepads: fake.getGamepads,
  })
  const box = mount.querySelector('[data-screen="warnings"]') as HTMLElement
  expect(box.lang).toBe('ja')
  expect(box.querySelector('h1')?.textContent).toBe('プレイする前に')
  expect(box.querySelector('button')?.textContent?.trim()).toBe('OK')
  await expect.element(page.getByRole('heading', { name: 'プレイする前に' })).toBeInTheDocument()
})

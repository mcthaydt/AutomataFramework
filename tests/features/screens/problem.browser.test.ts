// The screen for a game that stopped: two sentences for a player, the developer's lines as they were written, and one
// button. With no language it is the developer's lines and a picture, nothing else.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { problemScreen } from '#src/features/screens/problem.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { testLocale } from '../../fixtures/screens/locale.ts'

const words = frameworkWords('es')
const LINES = ['content/levels/level-1.json: the door "d1" has no level to open.']

let mount: HTMLDivElement
let screen: ReturnType<typeof problemScreen> | undefined
let reloads: number

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;inset:0'
  document.body.append(mount)
  reloads = 0
})
afterEach(() => {
  screen?.destroy()
  screen = undefined
  mount.remove()
})

function open(options: { language?: 'es' | null; fix?: string; lines?: readonly string[] } = {}): void {
  const language = options.language === undefined ? 'es' : options.language
  screen = problemScreen({
    mount,
    frames: manualFrames(),
    ...(language === null ? {} : { locale: testLocale(language).locale }),
    lines: options.lines ?? LINES,
    ...(options.fix === undefined ? {} : { fix: options.fix }),
    onReload: () => {
      reloads += 1
    },
  })
}

const button = (): HTMLButtonElement => mount.querySelector('button') as HTMLButtonElement

test.each(SCREENS)('at %s it fits with no scrolling and its button is 48 px', async (_name, w, h) => {
  await page.viewport(w, h)
  open({ fix: 'Run "automata check".' })
  const box = button().getBoundingClientRect()
  expect([box.top >= 0, box.bottom <= window.innerHeight, box.height >= 48]).toEqual([true, true, true])
  const root = document.scrollingElement as Element
  expect(root.scrollHeight).toBeLessThanOrEqual(window.innerHeight)
  expect(mount.querySelector('[role="alert"]')).not.toBeNull()
})

test("with a language it is in the player's words, and the developer's lines stay as given", () => {
  open({ fix: 'Run "automata check".' })
  const alert = mount.querySelector('[role="alert"]') as HTMLElement
  expect(alert.textContent).toContain(words('automata.problem.text'))
  expect(alert.textContent).toContain(LINES[0])
  expect(alert.textContent).toContain('Run "automata check".')
  expect(mount.querySelector('h1')?.textContent).toBe(words('automata.problem.title'))
  expect(button().textContent?.trim()).toBe(words('automata.problem.reload'))
})

test('with no language it shows the lines and none of the player words, and the button is a picture with a name', () => {
  open({ language: null })
  const alert = mount.querySelector('[role="alert"]') as HTMLElement
  expect(alert.textContent).toContain(LINES[0])
  expect(mount.querySelector('h1')).toBeNull()
  expect(mount.textContent).not.toContain(words('automata.problem.text'))
  expect(button().textContent?.trim()).toBe('')
  expect(button().getAttribute('aria-label')).toBe('Load the page again')
  expect(button().querySelector('svg')).not.toBeNull()
  const box = button().getBoundingClientRect()
  expect([box.width >= 48, box.height >= 48]).toEqual([true, true])
})

test('"Load the page again" calls onReload once', async () => {
  await page.viewport(390, 844)
  open()
  await userEvent.click(button())
  expect(reloads).toBe(1)
})

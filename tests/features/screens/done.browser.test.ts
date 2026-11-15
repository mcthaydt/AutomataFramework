// "Well done!": it fits at every size with its main button 48 px, the last level says the game is finished, and a
// sentence about progress that was not kept never stands in the way of "Next level".
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { doneScreen } from '#src/features/screens/done.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { testLocale } from '../../fixtures/screens/locale.ts'

const words = frameworkWords('es')

let mount: HTMLDivElement
let screen: ReturnType<typeof doneScreen> | undefined
let nexts: number
let menus: number

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;inset:0'
  document.body.append(mount)
  nexts = 0
  menus = 0
})
afterEach(() => {
  screen?.destroy()
  screen = undefined
  mount.remove()
})

function open(options: { next?: boolean; notKept?: string } = {}): void {
  screen = doneScreen({
    mount,
    locale: testLocale('es').locale,
    frames: manualFrames(),
    level: 'Nivel 1',
    next: options.next ?? true,
    ...(options.notKept === undefined ? {} : { notKept: options.notKept }),
    onNext: () => {
      nexts += 1
    },
    onMenu: () => {
      menus += 1
    },
  })
}

const buttons = (): HTMLButtonElement[] => [...mount.querySelectorAll('button')]

test.each(SCREENS)('at %s it fits with no scrolling and its main button is 48 px', async (_name, w, h) => {
  await page.viewport(w, h)
  open({ notKept: words('automata.done.not-kept') })
  const all = buttons()
  expect(all.map((button) => button.textContent?.trim())).toEqual([
    words('automata.done.next'),
    words('automata.done.menu'),
  ])
  for (const button of all) {
    const box = button.getBoundingClientRect()
    expect([box.left >= 0, box.right <= window.innerWidth, box.top >= 0, box.bottom <= window.innerHeight]).toEqual([
      true,
      true,
      true,
      true,
    ])
  }
  expect(all[0]?.getBoundingClientRect().height).toBeGreaterThanOrEqual(48)
  expect(document.activeElement).toBe(all[0])
  const root = document.scrollingElement as Element
  expect(root.scrollHeight).toBeLessThanOrEqual(window.innerHeight)
  expect(mount.textContent).toContain(words('automata.done.level', { level: 'Nivel 1' }))
})

test('"Next level" and "Main menu" each call theirs once', async () => {
  await page.viewport(390, 844)
  open()
  await userEvent.click(buttons()[0] as HTMLElement)
  await userEvent.click(buttons()[1] as HTMLElement)
  expect([nexts, menus]).toEqual([1, 1])
})

test('after the last level it says the game is finished and has one button', async () => {
  await page.viewport(390, 844)
  open({ next: false })
  expect(buttons().map((button) => button.textContent?.trim())).toEqual([words('automata.done.menu')])
  expect(mount.textContent).toContain(words('automata.done.game'))
  expect(buttons()[0]?.getBoundingClientRect().height).toBeGreaterThanOrEqual(48)
  await userEvent.click(buttons()[0] as HTMLElement)
  expect([nexts, menus]).toEqual([0, 1])
})

test('progress that was not kept is a sentence, and "Next level" still works', async () => {
  await page.viewport(390, 844)
  const sentence = words('automata.done.not-kept')
  open({ notKept: sentence })
  expect(mount.querySelector('[role="status"]')?.textContent).toBe(sentence)
  await userEvent.click(buttons()[0] as HTMLElement)
  expect(nexts).toBe(1)
})

test('with nothing to report there is no status line', () => {
  open()
  expect(mount.querySelector('[role="status"]')).toBeNull()
})

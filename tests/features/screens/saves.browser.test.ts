// The saved games screen alone: three places fit, a loss asks first, and a place that cannot be opened says why.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { frameworkWords } from '#src/features/locale/locale.ts'
import type { SlotState } from '#src/features/saves/saves.ts'
import { savesScreen } from '#src/features/screens/saves.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { testLocale } from '../../fixtures/screens/locale.ts'

const es = frameworkWords('es')

let mount: HTMLDivElement
let screen: ReturnType<typeof savesScreen> | undefined
let told: string[]

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;inset:0'
  document.body.append(mount)
  told = []
})
afterEach(() => {
  screen?.destroy()
  screen = undefined
  mount.remove()
})

const THREE: readonly SlotState[] = [
  { slot: 0, kind: 'ready', savedAt: 3, label: 'Nivel Dos' },
  { slot: 1, kind: 'ready', savedAt: 2, label: 'Nivel Uno' },
  { slot: 2, kind: 'empty' },
]

function open(
  slots: readonly SlotState[] = THREE,
  problem?: Parameters<typeof savesScreen>[0]['problem'],
): void {
  screen = savesScreen({
    mount,
    locale: testLocale('es').locale,
    slots,
    ...(problem === undefined ? {} : { problem }),
    onContinue: (slot) => told.push(`continue ${slot}`),
    onNew: (slot) => told.push(`new ${slot}`),
    onErase: (slot) => told.push(`erase ${slot}`),
    onBack: () => told.push('back'),
  })
}

const buttons = (): HTMLButtonElement[] => [...mount.querySelectorAll('button')]
const named = (label: string): HTMLElement =>
  buttons().find((one) => one.textContent?.trim() === label) as HTMLElement
/** The button called `label` in the place called `place`. */
const inPlace = (place: string, label: string): HTMLButtonElement => {
  const section = mount.querySelector(`section[aria-label="${place}"]`) as HTMLElement
  const found = [...section.querySelectorAll('button')].find((one) => one.textContent?.trim() === label)
  if (found === undefined) throw new Error(`${place} has no "${label}" button.`)
  return found
}
const game = (number: number): string => es('automata.saves.place', { number })
/** A button of the question on top: in Spanish its "Delete" says what a place's own button says. */
function inQuestion(label: string): HTMLElement {
  const asked = [...(mount.querySelector('[role="alertdialog"]')?.querySelectorAll('button') ?? [])]
  return asked.find((one) => one.textContent?.trim() === label) as HTMLElement
}

test.each(SCREENS)(
  'at %s three places fit with no scrolling, except on the sideways phone where only the list scrolls',
  async (name, w, h) => {
    await page.viewport(w, h)
    open()
    const list = mount.querySelector('[role="region"]') as HTMLElement
    if (name !== 'phone-844x390') expect(list.scrollHeight).toBeLessThanOrEqual(list.clientHeight)
    const root = document.scrollingElement as Element
    expect([root.scrollWidth <= window.innerWidth, root.scrollHeight <= window.innerHeight]).toEqual([
      true,
      true,
    ])
    for (const button of buttons()) {
      const box = button.getBoundingClientRect()
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
    }
    expect(buttons()[0]?.textContent?.trim()).toBe(es('automata.back'))
  },
)

test('Continue is the one thing to press: first, 48 px, with the focus', async () => {
  await page.viewport(390, 844)
  open()
  const primary = buttons().filter((one) => one.dataset.kind === 'primary')
  expect(primary.map((one) => one.textContent?.trim())).toEqual([es('automata.saves.continue')])
  expect(primary[0]?.getBoundingClientRect().height).toBeGreaterThanOrEqual(48)
  expect(primary[0]).toBe(inPlace(game(1), es('automata.saves.continue')))
  expect(document.activeElement).toBe(primary[0])
})

test('Continue opens that place, and New game here on an empty place needs no question', async () => {
  open()
  await userEvent.click(inPlace(game(2), es('automata.saves.continue')))
  await userEvent.click(inPlace(game(3), es('automata.saves.new')))
  expect(told).toEqual(['continue 1', 'new 2'])
  expect(mount.querySelector('[role="alertdialog"]')).toBeNull()
})

test('"New game here" on a used place asks first: "Keep it" changes nothing, "Start a new game" writes', async () => {
  open()
  await userEvent.click(inPlace(game(1), es('automata.saves.new')))
  await expect.poll(() => mount.querySelector('[role="alertdialog"]')).not.toBeNull()
  expect(mount.textContent).toContain(es('automata.saves.replace-ask'))
  await userEvent.click(named(es('automata.keep')))
  await expect.poll(() => mount.querySelector('[role="alertdialog"]')).toBeNull()
  expect(told).toEqual([])
  await userEvent.click(inPlace(game(1), es('automata.saves.new')))
  await userEvent.click(named(es('automata.saves.replace-yes')))
  expect(told).toEqual(['new 0'])
})

test('Delete asks first; "Keep it" keeps it; "Delete it" empties the place', async () => {
  open()
  await userEvent.click(inPlace(game(2), es('automata.saves.erase')))
  await expect.poll(() => mount.textContent).toContain(es('automata.saves.erase-ask'))
  await userEvent.click(named(es('automata.keep')))
  expect(told).toEqual([])
  await userEvent.click(inPlace(game(2), es('automata.saves.erase')))
  await userEvent.click(inQuestion(es('automata.saves.erase-yes')))
  expect(told).toEqual(['erase 1'])
})

test('a damaged saved game says so in words and can only be deleted', async () => {
  open([
    { slot: 0, kind: 'damaged', problem: { kind: 'damaged', detail: 'not json' } },
    { slot: 1, kind: 'newer', problem: { kind: 'newer', version: 4 } },
    { slot: 2, kind: 'empty' },
  ])
  const first = mount.querySelector(`section[aria-label="${game(1)}"]`) as HTMLElement
  expect(first.textContent).toContain(es('automata.saves.damaged'))
  expect([...first.querySelectorAll('button')].map((one) => one.textContent?.trim())).toEqual([
    es('automata.saves.erase'),
  ])
  const second = mount.querySelector(`section[aria-label="${game(2)}"]`) as HTMLElement
  expect(second.textContent).toContain(es('automata.saves.newer'))
  // The one thing to press is the empty place's New game here: nothing can be opened.
  expect(buttons().filter((one) => one.dataset.kind === 'primary').length).toBe(1)
})

test('a list the host would not give says why, in place of the places', async () => {
  open([], { kind: 'refused', refusal: 'unavailable', detail: 'no' })
  expect(mount.querySelector('[role="alert"]')?.textContent).toBe(es('automata.saves.refused.unavailable'))
  expect(mount.querySelector('section')).toBeNull()
})

test('Back, and Escape, go back', async () => {
  open()
  await userEvent.click(buttons()[0] as HTMLElement)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))
  expect(told).toEqual(['back', 'back'])
})

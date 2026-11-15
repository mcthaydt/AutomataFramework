import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { Sheet } from '../../fixtures/ui/sheet.ts'

let target: HTMLDivElement
let sheet: ReturnType<typeof mount> | undefined
let log: string[]

beforeEach(() => {
  // Fills the page, as a game's screen fills its mount.
  target = document.createElement('div')
  target.style.cssText = 'position:fixed;inset:0'
  document.body.append(target)
  log = []
  sheet = mount(Sheet, { target, props: { log: (what) => log.push(what) } })
  // Mounting leaves its effects (the first focus, the first measure) for later; a test wants them now.
  flushSync()
})
afterEach(() => {
  if (sheet !== undefined) void unmount(sheet)
  sheet = undefined
  target.remove()
})

const slider = (): HTMLElement => target.querySelector<HTMLElement>('[role="slider"]') as HTMLElement
const controls = (): HTMLElement[] => [
  ...target.querySelectorAll<HTMLElement>('button, [role="slider"], [role="switch"]'),
]
/** Where on the page a value of the slider lies, with the 44 px thumb at its end. */
const xOf = (value: number): number => {
  const box = slider().getBoundingClientRect()
  return box.left + 22 + value * (box.width - 44)
}
const pointer = (type: string, clientX: number): PointerEvent =>
  new PointerEvent(type, { clientX, clientY: 0, pointerId: 1, bubbles: true, isPrimary: true })

test.each(SCREENS)(
  'at %s every control is at least 44 px and nothing but the list scrolls',
  async (_name, w, h) => {
    await page.viewport(w, h)
    const name = (control: HTMLElement): string =>
      control.textContent?.trim() || control.getAttribute('aria-label') || control.tagName
    const small = controls().filter((control) => {
      const box = control.getBoundingClientRect()
      return box.width < 44 || box.height < 44
    })
    expect(small.map(name)).toEqual([])
    // The page itself does not scroll, and nor does anything on it but the list.
    const root = document.scrollingElement as Element
    const fits = [root.scrollWidth <= window.innerWidth, root.scrollHeight <= window.innerHeight]
    expect(fits).toEqual([true, true])
    const list = target.querySelector('[role="region"]') as HTMLElement
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight)
    expect(getComputedStyle(list).overflowY).toBe('auto')
    for (const element of target.querySelectorAll<HTMLElement>('*')) {
      if (element === list) continue
      expect(['auto', 'scroll']).not.toContain(getComputedStyle(element).overflowY)
    }
    // Everything outside the list is on the screen, not clipped below it.
    const edge = (target.querySelector('[data-width]') as HTMLElement).getBoundingClientRect()
    const clipped = controls()
      .filter((control) => !list.contains(control))
      .filter((control) => {
        const box = control.getBoundingClientRect()
        return box.top < edge.top - 1 || box.bottom > edge.bottom + 1
      })
    expect(clipped.map(name)).toEqual([])
  },
)

test('a slider is dragged by a finger and says when it is let go', async () => {
  slider().dispatchEvent(pointer('pointerdown', xOf(0.8)))
  expect(log).toEqual(['change:0.8'])
  window.dispatchEvent(pointer('pointermove', xOf(0.2)))
  window.dispatchEvent(pointer('pointermove', xOf(0.2)))
  // Past either end it stops at the end, and the same place is not said twice.
  window.dispatchEvent(pointer('pointermove', xOf(-3)))
  expect(log).toEqual(['change:0.8', 'change:0.2', 'change:0'])
  expect(log).not.toContain('release:0')
  window.dispatchEvent(pointer('pointerup', xOf(-3)))
  expect(log.at(-1)).toBe('release:0')
  // A drag that has ended is not followed.
  window.dispatchEvent(pointer('pointermove', xOf(0.5)))
  expect(log).toHaveLength(4)
  await expect.poll(() => slider().getAttribute('aria-valuenow')).toBe('0')
  expect(document.activeElement).toBe(slider())
})

test('a slider is stepped by left and right keys, one step each, and says when each is let go', async () => {
  slider().focus()
  await userEvent.keyboard('{ArrowRight}')
  expect(log).toEqual(['change:0.55', 'release:0.55'])
  await userEvent.keyboard('{ArrowLeft}')
  await userEvent.keyboard('{ArrowLeft}')
  expect(log.filter((entry) => entry.startsWith('change'))).toEqual([
    'change:0.55',
    'change:0.5',
    'change:0.45',
  ])
  await userEvent.keyboard('{End}')
  expect(log.at(-2)).toBe('change:1')
  await userEvent.keyboard('{Home}')
  expect(log.at(-2)).toBe('change:0')
  // Up and down are not the slider's: they walk the screen.
  const before = log.length
  await userEvent.keyboard('{ArrowUp}')
  expect(log).toHaveLength(before)
})

test('a slider says its value for a screen reader', async () => {
  expect(slider().getAttribute('aria-valuenow')).toBe('50')
  expect(slider().getAttribute('aria-label')).toBe('Volume')
  slider().focus()
  await userEvent.keyboard('{ArrowRight}')
  await expect.poll(() => slider().getAttribute('aria-valuetext')).toBe('55%')
})

test('a switch is turned by a tap and by Space, and says whether it is on', async () => {
  const toggle = target.querySelector<HTMLElement>('[role="switch"]') as HTMLElement
  expect(toggle.getAttribute('aria-checked')).toBe('false')
  expect(toggle.getBoundingClientRect().height).toBeGreaterThanOrEqual(48)
  await userEvent.click(toggle)
  expect(log).toEqual(['shake:true'])
  await expect.poll(() => toggle.getAttribute('aria-checked')).toBe('true')
  toggle.focus()
  await userEvent.keyboard(' ')
  expect(log).toEqual(['shake:true', 'shake:false'])
})

test('a key row says it is waiting, and its button becomes the way out', async () => {
  const change = page.getByRole('button', { name: 'Change' }).first()
  await userEvent.click(change)
  expect(log).toEqual(['key'])
  await expect.element(page.getByText('Press a key')).toBeInTheDocument()
  const cancel = page.getByRole('button', { name: 'Cancel' })
  await expect.element(cancel).toBeInTheDocument()
  await userEvent.click(cancel)
  expect(log).toEqual(['key', 'cancel'])
  await expect.element(page.getByText('Space', { exact: true })).toBeInTheDocument()
})

test('a dialog that loses something opens with "no" focused and closes on Escape', async () => {
  await userEvent.click(page.getByRole('button', { name: 'Erase' }))
  const dialog = target.querySelector('[role="alertdialog"]') as HTMLElement
  expect(dialog).not.toBeNull()
  expect(dialog.getAttribute('aria-modal')).toBe('true')
  expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
  expect(dialog.textContent).toContain('It cannot come back.')
  expect((document.activeElement as HTMLElement).textContent?.trim()).toBe('Keep')
  await userEvent.keyboard('{Escape}')
  expect(log).toEqual(['no'])
  expect(target.querySelector('[role="alertdialog"]')).toBeNull()
})

test('a dialog holds the focus: Tab and Shift+Tab go round its two buttons and never out', async () => {
  await userEvent.click(page.getByRole('button', { name: 'Erase' }))
  const names = (): string => (document.activeElement as HTMLElement).textContent?.trim() ?? ''
  expect(names()).toBe('Keep')
  await userEvent.tab()
  expect(names()).toBe('Erase')
  await userEvent.tab()
  expect(names()).toBe('Keep')
  await userEvent.tab({ shift: true })
  expect(names()).toBe('Erase')
  // The dialog's own Erase comes before the one under it in the page.
  await userEvent.click(page.getByRole('button', { name: 'Erase' }).first())
  expect(log).toEqual(['yes'])
})

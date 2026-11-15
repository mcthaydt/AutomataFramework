import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Button, type ButtonProps, UI_PROPERTIES } from '#src/features/ui/ui.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'

let target: HTMLDivElement
let part: ReturnType<typeof mount> | undefined

beforeEach(() => {
  target = document.createElement('div')
  document.body.append(target)
})
afterEach(() => {
  drop()
  target.remove()
})

/** Takes the button off the page, so the next one is measured alone. */
function drop(): void {
  if (part !== undefined) void unmount(part)
  part = undefined
}

/** A button on the page: `props` over a label and a press that does nothing. */
function put(props: Partial<ButtonProps> = {}): HTMLButtonElement {
  part = mount(Button, { target, props: { label: 'Play', onpress: () => {}, ...props } })
  flushSync()
  const found = target.querySelector('button')
  if (found === null) throw new Error('The button is not on the page.')
  return found
}

test.each(SCREENS)(
  'at %s a primary button is at least 48 px both ways and a plain one 44',
  async (_name, w, h) => {
    await page.viewport(w, h)
    const primary = put({ kind: 'primary' }).getBoundingClientRect()
    expect([primary.width >= 48, primary.height >= 48]).toEqual([true, true])
    drop()
    const plain = put({ kind: 'plain' }).getBoundingClientRect()
    expect([plain.width >= 44, plain.height >= 44]).toEqual([true, true])
    // An icon alone is just as big.
    drop()
    const icon = put({ icon: 'gear', iconOnly: true }).getBoundingClientRect()
    expect([icon.width >= 44, icon.height >= 44]).toEqual([true, true])
  },
)

test('a tap, Enter and Space each press it once; a disabled one is never pressed', async () => {
  const onpress = vi.fn()
  const button = put({ onpress })
  await userEvent.click(button)
  expect(onpress).toHaveBeenCalledTimes(1)
  button.focus()
  await userEvent.keyboard('{Enter}')
  // A button presses on a key's release, which a browser may deliver a moment after the keys were sent.
  await expect.poll(() => onpress.mock.calls.length).toBe(2)
  await userEvent.keyboard(' ')
  await expect.poll(() => onpress.mock.calls.length).toBe(3)

  drop()
  const never = vi.fn()
  const off = put({ onpress: never, disabled: true })
  off.click()
  off.focus()
  await userEvent.keyboard('{Enter}')
  await userEvent.keyboard(' ')
  expect(never).not.toHaveBeenCalled()
  expect(off.disabled).toBe(true)
})

test("the button takes the game's own look from --automata-ui-accent", () => {
  expect(UI_PROPERTIES).toContain('--automata-ui-accent')
  target.style.setProperty('--automata-ui-accent', 'rgb(12, 34, 56)')
  target.style.setProperty('--automata-ui-accent-color', 'rgb(250, 240, 230)')
  const style = getComputedStyle(put({ kind: 'primary' }))
  expect(style.backgroundColor).toBe('rgb(12, 34, 56)')
  expect(style.color).toBe('rgb(250, 240, 230)')
  // A plain button is not filled with it.
  drop()
  expect(getComputedStyle(put({ kind: 'plain' })).backgroundColor).not.toBe('rgb(12, 34, 56)')
})

test('an icon-only button still has its name for a screen reader', async () => {
  const button = put({ label: 'Pause', icon: 'pause', iconOnly: true })
  expect(button.getAttribute('aria-label')).toBe('Pause')
  expect(button.textContent?.trim()).toBe('')
  expect(button.querySelector('svg')).not.toBeNull()
  // The drawing is hidden from a screen reader, so the name is said once.
  expect(button.querySelector('.icon')?.getAttribute('aria-hidden')).toBe('true')
  await expect.element(page.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
})

// The desktop, 1280 by 720, a keyboard only: every screen walked with the arrows, Enter and Escape, and a key changed in
// Settings that is then the key that walks the hero.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { focusedName, ticks, walkByKey } from '../../fixtures/flow/page.ts'
import { focusOn, keyboard } from '../../fixtures/ui/keys.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(async () => {
  await drive.start()
  await page.viewport(1280, 720)
})
afterEach(() => drive.stop())

/** Walks the focus with the arrows (a question's two buttons sit side by side) to the button called `label`, then Enter. */
async function enter(label: string): Promise<void> {
  const seen: string[] = [focusedName()]
  // What a failure needs to say: every focus change, and whether an earlier listener had already taken each arrow.
  const moved: string[] = []
  const arrows: string[] = []
  const onFocus = (): void => {
    moved.push(focusedName())
  }
  const onKey = (event: KeyboardEvent): void => {
    arrows.push(`${event.key}${event.defaultPrevented ? '!' : ''}`)
  }
  window.addEventListener('focusin', onFocus)
  window.addEventListener('keydown', onKey, { capture: true })
  for (const arrow of ['{ArrowDown}', '{ArrowUp}', '{ArrowLeft}', '{ArrowRight}']) {
    for (let step = 0; step < 10 && focusedName() !== label; step++) {
      await keyboard(arrow)
      seen.push(focusedName())
    }
    if (focusedName() === label) break
  }
  window.removeEventListener('focusin', onFocus)
  window.removeEventListener('keydown', onKey, { capture: true })
  const found = drive.mount.querySelectorAll<HTMLElement>('[data-screen]')
  const screens = [...found].map((one) => one.dataset.screen)
  const boxes = [...drive.mount.querySelectorAll('button')].map((one) => {
    const { x, y, width, height } = one.getBoundingClientRect()
    const says = one.textContent?.trim() || one.getAttribute('aria-label')
    return `${says}@${[x, y, width, height].map(Math.round).join(',')}`
  })
  const trail = [
    seen.join(' > '),
    `focus ${moved.join(' > ')}`,
    `keys ${arrows.join(' ')}`,
    `screens ${screens.join(',')}`,
    boxes.join(' '),
  ]
  const went = trail.join(' | ')
  expect(focusedName(), `Arrow keys could not reach "${label}": ${went}`).toBe(label)
  await keyboard('{Enter}')
}

/** The row of the controls for `action` (no gamepad is plugged in, so these are the keyboard's). */
function rowOf(action: string): HTMLElement {
  const rows = [...drive.mount.querySelectorAll<HTMLElement>('.key')]
  const row = rows.find((one) => one.querySelector('.action')?.textContent === action)
  if (row === undefined) throw new Error(`The controls have no row for "${action}".`)
  return row
}
function changeOf(action: string): HTMLButtonElement {
  return rowOf(action).querySelector('button') as HTMLButtonElement
}
const rowSays = (action: string): string => rowOf(action).querySelector('.input')?.textContent ?? ''

test('every screen is walked with arrows, Enter and Escape; a key is changed in Settings and used in the level', async () => {
  await drive.toMenu({ game: { noWarning: true } })
  await enter(es('automata.menu.settings'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="settings"]')).not.toBeNull()
  // Change the key for Right to L: Enter on Change, then L.
  await focusOn(changeOf('Right'))
  await keyboard('{Enter}')
  const asked = es('automata.settings.press-key', { action: 'Right' })
  await expect.poll(() => drive.mount.textContent).toContain(asked)
  drive.key('keydown', 'KeyL')
  drive.key('keyup', 'KeyL')
  await expect.poll(() => rowSays('Right')).toBe('L')
  // Escape goes back to the menu.
  await keyboard('{Escape}')
  await drive.wait(es('automata.menu.play'))
  expect(drive.mount.querySelector('[data-screen="settings"]')).toBeNull()
  await enter(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  ticks(drive, 30)
  // Escape pauses; Escape again keeps playing, and does not pause again.
  await keyboard('{Escape}')
  await drive.shown('paused')
  await drive.wait(es('automata.pause.resume'))
  await keyboard('{Escape}')
  await drive.shown('playing')
  ticks(drive, 5)
  expect(drive.step()).toBe('playing')
  // The old key does nothing; the new one walks to the door.
  walkByKey(drive, 'ArrowRight')
  expect(drive.step()).toBe('playing')
  walkByKey(drive, 'KeyL')
  await drive.shown('done')
  await drive.wait(es('automata.done.next'))
  await enter(es('automata.done.next'))
  await drive.shown('playing')
  ticks(drive, 5)
  // Leaving from pause asks first; Enter on the question's "yes" leaves.
  await keyboard('{Escape}')
  await drive.shown('paused')
  await enter(es('automata.pause.leave'))
  await expect.poll(() => drive.mount.querySelector('[role="alertdialog"]')).not.toBeNull()
  await enter(es('automata.pause.leave-yes'))
  await drive.shown('menu')
  await drive.wait(es('automata.menu.continue'))
})

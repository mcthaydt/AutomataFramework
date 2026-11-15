// "How to play" on a page (plan Q, Task 7b): from the menu and from pause, with the goal and the rows, Back has the focus
// and returns to where it was opened, a gamepad plugged in while it is open changes the rows, and at a short wide size
// only the list scrolls.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { focusedName, tapPad } from '../../fixtures/flow/page.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

const onScreen = (): string => drive.mount.querySelector('[data-screen="how"]')?.textContent ?? ''

test('How to play from the menu: the goal, the rows, Back has the focus and returns to the menu', async () => {
  await drive.toMenu({ game: { noWarning: true } })
  await drive.press(es('automata.menu.how'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="how"]')).not.toBeNull()
  expect(drive.mount.dataset.over).toBe('how')
  expect(onScreen()).toContain('Llega a la puerta.')
  expect(onScreen()).toContain(es('automata.how.walk'))
  expect(onScreen()).toContain(es('automata.how.jump'))
  expect(onScreen()).toContain(es('automata.pause.button'))
  expect(focusedName()).toBe(es('automata.back'))
  await drive.press(es('automata.back'))
  await drive.wait(es('automata.menu.play'))
  expect(drive.mount.dataset.over).toBeUndefined()
  expect(drive.step()).toBe('menu')
})

test('How to play from pause: the goal of the level being played, and Back returns to the pause screen', async () => {
  await drive.toMenu({ game: { noWarning: true, start: 'level-pit' } })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  drive.key('keydown', 'Escape')
  await drive.shown('paused')
  await drive.press(es('automata.menu.how'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="how"]')).not.toBeNull()
  expect(onScreen()).toContain('Salta el hueco y llega a la puerta.')
  await drive.press(es('automata.back'))
  await drive.wait(es('automata.pause.resume'))
  expect(drive.step()).toBe('paused')
  expect(drive.flow()?.game()?.paused()).toBe(true)
})

test('plugging in a gamepad while it is open changes the rows', async () => {
  await drive.toMenu({ game: { noWarning: true } })
  await drive.press(es('automata.menu.how'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="how"]')).not.toBeNull()
  expect(onScreen()).not.toContain(es('automata.pad.start'))
  drive.pads.connect(0)
  drive.run(200)
  // A button on the pad: it is the device in use now.
  tapPad(drive, 'dpad-down')
  await expect.poll(onScreen).toContain(es('automata.pad.start'))
})

test('Escape goes back', async () => {
  await drive.toMenu({ game: { noWarning: true } })
  await drive.press(es('automata.menu.how'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="how"]')).not.toBeNull()
  await userEvent.keyboard('{Escape}')
  await drive.wait(es('automata.menu.play'))
  expect(drive.mount.dataset.over).toBeUndefined()
})

test('at 844x390 only the list scrolls, and Back is in view', async () => {
  await page.viewport(844, 390)
  await drive.toMenu({ game: { noWarning: true } })
  await drive.press(es('automata.menu.how'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="how"]')).not.toBeNull()
  const back = [...drive.mount.querySelectorAll('button')].find(
    (one) => one.textContent?.trim() === es('automata.back'),
  ) as HTMLElement
  const box = back.getBoundingClientRect()
  expect([box.top >= 0, box.bottom <= window.innerHeight, box.height >= 48]).toEqual([true, true, true])
  expect((document.scrollingElement as Element).scrollHeight).toBeLessThanOrEqual(window.innerHeight)
})

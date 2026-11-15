// The phone, 390 by 844, thumbs only: a first visit from the warning to the last door, and the visit after it.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { testHost } from '#src/features/host/host.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { SPLASH_MS } from '#src/features/screens/screens.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { ticks, walkByThumb } from '../../fixtures/flow/page.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

/** The Swap sides switch on the Settings screen. */
const swap = (): HTMLElement => {
  const switches = [...drive.mount.querySelectorAll<HTMLElement>('[role="switch"]')]
  return switches.find((one) => one.textContent?.trim() === es('automata.settings.swap')) as HTMLElement
}

/** The slider on the Settings screen called `label`. */
const slider = (label: string): HTMLElement => {
  const found = [...drive.mount.querySelectorAll<HTMLElement>('[role="slider"]')].find(
    (one) => one.getAttribute('aria-label') === label,
  )
  if (found === undefined) throw new Error(`Settings has no slider called "${label}".`)
  return found
}

test('a first-time player is led from the warning to the last door and the menu, by thumb', async () => {
  await page.viewport(390, 844)
  const host = testHost({ deviceLanguages: ['es-MX'] })
  await drive.open({ host })
  // The warning, then the flags: one flag, then Go.
  await drive.shown('warnings')
  await drive.press('OK')
  await drive.shown('picking')
  await expect.poll(() => drive.mount.querySelector('.automata-picker-go')).not.toBeNull()
  ;(drive.mount.querySelector('.automata-flag') as HTMLElement).click()
  ;(drive.mount.querySelector('.automata-picker-go') as HTMLElement).click()
  await drive.shown('splash')
  drive.frames.at(0)
  drive.run(SPLASH_MS + 200)
  await drive.shown('menu')
  await drive.wait(es('automata.menu.play'))
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  ticks(drive, 30)
  // The hero walks to the door by a thumb on the right button.
  walkByThumb(drive)
  await drive.shown('done')
  await drive.wait(es('automata.done.next'))
  await drive.press(es('automata.done.next'))
  await drive.shown('playing')
  expect(drive.flow()?.state().level).toBe('level-2')
  drive.frames.at(0)
  ticks(drive, 30)
  // Pause with the corner button, turn Swap sides on in Settings, and keep playing.
  await drive.press(es('automata.pause.button'))
  await drive.shown('paused')
  await drive.press(es('automata.menu.settings'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="settings"]')).not.toBeNull()
  await userEvent.click(swap())
  await expect.poll(() => swap().getAttribute('aria-checked')).toBe('true')
  await drive.press(es('automata.back'))
  await drive.wait(es('automata.pause.resume'))
  await drive.press(es('automata.pause.resume'))
  await drive.shown('playing')
  drive.frames.at(0)
  walkByThumb(drive)
  await drive.shown('done')
  expect(drive.mount.textContent).toContain(es('automata.done.game'))
  await drive.press(es('automata.done.menu'))
  await drive.shown('menu')
  await drive.wait(es('automata.menu.continue'))
})

test('the same player comes back: no flags, Continue is first and opens the level reached, Swap sides still on', async () => {
  await page.viewport(390, 844)
  const host = testHost()
  await drive.toMenu({ host, game: { noWarning: true } })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  ticks(drive, 30)
  walkByThumb(drive)
  await drive.shown('done')
  await drive.wait(es('automata.done.next'))
  await drive.press(es('automata.done.menu'))
  await drive.shown('menu')
  await drive.wait(es('automata.menu.settings'))
  await drive.press(es('automata.menu.settings'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="settings"]')).not.toBeNull()
  await userEvent.click(swap())
  await expect.poll(() => swap().getAttribute('aria-checked')).toBe('true')
  // The music is turned right down, and kept.
  const music = es('automata.settings.music')
  slider(music).focus()
  await userEvent.keyboard('{Home}')
  await expect.poll(() => slider(music).getAttribute('aria-valuenow')).toBe('0')
  drive.leave()
  // A fresh page on the same store: the splash, then the menu with Continue first.
  await drive.open({ host, game: { noWarning: true } })
  await drive.shown('splash')
  drive.frames.at(0)
  drive.run(SPLASH_MS + 200)
  await drive.shown('menu')
  await drive.wait(es('automata.menu.continue'))
  expect(drive.buttons()[0]).toBe(es('automata.menu.continue'))
  await drive.press(es('automata.menu.settings'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="settings"]')).not.toBeNull()
  expect(swap().getAttribute('aria-checked')).toBe('true')
  expect(slider(music).getAttribute('aria-valuenow')).toBe('0')
  // The speaker was told the music is off before any sound could play.
  expect(drive.speaker.levels.music).toBe(0)
  expect(drive.speaker.played).toHaveLength(0)
  await drive.press(es('automata.back'))
  await drive.wait(es('automata.menu.continue'))
  await drive.press(es('automata.menu.continue'))
  await drive.shown('playing')
  expect(drive.flow()?.state().level).toBe('level-2')
})

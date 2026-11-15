// Back on the flow's page (plan Q, call 11): the page's history entry is pushed when a level is played, Back pauses and
// steps back through the screens, and a game in a frame leaves Back to the page that frames it. The page is a frame here
// (the test runs in one), so each test says `back: true` for the game that is the whole page.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => {
  drive.stop()
  vi.restoreAllMocks()
})

/** The Back button, as the page hears it. */
const back = (): void => {
  window.dispatchEvent(new PopStateEvent('popstate'))
}

async function play(back?: boolean): Promise<void> {
  await drive.toMenu({ ...(back === undefined ? {} : { back }) })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
}

test('the test page is a frame, so a game here does not take Back unless it is told to', async () => {
  expect(window.top).not.toBe(window)
  const push = vi.spyOn(history, 'pushState')
  await play()
  expect(push).not.toHaveBeenCalled()
  back()
  expect(drive.step()).toBe('playing')
})

test('back: true in a frame turns it on: Back while playing pauses, the page is still here', async () => {
  const push = vi.spyOn(history, 'pushState')
  await play(true)
  expect(push).toHaveBeenCalledTimes(1)
  back()
  await drive.shown('paused')
  expect(drive.mount.isConnected).toBe(true)
})

test('Back on pause is the menu, and Play again gets a new entry', async () => {
  const push = vi.spyOn(history, 'pushState')
  await play(true)
  back()
  await drive.shown('paused')
  back()
  await drive.shown('menu')
  await drive.wait(es('automata.menu.continue'))
  await drive.press(es('automata.menu.continue'))
  await drive.shown('playing')
  back()
  await drive.shown('paused')
  // Each Back uses up the entry it came by, so there is a new one for the first Play, the pause it led to, Continue, and
  // the pause after that.
  expect(push.mock.calls.length).toBe(4)
})

test('Back with Settings open on pause closes Settings and stays paused', async () => {
  await play(true)
  back()
  await drive.shown('paused')
  await drive.press(es('automata.menu.settings'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="settings"]')).not.toBeNull()
  back()
  await expect.poll(() => drive.mount.querySelector('[data-screen="settings"]')).toBeNull()
  expect(drive.step()).toBe('paused')
})

test('back: false pushes nothing and listens to nothing; after stop() nothing is listened to', async () => {
  const push = vi.spyOn(history, 'pushState')
  await play(false)
  back()
  expect(push).not.toHaveBeenCalled()
  expect(drive.step()).toBe('playing')
  drive.stop()
  await drive.start()
  const listening = vi.spyOn(window, 'removeEventListener')
  await play(true)
  drive.leave()
  expect(listening.mock.calls.some(([type]) => type === 'popstate')).toBe(true)
})

// Every screen of the flow at the five sizes: nothing is cut off, nothing but a list scrolls, every control is big enough
// to touch, the screen's one main button is bigger still, and a picture is taken (the screens job keeps them). Then the
// phone is turned on three screens, and the focus and the state stay where they were.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { defaultSave } from '#src/features/flow/flow.ts'
import { type TestHost, testHost } from '#src/features/host/host.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { createSaves } from '#src/features/saves/saves.ts'
import { SPLASH_MS } from '#src/features/screens/screens.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { focusedName, ticks } from '../../fixtures/flow/page.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

/** Two games saved, so the menu offers Continue and Saved games. */
async function twoGames(host: TestHost): Promise<void> {
  const saves = createSaves({ def: defaultSave(drive.game).def, store: host.store })
  await saves.save(0, { level: 'level-1' }, { label: 'Nivel Uno' })
  await saves.save(1, { level: 'level-2' }, { label: 'Nivel Dos' })
}

/** What every screen must be: whole on the page, with controls a thumb can press, and a picture of it. */
async function look(size: string, name: string, mains?: number): Promise<void> {
  const root = document.scrollingElement as Element
  const fits = [root.scrollWidth <= window.innerWidth, root.scrollHeight <= window.innerHeight]
  expect(fits, `${name} fits the page`).toEqual([true, true])
  for (const button of drive.mount.querySelectorAll<HTMLElement>('.automata-screen button')) {
    const box = button.getBoundingClientRect()
    const says = button.textContent?.trim() || button.getAttribute('aria-label')
    expect(box.height, `${name}: "${says}" is tall enough`).toBeGreaterThanOrEqual(44)
    expect(box.width, `${name}: "${says}" is wide enough`).toBeGreaterThanOrEqual(44)
  }
  const primaries = [...drive.mount.querySelectorAll<HTMLElement>('.automata-screen [data-kind="primary"]')]
  // A screen with one thing to do names it once; Settings and the splash have none, and the level has its own.
  if (mains !== undefined) expect(primaries, `${name} names its one main button`).toHaveLength(mains)
  for (const main of primaries) {
    const height = main.getBoundingClientRect().height
    expect(height, `${name}: the main button is tall enough`).toBeGreaterThanOrEqual(48)
  }
  await page.screenshot({ element: drive.mount, path: `__screenshots__/flow-${size}-${name}.png` })
}

test.each(SCREENS)(
  'at %s: every screen of the flow is opened once, nothing is cut off, every control is big enough',
  async (size, w, h) => {
    await page.viewport(w, h)
    const host = testHost({ deviceLanguages: ['es-MX'] })
    await twoGames(host)
    await drive.open({ host, game: { players: 2 } })
    await drive.shown('warnings')
    await drive.wait('OK')
    await look(size, 'warnings', 1)
    await drive.press('OK')
    await drive.shown('picking')
    await expect.poll(() => drive.mount.querySelector('.automata-picker-go')).not.toBeNull()
    await look(size, 'language')
    ;(drive.mount.querySelector('.automata-flag') as HTMLElement).click()
    ;(drive.mount.querySelector('.automata-picker-go') as HTMLElement).click()
    await drive.shown('splash')
    await look(size, 'splash', 0)
    drive.frames.at(0)
    drive.run(SPLASH_MS + 200)
    await drive.shown('menu')
    await drive.wait(es('automata.menu.continue'))
    await look(size, 'menu', 1)
    // Settings, the saved games and the players are each opened from the menu and left by Back or Done.
    await drive.press(es('automata.menu.settings'))
    await expect.poll(() => drive.mount.querySelector('[data-screen="settings"]')).not.toBeNull()
    await look(size, 'settings', 0)
    await drive.press(es('automata.back'))
    await drive.wait(es('automata.menu.saves'))
    await drive.press(es('automata.menu.saves'))
    await expect.poll(() => drive.mount.querySelector('[data-screen="saves"]')).not.toBeNull()
    await look(size, 'saves', 1)
    await drive.press(es('automata.back'))
    await drive.wait(es('automata.menu.add-player'))
    await drive.press(es('automata.menu.add-player'))
    await expect.poll(() => drive.mount.querySelector('[data-screen="players"]')).not.toBeNull()
    await look(size, 'players', 1)
    await drive.press(es('automata.players.done'))
    await drive.wait(es('automata.menu.continue'))
    // The level, with its pause button and numbers, then pause and "Well done!".
    await drive.press(es('automata.menu.continue'))
    await drive.shown('playing')
    drive.frames.at(0)
    ticks(drive, 30)
    await look(size, 'playing')
    await drive.press(es('automata.pause.button'))
    await drive.shown('paused')
    await drive.wait(es('automata.pause.resume'))
    await look(size, 'pause', 1)
    await drive.press(es('automata.pause.resume'))
    await drive.shown('playing')
    drive.flow()?.finishLevel()
    await drive.shown('done')
    // Continue opened the last level, so there is no next one: "Well done" offers only the way back to the menu.
    await drive.wait(es('automata.done.menu'))
    await look(size, 'done', 1)
  },
)

test('a game that cannot be read shows its problem whole at every size', async () => {
  for (const [size, w, h] of SCREENS) {
    await page.viewport(w, h)
    await drive.open({ game: { replace: { 'content/levels/level-2.json': '{ not json' } } })
    await drive.shown('problem')
    await look(size, 'problem', 1)
    drive.leave()
  }
})

test('turning the phone on the menu, in Settings and on pause keeps the focus and the state', async () => {
  await page.viewport(390, 844)
  const host = testHost()
  await twoGames(host)
  await drive.toMenu({ host, game: { noWarning: true } })
  const turn = async (): Promise<void> => {
    // Counted for a failure to print: did the page hear the window change, and did a box watcher hear the mount's?
    let heard = 0
    let watched = 0
    const count = (): void => {
      heard += 1
    }
    window.addEventListener('resize', count)
    const watcher = new ResizeObserver(() => {
      watched += 1
    })
    watcher.observe(drive.mount)
    await page.viewport(844, 390)
    await expect.poll(() => window.innerHeight).toBe(390)
    // A screen drawn in the kit's frame says "tall" until it has measured its new box; the menu has no frame.
    // What every kit frame says it measured, for a failure to print: the page's own state, then each frame.
    const frames = (): string => {
      const state = `${document.visibilityState} ${window.innerWidth}x${window.innerHeight}`
      const found = [`${state} heard ${heard} watched ${watched}`]
      for (const one of drive.mount.querySelectorAll<HTMLElement>('[data-height]')) {
        const screen = one.closest<HTMLElement>('[data-screen]')
        const says = `${one.dataset.width}/${one.dataset.height}`
        found.push(`${screen?.dataset.screen} says ${says} in ${one.clientWidth}x${one.clientHeight}`)
      }
      return found.join(' | ')
    }
    await expect.poll(frames).not.toMatch(/tall/)
    window.removeEventListener('resize', count)
    watcher.disconnect()
  }
  // The menu: the same button is in focus on its side.
  await drive.wait(es('automata.menu.continue'))
  const first = focusedName()
  await turn()
  expect(focusedName()).toBe(first)
  expect(drive.step()).toBe('menu')
  await page.viewport(390, 844)
  // Settings: Swap sides is left on, and it is still the control in focus.
  await drive.press(es('automata.menu.settings'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="settings"]')).not.toBeNull()
  const swap = (): HTMLElement => {
    const switches = [...drive.mount.querySelectorAll<HTMLElement>('[role="switch"]')]
    return switches.find((one) => one.textContent?.trim() === es('automata.settings.swap')) as HTMLElement
  }
  await userEvent.click(swap())
  await expect.poll(() => swap().getAttribute('aria-checked')).toBe('true')
  swap().focus()
  await turn()
  expect(swap().getAttribute('aria-checked')).toBe('true')
  expect(document.activeElement).toBe(swap())
  await drive.press(es('automata.back'))
  await page.viewport(390, 844)
  // Pause: still paused, with the same button in focus.
  await drive.wait(es('automata.menu.continue'))
  await drive.press(es('automata.menu.continue'))
  await drive.shown('playing')
  drive.frames.at(0)
  ticks(drive, 30)
  await drive.press(es('automata.pause.button'))
  await drive.shown('paused')
  await drive.wait(es('automata.pause.resume'))
  const paused = focusedName()
  await turn()
  expect(drive.step()).toBe('paused')
  expect(focusedName()).toBe(paused)
})

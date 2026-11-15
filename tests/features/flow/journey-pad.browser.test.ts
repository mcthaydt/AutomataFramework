// The tablet on its side, 1180 by 820, a gamepad only: every screen from the warning to the last "Main menu", and a second
// gamepad that joins from the menu.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { Player } from '#src/features/commands/commands.ts'
import { testHost } from '#src/features/host/host.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { SPLASH_MS } from '#src/features/screens/screens.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { padPress, tapPad, ticks, walkByPad } from '../../fixtures/flow/page.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(async () => {
  await drive.start()
  await page.viewport(1180, 820)
})
afterEach(() => drive.stop())

const onScreen = (): string => drive.mount.querySelector('[data-screen="players"]')?.textContent ?? ''

test('every screen from the warning to the last "Main menu" is walked and pressed with the gamepad alone', async () => {
  const host = testHost()
  await drive.returning(host, 'es')
  drive.pads.connect(0)
  await drive.open({ host })
  // The warning: its one button is the one in focus.
  await drive.shown('warnings')
  await drive.wait('OK')
  drive.frames.advance(100)
  tapPad(drive, 'south')
  await drive.shown('splash')
  // Any press skips the splash.
  drive.frames.at(0)
  drive.run(SPLASH_MS + 200)
  await drive.shown('menu')
  await drive.wait(es('automata.menu.play'))
  // Settings and back: the pad's right button goes back.
  padPress(drive, es('automata.menu.settings'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="settings"]')).not.toBeNull()
  drive.frames.advance(100)
  tapPad(drive, 'east')
  await drive.wait(es('automata.menu.play'))
  expect(drive.mount.querySelector('[data-screen="settings"]')).toBeNull()
  padPress(drive, es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  ticks(drive, 30)
  walkByPad(drive)
  await drive.shown('done')
  await drive.wait(es('automata.done.next'))
  drive.frames.advance(100)
  padPress(drive, es('automata.done.next'))
  await drive.shown('playing')
  ticks(drive, 30)
  // Start pauses, the right button keeps playing.
  tapPad(drive, 'start')
  await drive.shown('paused')
  await drive.wait(es('automata.pause.resume'))
  tapPad(drive, 'east')
  await drive.shown('playing')
  walkByPad(drive)
  await drive.shown('done')
  await drive.wait(es('automata.done.menu'))
  drive.frames.advance(100)
  padPress(drive, es('automata.done.menu'))
  await drive.shown('menu')
  // A game was kept on the way, so the menu offers Continue.
  await drive.wait(es('automata.menu.continue'))
})

test('start pauses and resumes; a second gamepad joins from the menu and both reach the door', async () => {
  const host = testHost()
  await drive.returning(host, 'es')
  drive.pads.connect(0)
  await drive.open({ host, game: { noWarning: true, players: 2 } })
  await drive.shown('splash')
  drive.frames.at(0)
  drive.run(SPLASH_MS + 200)
  await drive.shown('menu')
  await drive.wait(es('automata.menu.add-player'))
  drive.frames.advance(100)
  padPress(drive, es('automata.menu.add-player'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="players"]')).not.toBeNull()
  drive.frames.advance(100)
  // A button on the second gamepad: the screen says who is in now.
  drive.pads.connect(1)
  drive.run(200)
  tapPad(drive, 'south', 1)
  await expect.poll(onScreen).toContain(es('automata.players.in', { player: 2 }))
  padPress(drive, es('automata.players.done'))
  await drive.wait(es('automata.menu.play'))
  padPress(drive, es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  ticks(drive, 30)
  expect(drive.flow()?.game()?.players()).toEqual([1, 2])
  // Start pauses and the pad's right button keeps playing.
  tapPad(drive, 'start')
  await drive.shown('paused')
  expect(drive.flow()?.game()?.paused()).toBe(true)
  tapPad(drive, 'east')
  await drive.shown('playing')
  expect(drive.flow()?.game()?.paused()).toBe(false)
  // Both walk right; the level is over when a hero reaches the door. Each pad drives its own hero: both have walked on
  // from where they started (2.5 and 3.5 tiles) by the time the first reaches the door.
  const heroX = (player: number): number => {
    const found = drive
      .flow()
      ?.game()
      ?.sim.query(Player, Transform)
      .find((one) => one.get(Player).number === player)
    return found === undefined ? Number.NaN : found.get(Transform).x
  }
  drive.pads.press('dpad-right', 0)
  drive.pads.press('dpad-right', 1)
  let last = [heroX(1), heroX(2)]
  for (let tick = 0; tick < 400 && drive.step() === 'playing'; tick++) {
    drive.frames.advance(1000 / 60)
    const now = [heroX(1), heroX(2)]
    if (now.every((x) => !Number.isNaN(x))) last = now
  }
  drive.pads.release('dpad-right', 0)
  drive.pads.release('dpad-right', 1)
  expect(drive.step()).toBe('done')
  expect(last[0]).toBeGreaterThan(3)
  expect(last[1]).toBeGreaterThan(4)
})

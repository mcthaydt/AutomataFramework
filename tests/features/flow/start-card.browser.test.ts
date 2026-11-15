// A level that waits for the first press and says what to do (plan Q, Task 7a): it starts still, the goal line and the
// hint show, a key, a touch or a pad button that begins after the level is up starts it, what was already held does not,
// and the card goes three seconds later.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Player } from '#src/features/commands/commands.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { flowReplay } from '../../fixtures/flow/game.ts'
import { tapPad, thumbDown, ticks, walkByKey } from '../../fixtures/flow/page.ts'

const es = frameworkWords('es')
const drive = createDrive()
const GOAL = 'Llega a la puerta.'

beforeEach(() => drive.start())
afterEach(() => drive.stop())

/** Opens a level from the menu, as a player does, and lets its first frame pass. */
async function intoLevel(game: Parameters<typeof drive.toMenu>[0] = {}): Promise<void> {
  await drive.toMenu({ ...game, game: { noWarning: true, ...game.game } })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
}

const tick = (): number => drive.flow()?.game()?.sim.tick ?? -1
const waiting = (): boolean => drive.mount.dataset.waiting !== undefined
const card = (): HTMLElement | null => drive.mount.querySelector('.card')
const heroX = (): number =>
  drive.flow()?.game()?.sim.query(Player, Transform)[0]?.get(Transform).x ?? Number.NaN

/** A key that is held down: the browser sends `keydown` again and again with `repeat` set. */
const repeat = (code: string): void => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, repeat: true, bubbles: true }))
}

test('a level starts still: the tick stays 0, data-waiting is there, the goal line and the hint show', async () => {
  await intoLevel()
  ticks(drive, 60)
  expect(tick()).toBe(0)
  expect(waiting()).toBe(true)
  expect(card()?.textContent).toContain(GOAL)
  expect(card()?.querySelector('.hint')?.textContent?.trim()).not.toBe('')
})

test('pressing Right starts it and the hero walks from the first tick', async () => {
  await intoLevel()
  const start = heroX()
  drive.key('keydown', 'ArrowRight')
  ticks(drive, 30)
  drive.key('keyup', 'ArrowRight')
  expect(waiting()).toBe(false)
  expect(tick()).toBeGreaterThan(0)
  expect(heroX()).toBeGreaterThan(start + 1)
})

test('a touch starts it', async () => {
  await intoLevel()
  const up = thumbDown(drive, 'Right')
  ticks(drive, 30)
  up()
  expect(waiting()).toBe(false)
  expect(tick()).toBeGreaterThan(0)
})

test('a gamepad button starts it', async () => {
  drive.pads.connect(0)
  await intoLevel()
  ticks(drive, 5)
  expect(waiting()).toBe(true)
  tapPad(drive, 'south')
  ticks(drive, 5)
  expect(waiting()).toBe(false)
  expect(tick()).toBeGreaterThan(0)
})

test('the Enter that pressed Play, held for 30 frames, does not start the level', async () => {
  await drive.toMenu({ game: { noWarning: true } })
  await userEvent.keyboard('{Enter>}')
  await drive.shown('playing')
  drive.frames.at(0)
  for (let frame = 0; frame < 30; frame++) {
    repeat('Enter')
    ticks(drive, 1)
  }
  expect(waiting()).toBe(true)
  expect(tick()).toBe(0)
  await userEvent.keyboard('{/Enter}')
})

test('the pad button that pressed Play, held for 30 frames, does not start the level', async () => {
  drive.pads.connect(0)
  await drive.toMenu({ game: { noWarning: true } })
  drive.frames.advance(100)
  drive.pads.press('south')
  for (let frame = 0; frame < 20 && drive.step() !== 'playing'; frame++) drive.frames.advance(100)
  await drive.shown('playing')
  ticks(drive, 30)
  expect(waiting()).toBe(true)
  expect(tick()).toBe(0)
  drive.pads.release('south')
  ticks(drive, 2)
  // Pressed again, it starts.
  tapPad(drive, 'south')
  ticks(drive, 5)
  expect(waiting()).toBe(false)
})

test("a held key's repeats do not start it; letting go and pressing again does", async () => {
  await intoLevel()
  for (let frame = 0; frame < 30; frame++) {
    repeat('KeyQ')
    ticks(drive, 1)
  }
  expect(waiting()).toBe(true)
  drive.key('keyup', 'KeyQ')
  drive.key('keydown', 'KeyQ')
  ticks(drive, 2)
  expect(waiting()).toBe(false)
})

test('Try again and Next level wait the same way', async () => {
  await drive.toMenu({ game: { noWarning: true, start: 'level-pit' } })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  walkByKey(drive)
  await drive.shown('lost')
  await drive.press(es('automata.lost.again'))
  await drive.shown('playing')
  ticks(drive, 30)
  expect(waiting()).toBe(true)
  expect(tick()).toBe(0)
  drive.flow()?.finishLevel()
  await drive.shown('done')
  await drive.press(es('automata.done.next'))
  await drive.shown('playing')
  ticks(drive, 30)
  expect(waiting()).toBe(true)
  expect(tick()).toBe(0)
})

test('three seconds after the first press the card is gone; before that it is there', async () => {
  await intoLevel()
  drive.key('keydown', 'ArrowRight')
  drive.run(2000)
  expect(card()).not.toBeNull()
  drive.run(1200)
  drive.key('keyup', 'ArrowRight')
  expect(card()).toBeNull()
})

test('a level with no goal word shows the hint alone; on touch with no goal, no card', async () => {
  await intoLevel({ game: { start: 'level-2' } })
  expect(card()?.querySelectorAll('p')).toHaveLength(1)
  expect(card()?.querySelector('.hint')).not.toBeNull()
  // The thumbs carry their own hints, so a touch takes the card away.
  const up = thumbDown(drive, 'Right')
  ticks(drive, 3)
  up()
  expect(card()).toBeNull()
})

test('the pause screen shows the goal line', async () => {
  await intoLevel()
  drive.key('keydown', 'Escape')
  await drive.shown('paused')
  expect(drive.mount.querySelector('[data-screen="pause"]')?.textContent).toContain(GOAL)
})

test('watch mode does not wait: the recording plays at once', async () => {
  await drive.open({ game: { noWarning: true }, watch: await flowReplay() })
  await drive.shown('watching')
  ticks(drive, 30)
  expect(waiting()).toBe(false)
})

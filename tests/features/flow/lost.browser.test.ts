// A level that is lost, on the flow's page (plan Q, Task 6): a hero walks into the gap of `level-pit`, the page says "You
// lost." with Try again focused, Try again starts the level afresh in the same page, and "Main menu" keeps the level for
// Continue. A win in the same step beats a loss, and a game with no `lost` never reaches the screen.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { Player } from '#src/features/commands/commands.ts'
import { writeContent } from '#src/features/content/content.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { FLOW_SOUNDS } from '../../fixtures/flow/game.ts'
import { focusedName, ticks, untilOver, walkByKey } from '../../fixtures/flow/page.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

/** Opens the pit level from the menu, as a player does, and waits for the game. */
async function intoPit(game: Parameters<typeof drive.toMenu>[0] = {}): Promise<void> {
  await drive.toMenu({ ...game, game: { noWarning: true, start: 'level-pit', ...game.game } })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
}

const heroX = (): number => {
  const hero = drive.flow()?.game()?.sim.query(Player)[0]
  return hero?.get(Transform).x ?? Number.NaN
}

test('the hero walks into the gap: the state is lost, the screen is up and Try again has the focus', async () => {
  await intoPit()
  walkByKey(drive)
  await drive.shown('lost')
  expect(drive.mount.querySelectorAll('[data-screen="lost"]')).toHaveLength(1)
  expect(drive.mount.textContent).toContain(es('automata.lost.title'))
  expect(drive.buttons()).toEqual(
    expect.arrayContaining([es('automata.lost.again'), es('automata.done.menu')]),
  )
  expect(focusedName()).toBe(es('automata.lost.again'))
})

test('Try again: playing, one more attempt, the hero back at its start, and the page did not reload', async () => {
  let reloads = 0
  await intoPit({
    reload: () => {
      reloads += 1
    },
  })
  expect(drive.mount.dataset.attempt).toBe('1')
  walkByKey(drive)
  await drive.shown('lost')
  const page = drive.mount
  await drive.press(es('automata.lost.again'))
  await drive.shown('playing')
  expect(drive.mount.dataset.attempt).toBe('2')
  await expect.poll(() => drive.flow()?.game()?.sim.tick).toBe(0)
  expect(heroX()).toBeCloseTo(2.5, 1)
  expect(drive.mount).toBe(page)
  expect(drive.mount.isConnected).toBe(true)
  expect(reloads).toBe(0)
})

test('Main menu from the lost screen shows the menu, and Continue opens the same level', async () => {
  await intoPit()
  walkByKey(drive)
  await drive.shown('lost')
  await drive.press(es('automata.done.menu'))
  await drive.shown('menu')
  expect(drive.flow()?.game()).toBeUndefined()
  await drive.wait(es('automata.menu.continue'))
  await drive.press(es('automata.menu.continue'))
  await drive.shown('playing')
  expect(drive.flow()?.state().level).toBe('level-pit')
  await expect.poll(() => drive.flow()?.game()?.sim.tick).toBe(0)
})

test('two heroes fall: one lost screen, and the attempt is unchanged until Try again', async () => {
  await drive.toMenu({ game: { noWarning: true, start: 'level-pit', players: 2 } })
  await drive.press(es('automata.menu.add-player'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="players"]')).not.toBeNull()
  drive.pads.connect(1)
  drive.run(200)
  drive.pads.press('south', 1)
  drive.run(200)
  drive.pads.release('south', 1)
  drive.run(200)
  await drive.press(es('automata.players.done'))
  await drive.wait(es('automata.menu.play'))
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  // Player one on the keyboard and player two on the pad run right together.
  drive.key('keydown', 'ArrowRight')
  drive.pads.press('dpad-right', 1)
  untilOver(drive)
  drive.key('keyup', 'ArrowRight')
  drive.pads.release('dpad-right', 1)
  await drive.shown('lost')
  ticks(drive, 90)
  expect(drive.mount.querySelectorAll('[data-screen="lost"]')).toHaveLength(1)
  expect(drive.mount.dataset.attempt).toBe('1')
  await drive.press(es('automata.lost.again'))
  await drive.shown('playing')
  expect(drive.mount.dataset.attempt).toBe('2')
})

test('a door over the gap: the hero touches it on the way down and it is Well done, never You lost', async () => {
  const doorOverGap = writeContent('level', {
    format: 1,
    id: 'level-pit',
    tiles: [
      ...Array.from({ length: 8 }, () => '.'.repeat(16)),
      Array.from({ length: 16 }, (_, col) => (col === 7 || col === 8 ? '.' : '#')).join(''),
    ],
    things: [{ id: 'door-1', character: 'door', x: 7.5, y: 7.5 }],
    starts: [{ player: 1, x: 2.5, y: 7.5 }],
  } as never)
  await intoPit({ game: { replace: { 'content/levels/level-pit.json': doorOverGap } } })
  walkByKey(drive)
  await drive.shown('done')
  ticks(drive, 120)
  expect(drive.step()).toBe('done')
  expect(drive.mount.textContent).not.toContain(es('automata.lost.title'))
})

test('screen.lost is raised once on the audio', async () => {
  drive.speaker.tap()
  await intoPit()
  walkByKey(drive)
  await drive.shown('lost')
  ticks(drive, 60)
  const heard = drive.speaker.played.flatMap((one) => (one.voice.kind === 'tone' ? [one.voice.from] : []))
  expect(heard.filter((pitch) => pitch === FLOW_SOUNDS['screen.lost'].pitch)).toHaveLength(1)
})

test('by keys alone: fall, Enter on Try again, and play again', async () => {
  await intoPit()
  walkByKey(drive)
  await drive.shown('lost')
  drive.key('keydown', 'Enter')
  drive.key('keyup', 'Enter')
  expect(focusedName()).toBe(es('automata.lost.again'))
  ;(document.activeElement as HTMLElement).click()
  await drive.shown('playing')
  await expect.poll(() => drive.flow()?.game()?.sim.tick).toBe(0)
  walkByKey(drive)
  await drive.shown('lost')
})

test('escape on the lost screen does nothing', async () => {
  await intoPit()
  walkByKey(drive)
  await drive.shown('lost')
  drive.key('keydown', 'Escape')
  drive.key('keyup', 'Escape')
  ticks(drive, 10)
  expect(drive.step()).toBe('lost')
})

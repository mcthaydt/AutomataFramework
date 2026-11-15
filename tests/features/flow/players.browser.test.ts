// Adding a player on the flow's page: from the main menu and from pause, with a gamepad's button or Enter, kept from level
// to level, taken out again from pause, and not offered where there is no room.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { padPress } from '../../fixtures/flow/page.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

/** A gamepad in slot `index` has its south button pressed and let go, a frame at a time. */
function tap(index: number): void {
  drive.pads.connect(index)
  drive.run(200)
  drive.pads.press('south', index)
  drive.run(200)
  drive.pads.release('south', index)
  drive.run(200)
}

const said = (player: number): string => es('automata.players.in', { player })
const onScreen = (): string => drive.mount.querySelector('[data-screen="players"]')?.textContent ?? ''
const players = (): readonly number[] => drive.flow()?.game()?.players() ?? []

test('from the main menu a button on a second gamepad joins, Done goes back, and the level starts with two heroes', async () => {
  await drive.toMenu({ game: { noWarning: true, players: 2 } })
  await drive.press(es('automata.menu.add-player'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="players"]')).not.toBeNull()
  expect(drive.mount.dataset.over).toBe('players')
  expect(onScreen()).toContain(said(1))
  expect(onScreen()).not.toContain(said(2))
  tap(1)
  await expect.poll(onScreen).toContain(said(2))
  await drive.press(es('automata.players.done'))
  await drive.wait(es('automata.menu.play'))
  // The room is taken, so the button for another player is gone.
  expect(drive.buttons()).not.toContain(es('automata.menu.add-player'))
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  expect(players()).toEqual([1, 2])
})

test('Enter shares the keyboard when the game lets it, and the second player is told they are in', async () => {
  await drive.toMenu({ game: { noWarning: true, players: 2 } })
  await drive.press(es('automata.menu.add-player'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="players"]')).not.toBeNull()
  expect(onScreen()).toContain(es('automata.players.keyboard'))
  await userEvent.keyboard('{Enter}')
  await expect.poll(onScreen).toContain(said(2))
  // The keyboard is shared now, so the sentence about sharing it is gone.
  expect(onScreen()).not.toContain(es('automata.players.keyboard'))
})

test('a game for one player has no button for another, on the menu or on pause', async () => {
  await drive.toMenu({ game: { noWarning: true } })
  expect(drive.buttons()).not.toContain(es('automata.menu.add-player'))
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  drive.run(200)
  drive.key('keydown', 'Escape')
  await drive.shown('paused')
  await drive.wait(es('automata.pause.resume'))
  expect(drive.buttons()).not.toContain(es('automata.menu.add-player'))
})

test('from pause a gamepad joins, the hero comes when play goes on, and "Take out player 2" takes them out', async () => {
  await drive.toMenu({ game: { noWarning: true, players: 2 } })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  drive.run(200)
  expect(players()).toEqual([1])
  drive.key('keydown', 'Escape')
  await drive.shown('paused')
  await drive.press(es('automata.menu.add-player'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="players"]')).not.toBeNull()
  tap(1)
  await expect.poll(onScreen).toContain(said(2))
  await drive.press(es('automata.players.done'))
  await drive.wait(es('automata.pause.resume'))
  expect(drive.step()).toBe('paused')
  // The room is taken; and the one who joined can be taken out.
  expect(drive.buttons()).not.toContain(es('automata.menu.add-player'))
  expect(drive.buttons()).toContain(es('automata.pause.remove', { player: 2 }))
  // The game holds still while paused: the hero comes on the first ticks after "Keep playing".
  await drive.press(es('automata.pause.resume'))
  await drive.shown('playing')
  drive.run(500)
  expect(players()).toEqual([1, 2])
  drive.key('keydown', 'Escape')
  await drive.shown('paused')
  await drive.press(es('automata.pause.remove', { player: 2 }))
  await drive.wait(es('automata.menu.add-player'))
  expect(drive.buttons()).not.toContain(es('automata.pause.remove', { player: 2 }))
  await drive.press(es('automata.pause.resume'))
  await drive.shown('playing')
  drive.run(500)
  expect(players()).toEqual([1])
})

test('the player who is in stays in for the next level', async () => {
  await drive.toMenu({ game: { noWarning: true, players: 2 } })
  await drive.press(es('automata.menu.add-player'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="players"]')).not.toBeNull()
  tap(1)
  await expect.poll(onScreen).toContain(said(2))
  await drive.press(es('automata.players.done'))
  await drive.wait(es('automata.menu.play'))
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.flow()?.finishLevel()
  await drive.shown('done')
  await drive.wait(es('automata.done.next'))
  await drive.press(es('automata.done.next'))
  await drive.shown('playing')
  expect(drive.flow()?.state().level).toBe('level-2')
  expect(players()).toEqual([1, 2])
})

test("player 1's own gamepad opens Add a player and presses Done: it does not join as player 2", async () => {
  drive.pads.connect(0)
  await drive.toMenu({ game: { noWarning: true, players: 2 } })
  drive.frames.advance(100)
  padPress(drive, es('automata.menu.add-player'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="players"]')).not.toBeNull()
  drive.frames.advance(100)
  padPress(drive, es('automata.players.done'))
  await drive.wait(es('automata.menu.play'))
  // Nobody joined: another player is still asked for, and the level has the one hero.
  expect(drive.buttons()).toContain(es('automata.menu.add-player'))
  padPress(drive, es('automata.menu.play'))
  await drive.shown('playing')
  drive.run(500)
  expect(players()).toEqual([1])
})

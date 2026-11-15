// A page that goes away and comes back, and a player who has the sound off (plan Q, Task 13): the level is paused when the
// page is hidden and stays so, nothing is played while it is hidden, nothing is asked of the speaker before the first press
// of the visit, and a level can be lost, tried again and won with both volumes at 0.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { openSections } from '#src/features/flow/sections.ts'
import { testHost } from '#src/features/host/host.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { crossThePit, keyHands, ticks, untilOver, walkByKey } from '../../fixtures/flow/page.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

test('hide the page mid-jump and show it: paused; Keep playing; the level can still be finished; no sound played while hidden', async () => {
  const host = testHost()
  await drive.toMenu({ host, game: { noWarning: true } })
  drive.speaker.tap()
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  // A jump is under way when the page goes.
  drive.frames.advance(1000 / 60)
  drive.key('keydown', 'Space')
  ticks(drive, 5)
  const tick = drive.flow()?.game()?.sim.tick
  const heard = drive.speaker.played.length
  host.hide()
  await drive.shown('paused')
  ticks(drive, 60)
  expect(drive.flow()?.game()?.sim.tick).toBe(tick)
  expect(drive.speaker.played).toHaveLength(heard)
  host.show()
  // It stays paused when the page comes back: the player says when to go on.
  ticks(drive, 10)
  expect(drive.step()).toBe('paused')
  drive.key('keyup', 'Space')
  await drive.wait(es('automata.pause.resume'))
  await drive.press(es('automata.pause.resume'))
  await drive.shown('playing')
  drive.frames.at(0)
  walkByKey(drive)
  await drive.shown('done')
})

test('no sound is asked of the speaker before the first press of the visit', async () => {
  await drive.toMenu({ game: { noWarning: true } })
  // The page has been opened and the menu drawn, and nobody has pressed anything.
  expect(drive.speaker.played).toHaveLength(0)
  expect(drive.speaker.state()).toBe('waiting')
})

test('with both volumes at 0 a level is lost, tried again and won', async () => {
  const host = testHost()
  await drive.returning(host, 'es')
  const sections = await openSections({ game: drive.game, host })
  await sections.sound.set({ format: 1, music: 0, sound: 0 })
  await drive.toMenu({ host, game: { noWarning: true, start: 'level-pit' } })
  drive.speaker.tap()
  expect(drive.speaker.levels).toEqual({ music: 0, sound: 0 })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  walkByKey(drive)
  await drive.shown('lost')
  await drive.press(es('automata.lost.again'))
  await drive.shown('playing')
  drive.frames.at(0)
  crossThePit(drive, keyHands(drive))
  untilOver(drive)
  await drive.shown('done')
  expect(drive.speaker.levels).toEqual({ music: 0, sound: 0 })
})

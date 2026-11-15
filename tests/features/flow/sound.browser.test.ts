// The flow's sound, run together with the audio and the screens: each screen the flow raises plays the cue the game gave
// it, and the pitch of each fixture sound says which one was heard.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { FLOW_SOUNDS } from '../../fixtures/flow/game.ts'
import { padPress, ticks } from '../../fixtures/flow/page.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

/** The pitch of every tone the speaker was given, in order, except the small tick every press and move makes. */
const screenPitches = (): number[] =>
  drive.speaker.played.flatMap((one) =>
    one.voice.kind === 'tone' && one.voice.from !== FLOW_SOUNDS['ui.press'].pitch ? [one.voice.from] : [],
  )

test('the menu, pause and done screens each raise their cue once, in the order they come', async () => {
  drive.speaker.tap()
  await drive.toMenu({ game: { noWarning: true } })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  ticks(drive, 30)
  drive.key('keydown', 'Escape')
  await drive.shown('paused')
  await drive.press(es('automata.pause.resume'))
  await drive.shown('playing')
  drive.flow()?.finishLevel()
  await drive.shown('done')
  expect(screenPitches()).toEqual([
    FLOW_SOUNDS['screen.menu'].pitch,
    FLOW_SOUNDS['screen.pause'].pitch,
    FLOW_SOUNDS['screen.done'].pitch,
  ])
})

test("a gamepad's press on a screen plays the press cue", async () => {
  drive.speaker.tap()
  drive.pads.connect(0)
  await drive.toMenu({ game: { noWarning: true } })
  const before = drive.speaker.played.length
  // The pad walks to Settings and presses it: the focus's moves and the press are each the game's tick cue.
  drive.frames.advance(100)
  padPress(drive, es('automata.menu.settings'))
  await drive.wait(es('automata.back'))
  const played = drive.speaker.played.slice(before)
  const heard = played.map((one) => (one.voice.kind === 'tone' ? one.voice.from : 0))
  expect(heard).toContain(FLOW_SOUNDS['ui.press'].pitch)
})

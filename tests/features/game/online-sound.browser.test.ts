// An online game's sound: the session hands the page every tick it predicted, and the page gives each one to the audio
// on its own tick. The session here is a stand-in that answers as a room that sent two jumps together would, so the
// test needs no room.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createAudio, testSpeaker } from '#src/features/audio/audio.ts'
import { type OnlineGame, startOnlineGame } from '#src/features/game/online.ts'
import { testHost } from '#src/features/host/host.ts'
import type { Advance, JoinOptions, Session, SessionStats } from '#src/features/net/net.ts'
import type { SimEvent } from '#src/features/sim/sim.ts'
import { loadSoundingGame } from '../../fixtures/audio/sounding-game.ts'
import { soundingHeroPlugin } from '../../fixtures/audio/sounding-hero.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'

const FRAME = 1000 / 60

let mount: HTMLDivElement
let online: OnlineGame | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  online?.leave()
  online = undefined
  mount.remove()
  vi.restoreAllMocks()
})

const jumped: SimEvent = { type: 'hero.jumped', payload: {} }

/** A join whose session gives, on each `advance`, the next answer from `answers`, and counts its syncs from `syncs`. */
function standIn(answers: Advance[], syncs: { count: number }) {
  return async (o: JoinOptions) => {
    const stats = (): SessionStats => ({
      confirmedTick: 0,
      predictedTick: o.predicted.tick,
      lead: 2,
      rollbacks: 0,
      late: 0,
      desyncs: 0,
      syncs: syncs.count,
      checked: 0,
    })
    const session: Session = {
      seat: 1,
      sim: o.predicted,
      state: () => ({ state: 'playing', away: [] }),
      stats,
      advance: () => answers.shift() ?? { deltas: [], events: [], steps: [] },
      resume: () => undefined,
      close: () => undefined,
    }
    return { session, code: 'ROOM', rejoin: () => Promise.resolve(), leave: () => undefined }
  }
}

async function start(answers: Advance[], syncs = { count: 0 }, tapped = true) {
  const speaker = testSpeaker()
  if (tapped) speaker.tap()
  const audio = createAudio({ content: await loadSoundingGame(), speaker })
  const frames = manualFrames()
  online = await startOnlineGame({
    content: await loadSoundingGame(),
    plugins: [soundingHeroPlugin],
    mount,
    controls: fixtureControls,
    host: testHost(),
    frames,
    server: 'ws://room.test',
    join: standIn(answers, syncs),
    audio,
  })
  return { audio, frames }
}

test('two jumps two ticks apart that reach the page in one advance are two log entries on their own ticks', async () => {
  const { audio, frames } = await start([
    {
      deltas: [],
      events: [jumped, jumped],
      steps: [
        { tick: 11, events: [jumped] },
        { tick: 12, events: [] },
        { tick: 13, events: [jumped] },
      ],
    },
  ])
  frames.at(0)
  frames.advance(FRAME)
  expect(audio.log().filter((entry) => entry.on === 'hero.jumped')).toEqual([
    { tick: 11, from: 'sim', on: 'hero.jumped', do: 'sound', id: 'jump' },
    { tick: 13, from: 'sim', on: 'hero.jumped', do: 'sound', id: 'jump' },
  ])
})

test('starting an online game starts the level music, and a sync lets the audio hear its ticks again', async () => {
  const syncs = { count: 0 }
  const { audio, frames } = await start(
    [
      { deltas: [], events: [jumped], steps: [{ tick: 40, events: [jumped] }] },
      { deltas: [], events: [jumped], steps: [{ tick: 3, events: [jumped] }] },
    ],
    syncs,
  )
  expect(audio.music()).toBe('meadow')
  frames.at(0)
  frames.advance(FRAME)
  // The room puts the page back on an earlier state: tick 3 is new again, not a repeat of one already heard.
  syncs.count = 1
  frames.advance(FRAME)
  const jumps = audio.log().filter((entry) => entry.on === 'hero.jumped')
  expect(jumps.map((entry) => entry.tick)).toEqual([40, 3])
})

test('the button is there while the sound waits, and leaving removes it', async () => {
  await start([], { count: 0 }, false)
  expect(mount.querySelector('[data-automata="sound-notice"]')?.textContent).toBe('Tap to start the sound')
  online?.leave()
  online = undefined
  expect(mount.querySelector('[data-automata="sound-notice"]')).toBeNull()
})

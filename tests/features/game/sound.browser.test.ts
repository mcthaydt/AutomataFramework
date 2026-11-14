// A game's sound in each real browser: the events the sim raises reach the audio on their own ticks, the button asks
// for the first tap, and none of it changes what the sim does. The speaker is a test speaker, so no engine needs ears.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createAudio, type GameAudio, type TestSpeaker, testSpeaker } from '#src/features/audio/audio.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { testHost } from '#src/features/host/host.ts'
import { loadSoundingGame } from '../../fixtures/audio/sounding-game.ts'
import { soundingHeroPlugin } from '../../fixtures/audio/sounding-hero.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'

const FRAME = 1000 / 60

let mount: HTMLDivElement
let game: Game | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  game?.stop()
  game = undefined
  mount.remove()
  vi.restoreAllMocks()
})

const notice = (): HTMLElement | null => mount.querySelector('[data-automata="sound-notice"]')
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}
const run = (frames: ReturnType<typeof manualFrames>, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}

/** A new audio over a test speaker, for the sounding game's cues. */
async function newAudio(): Promise<{ audio: GameAudio; speaker: TestSpeaker }> {
  const speaker = testSpeaker()
  return { audio: createAudio({ content: await loadSoundingGame(), speaker }), speaker }
}

/** Starts the sounding game on the manual frames, with the audio and the notice setting a test gives. */
async function start(
  extra: { audio?: GameAudio; soundNotice?: string | false; frames?: ReturnType<typeof manualFrames> } = {},
): Promise<{ game: Game; frames: ReturnType<typeof manualFrames> }> {
  const frames = extra.frames ?? manualFrames()
  game = await startGame({
    content: await loadSoundingGame(),
    plugins: [soundingHeroPlugin],
    mount,
    controls: fixtureControls,
    host: testHost(),
    frames,
    ...(extra.audio === undefined ? {} : { audio: extra.audio }),
    ...(extra.soundNotice === undefined ? {} : { soundNotice: extra.soundNotice }),
  })
  return { game, frames }
}

test("starting a game starts the level's music and logs level.started", async () => {
  const { audio } = await newAudio()
  await start({ audio })
  expect(audio.music()).toBe('meadow')
  expect(audio.log()[0]).toEqual({ tick: 0, from: 'page', on: 'level.started', do: 'music', id: 'meadow' })
})

test('a jump is in the cue log on the tick the sim raised it', async () => {
  const { audio, speaker } = await newAudio()
  speaker.tap()
  const heard = vi.spyOn(audio, 'hear')
  const { frames } = await start({ audio })
  frames.at(0)
  run(frames, 30) // the hero settles on the ground first
  key('keydown', 'Space')
  run(frames, 10)
  const withJump = heard.mock.calls.find(([step]) => step.events.some((e) => e.type === 'hero.jumped'))
  const jumpedAt = withJump?.[0].tick
  expect(jumpedAt).toBeDefined()
  expect(audio.log().find((entry) => entry.on === 'hero.jumped')).toEqual({
    tick: jumpedAt,
    from: 'sim',
    on: 'hero.jumped',
    do: 'sound',
    id: 'jump',
  })
  // The audio is given the tick and the events and nothing else: never the render delta or the commands.
  for (const [step] of heard.mock.calls) expect(Object.keys(step).sort()).toEqual(['events', 'tick'])
})

test('a game with audio and a game without end on the same hash', async () => {
  async function play(withAudio: boolean): Promise<string> {
    const speaker = testSpeaker()
    speaker.tap()
    const audio = createAudio({ content: await loadSoundingGame(), speaker })
    const { game: g, frames } = await start(withAudio ? { audio } : {})
    key('keydown', 'ArrowRight')
    key('keydown', 'Space')
    frames.at(0)
    run(frames, 120)
    key('keyup', 'ArrowRight')
    key('keyup', 'Space')
    const hash = g.sim.hash()
    g.stop()
    game = undefined
    return hash
  }
  expect(await play(true)).toBe(await play(false))
})

test('the button is there until the speaker is tapped, and gone after', async () => {
  const { audio, speaker } = await newAudio()
  await start({ audio })
  expect(notice()?.textContent).toBe('Tap to start the sound')
  speaker.tap()
  expect(notice()).toBeNull()
})

test('soundNotice: false shows no button; a string is shown as given', async () => {
  const quiet = await newAudio()
  await start({ audio: quiet.audio, soundNotice: false })
  expect(notice()).toBeNull()
  game?.stop()
  game = undefined
  const spoken = await newAudio()
  await start({ audio: spoken.audio, soundNotice: 'Toca para oír el sonido' })
  expect(notice()?.textContent).toBe('Toca para oír el sonido')
})

test('stopping the game removes the button and leaves the music wanted', async () => {
  const { audio } = await newAudio()
  const { game: g } = await start({ audio })
  g.stop()
  game = undefined
  expect(notice()).toBeNull()
  expect(audio.music()).toBe('meadow')
})

test('a second game with the same audio keeps the track and hears tick 1 again', async () => {
  const { audio, speaker } = await newAudio()
  speaker.tap()
  const first = await start({ audio })
  first.frames.at(0)
  run(first.frames, 5)
  first.game.stop()
  game = undefined
  const cuts = speaker.cuts.length
  const { frames } = await start({ audio })
  expect(speaker.cuts).toHaveLength(cuts) // the same track carries on: no second cut
  frames.at(0)
  run(frames, 30)
  key('keydown', 'Space')
  run(frames, 10)
  // The second game's tick 1 is heard although the first game was already past it, and its jump is logged.
  expect(audio.log().filter((entry) => entry.on === 'hero.jumped')).toHaveLength(1)
})

test('paused, no sim event is heard, and a page event still plays', async () => {
  const { audio, speaker } = await newAudio()
  speaker.tap()
  const { game: g, frames } = await start({ audio })
  frames.at(0)
  run(frames, 30)
  g.pause()
  const heard = vi.spyOn(audio, 'hear')
  key('keydown', 'Space')
  run(frames, 10)
  expect(heard).not.toHaveBeenCalled()
  const before = audio.log().length
  audio.raise('level.started')
  expect(audio.log()).toHaveLength(before + 1)
  expect(audio.log().at(-1)).toMatchObject({ from: 'page', on: 'level.started' })
})

test('a game given no audio has no button and runs as before', async () => {
  const { game: g, frames } = await start()
  expect(notice()).toBeNull()
  frames.at(0)
  run(frames, 20)
  expect(g.sim.tick).toBe(20)
})

// A watched replay draws its feel, in each real browser: dust on a landing, a shake on a jump, a freeze that holds the
// game and still ends on the recorded hash, dust again in the second round, and never a buzz. Frames by hand.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { controlsCommand, createRecorder, type Replay } from '#src/features/commands/commands.ts'
import { type Watch, watchReplay } from '#src/features/game/watch.ts'
import { type TestHost, testHost } from '#src/features/host/host.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { loadFeelGame } from '../../fixtures/feel/game.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'

const FRAME = 1000 / 60
/** The recording: right from tick 0 (the spark is taken on the way), a jump at 90, let go at 150. */
const TICKS = 160

let mount: HTMLDivElement
let watch: Watch | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  watch?.stop()
  watch = undefined
  mount.remove()
  vi.restoreAllMocks()
})

/** The recording these tests play: made here, on a headless sim of the feel game. */
async function record(): Promise<Replay> {
  const sim = await createGameSim({ content: await loadFeelGame() })
  try {
    const recorder = createRecorder(sim)
    for (let tick = 0; tick < TICKS; tick++)
      recorder.step(
        tick === 0
          ? [controlsCommand(tick, 1, 0, ['right'])]
          : tick === 90
            ? [controlsCommand(tick, 1, 1, ['right', 'jump'])]
            : tick === 92
              ? [controlsCommand(tick, 1, 2, ['right'])]
              : tick === 150
                ? [controlsCommand(tick, 1, 3, [])]
                : [],
      )
    return recorder.replay()
  } finally {
    sim.dispose()
  }
}

interface Started {
  readonly w: Watch
  readonly frames: ManualFrames
  readonly host: TestHost
  readonly replay: Replay
}

async function start(
  options: { readonly host?: TestHost; readonly rounds?: number; readonly restTicks?: number } = {},
): Promise<Started> {
  const frames = manualFrames()
  const host = options.host ?? testHost()
  const replay = await record()
  const w = await watchReplay({
    content: await loadFeelGame(),
    mount,
    host,
    frames,
    replay,
    ...(options.rounds === undefined ? {} : { rounds: options.rounds }),
    ...(options.restTicks === undefined ? {} : { restTicks: options.restTicks }),
  })
  watch = w
  frames.at(0)
  return { w, frames, host, replay }
}

const offset = (w: Watch): number => Math.abs(w.feel().shake.x) + Math.abs(w.feel().shake.y)

/** What a run of frames drew: the most dust and shake seen, and whether a freeze was on. */
interface Seen {
  specks: number
  shake: number
  froze: boolean
}
const watchFrames = (w: Watch, frames: ManualFrames, n: number): Seen => {
  const seen: Seen = { specks: 0, shake: 0, froze: false }
  for (let i = 0; i < n; i++) {
    frames.advance(FRAME)
    seen.specks = Math.max(seen.specks, w.feel().specks.length)
    seen.shake = Math.max(seen.shake, offset(w))
    seen.froze ||= w.feel().freeze > 0
  }
  return seen
}

test('a watched replay draws dust on a landing and shakes on a jump', async () => {
  const { w, frames } = await start({ rounds: 1 })
  const seen = watchFrames(w, frames, 300)
  expect(seen.specks).toBeGreaterThan(0)
  expect(seen.shake).toBeGreaterThan(0)
})

test('a watched replay never asks the host to buzz', async () => {
  const { w, frames, host } = await start({ rounds: 1 })
  watchFrames(w, frames, 300)
  expect(host.buzzes).toEqual([])
})

test('a freeze holds a watched replay, and it still ends on its recorded hash', async () => {
  const { w, frames, replay } = await start({ rounds: 1 })
  let held = 0
  let before = w.sim.tick
  for (let i = 0; i < 300; i++) {
    frames.advance(FRAME)
    if (w.feel().freeze > 0 && w.sim.tick === before) held++
    before = w.sim.tick
  }
  // Six ticks of freeze: the frames after the one that began it stand still.
  expect(held).toBeGreaterThanOrEqual(5)
  expect(w.rounds).toBe(1)
  expect(w.sim.tick).toBe(replay.ticks)
  expect(w.sim.hash()).toBe(replay.finalHash)
})

test('the last dust settles and then the watch asks for no more frames', async () => {
  const { w, frames } = await start({ rounds: 1 })
  watchFrames(w, frames, 400)
  expect(w.feel().specks).toHaveLength(0)
  expect(frames.pending).toBe(false)
})

test('the second round makes dust again', async () => {
  const { w, frames } = await start({ restTicks: 40 })
  // The first round, and the rest in which its last dust fades.
  for (let i = 0; i < 500 && w.rounds < 1; i++) frames.advance(FRAME)
  expect(w.rounds).toBe(1)
  let dust = 0
  // Round two, from tick 20 on: the spark and the landings come again, and are heard from tick 1.
  for (let i = 0; i < 400 && w.rounds < 2; i++) {
    frames.advance(FRAME)
    if (w.rounds === 1 && w.sim.tick >= 20) dust = Math.max(dust, w.feel().specks.length)
  }
  expect(dust).toBeGreaterThan(0)
})

test('a watch under reduced motion draws no shake, and its dust is the same', async () => {
  const { w, frames } = await start({ host: testHost({ reducedMotion: true }), rounds: 1 })
  const seen = watchFrames(w, frames, 300)
  expect(seen.shake).toBe(0)
  expect(seen.specks).toBeGreaterThan(0)
})

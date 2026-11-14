// `watchReplay` in each real browser: the fixture game plays a recording it made itself, with hand-driven frames.
// Frames are counted as game.browser.test.ts counts them: `frames.at(0)` first, which only sets the clock, then
// `run(frames, n)` for n steps.

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { controlsCommand, createRecorder, type Replay } from '#src/features/commands/commands.ts'
import { type Watch, WatchSetupError, watchReplay } from '#src/features/game/watch.ts'
import type { Host } from '#src/features/host/host.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const FRAME = 1000 / 60
/** The recording is 90 ticks: hold right from tick 5 to tick 65. */
const TICKS = 90

let mount: HTMLDivElement
let watch: Watch | undefined

/** A host the test can hide and show. */
function fakeHost(): Host & { hide(): void; show(): void } {
  let visible = true
  const listeners = new Set<(visible: boolean) => void>()
  const set = (next: boolean): void => {
    visible = next
    for (const l of listeners) l(next)
  }
  return {
    target: 'web',
    visible: () => visible,
    onVisibility(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    hide: () => set(false),
    show: () => set(true),
  }
}

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

/** The recording these tests play: recorded here, on a headless sim, so no file has to be kept in step. */
async function record(): Promise<Replay> {
  const sim = await createGameSim({ content: await loadFixtureGame(), plugins: [heroPlugin] })
  try {
    const recorder = createRecorder(sim)
    for (let tick = 0; tick < TICKS; tick++) {
      recorder.step(
        tick === 5
          ? [controlsCommand(tick, 1, 0, ['right'])]
          : tick === 65
            ? [controlsCommand(tick, 1, 1, [])]
            : [],
      )
    }
    return recorder.replay()
  } finally {
    sim.dispose()
  }
}

/** The sim's hash after its first tick with nothing held, which is where every round must start from. */
async function hashAfterFirstTick(): Promise<string> {
  const sim = await createGameSim({ content: await loadFixtureGame(), plugins: [heroPlugin] })
  try {
    sim.step([])
    return sim.hash()
  } finally {
    sim.dispose()
  }
}

async function start(
  extra: {
    replay?: Replay
    rounds?: number
    restTicks?: number
    seed?: number
    files?: Record<string, string>
  } = {},
): Promise<{
  watch: Watch
  frames: ReturnType<typeof manualFrames>
  host: ReturnType<typeof fakeHost>
  replay: Replay
}> {
  const frames = manualFrames()
  const host = fakeHost()
  const replay = extra.replay ?? (await record())
  watch = await watchReplay({
    content: await loadFixtureGame(extra.files ?? {}),
    plugins: [heroPlugin],
    mount,
    host,
    frames,
    replay,
    ...(extra.rounds === undefined ? {} : { rounds: extra.rounds }),
    ...(extra.restTicks === undefined ? {} : { restTicks: extra.restTicks }),
    ...(extra.seed === undefined ? {} : { seed: extra.seed }),
  })
  return { watch, frames, host, replay }
}

const run = (frames: ReturnType<typeof manualFrames>, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}

test('the replay plays by itself and ends on its recorded hash', async () => {
  const { watch: w, frames, replay } = await start()
  expect(mount.querySelector('canvas')).not.toBeNull()
  frames.at(0)
  run(frames, TICKS)
  expect(w.sim.tick).toBe(TICKS)
  expect(w.sim.hash()).toBe(replay.finalHash)
  expect(w.rounds).toBe(1)
})

test('nothing a player does reaches it', async () => {
  const { watch: w, frames, replay } = await start()
  // Left held against a recording that runs right: if the keyboard reached the sim, the hash would differ.
  key('keydown', 'ArrowLeft')
  mount.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }))
  frames.at(0)
  run(frames, TICKS)
  key('keyup', 'ArrowLeft')
  expect(w.sim.hash()).toBe(replay.finalHash)
  expect(mount.querySelector('.automata-touch')).toBeNull()
  expect(mount.children).toHaveLength(1)
})

test('after the rest it starts again from the first picture', async () => {
  const { watch: w, frames, replay } = await start({ restTicks: 10 })
  const first = await hashAfterFirstTick()
  frames.at(0)
  run(frames, TICKS)
  expect(w.rounds).toBe(1)
  run(frames, 10) // the rest: nothing moves
  expect(w.sim.tick).toBe(TICKS)
  run(frames, 1) // the restore, and tick 0's commands
  expect(w.sim.tick).toBe(1)
  expect(w.sim.hash()).toBe(first)
  run(frames, TICKS - 1)
  expect(w.sim.tick).toBe(TICKS)
  expect(w.sim.hash()).toBe(replay.finalHash)
  expect(w.rounds).toBe(2)
})

test('rounds: 1 holds the last picture and asks for no more frames', async () => {
  const { watch: w, frames, replay } = await start({ rounds: 1 })
  frames.at(0)
  run(frames, TICKS)
  expect(w.rounds).toBe(1)
  expect(frames.pending).toBe(false)
  frames.advance(5000)
  expect(w.sim.tick).toBe(TICKS)
  expect(w.sim.hash()).toBe(replay.finalHash)
})

test('it is still while the host is hidden, and does not fast-forward after', async () => {
  const { watch: w, frames, host } = await start()
  frames.at(0)
  run(frames, 30)
  expect(w.sim.tick).toBe(30)
  host.hide()
  frames.advance(60_000) // nothing is listening for frames now
  expect(w.sim.tick).toBe(30)
  host.show()
  frames.at(120_000)
  frames.at(120_000 + FRAME)
  expect(w.sim.tick).toBeLessThanOrEqual(31)
})

// An editor may have moved the crate since the recording. The play goes wherever its commands now lead, and no one is
// told there is a problem.
test('content that changed since the recording still plays', async () => {
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] as string) as {
    things: { x: number }[]
  }
  const moved = { ...level, things: level.things.map((t) => ({ ...t, x: 12.5 })) }
  const {
    watch: w,
    frames,
    replay,
  } = await start({
    files: { 'content/levels/level-1.json': JSON.stringify(moved) },
  })
  expect(w.sim.contentHash).not.toBe(replay.contentHash)
  frames.at(0)
  run(frames, TICKS)
  expect(w.sim.tick).toBe(TICKS)
})

test('a replay for another tick rate or seed is refused in words', async () => {
  const replay = await record()
  const frames = manualFrames()
  const common = { content: await loadFixtureGame(), plugins: [heroPlugin], mount, host: fakeHost(), frames }
  const rate = await watchReplay({ ...common, replay: { ...replay, tickHz: 30 } }).catch((e: unknown) => e)
  expect(rate).toBeInstanceOf(WatchSetupError)
  expect((rate as WatchSetupError).name).toBe('WatchSetupError')
  expect((rate as WatchSetupError).message).toMatch(/30 Hz/)
  expect(mount.children).toHaveLength(0)
  const seed = await watchReplay({ ...common, replay, seed: replay.seed + 1 }).catch((e: unknown) => e)
  expect(seed).toBeInstanceOf(WatchSetupError)
  expect((seed as WatchSetupError).message).toMatch(/seed/)
  expect(mount.children).toHaveLength(0)
})

test('a replay of no ticks holds the first picture', async () => {
  const replay = await record()
  const { watch: w, frames } = await start({ replay: { ...replay, ticks: 0, commands: [], checks: [] } })
  expect(frames.pending).toBe(false)
  frames.at(0)
  expect(w.sim.tick).toBe(0)
  expect(w.rounds).toBe(0)
})

test('stop removes the canvas, and may be called twice', async () => {
  const { watch: w, frames } = await start()
  frames.at(0)
  run(frames, 5)
  w.stop()
  expect(mount.children).toHaveLength(0)
  expect(frames.pending).toBe(false)
  expect(() => w.sim.step([])).toThrow()
  expect(() => w.stop()).not.toThrow()
  watch = undefined
})

test('a finished watch stays still when the page is hidden and shown again', async () => {
  const { watch: w, frames, host, replay } = await start({ rounds: 1 })
  frames.at(0)
  run(frames, TICKS)
  host.hide()
  host.show()
  expect(frames.pending).toBe(false)
  frames.at(9000)
  expect(w.sim.tick).toBe(TICKS)
  expect(w.sim.hash()).toBe(replay.finalHash)
})

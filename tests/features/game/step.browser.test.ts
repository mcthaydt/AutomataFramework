// One step by hand and a slower speed, on the whole game in each real browser: fixture content, the hero, hand-driven
// frames.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { verifyReplay } from '#src/features/commands/commands.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { testHost } from '#src/features/host/host.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { chosenLocale } from '../../fixtures/locale/chosen.ts'

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

async function start(): Promise<{ game: Game; frames: ManualFrames }> {
  const frames = manualFrames()
  const content = await loadFixtureGame()
  game = await startGame({
    content,
    locale: await chosenLocale(content, 'ko'),
    plugins: [heroPlugin],
    mount,
    controls: fixtureControls,
    host: testHost(),
    frames,
  })
  frames.at(0)
  return { game, frames }
}
const run = (frames: ManualFrames, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}

test('paused, step() takes one step each time, and onStep hears each', async () => {
  const { game: g } = await start()
  const heard: number[] = []
  g.onStep((s) => heard.push(s.tick))
  g.pause()
  g.step()
  g.step()
  g.step()
  expect(g.sim.tick).toBe(3)
  expect(heard).toEqual([1, 2, 3])
})

test('running, step() does nothing', async () => {
  const { game: g } = await start()
  g.step()
  expect(g.sim.tick).toBe(0)
})

test('a step by hand is not lost to the loop: resume goes on from where the steps left off', async () => {
  const { game: g, frames } = await start()
  g.pause()
  g.step()
  g.step()
  g.resume()
  frames.at(10_000)
  run(frames, 10)
  expect(g.sim.tick).toBe(12)
})

test('what was played with steps by hand replays to the same hash', async () => {
  const { game: g, frames } = await start()
  key('keydown', 'ArrowRight')
  run(frames, 30)
  g.pause()
  for (let i = 0; i < 10; i++) g.step()
  g.resume()
  run(frames, 30)
  const fresh = await createGameSim({ content: await loadFixtureGame(), plugins: [heroPlugin] })
  try {
    expect(verifyReplay(fresh, g.replay())).toEqual({ ok: true })
  } finally {
    fresh.dispose()
  }
})

test('at half speed 120 frames take 60 steps, at a quarter 30, and back at 1 it is the game own speed', async () => {
  const { game: g, frames } = await start()
  g.setSpeed(0.5)
  run(frames, 120)
  expect(g.sim.tick).toBe(60)
  g.setSpeed(0.25)
  run(frames, 120)
  expect(g.sim.tick).toBe(90)
  g.setSpeed(1)
  run(frames, 60)
  expect(g.sim.tick).toBe(150)
})

test('a speed that is not 1, 0.5 or 0.25 throws, and the speed stays as it was', async () => {
  const { game: g, frames } = await start()
  g.setSpeed(0.5)
  expect(() => g.setSpeed(0.3)).toThrow(/1, 0\.5 or 0\.25/)
  expect(() => g.setSpeed(2)).toThrow()
  expect(() => g.setSpeed(Number.NaN)).toThrow()
  run(frames, 120)
  expect(g.sim.tick).toBe(60)
})

test('a stopped game does not take a step by hand', async () => {
  const { game: g } = await start()
  g.pause()
  g.stop()
  expect(() => g.step()).not.toThrow()
  expect(g.sim.tick).toBe(0)
})

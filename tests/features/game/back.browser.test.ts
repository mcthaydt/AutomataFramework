// Going back through what was just played, on the whole game in each real browser: the hero is made to run by real key
// events, the game is paused and taken back, and it must be exactly where it was and play on to the same place.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { verifyReplay } from '#src/features/commands/commands.ts'
import { loadGame } from '#src/features/content/content.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { testHost } from '#src/features/host/host.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { readFullGamePicture } from '../../fixtures/full-game/pictures.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
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

async function fullContent() {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

async function start(keepSeconds?: number): Promise<{ game: Game; frames: ManualFrames }> {
  const frames = manualFrames()
  const content = await fullContent()
  game = await startGame({
    content,
    locale: await chosenLocale(content, 'ko'),
    plugins: [heroPlugin],
    mount,
    controls: fixtureControls,
    host: testHost(),
    frames,
    readPicture: readFullGamePicture,
    ...(keepSeconds === undefined ? {} : { keepSeconds }),
  })
  frames.at(0)
  return { game, frames }
}
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}

/** What the player does, by tick: holds Right from 10, lets go at 150, holds Left from 200 to 260. Done on frames. */
function script(g: Game, frames: ManualFrames, to: number): void {
  while (g.sim.tick < to) {
    if (g.sim.tick === 10) key('keydown', 'ArrowRight')
    if (g.sim.tick === 150) key('keyup', 'ArrowRight')
    if (g.sim.tick === 200) key('keydown', 'ArrowLeft')
    if (g.sim.tick === 260) key('keyup', 'ArrowLeft')
    frames.advance(FRAME)
  }
}

test('after backTo(120) the game is as it was at 120, and played on it reaches the same place', async () => {
  const { game: g, frames } = await start(10)
  script(g, frames, 120)
  const at120 = g.sim.hash()
  script(g, frames, 300)
  const at300 = g.sim.hash()
  g.pause()
  g.backTo(120)
  expect(g.sim.tick).toBe(120)
  expect(g.sim.hash()).toBe(at120)
  g.resume()
  // Nobody held anything while the game was paused, so Right is pressed again, as it was when the game was at 120.
  key('keydown', 'ArrowRight')
  script(g, frames, 300)
  expect(g.sim.hash()).toBe(at300)
  const fresh = await createGameSim({ content: await fullContent(), plugins: [heroPlugin] })
  try {
    expect(verifyReplay(fresh, g.replay())).toEqual({ ok: true })
  } finally {
    fresh.dispose()
  }
})

test('what was played after the tick gone back to is forgotten', async () => {
  const { game: g, frames } = await start(10)
  script(g, frames, 300)
  g.pause()
  g.backTo(120)
  expect(g.replay().ticks).toBe(120)
  expect(g.replay().commands.every((c) => c.tick < 120)).toBe(true)
})

test('kept() gives the ticks backTo can reach: with keepSeconds 2 at tick 300 it is 180 to 300', async () => {
  const { game: g, frames } = await start(2)
  script(g, frames, 300)
  expect(g.kept()).toEqual({ from: 180, to: 300 })
})

test('kept() is from = to when nothing is kept, and backTo throws', async () => {
  const { game: g, frames } = await start()
  script(g, frames, 100)
  expect(g.kept()).toEqual({ from: 100, to: 100 })
  g.pause()
  expect(() => g.backTo(50)).toThrow()
})

test('backTo while running, or to a tick outside kept(), throws and changes nothing', async () => {
  const { game: g, frames } = await start(2)
  script(g, frames, 300)
  expect(() => g.backTo(250)).toThrow(/pause/)
  g.pause()
  const hash = g.sim.hash()
  expect(() => g.backTo(179)).toThrow(/180 to 300/)
  expect(() => g.backTo(301)).toThrow()
  expect(() => g.backTo(200.5)).toThrow()
  expect(g.sim.hash()).toBe(hash)
  expect(g.sim.tick).toBe(300)
})

test('the oldest kept tick and now can both be gone back to', async () => {
  const { game: g, frames } = await start(2)
  script(g, frames, 300)
  g.pause()
  g.backTo(180)
  expect(g.sim.tick).toBe(180)
  g.backTo(180)
  expect(g.sim.tick).toBe(180)
})

test('keepSeconds outside 0 to 60 or not a whole number is refused before anything is put on the page', async () => {
  const content = await fullContent()
  for (const keepSeconds of [-1, 61, 1.5, Number.NaN]) {
    await expect(
      startGame({
        content,
        locale: await chosenLocale(content, 'ko'),
        plugins: [heroPlugin],
        mount,
        controls: fixtureControls,
        host: testHost(),
        frames: manualFrames(),
        readPicture: readFullGamePicture,
        keepSeconds,
      }),
    ).rejects.toThrow(/keepSeconds/)
  }
  expect(mount.querySelector('canvas')).toBeNull()
})

test("the hero's box after backTo(120) equals the box read at tick 120", async () => {
  const { game: g, frames } = await start(10)
  script(g, frames, 119)
  g.pause()
  g.step()
  expect(g.sim.tick).toBe(120)
  const at120 = g.heroes()
  expect(at120.length).toBeGreaterThan(0)
  g.resume()
  script(g, frames, 300)
  g.pause()
  g.backTo(120)
  expect(g.heroes()).toEqual(at120)
})

test('backTo(kept().to) is allowed in every case, changes nothing, and does not throw', async () => {
  // Nothing is kept, so kept() is from = to, and the tick it names is still inside it.
  const bare = await start()
  script(bare.game, bare.frames, 30)
  bare.game.pause()
  expect(bare.game.kept()).toEqual({ from: 30, to: 30 })
  const hash = bare.game.sim.hash()
  expect(() => bare.game.backTo(30)).not.toThrow()
  expect(bare.game.sim.tick).toBe(30)
  expect(bare.game.sim.hash()).toBe(hash)
  bare.game.stop()

  // Kept, but only just started: at tick 0 there is nothing before now to go back to, and now is still reachable.
  const fresh = await start(5)
  fresh.game.pause()
  expect(fresh.game.kept()).toEqual({ from: 0, to: 0 })
  expect(() => fresh.game.backTo(0)).not.toThrow()
  expect(fresh.game.sim.tick).toBe(0)
  expect(fresh.game.replay().ticks).toBe(0)

  // Kept and played: now is the newest end of the range, and a step taken after it goes on from there.
  fresh.game.resume()
  script(fresh.game, fresh.frames, 100)
  fresh.game.pause()
  const { to } = fresh.game.kept()
  const before = fresh.game.sim.hash()
  expect(() => fresh.game.backTo(to)).not.toThrow()
  expect(fresh.game.sim.hash()).toBe(before)
})

test('after stop(), kept() has nothing to go back to: from = to, the last tick', async () => {
  const { game: g, frames } = await start(5)
  script(g, frames, 30)
  expect(g.kept().from).toBeLessThan(g.kept().to)
  g.stop()
  expect(g.kept()).toEqual({ from: 30, to: 30 })
})

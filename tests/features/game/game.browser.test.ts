// The whole game in each real browser: fixture content, the hero, real key events, hand-driven frames.

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Player, verifyReplay } from '#src/features/commands/commands.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { type Host, type TestHost, testHost } from '#src/features/host/host.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { createLocale } from '#src/features/locale/locale.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import { definePlugin, defineSystem } from '#src/features/sim/sim.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { pixel } from '../../fixtures/game/pixels.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'
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

async function start(
  extra: { host?: Host; frames?: ReturnType<typeof manualFrames>; controls?: typeof fixtureControls } = {},
): Promise<{ game: Game; frames: ReturnType<typeof manualFrames>; host: TestHost }> {
  const frames = extra.frames ?? manualFrames()
  const host = testHost()
  game = await startGame({
    content: await loadFixtureGame(),
    locale: await chosenLocale(await loadFixtureGame(), 'ko'),
    plugins: [heroPlugin],
    mount,
    controls: extra.controls ?? fixtureControls,
    host: extra.host ?? host,
    frames,
  })
  return { game, frames, host }
}
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}
/** Delivers `n` frames, one display refresh apart, the first of which only sets the clock. */
const run = (frames: ReturnType<typeof manualFrames>, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}
const heroX = (g: Game): number => {
  const hero = g.sim.query(Player, Transform)[0]
  if (hero === undefined) throw new Error('no hero')
  return hero.get(Transform).x
}

test('the game starts: a canvas in the mount and the sim at tick 0', async () => {
  const { game: g } = await start()
  expect(mount.querySelector('canvas')).not.toBeNull()
  expect(g.sim.tick).toBe(0)
})

// The level's own colour reaches the screen: the sky behind it, and the bars beside it, are what its file says.
test('a level that sets its sky is drawn on that sky', async () => {
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] as string) as Record<string, unknown>
  const frames = manualFrames()
  const content = await loadFixtureGame({
    'content/levels/level-1.json': JSON.stringify({ ...level, sky: '#fdd4bd' }),
  })
  game = await startGame({
    content,
    locale: await chosenLocale(content, 'ko'),
    plugins: [heroPlugin],
    mount,
    controls: fixtureControls,
    host: testHost(),
    frames,
  })
  const canvas = mount.querySelector('canvas')
  if (canvas === null) throw new Error('no canvas')
  // A WebGL canvas is cleared once the page has shown it, so a frame is drawn and read back in the same task.
  frames.at(0)
  run(frames, 2)
  expect(pixel(canvas, 2, 2)).toEqual([0xfd, 0xd4, 0xbd])
})

test('holding Right for 120 frames moves the hero right', async () => {
  const { game: g, frames } = await start()
  const before = heroX(g)
  key('keydown', 'ArrowRight')
  frames.at(0) // the first frame sets the clock
  run(frames, 120)
  expect(g.sim.tick).toBe(120)
  expect(heroX(g)).toBeGreaterThan(before + 1)
})

test('what was played replays to the same hash in a headless sim', async () => {
  const { game: g, frames } = await start()
  key('keydown', 'ArrowRight')
  frames.at(0)
  run(frames, 90)
  key('keydown', 'Space')
  run(frames, 30)
  key('keyup', 'ArrowRight')
  key('keyup', 'Space')
  run(frames, 30)
  const replay = g.replay()
  expect(replay.ticks).toBe(150)
  expect(replay.commands.length).toBeGreaterThan(0)
  const fresh = await createGameSim({ content: await loadFixtureGame(), plugins: [heroPlugin] })
  try {
    expect(verifyReplay(fresh, replay)).toEqual({ ok: true })
  } finally {
    fresh.dispose()
  }
})

test('startGame records the level and the players it started with', async () => {
  const { game: g } = await start()
  expect(g.replay().meta).toEqual({ level: 'level-1', players: '1' })
})

test('a hidden page pauses the game and coming back does not fast-forward', async () => {
  const { game: g, frames, host } = await start()
  frames.at(0)
  run(frames, 30)
  expect(g.sim.tick).toBe(30)
  host.hide()
  frames.advance(60_000) // nothing is listening for frames now
  expect(g.sim.tick).toBe(30)
  host.show()
  frames.at(120_000)
  frames.at(120_000 + FRAME)
  expect(g.sim.tick).toBeLessThanOrEqual(31)
})

test('a game that starts on a hidden page waits to be seen', async () => {
  const host = testHost()
  host.hide()
  const { game: g, frames } = await start({ host })
  // The input also asks for frames (to read gamepads), so what is shown is that the game itself does not run.
  frames.at(0)
  run(frames, 5)
  expect(g.sim.tick).toBe(0)
  host.show()
  frames.at(0)
  run(frames, 3)
  expect(g.sim.tick).toBe(3)
})

test('pause and resume', async () => {
  const { game: g, frames } = await start()
  frames.at(0)
  run(frames, 10)
  g.pause()
  frames.advance(5000)
  expect(g.sim.tick).toBe(10)
  g.resume()
  frames.at(9000)
  run(frames, 5)
  expect(g.sim.tick).toBe(15)
})

test('coming back to a page that is paused by hand does not start it', async () => {
  const { game: g, frames, host } = await start()
  frames.at(0)
  g.pause()
  host.hide()
  host.show()
  // The input keeps asking for frames, so a menu can be walked with a gamepad while the game is held: the game does not run.
  frames.at(9000)
  run(frames, 5)
  expect(g.sim.tick).toBe(0)
})

test('stop leaves the mount empty and the sim disposed', async () => {
  const { game: g, frames } = await start()
  frames.at(0)
  run(frames, 5)
  g.stop()
  expect(mount.children).toHaveLength(0)
  expect(frames.pending).toBe(false)
  expect(() => g.sim.step([])).toThrow()
  expect(() => g.stop()).not.toThrow()
  game = undefined
})

test('the screen is kept lit while the game runs, and let go when it is paused, hidden or stopped', async () => {
  const { game: g, host } = await start()
  expect(host.awake).toBe(true)
  g.pause()
  expect(host.awake).toBe(false)
  g.resume()
  expect(host.awake).toBe(true)
  host.hide()
  expect(host.awake).toBe(false)
  host.show()
  expect(host.awake).toBe(true)
  g.stop()
  expect(host.awake).toBe(false)
  game = undefined
})

test('while it plays the game takes every touch, and stop gives the page back', async () => {
  const { game: g } = await start()
  expect(getComputedStyle(mount).touchAction).toBe('none')
  const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  mount.dispatchEvent(menu)
  expect(menu.defaultPrevented).toBe(true)
  g.stop()
  expect(mount.style.getPropertyValue('touch-action')).toBe('')
  expect(document.documentElement.style.getPropertyValue('overscroll-behavior')).toBe('')
  game = undefined
})

test('bad controls stop the game from starting, with the plain message', async () => {
  const bad = { 'Jump!': { label: 'Jump', keys: ['Space'], side: 'right' as const } }
  await expect(start({ controls: bad })).rejects.toThrow('"Jump!" cannot be an action name')
  expect(mount.children).toHaveLength(0)
})

// No language is the default for anyone, so a game does not start for a player who has not chosen one: the picker
// comes first. Nothing is put on the page, and the sentence says what to do.
test('a game does not start before the player has a language', async () => {
  const content = await loadFixtureGame()
  const host = testHost({ deviceLanguages: ['fr-FR'] })
  const locale = createLocale({
    content,
    host,
    settings: await openSettings({ game: 'no-language', store: host.store }),
  })
  await expect(
    startGame({ content, locale, plugins: [heroPlugin], mount, controls: fixtureControls, host }),
  ).rejects.toThrow(
    'No language is chosen yet. Show the language picker first (languagePicker), then start the game.',
  )
  expect(mount.childElementCount).toBe(0)
})

test('a locale that only watches has a language and was not asked, so it cannot start the game either', async () => {
  const content = await loadFixtureGame()
  const host = testHost({ deviceLanguages: ['ja-JP'] })
  const locale = createLocale({
    content,
    host,
    settings: await openSettings({ game: 'watching', store: host.store }),
    watching: true,
  })
  expect([locale.language(), locale.asked()]).toEqual(['ja', false])
  await expect(
    startGame({ content, locale, plugins: [heroPlugin], mount, controls: fixtureControls, host }),
  ).rejects.toThrow('No language is chosen yet.')
  expect(mount.childElementCount).toBe(0)
})

// Plan U, Task 2: what a game tells a screen. The flow ends a level on an event, and shows a problem when the game's
// rules throw, so a game says each step, whether it is held, and when it broke.

test('every step is heard once, in order, with its events', async () => {
  const { game: g, frames } = await start()
  const heard: { tick: number; events: readonly unknown[] }[] = []
  g.onStep((step) => heard.push(step))
  frames.at(0)
  run(frames, 3)
  // The tick the sim is at after the step: the one the sound is told, too.
  expect(heard.map((step) => step.tick)).toEqual([1, 2, 3])
  expect(g.sim.tick).toBe(3)
  for (const step of heard) expect(Array.isArray(step.events)).toBe(true)
})

test('a listener that is taken away hears no more steps', async () => {
  const { game: g, frames } = await start()
  const heard: number[] = []
  const stop = g.onStep((step) => heard.push(step.tick))
  frames.at(0)
  run(frames, 2)
  stop()
  run(frames, 2)
  expect(heard).toEqual([1, 2])
})

test('paused() is true between pause() and resume()', async () => {
  const { game: g } = await start()
  expect(g.paused()).toBe(false)
  g.pause()
  expect(g.paused()).toBe(true)
  g.resume()
  expect(g.paused()).toBe(false)
})

test('replay() after stop() is the play as it was', async () => {
  const { game: g, frames } = await start()
  frames.at(0)
  run(frames, 5)
  const before = g.replay()
  g.stop()
  const after = g.replay()
  expect(after.ticks).toBe(before.ticks)
  expect(after.finalHash).toBe(before.finalHash)
  expect(after).toEqual(before)
})

const boom = defineSystem({
  name: 'boom.system',
  phase: 'gameplay',
  run(ctx) {
    if (ctx.tick === 3) throw new Error('the rules broke')
  },
})
const boomPlugin = definePlugin({ name: 'boom', systems: [boom] })

test('a game whose rules throw stays stopped and says so', async () => {
  const frames = manualFrames()
  const host = testHost()
  game = await startGame({
    content: await loadFixtureGame(),
    locale: await chosenLocale(await loadFixtureGame(), 'ko'),
    plugins: [heroPlugin, boomPlugin],
    mount,
    controls: fixtureControls,
    host,
    frames,
  })
  expect(game.broken()).toBeUndefined()
  const told: unknown[] = []
  game.onBroken((error) => told.push(error))
  frames.at(0)
  let thrown: unknown
  try {
    run(frames, 8)
  } catch (error) {
    thrown = error
  }
  // The error still goes on to the page's handler, and the game kept the very same one.
  expect(thrown).toBeInstanceOf(Error)
  expect(game.broken()).toBe(thrown)
  expect(told).toEqual([thrown])
  const stoppedAt = game.sim.tick
  // Coming back on screen does not start a broken game again.
  host.hide()
  host.show()
  frames.at(100_000)
  run(frames, 5)
  // The game's own loop asks for no more frames (the input's pad reading still does, so `frames` is never idle).
  expect(game.sim.tick).toBe(stoppedAt)
})

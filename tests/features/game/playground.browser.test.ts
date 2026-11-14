// The playground, played the way a person plays it: the whole game on a page in each real browser, a key or a thumb held
// down for 260 frames, at five screen sizes. The hero takes the spark, walks through the door, a crate tips the seesaw
// and the ropes are drawn, and the run is one the sim replays headless.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { verifyReplay } from '#src/features/commands/commands.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { testHost } from '#src/features/host/host.ts'
import { createGameSim, Thing } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { fitWorld } from '#src/features/render/fit.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { brightness, pixel } from '../../fixtures/game/pixels.ts'
import { loadPlayground } from '../../fixtures/playground/game.ts'
import { playgroundPlugin, Score } from '../../fixtures/playground/plugin.ts'

const FRAME = 1000 / 60
/** Long enough for the hero to run to the wall at the end of the level: the key is held past the script's own 200 ticks. */
const FRAMES = 260
const WORLD = { w: 24, h: 10 }

let mount: HTMLDivElement
let game: Game | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  game?.stop()
  game = undefined
  mount.remove()
  vi.restoreAllMocks()
})

const twoFrames = (): Promise<void> =>
  new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))

async function start(w: number, h: number): Promise<{ game: Game; frames: ReturnType<typeof manualFrames> }> {
  await page.viewport(w, h)
  expect([window.innerWidth, window.innerHeight]).toEqual([w, h])
  const frames = manualFrames()
  game = await startGame({
    content: await loadPlayground(),
    plugins: [heroPlugin, playgroundPlugin],
    mount,
    controls: fixtureControls,
    host: testHost(),
    frames,
  })
  return { game, frames }
}

const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}
const run = (frames: ReturnType<typeof manualFrames>, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}
const thing = (g: Game, id: string) => g.sim.query(Thing).find((e) => e.get(Thing).id === id)

/** What the run must have done: the spark taken, the seesaw tipped right, and a replay a headless sim agrees with. */
async function expectPlayed(g: Game): Promise<void> {
  expect(g.sim.resource(Score).sparks).toBe(1)
  expect(thing(g, 'spark-1')).toBeUndefined()
  expect(thing(g, 'plank-1')?.get(Transform).rotation).toBeGreaterThan(0.1)
  const replay = g.replay()
  const fresh = await createGameSim({
    content: await loadPlayground(),
    plugins: [heroPlugin, playgroundPlugin],
  })
  try {
    expect(verifyReplay(fresh, replay)).toEqual({ ok: true })
  } finally {
    fresh.dispose()
  }
  // The door is checked too: `Score.inDoor` is false before the door and after it, so only the events say the hero
  // went through. A second fresh sim plays the recorded commands and reports every touch it hears.
  const again = await createGameSim({
    content: await loadPlayground(),
    plugins: [heroPlugin, playgroundPlugin],
  })
  try {
    const touches: string[] = []
    for (let tick = 0; tick < replay.ticks; tick++)
      for (const e of again.step(replay.commands.filter((c) => c.tick === tick)).events)
        if (/\.(touched|left|taken)$/.test(e.type)) touches.push(e.type)
    expect(touches).toEqual(['spark.touched', 'spark.taken', 'door.touched', 'door.left'])
  } finally {
    again.dispose()
  }
}
}

test.each([
  [390, 844],
  [844, 390],
  [820, 1180],
  [1180, 820],
  [1280, 720],
])('at %i by %i, holding the right key takes the spark and goes through the door', async (w, h) => {
  const { game: g, frames } = await start(w, h)
  key('keydown', 'ArrowRight')
  frames.at(0)
  run(frames, FRAMES)
  key('keyup', 'ArrowRight')
  await expectPlayed(g)
  await page.screenshot({ element: mount, path: `__screenshots__/playground-${w}x${h}.png` })
})

test('on a phone, a thumb held on the Right button does the same', async () => {
  const { game: g, frames } = await start(390, 844)
  // A finger on the screen brings up the buttons, as it does for a player on a phone.
  window.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }))
  frames.at(0)
  run(frames, 2)
  await twoFrames()
  const right = mount.querySelector('[data-action="right"]')
  if (right === null) throw new Error('no Right button')
  right.dispatchEvent(
    new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'touch', bubbles: true, cancelable: true }),
  )
  run(frames, FRAMES)
  right.dispatchEvent(
    new PointerEvent('pointerup', { pointerId: 2, pointerType: 'touch', bubbles: true, cancelable: true }),
  )
  await expectPlayed(g)
})

test('the ropes are on the picture', async () => {
  // A wide page, so no touch buttons take room: the world is fitted to the whole canvas.
  const { frames } = await start(1280, 720)
  frames.at(0)
  run(frames, 2)
  const canvas = mount.querySelector('canvas') as HTMLCanvasElement
  const box = canvas.getBoundingClientRect()
  const fit = fitWorld({ w: box.width, h: box.height }, WORLD)
  // Halfway up the left rope, from (7.5, 6) on the platform to (7.6, 2) in the level.
  const x = fit.left + 7.55 * fit.scale
  const y = fit.top + 4 * fit.scale
  const around: number[] = []
  for (let dx = -2; dx <= 2; dx++)
    for (let dy = -2; dy <= 2; dy++) around.push(brightness(pixel(canvas, x + dx, y + dy)))
  expect(Math.min(...around)).toBeLessThan(90)
})

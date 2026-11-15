// The built-in hero at a gamepad and at a keyboard, in each real browser: the stick walks, the bottom button jumps and
// jumps again in the air, the left button and the right trigger dash; and the same at a keyboard with Space and Shift.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Player } from '#src/features/commands/commands.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { testHost } from '#src/features/host/host.ts'
import { Body, Transform } from '#src/features/physics/physics.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'
import { chosenLocale } from '../../fixtures/locale/chosen.ts'
import { movesScreenContent, paintedPictures } from '../../fixtures/moves/screen.ts'

const FRAME = 1000 / 60

let mount: HTMLDivElement
let game: Game | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:844px;height:390px;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  game?.stop()
  game = undefined
  mount.remove()
  vi.restoreAllMocks()
})

async function begin(): Promise<{ g: Game; frames: ManualFrames; pads: FakeGamepads }> {
  const content = await movesScreenContent()
  const frames = manualFrames()
  const pads = fakeGamepads()
  pads.connect(0)
  const g = await startGame({
    content,
    locale: await chosenLocale(content, 'ko'),
    mount,
    host: testHost(),
    frames,
    gamepads: pads.getGamepads,
    readPicture: paintedPictures(content),
  })
  game = g
  frames.at(0)
  run(frames, 60)
  return { g, frames, pads }
}

const run = (frames: ManualFrames, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}
const hero = (g: Game): { x: number; y: number; vx: number; vy: number } => {
  const found = g.sim.query(Player, Transform, Body)[0]
  if (found === undefined) throw new Error('no hero')
  return {
    x: found.get(Transform).x,
    y: found.get(Transform).y,
    vx: found.get(Body).vx,
    vy: found.get(Body).vy,
  }
}
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}

test('the stick walks the hero, and letting go stops it', async () => {
  const { g, frames, pads } = await begin()
  const from = hero(g).x
  pads.stick(1, 0)
  run(frames, 30)
  expect(hero(g).x).toBeGreaterThan(from + 2)
  pads.stick(0, 0)
  run(frames, 15)
  const stopped = hero(g).x
  run(frames, 20)
  expect(hero(g).x - stopped).toBeLessThan(0.1)
})

test('the bottom button jumps, and pressed again in the air, jumps again', async () => {
  const { g, frames, pads } = await begin()
  const ground = hero(g).y
  pads.press('south')
  frames.advance(FRAME)
  expect(hero(g).vy).toBeLessThan(-5)
  pads.release('south')
  run(frames, 25)
  expect(hero(g).y).toBeLessThan(ground - 0.5)
  pads.press('south')
  frames.advance(FRAME)
  expect(hero(g).vy).toBeLessThan(-8)
})

test.each(['west', 'r2'] as const)('the %s input dashes', async (input) => {
  const { g, frames, pads } = await begin()
  pads.stick(1, 0)
  run(frames, 10)
  const walking = hero(g).vx
  pads.press(input)
  run(frames, 3)
  expect(hero(g).vx).toBeGreaterThan(walking + 4)
})

test('at a keyboard, arrows walk, Space jumps and jumps again, and Shift dashes', async () => {
  const { g, frames } = await begin()
  const from = hero(g).x
  key('keydown', 'ArrowRight')
  run(frames, 30)
  expect(hero(g).x).toBeGreaterThan(from + 2)
  const walking = hero(g).vx
  key('keydown', 'ShiftLeft')
  run(frames, 3)
  expect(hero(g).vx).toBeGreaterThan(walking + 4)
  key('keyup', 'ShiftLeft')
  key('keyup', 'ArrowRight')
  run(frames, 60)
  key('keydown', 'Space')
  frames.advance(FRAME)
  expect(hero(g).vy).toBeLessThan(-5)
  key('keyup', 'Space')
  run(frames, 25)
  key('keydown', 'Space')
  frames.advance(FRAME)
  expect(hero(g).vy).toBeLessThan(-8)
  key('keyup', 'Space')
})

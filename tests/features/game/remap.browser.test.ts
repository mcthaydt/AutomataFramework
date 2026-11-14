// A player changes a key or a button while the game runs, and the game plays by the change; saved changes survive a
// restart, and saved changes that no longer fit the game are dropped, not fatal. Each in a real browser.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import type { Game } from '#src/features/game/game.ts'
import { heroOf, key, run, startCoop } from '../../fixtures/game/co-op-game.ts'

const SCREENS = [
  ['phone-390x844', 390, 844],
  ['tablet-820x1180', 820, 1180],
  ['phone-844x390', 844, 390],
  ['tablet-1180x820', 1180, 820],
  ['desktop-1280x720', 1280, 720],
] as const

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

for (const [name, w, h] of SCREENS) {
  test(`on ${name} a player changes the jump key and the hero jumps with it`, async () => {
    await page.viewport(w, h)
    const started = await startCoop(mount)
    game = started.game
    const { frames } = started
    run(frames, 60)
    const floor = heroOf(game, 1).y

    const capture = game.input.capture('keys')
    key('keydown', 'KeyK')
    expect(await capture.done).toEqual({ ok: true, input: 'KeyK' })
    expect(game.input.rebind('jump', 'keys', 'KeyK').ok).toBe(true)
    key('keyup', 'KeyK')
    run(frames, 2)

    key('keydown', 'KeyK')
    run(frames, 10)
    expect(heroOf(game, 1).y).toBeLessThan(floor - 0.2)
  })
}

test('a changed key is still the key after the game starts again from what was saved', async () => {
  const first = await startCoop(mount)
  first.game.input.rebind('jump', 'keys', 'KeyK')
  const saved = JSON.parse(JSON.stringify(first.game.input.settings()))
  first.game.stop()

  const second = await startCoop(mount, { settings: saved })
  game = second.game
  expect(game.input.controls().jump?.keys).toEqual(['KeyK'])
  run(second.frames, 60)
  const floor = heroOf(game, 1).y
  key('keydown', 'Space')
  run(second.frames, 10)
  expect(heroOf(game, 1).y).toBeCloseTo(floor, 1)
  key('keyup', 'Space')
  key('keydown', 'KeyK')
  run(second.frames, 10)
  expect(heroOf(game, 1).y).toBeLessThan(floor - 0.2)
})

test('a changed gamepad button is the one that jumps', async () => {
  const { game: g, frames, pads } = await startCoop(mount)
  game = g
  pads.connect(0)
  run(frames, 60)
  const floor = heroOf(g, 1).y

  const capture = g.input.capture('pad')
  run(frames, 2)
  pads.press('west', 0)
  run(frames, 2)
  expect(await capture.done).toEqual({ ok: true, input: 'west' })
  expect(g.input.rebind('jump', 'pad', 'west').ok).toBe(true)
  pads.release('west', 0)
  run(frames, 2)

  pads.press('south', 0)
  run(frames, 10)
  expect(heroOf(g, 1).y).toBeCloseTo(floor, 1)
  pads.release('south', 0)
  run(frames, 2)
  pads.press('west', 0)
  run(frames, 10)
  expect(heroOf(g, 1).y).toBeLessThan(floor - 0.2)
})

test('saved changes from another game are dropped and named, and the game still starts', async () => {
  const { game: g } = await startCoop(mount, {
    settings: { format: 1, bindings: { fly: { keys: ['KeyF'] } } },
  })
  game = g
  expect(g.input.dropped()).toEqual(['fly'])
  expect(g.input.controls().jump?.keys).toEqual(['Space', 'ArrowUp'])
})

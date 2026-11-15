// "Show me": `game.showFeel` plays one feel file on demand, playing or paused, in each real browser. It is presentation
// only: nothing reaches the sim, nothing is recorded, and a freeze it holds is the picture's alone.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { Player, type Replay } from '#src/features/commands/commands.ts'
import type { FeelFile } from '#src/features/content/content.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { type TestHost, testHost } from '#src/features/host/host.ts'
import { Body, Transform } from '#src/features/physics/physics.ts'
import { loadFeelGame } from '../../fixtures/feel/game.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { chosenLocale } from '../../fixtures/locale/chosen.ts'

const FRAME = 1000 / 60

let mount: HTMLDivElement
let game: Game | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden'
  document.body.append(mount)
  // A phone: the thumbs are on the page from the start.
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
})
afterEach(() => {
  game?.stop()
  game = undefined
  mount.remove()
  vi.restoreAllMocks()
})

/** A draft that is in no file of the game: eight specks, a shake and a buzz. */
const DRAFT: FeelFile = {
  format: 1,
  id: 'poof',
  on: 'x.y',
  dust: { count: 8, color: '#ffffff', speed: 2, life: 20 },
  shake: { strength: 0.3, ticks: 12 },
  buzz: { strength: 0.7, ticks: 6 },
}

interface Started {
  readonly g: Game
  readonly frames: ManualFrames
  readonly host: TestHost
}

async function begin(
  options: { readonly host?: TestHost; readonly players?: readonly number[] } = {},
): Promise<Started> {
  await page.viewport(390, 844)
  const content = await loadFeelGame()
  const frames = manualFrames()
  const host = options.host ?? testHost()
  const g = await startGame({
    content,
    locale: await chosenLocale(content, 'ko'),
    mount,
    host,
    frames,
    ...(options.players === undefined ? {} : { players: options.players }),
  })
  game = g
  frames.at(0)
  run(frames, 60)
  return { g, frames, host }
}

const run = (frames: ManualFrames, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}
const heroOf = (g: Game, number = 1): { sid: number; x: number; y: number } => {
  const found = g.sim.query(Player, Transform, Body).find((e) => e.get(Player).number === number)
  if (found === undefined) throw new Error(`no hero ${number}`)
  return { sid: found.sid, x: found.get(Transform).x, y: found.get(Transform).y }
}
const offset = (g: Game): number => Math.abs(g.feel().shake.x) + Math.abs(g.feel().shake.y)
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}

test('showFeel draws the burst at the first hero', async () => {
  const { g, frames } = await begin()
  g.showFeel(DRAFT)
  frames.advance(FRAME)
  const at = heroOf(g)
  expect(g.feel().specks).toHaveLength(8)
  for (const speck of g.feel().specks) {
    expect(Math.abs(speck.x - at.x)).toBeLessThan(0.6)
    expect(Math.abs(speck.y - (at.y + 0.5))).toBeLessThan(0.6)
  }
})

test('showFeel with a sid draws it at that thing', async () => {
  const { g, frames } = await begin({ players: [1, 2] })
  const two = heroOf(g, 2)
  g.showFeel(DRAFT, two.sid)
  frames.advance(FRAME)
  expect(g.feel().specks).toHaveLength(8)
  for (const speck of g.feel().specks) expect(Math.abs(speck.x - two.x)).toBeLessThan(0.6)
})

test('showFeel while paused draws the burst, moves it, and ends with the picture at rest', async () => {
  const { g, frames } = await begin()
  g.pause()
  g.showFeel(DRAFT)
  // The first still frame sets the clock and makes the burst; each one after moves it on.
  frames.advance(FRAME)
  expect(g.feel().specks).toHaveLength(8)
  const first = g.feel().specks.map((s) => `${s.x},${s.y}`)
  run(frames, 5)
  expect(g.feel().specks.map((s) => `${s.x},${s.y}`)).not.toEqual(first)
  run(frames, 40)
  expect(g.feel().specks).toHaveLength(0)
  expect(offset(g)).toBe(0)
  // The sim did not move while the picture did.
  const tick = g.sim.tick
  run(frames, 10)
  expect(g.sim.tick).toBe(tick)
})

test("showFeel takes a draft that is not in the game's content", async () => {
  const { g, frames } = await begin()
  expect(g.feel().specks).toHaveLength(0)
  const draft: FeelFile = {
    format: 1,
    id: 'only-in-the-editor',
    on: 'nothing.at.all',
    shake: { strength: 0.2, ticks: 6 },
  }
  g.showFeel(draft)
  let most = 0
  for (let i = 0; i < 6; i++) {
    frames.advance(FRAME)
    most = Math.max(most, offset(g))
  }
  expect(most).toBeGreaterThan(0)
})

test('a draft the schema refuses throws a RangeError that says what to write, and nothing is drawn', async () => {
  const { g, frames } = await begin()
  const refused: unknown[] = [
    { ...DRAFT, dust: { count: 10000, color: '#ffffff', speed: 2, life: 20 } },
    { ...DRAFT, dust: { count: Number.NaN, color: '#ffffff', speed: 2, life: 20 } },
    { format: 1, id: 'nothing', on: 'x.y' },
    { ...DRAFT, extra: true },
    null,
  ]
  for (const draft of refused) {
    expect(() => g.showFeel(draft as FeelFile), JSON.stringify(draft)).toThrow(RangeError)
    try {
      g.showFeel(draft as FeelFile)
    } catch (error) {
      expect((error as Error).message.length).toBeGreaterThan(10)
    }
  }
  run(frames, 3)
  expect(g.feel().specks).toHaveLength(0)
  expect(offset(g)).toBe(0)
})

test("showFeel's freeze holds the picture and the tick count goes on", async () => {
  const { g, frames } = await begin()
  g.showFeel({ format: 1, id: 'hold', on: 'x.y', freeze: { ticks: 6 } })
  frames.advance(FRAME)
  expect(g.feel().freeze).toBe(6)
  const tick = g.sim.tick
  run(frames, 3)
  expect(g.feel().freeze).toBe(3)
  // Offline a freeze of the game itself would have stopped the ticks; this one only holds what is drawn.
  expect(g.sim.tick).toBeGreaterThanOrEqual(tick + 3)
})

test('a recording made while showFeel runs is the same as one made without it', async () => {
  const play = async (show: boolean): Promise<Replay> => {
    game?.stop()
    const { g, frames } = await begin()
    key('keydown', 'ArrowRight')
    while (g.sim.tick < 120) {
      if (show && g.sim.tick % 20 === 0) g.showFeel(DRAFT)
      frames.advance(FRAME)
    }
    key('keyup', 'ArrowRight')
    run(frames, 20)
    return g.replay()
  }
  const plain = await play(false)
  const shown = await play(true)
  expect(shown.commands).toEqual(plain.commands)
  expect(shown.ticks).toBe(plain.ticks)
  expect(shown.finalHash).toBe(plain.finalHash)
})

test('with shake off, showFeel draws no shake', async () => {
  const { g, frames } = await begin()
  g.setShake(false)
  g.showFeel(DRAFT)
  let most = 0
  for (let i = 0; i < 12; i++) {
    frames.advance(FRAME)
    most = Math.max(most, offset(g))
  }
  expect(most).toBe(0)
  expect(g.feel().specks.length).toBeGreaterThan(0)
})

test('showFeel on touch buzzes once; on a keyboard it does not', async () => {
  const { g, frames, host } = await begin()
  const before = host.buzzes.length
  key('keydown', 'ArrowLeft')
  frames.advance(FRAME)
  key('keyup', 'ArrowLeft')
  g.showFeel(DRAFT)
  frames.advance(FRAME)
  expect(host.buzzes.length).toBe(before)
  // A thumb on the glass makes the player a touch player.
  const half = mount.querySelector<HTMLElement>('.automata-thumb-half[data-half="jump"]')
  if (half === null) throw new Error('no jump half')
  const box = half.getBoundingClientRect()
  const at = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 }
  const finger = (type: string): boolean =>
    half.dispatchEvent(
      new PointerEvent(type, { pointerId: 3, pointerType: 'touch', ...at, bubbles: true, cancelable: true }),
    )
  finger('pointerdown')
  frames.advance(FRAME)
  finger('pointerup')
  const mid = host.buzzes.length
  g.showFeel(DRAFT)
  frames.advance(FRAME)
  expect(host.buzzes.slice(mid)).toEqual([{ strength: 0.7, ms: 100 }])
})

test('showFeel at a thing that is not in the scene makes no dust, and its shake still happens', async () => {
  const { g, frames } = await begin()
  g.showFeel(DRAFT, 987654)
  let most = 0
  for (let i = 0; i < 6; i++) {
    frames.advance(FRAME)
    most = Math.max(most, offset(g))
  }
  expect(g.feel().specks).toHaveLength(0)
  expect(most).toBeGreaterThan(0)
})

test('a hidden page asks for no frames for a shown feel', async () => {
  const { g, frames, host } = await begin()
  g.pause()
  host.hide()
  g.showFeel(DRAFT)
  run(frames, 10)
  // Nothing drew it: the page is out of sight.
  expect(g.feel().specks).toHaveLength(0)
  host.show()
  run(frames, 3)
  expect(g.feel().specks.length).toBeGreaterThan(0)
})

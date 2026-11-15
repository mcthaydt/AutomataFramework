// A game played alone draws its feel, in each real browser: dust at the hero's feet on a landing, a shake on a jump that
// moves the level and not the controls, a freeze that holds the tick count and gives it back with no fast-forward, and
// a recording that is the same whatever the feel did. Frames are driven by hand; the page is a phone first.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { Player, verifyReplay } from '#src/features/commands/commands.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { type TestHost, testHost } from '#src/features/host/host.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { Body, Transform } from '#src/features/physics/physics.ts'
import { FREEZE_TICKS, LAND_BUZZ, loadFeelGame, withoutFeel } from '../../fixtures/feel/game.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
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

interface Started {
  readonly g: Game
  readonly frames: ManualFrames
  readonly host: TestHost
}

interface Begin {
  readonly host?: TestHost
  readonly players?: readonly number[]
  readonly size?: readonly [number, number]
}

/** The feel game on a screen of this size, with frames in hand and the page settled. */
async function begin(options: Begin = {}): Promise<Started> {
  const [w, h] = options.size ?? [390, 844]
  await page.viewport(w, h)
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
  // Long enough for any dust of the hero settling at the start to be gone.
  run(frames, 60)
  return { g, frames, host }
}

const run = (frames: ManualFrames, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}
/** Frames until `done`, at most `max`; says whether it came true. */
const until = (frames: ManualFrames, done: () => boolean, max = 300): boolean => {
  for (let i = 0; i < max && !done(); i++) frames.advance(FRAME)
  return done()
}
const hero = (g: Game, number = 1): { x: number; y: number } => {
  const found = g.sim.query(Player, Transform, Body).find((e) => e.get(Player).number === number)
  if (found === undefined) throw new Error(`no hero ${number}`)
  return { x: found.get(Transform).x, y: found.get(Transform).y }
}
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}
/** A tap on the jump key, one frame long. */
const tapJump = (frames: ManualFrames): void => {
  key('keydown', 'Space')
  frames.advance(FRAME)
  key('keyup', 'Space')
}
const offset = (g: Game): number => Math.abs(g.feel().shake.x) + Math.abs(g.feel().shake.y)
/** The biggest shake over `n` frames. */
const mostShake = (g: Game, frames: ManualFrames, n: number): number => {
  let most = offset(g)
  for (let i = 0; i < n; i++) {
    frames.advance(FRAME)
    most = Math.max(most, offset(g))
  }
  return most
}
/** The highest the hero gets over `n` frames: the smallest y, which points down. */
const apexOver = (g: Game, frames: ManualFrames, n: number): number => {
  let top = hero(g).y
  for (let i = 0; i < n; i++) {
    frames.advance(FRAME)
    top = Math.min(top, hero(g).y)
  }
  return top
}
/** Walks the first hero right until the spark is taken: the frame in which the freeze starts. */
const takeSpark = (g: Game, frames: ManualFrames): void => {
  key('keydown', 'ArrowRight')
  expect(until(frames, () => g.feel().freeze > 0)).toBe(true)
}
const half = (name: 'walk' | 'jump'): HTMLElement => {
  const found = mount.querySelector<HTMLElement>(`.automata-thumb-half[data-half="${name}"]`)
  if (found === null) throw new Error(`no ${name} half`)
  return found
}
const finger = (el: Element, type: string, id: number, x: number, y: number): void => {
  el.dispatchEvent(
    new PointerEvent(type, {
      pointerId: id,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    }),
  )
}

test('the hero lands and dust is drawn at its feet, and is gone after its life', async () => {
  const { g, frames } = await begin()
  expect(g.feel().specks).toHaveLength(0)
  tapJump(frames)
  expect(until(frames, () => g.feel().specks.length > 0)).toBe(true)
  const at = hero(g)
  // Six specks, the burst of the landing, at the bottom middle of the hero.
  expect(g.feel().specks).toHaveLength(6)
  for (const speck of g.feel().specks) {
    expect(Math.abs(speck.x - at.x)).toBeLessThan(0.6)
    expect(Math.abs(speck.y - (at.y + 0.5))).toBeLessThan(0.6)
  }
  // Eighteen ticks of life, and a few frames to spare.
  run(frames, 25)
  expect(g.feel().specks).toHaveLength(0)
})

test('a jump shakes the level and not the touch controls or the mount', async () => {
  const { g, frames } = await begin()
  const fixed = [mount, ...mount.querySelectorAll('canvas, .automata-thumb-half, .automata-touch-button')]
  const boxes = (): string[] => fixed.map((el) => JSON.stringify(el.getBoundingClientRect()))
  const before = boxes()
  expect(fixed.length).toBeGreaterThan(2)
  expect(offset(g)).toBe(0)
  key('keydown', 'Space')
  let most = 0
  for (let i = 0; i < 12; i++) {
    frames.advance(FRAME)
    most = Math.max(most, offset(g))
    expect(boxes()).toEqual(before)
  }
  key('keyup', 'Space')
  expect(most).toBeGreaterThan(0)
  // Twelve ticks of shake, and a few frames to spare.
  expect(until(frames, () => offset(g) === 0, 40)).toBe(true)
})

test('on a host that asked for less motion a jump draws no shake and a landing still draws dust', async () => {
  const { g, frames } = await begin({ host: testHost({ reducedMotion: true }) })
  key('keydown', 'Space')
  let most = 0
  let dust = 0
  for (let i = 0; i < 90; i++) {
    frames.advance(FRAME)
    most = Math.max(most, offset(g))
    dust = Math.max(dust, g.feel().specks.length)
    if (i === 3) key('keyup', 'Space')
  }
  expect(most).toBe(0)
  expect(dust).toBeGreaterThan(0)
})

test('on a host that asked for less motion, the saved choice to shake still wins', async () => {
  const content = await loadFeelGame()
  const frames = manualFrames()
  const g = await startGame({
    content,
    locale: await chosenLocale(content, 'ko'),
    mount,
    host: testHost({ reducedMotion: true }),
    frames,
    feelSettings: { format: 1, shake: true },
  })
  game = g
  frames.at(0)
  run(frames, 30)
  key('keydown', 'Space')
  expect(mostShake(g, frames, 12)).toBeGreaterThan(0)
  key('keyup', 'Space')
})

test('setShake(false) stops the shake; setShake(true) brings it back', async () => {
  const { g, frames } = await begin()
  g.setShake(false)
  key('keydown', 'Space')
  expect(mostShake(g, frames, 12)).toBe(0)
  key('keyup', 'Space')
  // Down again, and the dust of that landing was not the setting's to take away.
  expect(until(frames, () => g.feel().specks.length > 0)).toBe(true)
  run(frames, 40)
  g.setShake(true)
  key('keydown', 'Space')
  expect(mostShake(g, frames, 12)).toBeGreaterThan(0)
  key('keyup', 'Space')
})

test('taking the spark holds the tick count for six ticks, then it goes on one a frame', async () => {
  const { g, frames } = await begin()
  takeSpark(g, frames)
  expect(g.feel().freeze).toBe(FREEZE_TICKS)
  const held = g.sim.tick
  const where = hero(g).x
  for (let left = FREEZE_TICKS - 1; left >= 0; left--) {
    frames.advance(FRAME)
    expect(g.feel().freeze).toBe(left)
    expect(g.sim.tick).toBe(held)
  }
  expect(hero(g).x).toBe(where)
  run(frames, 3)
  // No fast-forward after the hold: a tick a frame, and none of the six owed.
  expect(g.sim.tick).toBe(held + 3)
})

test('a jump key pressed during the hold and still down when it ends jumps on the first step after it', async () => {
  const { g, frames } = await begin()
  takeSpark(g, frames)
  key('keyup', 'ArrowRight')
  const ground = hero(g).y
  frames.advance(FRAME)
  key('keydown', 'Space')
  expect(until(frames, () => g.feel().freeze === 0, 20)).toBe(true)
  const held = g.sim.tick
  expect(apexOver(g, frames, 12)).toBeLessThan(ground - 0.3)
  expect(g.sim.tick).toBeGreaterThan(held)
  key('keyup', 'Space')
})

test('a tap on the thumbs during the hold still jumps on the first step after it', async () => {
  const { g, frames } = await begin()
  takeSpark(g, frames)
  key('keyup', 'ArrowRight')
  const ground = hero(g).y
  const box = half('jump').getBoundingClientRect()
  const at = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  frames.advance(FRAME)
  finger(half('jump'), 'pointerdown', 7, at.x, at.y)
  finger(half('jump'), 'pointerup', 7, at.x, at.y)
  expect(g.feel().freeze).toBeGreaterThan(0)
  expect(until(frames, () => g.feel().freeze === 0, 20)).toBe(true)
  expect(apexOver(g, frames, 14)).toBeLessThan(ground - 0.2)
})

/** Walks into the spark, lets two ticks of the hold go by, and says where the tick count was. */
async function holdTwoTicks(started: Started): Promise<number> {
  takeSpark(started.g, started.frames)
  const held = started.g.sim.tick
  run(started.frames, 2)
  expect(started.g.feel().freeze).toBe(FREEZE_TICKS - 2)
  return held
}

test('pause during a hold keeps the rest: after resume the tick count waits out what was left', async () => {
  const started = await begin()
  const { g, frames } = started
  const held = await holdTwoTicks(started)
  g.pause()
  run(frames, 30)
  expect(g.feel().freeze).toBe(FREEZE_TICKS - 2)
  expect(g.sim.tick).toBe(held)
  g.resume()
  // One frame to set the clock and four that spend what was left.
  run(frames, 5)
  expect(g.feel().freeze).toBe(0)
  expect(g.sim.tick).toBe(held)
  run(frames, 3)
  expect(g.sim.tick).toBeGreaterThan(held)
  expect(g.sim.tick).toBeLessThanOrEqual(held + 3)
})

test('a page hidden during a hold and shown again does the same', async () => {
  const started = await begin()
  const { g, frames, host } = started
  const held = await holdTwoTicks(started)
  host.hide()
  run(frames, 30)
  expect(g.feel().freeze).toBe(FREEZE_TICKS - 2)
  host.show()
  run(frames, 5)
  expect(g.feel().freeze).toBe(0)
  expect(g.sim.tick).toBe(held)
  run(frames, 3)
  expect(g.sim.tick).toBeGreaterThan(held)
})

test('two heroes on one screen hold together', async () => {
  const { g, frames } = await begin({ players: [1, 2] })
  takeSpark(g, frames)
  const held = g.sim.tick
  const one = hero(g, 1)
  const two = hero(g, 2)
  run(frames, FREEZE_TICKS)
  expect(g.sim.tick).toBe(held)
  expect(hero(g, 1)).toEqual(one)
  expect(hero(g, 2)).toEqual(two)
  run(frames, 4)
  expect(g.sim.tick).toBeGreaterThan(held)
  expect(hero(g, 1).x).toBeGreaterThan(one.x)
})

test("a landing on touch buzzes the host once, with the file's strength", async () => {
  const { g, frames, host } = await begin()
  const before = host.buzzes.length
  // Touch is what the phone's thumbs are: a tap on the jump half makes the player a touch player.
  const box = half('jump').getBoundingClientRect()
  const at = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  finger(half('jump'), 'pointerdown', 8, at.x, at.y)
  frames.advance(FRAME)
  finger(half('jump'), 'pointerup', 8, at.x, at.y)
  expect(until(frames, () => g.feel().specks.length > 0)).toBe(true)
  expect(host.buzzes.slice(before)).toEqual([{ strength: LAND_BUZZ.strength, ms: 50 }])
})

/** The recording of a play that walks into the spark and goes on a while, and what a fresh sim makes of it. */
async function verified(g: Game): Promise<unknown> {
  const fresh = await createGameSim({ content: await loadFeelGame(), players: [1] })
  try {
    return verifyReplay(fresh, g.replay())
  } finally {
    fresh.dispose()
  }
}

test('a recording made across a freeze replays to the same hash in a headless sim', async () => {
  const { g, frames } = await begin()
  takeSpark(g, frames)
  run(frames, 40)
  tapJump(frames)
  run(frames, 60)
  expect(g.replay().ticks).toBeGreaterThan(60)
  expect(await verified(g)).toEqual({ ok: true })
})

/** A play told by ticks and not by frames, so a freeze stretching it over more frames changes nothing it says. */
async function playTicks(files: Readonly<Record<string, string | undefined>>): Promise<Game> {
  game?.stop()
  const content = await loadFeelGame(files)
  const frames = manualFrames()
  const g = await startGame({
    content,
    locale: await chosenLocale(content, 'ko'),
    mount,
    host: testHost(),
    frames,
  })
  game = g
  frames.at(0)
  key('keydown', 'ArrowRight')
  expect(until(frames, () => g.sim.tick >= 150)).toBe(true)
  tapJump(frames)
  expect(until(frames, () => g.sim.tick >= 240)).toBe(true)
  key('keyup', 'ArrowRight')
  return g
}

test('the same play with the three feel files taken out records the same commands and ends on the same hash', async () => {
  const withFeel = (await playTicks({})).replay()
  const bare = (await playTicks(withoutFeel())).replay()
  expect(withFeel.commands.length).toBeGreaterThan(0)
  expect(withFeel.ticks).toBe(bare.ticks)
  expect(withFeel.commands).toEqual(bare.commands)
  expect(withFeel.finalHash).toBe(bare.finalHash)
})

test.each(SCREENS)('at %s the dust never covers a touch control', async (_name, w, h) => {
  const { g, frames } = await begin({ size: [w, h] })
  tapJump(frames)
  expect(until(frames, () => g.feel().specks.length > 0)).toBe(true)
  const buttons = [...mount.querySelectorAll<HTMLElement>('.automata-touch-button')]
  expect(buttons.length).toBeGreaterThan(0)
  for (const button of buttons) {
    const box = button.getBoundingClientRect()
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    expect(top?.closest('.automata-touch-button')).toBe(button)
  }
})

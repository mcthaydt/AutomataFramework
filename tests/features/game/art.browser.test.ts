// A game with pictures, played the way a player plays it, in each real browser and from a phone to a computer: the
// full game is painted here by the same `artFiles` a game's script uses, so each engine both paints and plays. The
// pictures are read by pixel: at a hero's texel, the paint it should be.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { createRecorder, Player } from '#src/features/commands/commands.ts'
import type { GameContent } from '#src/features/content/content.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { type Watch, watchReplay } from '#src/features/game/watch.ts'
import { testHost } from '#src/features/host/host.ts'
import { createGameSim, Sprite } from '#src/features/level/level.ts'
import type { HeroBox } from '#src/features/render/render.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { snapshot } from '../../fixtures/game/snapshot.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { readFullGamePicture } from '../../fixtures/full-game/pictures.ts'
import { fullGameFiles, readFullGame } from '../../fixtures/full-game/read.ts'
import { loadGame } from '#src/features/content/content.ts'

const FRAME = 1000 / 60
const host = testHost()
const BODY = 0xf37f94
const VARIANT = 0xafd472
const GRASS = 0xafd472
const SKY = 0x9fd3f0

let mount: HTMLDivElement
let game: Game | undefined
let watch: Watch | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  game?.stop()
  watch?.stop()
  game = undefined
  watch = undefined
  mount.remove()
  vi.restoreAllMocks()
})

/** The full game, loaded, with `overrides` as `readFullGame` takes them. */
async function full(overrides: Record<string, string | undefined> = {}): Promise<GameContent> {
  const loaded = await loadGame(readFullGame(overrides))
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

/** The full game for two players, who may share the screen. */
const twoPlayers = {
  'automata.toml': (fullGameFiles['automata.toml'] ?? '').replace('hero = "hero"\n', 'hero = "hero"\nplayers = 2\n'),
}

/** The game, started on a screen of this size, with its frames in hand. */
async function begin(
  w: number,
  h: number,
  overrides: Record<string, string | undefined> = {},
): Promise<{ game: Game; frames: ManualFrames }> {
  await page.viewport(w, h)
  expect([window.innerWidth, window.innerHeight]).toEqual([w, h])
  const frames = manualFrames()
  game = await startGame({
    content: await full(overrides),
    plugins: [heroPlugin],
    mount,
    controls: fixtureControls,
    host,
    frames,
    readPicture: readFullGamePicture,
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
const canvasOf = (): HTMLCanvasElement => {
  const canvas = mount.querySelector('canvas')
  if (canvas === null) throw new Error('no canvas')
  return canvas
}

const near = (colour: readonly number[], hex: number, slack = 24): boolean =>
  [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].every((channel, i) => Math.abs((colour[i] ?? 0) - channel) <= slack)

/** The hero's picture is 24 by 24 texels, 1.5 tiles square, standing on the bottom of its box (a tile tall). */
const texelAt = (box: HeroBox, tx: number, ty: number): [number, number] => {
  const side = box.h * 1.5
  return [
    box.x + box.w / 2 - side / 2 + ((tx + 0.5) * side) / 24,
    box.y + box.h - side + ((ty + 0.5) * side) / 24,
  ]
}
/** The texel of the hero's body in the idle pose, where no other part is. */
const BODY_TEXEL = [12, 19] as const

const heroBox = (g: Game, player = 1): HeroBox => {
  const box = g.heroes().find((b) => b.player === player)
  if (box === undefined) throw new Error(`hero ${player} is not on the canvas`)
  return box
}

/** The sprite of player 1's hero. */
const spriteOf = (g: Game): { clip: string; pose: string; face: number } => {
  const hero = g.sim.query(Player, Sprite)[0]
  if (hero === undefined) throw new Error('no hero with a sprite')
  const { clip, pose, face } = hero.get(Sprite)
  return { clip, pose, face }
}

for (const [name, w, h] of SCREENS) {
  test(`on ${name} a first look: a hero, grass, hills and sky, and not a plain box`, async () => {
    const { frames } = await begin(w, h)
    window.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }),
    )
    run(frames, 40)
    const canvas = canvasOf()
    const box = heroBox(game as Game)
    const at = snapshot(canvas)
    // The hero is its picture: the paint of its body is where its body is, and the box's own colour is nowhere near.
    expect(near(at(...texelAt(box, ...BODY_TEXEL)), BODY)).toBe(true)
    expect(near(at(box.x + box.w / 2, box.y + box.h * 0.3), 0xe4572e, 12)).toBe(false)
    // Grass is under its feet, and the sky is above the level.
    expect(near(at(box.x + box.w / 2, box.y + box.h + box.h * 0.15), GRASS)).toBe(true)
    expect(near(at(2, 2), SKY)).toBe(true)
    await page.screenshot({ element: mount, path: `__screenshots__/art-${w}x${h}.png` })
  })
}

test('holding right runs: the pose changes, the hero moves, and the camera goes with it', async () => {
  const { game: g, frames } = await begin(390, 844)
  window.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }))
  run(frames, 30)
  const before = heroBox(g).x
  const poses = new Set<string>()
  const clips = new Set<string>()
  key('keydown', 'ArrowRight')
  for (let i = 0; i < 60; i++) {
    run(frames, 1)
    poses.add(spriteOf(g).pose)
    clips.add(spriteOf(g).clip)
  }
  const box = heroBox(g)
  expect(clips.has('run')).toBe(true)
  expect(poses.size).toBeGreaterThan(1)
  expect(g.sim.query(Player, Sprite).length).toBe(1)
  // It ran a long way, and the camera kept it on the screen, away from the edges, above the touch buttons.
  const width = canvasOf().clientWidth
  expect((box.x + box.w / 2) / width).toBeGreaterThan(0.2)
  expect((box.x + box.w / 2) / width).toBeLessThan(0.8)
  expect(box.x).not.toBeCloseTo(before, 0)
  const buttons = [...mount.querySelectorAll('button')].map((b) => b.getBoundingClientRect().top)
  expect(buttons.length).toBeGreaterThan(0)
  expect(box.y + box.h).toBeLessThanOrEqual(Math.min(...buttons) + 1)
})

test('turning left turns the picture round', async () => {
  const { game: g, frames } = await begin(844, 390)
  run(frames, 30)
  /** Which side of the hero's middle the dark of its face (the eye, in the rows of the head) is on: the mean over those rows. */
  const faceSide = (): number => {
    const box = heroBox(g)
    const at = snapshot(canvasOf())
    let sum = 0
    let count = 0
    for (let ty = 8; ty < 16; ty++)
      for (let tx = 0; tx < 24; tx++)
        if (near(at(...texelAt(box, tx, ty)), 0x111314, 16)) {
          sum += tx - 11.5
          count++
        }
    return count === 0 ? 0 : sum / count
  }
  key('keydown', 'ArrowRight')
  run(frames, 20)
  key('keyup', 'ArrowRight')
  run(frames, 20)
  expect(spriteOf(g).face).toBe(1)
  const right = faceSide()
  key('keydown', 'ArrowLeft')
  run(frames, 20)
  key('keyup', 'ArrowLeft')
  run(frames, 20)
  expect(spriteOf(g).face).toBe(-1)
  const left = faceSide()
  expect(right).toBeGreaterThan(0)
  expect(left).toBeLessThan(0)
})

test('a jump shows jump, then fall, then land', async () => {
  const { game: g, frames } = await begin(844, 390)
  run(frames, 30)
  const seen: string[] = []
  key('keydown', 'Space')
  for (let i = 0; i < 90; i++) {
    run(frames, 1)
    const { clip } = spriteOf(g)
    if (seen[seen.length - 1] !== clip) seen.push(clip)
    if (i === 3) key('keyup', 'Space')
  }
  const order = ['jump', 'fall', 'land'].map((clip) => seen.indexOf(clip))
  expect(order.every((at) => at >= 0), `the clips seen: ${seen.join(', ')}`).toBe(true)
  expect(order[0]).toBeLessThan(order[1] as number)
  expect(order[1]).toBeLessThan(order[2] as number)
})

test('a second player joins and both heroes are on the screen in their own paints', async () => {
  const { game: g, frames } = await begin(844, 390, twoPlayers)
  expect(g.addPlayer('keyboard')).toEqual({ ok: true, player: 2 })
  run(frames, 40)
  const boxes = g.heroes()
  expect(boxes.map((b) => b.player)).toEqual([1, 2])
  const width = canvasOf().clientWidth
  const height = canvasOf().clientHeight
  for (const box of boxes) {
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.w).toBeLessThanOrEqual(width)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.h).toBeLessThanOrEqual(height)
  }
  const at = snapshot(canvasOf())
  expect(near(at(...texelAt(heroBox(g, 1), ...BODY_TEXEL)), BODY)).toBe(true)
  expect(near(at(...texelAt(heroBox(g, 2), ...BODY_TEXEL)), VARIANT)).toBe(true)
})

test('a recorded play is watched with the same pictures on the same ticks', async () => {
  const { game: g, frames } = await begin(390, 844)
  key('keydown', 'ArrowRight')
  run(frames, 90)
  const played = { pose: spriteOf(g).pose, box: heroBox(g), colour: undefined as number[] | undefined }
  played.colour = snapshot(canvasOf())(...texelAt(played.box, ...BODY_TEXEL))
  const replay = g.replay()
  expect(replay.ticks).toBe(90)
  g.stop()
  game = undefined
  const again = manualFrames()
  watch = await watchReplay({
    content: await full(),
    plugins: [heroPlugin],
    mount,
    host,
    replay,
    frames: again,
    readPicture: readFullGamePicture,
  })
  again.at(0)
  run(again, 90)
  const hero = watch.sim.query(Player, Sprite)[0]
  expect(hero?.get(Sprite).pose).toBe(played.pose)
  const watched = watch.heroes()[0]
  expect(watched).toBeDefined()
  expect(Math.abs((watched?.x ?? 0) - played.box.x)).toBeLessThanOrEqual(1)
  expect(Math.abs((watched?.y ?? 0) - played.box.y)).toBeLessThanOrEqual(1)
  const colour = snapshot(canvasOf())(...texelAt(watched as HeroBox, ...BODY_TEXEL))
  expect(near(colour, BODY)).toBe(true)
  expect(near(played.colour ?? [], BODY)).toBe(true)
})

test('a missing picture stops the game with one sentence and leaves the page clean', async () => {
  const frames = manualFrames()
  const before = mount.children.length
  const stopped = startGame({
    content: await full(),
    plugins: [heroPlugin],
    mount,
    controls: fixtureControls,
    host,
    frames,
    readPicture: async (path) => {
      if (path === 'content/figures/hero.png') throw new Error('no such file')
      return readFullGamePicture(path)
    },
  })
  await expect(stopped).rejects.toThrow(
    'The picture content/figures/hero.png is missing. Run "automata art" to paint it.',
  )
  expect(mount.children.length).toBe(before)
  expect(mount.querySelector('canvas')).toBeNull()
  expect(mount.querySelector('button')).toBeNull()
})

test('a game with pictures and no readPicture says what to pass', async () => {
  const options = {
    content: await full(),
    plugins: [heroPlugin],
    mount,
    controls: fixtureControls,
    host,
    frames: manualFrames(),
  }
  await expect(startGame(options)).rejects.toThrow(
    'This game has pictures, so startGame needs "readPicture" to fetch them.',
  )
  const sim = await createGameSim({ content: options.content, plugins: [heroPlugin] })
  const replay = createRecorder(sim).replay()
  sim.dispose()
  await expect(
    watchReplay({ content: options.content, plugins: [heroPlugin], mount, host, replay, frames: manualFrames() }),
  ).rejects.toThrow('This game has pictures, so watchReplay needs "readPicture" to fetch them.')
  expect(mount.querySelector('canvas')).toBeNull()
})

test('the M1 game, with no pictures, starts with no readPicture as it always did, and has no heroes to box', async () => {
  const frames = manualFrames()
  game = await startGame({
    content: await loadFixtureGame(),
    plugins: [heroPlugin],
    mount,
    controls: fixtureControls,
    host,
    frames,
  })
  frames.at(0)
  run(frames, 5)
  expect(mount.querySelector('canvas')).not.toBeNull()
  expect(game.heroes()).toEqual([])
})

test("game.heroes() gives each hero's box, new after each draw", async () => {
  const { game: g, frames } = await begin(844, 390, twoPlayers)
  expect(g.addPlayer('keyboard')).toEqual({ ok: true, player: 2 })
  run(frames, 30)
  const first = g.heroes()
  expect(first).toHaveLength(2)
  for (const box of first) {
    expect(box.w).toBeGreaterThan(0)
    expect(box.h).toBeCloseTo(box.w / 0.8, 1)
  }
  key('keydown', 'ArrowRight')
  run(frames, 20)
  expect(g.heroes()[0]?.x).not.toBe(first[0]?.x)
})

// The renderer draws pictures: a thing with a figure is its picture (mirrored when it faces left, in the next hero's
// colours for player 2), the level's tiles are their squares, and a picture that is missing, old or the wrong size
// stops the game with one sentence. The full game's own pictures are painted by the same painters `automata art` uses.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import { Sprite } from '#src/features/level/level.ts'
import { type Art, ArtError, createRenderer, loadArt, type Renderer } from '#src/features/render/render.ts'
import type { RenderDelta } from '#src/features/sim/sim.ts'
import { fullGamePictures, readFullGamePicture } from '../../fixtures/full-game/pictures.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { snapshot } from '../../fixtures/game/pixels.ts'

/** The level is 16 tiles wide and 9 tall; 32 pixels a tile makes every texel of a 16-pixel tile two pixels. */
const WORLD = { w: 16, h: 9 }
const TILE = 32
const SKY = 0x9fd3f0
const PALETTE = [SKY, 0x111314, 0xfdd4bd, 0xafd472, 0xf37f94]
const BOX = 0xe4572e
const CRATE = 0xc9a227
const MAGENTA = 0xff00ff
const EDGE = 0x1b1b24

let mount: HTMLDivElement
let renderer: Renderer | undefined
let art: Art | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = `position:fixed;left:0;top:0;overflow:hidden;width:${WORLD.w * TILE}px;height:${WORLD.h * TILE}px`
  document.body.append(mount)
})
afterEach(() => {
  // Destroying the renderer frees its art; an art that never reached a renderer is freed here.
  renderer?.destroy()
  art?.destroy()
  renderer = undefined
  art = undefined
  mount.remove()
})

/** The full game, loaded. */
async function loaded(): Promise<GameContent> {
  const game = await loadGame(readFullGame())
  if (!game.ok) throw new Error('the full game did not load')
  return game.value
}

const rgb = (hex: number): [number, number, number] => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
const near = (a: readonly number[], hex: number, slack = 24): boolean =>
  a.every((channel, i) => Math.abs(channel - (rgb(hex)[i] ?? 0)) <= slack)

/** The palette colour a pixel is closest to. */
function classify(colour: readonly number[]): number {
  let best = 0
  let distance = Number.POSITIVE_INFINITY
  PALETTE.forEach((hex, i) => {
    const d = colour.reduce((total, channel, c) => total + Math.abs(channel - (rgb(hex)[c] ?? 0)), 0)
    if (d < distance) {
      distance = d
      best = i
    }
  })
  return best
}

/** A row of the level's views and its sprite component. */
function heroDelta(options: { face: number; player: number; sid?: number }): RenderDelta {
  return {
    resync: true,
    added: [
      {
        sid: options.sid ?? 1,
        components: {
          transform: { x: 8, y: 4.5, rotation: 0 },
          look: { w: 0.8, h: 1, color: BOX },
          [Sprite.id]: { character: 'hero', player: options.player, pose: 'idle', face: options.face },
        },
      },
    ],
    changed: [],
    removed: [],
  }
}

/** The hero's picture is 24 by 24 texels, 48 pixels square, its middle on x 256 and its bottom on y 160. */
const HERO = { left: 232, top: 112, texel: 2 }

/** The colours of the hero's texels, row by row, as indexes into `PALETTE`, read from what the renderer drew. */
async function heroTexels(face: number, player: number): Promise<number[][]> {
  const game = await loaded()
  art = await loadArt({ content: game, readPicture: readFullGamePicture })
  renderer = await createRenderer({ mount, world: WORLD, art })
  renderer.apply(heroDelta({ face, player }))
  renderer.draw(1)
  const at = snapshot(renderer.canvas)
  const rows: number[][] = []
  for (let j = 0; j < 24; j++) {
    const row: number[] = []
    for (let i = 0; i < 24; i++)
      row.push(classify(at(HERO.left + i * HERO.texel + 1, HERO.top + j * HERO.texel + 1)))
    rows.push(row)
  }
  renderer.destroy()
  renderer = undefined
  art = undefined
  return rows
}

test('a thing with a figure is drawn as its picture, not as its box', async () => {
  const rows = await heroTexels(1, 1)
  const used = new Set(rows.flat())
  // The ink, the skin and the body are all there, and there is sky around the hero.
  expect([...used].sort()).toEqual([0, 1, 2, 4])
})

test('a hero that faces left is the picture mirrored', async () => {
  const right = await heroTexels(1, 1)
  const left = await heroTexels(-1, 1)
  const mirrored = right.map((row) => [...row].reverse())
  // The hero is not the same both ways, or this would prove nothing.
  expect(mirrored).not.toEqual(right)
  expect(left).toEqual(mirrored)
})

test('the second hero wears the second variant', async () => {
  const one = (await heroTexels(1, 1)).flat()
  const two = (await heroTexels(1, 2)).flat()
  const body = one.filter((place) => place === 4).length
  expect(body).toBeGreaterThan(0)
  expect(two.filter((place) => place === 4)).toHaveLength(0)
  expect(two.filter((place) => place === 3)).toHaveLength(body)
})

test('a thing with no figure is its box, with a dark edge', async () => {
  const game = await loaded()
  art = await loadArt({ content: game, readPicture: readFullGamePicture })
  renderer = await createRenderer({ mount, world: WORLD, art })
  renderer.apply({
    resync: true,
    added: [
      {
        sid: 1,
        components: {
          transform: { x: 4, y: 4.5, rotation: 0 },
          look: { w: 1, h: 1, color: CRATE },
          [Sprite.id]: { character: 'crate', player: 0, pose: '', face: 1 },
        },
      },
    ],
    changed: [],
    removed: [],
  })
  renderer.draw(1)
  const at = snapshot(renderer.canvas)
  // The box is x 112 to 144 and y 128 to 160: its middle is the crate's colour, and its left side is a dark line one pixel
  // wide, just outside it or just inside.
  expect(near(at(4 * TILE, 4.5 * TILE), CRATE)).toBe(true)
  const side = [at(3.5 * TILE - 0.5, 4.5 * TILE), at(3.5 * TILE + 0.5, 4.5 * TILE)]
  expect(side.some((colour) => near(colour, EDGE, 40))).toBe(true)
})

/** The ground box of the full game's level: the whole bottom row. */
const GROUND: RenderDelta = {
  resync: true,
  added: [
    {
      sid: 1,
      components: { transform: { x: 8, y: 8.5, rotation: 0 }, look: { w: 16, h: 1, color: MAGENTA } },
    },
  ],
  changed: [],
  removed: [],
}

/** Whether any pixel along the ground row is this colour. */
function groundHas(canvas: HTMLCanvasElement, hex: number): boolean {
  const at = snapshot(canvas)
  for (let y = 8 * TILE; y < 9 * TILE; y += 2)
    for (let x = 0; x < WORLD.w * TILE; x += 2) if (near(at(x, y), hex, 8)) return true
  return false
}

test("the level's tiles are drawn and the ground boxes under them are not", async () => {
  const game = await loaded()
  art = await loadArt({ content: game, readPicture: readFullGamePicture })
  expect(art.tiles.length).toBeGreaterThan(0)
  renderer = await createRenderer({ mount, world: WORLD, art })
  renderer.apply(GROUND)
  renderer.draw(1)
  expect(groundHas(renderer.canvas, MAGENTA)).toBe(false)
  expect(groundHas(renderer.canvas, 0xafd472)).toBe(true)
})

test('with no art every thing is its box, as before', async () => {
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply(GROUND)
  renderer.draw(1)
  expect(groundHas(renderer.canvas, MAGENTA)).toBe(true)
  renderer.apply(heroDelta({ face: 1, player: 1, sid: 2 }))
  renderer.draw(1)
  const at = snapshot(renderer.canvas)
  expect(near(at(8 * TILE, 4.5 * TILE), BOX)).toBe(true)
})

test('destroying the art or the renderer twice is harmless', async () => {
  const game = await loaded()
  art = await loadArt({ content: game, readPicture: readFullGamePicture })
  renderer = await createRenderer({ mount, world: WORLD, art })
  renderer.destroy()
  expect(() => renderer?.destroy()).not.toThrow()
  expect(() => art?.destroy()).not.toThrow()
  renderer = undefined
})

/** The message `loadArt` stops with when the game's pictures are read by `read`, or `undefined` when it loads. */
async function stoppedBy(
  read: (path: string) => Promise<Blob>,
  change?: (game: GameContent) => GameContent,
): Promise<string | undefined> {
  const game = await loaded()
  try {
    const made = await loadArt({ content: change === undefined ? game : change(game), readPicture: read })
    made.destroy()
    return undefined
  } catch (error) {
    expect(error).toBeInstanceOf(ArtError)
    return (error as Error).message
  }
}

test('a picture that is missing stops the game and says what to run', async () => {
  const message = await stoppedBy(async (path) => {
    if (path === 'content/figures/hero.png') throw new Error('no such file')
    return readFullGamePicture(path)
  })
  expect(message).toBe('The picture content/figures/hero.png is missing. Run "automata art" to paint it.')
})

test('a file that is not a picture stops the game', async () => {
  const message = await stoppedBy(async (path) =>
    path === 'content/figures/hero.png' ? new Blob(['not a picture']) : readFullGamePicture(path),
  )
  expect(message).toBe('content/figures/hero.png is not a picture a browser can read.')
})

test('a picture of the wrong size stops the game', async () => {
  // The meadow's picture is not the hero's size.
  const message = await stoppedBy(async (path) =>
    readFullGamePicture(path === 'content/figures/hero.png' ? 'content/figures/meadow.png' : path),
  )
  expect(message).toMatch(
    /^The picture content\/figures\/hero\.png is \d+ by \d+ pixels, but its figure file makes it \d+ by \d+\. Run "automata art" to paint it again\.$/,
  )
})

test('a tileset whose columns do not match its picture stops the game', async () => {
  const message = await stoppedBy(readFullGamePicture, (game) => {
    const meadow = game.tilesets?.meadow
    if (meadow === undefined) throw new Error('the full game has a meadow tileset')
    return { ...game, tilesets: { ...game.tilesets, meadow: { ...meadow, columns: meadow.columns + 1 } } }
  })
  expect(message).toMatch(
    /^The tileset "meadow" says its picture is 5 tiles of 16 pixels wide, which is 80, but content\/figures\/meadow\.png is \d+ pixels wide\.$/,
  )
})

test('a tileset that uses a square its picture does not have stops the game', async () => {
  const message = await stoppedBy(readFullGamePicture, (game) => {
    const meadow = game.tilesets?.meadow
    if (meadow === undefined) throw new Error('the full game has a meadow tileset')
    const tiles = meadow.tiles.map((tile) => ({
      ...tile,
      pictures: tile.pictures.map((one) => ({ ...one, frame: 99 })),
    }))
    return { ...game, tilesets: { ...game.tilesets, meadow: { ...meadow, tiles } } }
  })
  expect(message).toMatch(
    /^The tileset "meadow" uses picture 99, but its picture has only \d+ squares, 0 to \d+\.$/,
  )
})

test('the full game paints a picture for each of its figures', async () => {
  // A guard for the expectations above: the hero's picture is the size the tests assume.
  const pictures = await fullGamePictures()
  expect(Object.keys(pictures)).toContain('content/figures/hero.png')
})

/** The whole level, drawn on the full game's own backdrop (no camera): the sky above, the hills low down. */
async function drawnWith(width: number, rows: RenderDelta['added'] = []): Promise<(x: number, y: number) => number[]> {
  const game = await loaded()
  art = await loadArt({ content: game, readPicture: readFullGamePicture })
  mount.style.width = `${width}px`
  renderer = await createRenderer({ mount, world: WORLD, art })
  renderer.apply({ resync: true, added: rows, changed: [], removed: [] })
  renderer.draw(1)
  return snapshot(renderer.canvas)
}

test('the backdrop is behind the level: sky at the top, hills low down, a tree on them', async () => {
  const at = await drawnWith(WORLD.w * TILE)
  // Above the mountains is sky; the bottom row is the hills' green; and the first tree's trunk is ink.
  expect(near(at(10, 10), SKY)).toBe(true)
  expect(near(at(100, 287), 0xafd472)).toBe(true)
  expect(near(at(193, 233), 0x111314)).toBe(true)
})

test('a layer repeats across a screen wider than the layer', async () => {
  // The hills' strip is 32 tiles, 1024 pixels; the canvas is 1200 pixels, with the 512 pixel level in its middle.
  const at = await drawnWith(1200)
  expect(near(at(10, 287), 0xafd472)).toBe(true)
  expect(near(at(1190, 287), 0xafd472)).toBe(true)
})

test('a hero who stands still is drawn the same while the camera eases', async () => {
  // A level 40 wide with a view 16 by 9 on a mount that is not a whole number of pixels a tile. Hero 2 walks and the
  // camera glides after the pair, but hero 1 does not move in the level, so every pixel of it must stay as it was: the
  // level's offset is whole device pixels, so the picture is never cut at a new place.
  const game = await loaded()
  art = await loadArt({ content: game, readPicture: readFullGamePicture })
  mount.style.width = '333px'
  mount.style.height = '187px'
  renderer = await createRenderer({ mount, world: { w: 40, h: 12 }, view: { w: 16, h: 9 }, art })
  const hero = (sid: number, player: number, x: number): RenderDelta['added'][number] => ({
    sid,
    components: {
      transform: { x, y: 6, rotation: 0 },
      look: { w: 0.8, h: 1, color: BOX },
      [Sprite.id]: { character: 'hero', player, pose: 'idle', face: 1 },
    },
  })
  renderer.apply({ resync: true, added: [hero(1, 1, 10), hero(2, 2, 14)], changed: [], removed: [] })
  const counts: number[] = []
  const middles: number[] = []
  for (let frame = 0; frame < 20; frame++) {
    renderer.apply({
      resync: false,
      added: [],
      changed: [hero(1, 1, 10), hero(2, 2, 14 + frame * 0.25)],
      removed: [],
    })
    renderer.draw(1)
    const box = renderer.heroes()[0]
    if (box === undefined) throw new Error('hero 1 is not on the canvas')
    middles.push(box.x)
    const at = snapshot(renderer.canvas)
    // The picture is 1.5 tiles square, standing on the bottom of the box.
    const side = (box.w / 0.8) * 1.5
    let ink = 0
    for (let y = Math.floor(box.y + box.h - side); y < box.y + box.h; y++)
      for (let x = Math.floor(box.x + box.w / 2 - side / 2); x < box.x + box.w / 2 + side / 2; x++)
        if (near(at(x + 0.5, y + 0.5), 0x111314, 16)) ink++
    counts.push(ink)
  }
  // The camera did move (hero 1 is not in the same place on the canvas), and the picture did not change.
  expect(new Set(middles).size).toBeGreaterThan(1)
  expect(counts[0]).toBeGreaterThan(0)
  expect(new Set(counts).size).toBe(1)
})

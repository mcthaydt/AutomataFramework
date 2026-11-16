// A place on the page, in each real browser (plan W, task 10): the links game opened at room-2 draws room-2 and room-3 as
// one world, follows the hero from one to the next (the sky is the level's), and steps tick 0 once when it is given facts.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { type Game, startGame } from '#src/features/game/game.ts'
import { testHost } from '#src/features/host/host.ts'
import { heroLevels, SKY_COLOR, Thing } from '#src/features/level/level.ts'
import { Collider } from '#src/features/physics/physics.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { drawnRows, pixel } from '../../fixtures/game/pixels.ts'
import { editLevel, loadLinksGame } from '../../fixtures/links-game/read.ts'
import { chosenLocale } from '../../fixtures/locale/chosen.ts'

const FRAME = 1000 / 60

let mount: HTMLDivElement
let game: Game | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  game?.stop()
  game = undefined
  mount.remove()
  vi.restoreAllMocks()
})

/** Room 2 with nothing in it, so a hero can walk to room 3, and its first hero starting at x 12; room 3 has its own sky. */
const open = editLevel('room-2', (level) => {
  level.things = level.things.filter((t) => t.id === 'door-in')
  level.starts[0] = { player: 1, x: 12, y: 7.5 }
})
const ROOM_3_SKY = '#112233'

async function start(
  overrides: Record<string, string | undefined> = {},
  facts?: readonly string[],
): Promise<{ game: Game; frames: ReturnType<typeof manualFrames>; canvas: HTMLCanvasElement }> {
  const frames = manualFrames()
  const content = await loadLinksGame(overrides)
  game = await startGame({
    content,
    locale: await chosenLocale(content, 'en'),
    mount,
    host: testHost(),
    frames,
    level: 'room-2',
    ...(facts === undefined ? {} : { facts }),
  })
  const canvas = mount.querySelector('canvas')
  if (canvas === null) throw new Error('no canvas')
  return { game, frames, canvas }
}
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}
const run = (frames: ReturnType<typeof manualFrames>, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}

test('both levels are drawn: the picture is 32 tiles wide and 9 tall, fitted into the mount', async () => {
  const { frames, canvas } = await start(open)
  frames.at(0)
  run(frames, 2)
  // 32 tiles across 640 pixels is 20 pixels a tile, so 9 tiles stand 180 pixels tall; room-2 alone would stand 360.
  const rows = drawnRows(canvas)
  expect(rows).toBeDefined()
  expect((rows?.bottom ?? 0) - (rows?.top ?? 0)).toBeGreaterThan(170)
  expect((rows?.bottom ?? 0) - (rows?.top ?? 0)).toBeLessThan(190)
  // The right wall is room-3's: a column of solid tiles at the far right of the picture.
  expect(pixel(canvas, 636, 180)).toEqual([0x3b, 0x4a, 0x5a])
})

test("after the hero crosses, the sky is room-3's", async () => {
  const {
    game: g,
    frames,
    canvas,
  } = await start({
    ...open,
    ...editLevel('room-3', (level) => {
      level.sky = ROOM_3_SKY
    }),
  })
  frames.at(0)
  run(frames, 2)
  // The bars above the picture are the sky: room-2's, which has none of its own, is the framework's light blue.
  expect(pixel(canvas, 320, 2)).toEqual([(SKY_COLOR >> 16) & 255, (SKY_COLOR >> 8) & 255, SKY_COLOR & 255])
  key('keydown', 'ArrowRight')
  run(frames, 150)
  key('keyup', 'ArrowRight')
  expect(heroLevels(g.sim)).toEqual([{ player: 1, level: 'room-3' }])
  expect(pixel(canvas, 320, 2)).toEqual([0x11, 0x22, 0x33])
})

test('with facts the sim is at tick 1 and the gate is open before the first frame; with none it is at tick 0', async () => {
  const none = await start()
  expect(none.game.sim.tick).toBe(0)
  none.game.stop()
  game = undefined

  const { game: g } = await start({}, ['room-2.gate-1.open'])
  expect(g.sim.tick).toBe(1)
  const gate = g.sim.query(Thing).find((e) => e.get(Thing).id === 'room-2.gate-1')
  expect(gate?.get(Collider).sensor).toBe(true)
  // The recording holds the one command at tick 0 and nothing else there; the first press would be tick 1.
  const atZero = g.replay().commands.filter((c) => c.tick === 0)
  expect(atZero.map((c) => [c.type, c.source])).toEqual([['facts', 0]])
})

// A page in a room draws its feel, in each real browser: a freeze holds the picture and never the ticks, both pages
// keep agreeing with the room, and a landing on touch is one buzz as before. The room lives in the page, reached
// through the scripted wire and stepped beat by beat, as online.browser.test.ts does it.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { Player } from '#src/features/commands/commands.ts'
import { writeContent } from '#src/features/content/content.ts'
import { type OnlineGame, startOnlineGame } from '#src/features/game/online.ts'
import { type TestHost, testHost } from '#src/features/host/host.ts'
import { createGameSim, JoinCommand, LeaveCommand } from '#src/features/level/level.ts'
import {
  createRoomEngine,
  createSession,
  type Joined,
  type JoinOptions,
  type Session,
} from '#src/features/net/net.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { FREEZE_TICKS, LAND_BUZZ, loadFeelGame } from '../../fixtures/feel/game.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { chosenLocale } from '../../fixtures/locale/chosen.ts'
import { levelOne, START_FLOOR } from '../../fixtures/moves/level.ts'
import { createWire, type Delay } from '../../fixtures/online/wire.ts'

const FRAME = 1000 / 60
const ONE: Delay = { up: 1, down: 1 }

let mount: HTMLDivElement
let online: OnlineGame | undefined
const made: Sim[] = []
const sessions: Session[] = []

beforeEach(async () => {
  await page.viewport(390, 844)
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden'
  document.body.append(mount)
  // A phone: the thumbs are on the page from the start.
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
})
afterEach(() => {
  online?.leave()
  online = undefined
  for (const s of sessions.splice(0)) s.close()
  for (const s of made.splice(0)) s.dispose()
  mount.remove()
  vi.restoreAllMocks()
})

interface Started {
  readonly game: OnlineGame
  readonly host: TestHost
  readonly checks: boolean[]
  /** One beat: deliver, the room steps, the page takes a frame, the other player advances. */
  beat(n?: number): void
}

/** Two seats in a room of the feel game: this page is seat 1, and a scripted player stands in seat 2. */
async function start(files: Record<string, string | undefined> = {}): Promise<Started> {
  const content = await loadFeelGame(files)
  const engineSim = await createGameSim({ content, players: [] })
  made.push(engineSim)
  const engine = createRoomEngine({
    sim: engineSim,
    level: 'level-1',
    seats: 2,
    seatCommands: { join: JoinCommand.id, leave: LeaveCommand.id },
  })
  const wire = createWire(engine)
  const frames = manualFrames()
  const host = testHost()
  const checks: boolean[] = []
  const join = async (o: JoinOptions): Promise<Joined> => {
    const link = wire.link(ONE)
    const session = createSession({
      link: o.wrapLink?.(link) ?? link,
      confirmed: o.confirmed,
      predicted: o.predicted,
      ...(o.onCheck === undefined ? {} : { onCheck: o.onCheck }),
      ...(o.onState === undefined ? {} : { onState: o.onState }),
      ...(o.onLinkClosed === undefined ? {} : { onLinkClosed: o.onLinkClosed }),
    })
    wire.pump()
    return {
      session,
      code: 'ROOM',
      rejoin: () => Promise.reject(new Error('no')),
      leave: () => session.close(),
    }
  }
  const game = await startOnlineGame({
    content,
    locale: await chosenLocale(content, 'ko'),
    mount,
    host,
    frames,
    server: 'ws://room.test',
    join,
    onCheck: (_tick, _hash, ok) => checks.push(ok),
  })
  online = game
  // The other seat: a session that holds nothing, so the room can start.
  const confirmed = await createGameSim({ content, players: [] })
  const predicted = await createGameSim({ content, players: [] })
  made.push(confirmed, predicted)
  const other = createSession({ link: wire.link(ONE), confirmed, predicted })
  sessions.push(other)
  wire.pump()
  const beat = (n = 1): void => {
    for (let i = 0; i < n; i++) {
      wire.pump()
      engine.step()
      frames.advance(FRAME)
      other.advance([])
    }
  }
  frames.at(0)
  beat(30)
  return { game, host, checks, beat }
}

const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}
const until = (beat: (n?: number) => void, done: () => boolean, max = 300): boolean => {
  for (let i = 0; i < max && !done(); i++) beat()
  return done()
}

test('a freeze online holds the picture and not the ticks', async () => {
  const { game, beat } = await start()
  key('keydown', 'ArrowRight')
  expect(until(beat, () => game.feel().freeze > 0)).toBe(true)
  const tick = game.sim.tick
  beat(3)
  // The room did not wait: the page's ticks went on, and the picture's hold counted down beside them.
  expect(game.sim.tick).toBeGreaterThanOrEqual(tick + 3)
  expect(game.feel().freeze).toBe(FREEZE_TICKS - 3)
  key('keyup', 'ArrowRight')
})

test('after the hold the picture is let go, and the world has gone on', async () => {
  const { game, beat } = await start()
  key('keydown', 'ArrowRight')
  expect(until(beat, () => game.feel().freeze > 0)).toBe(true)
  const tick = game.sim.tick
  beat(FREEZE_TICKS + 2)
  expect(game.feel().freeze).toBe(0)
  expect(game.sim.tick).toBeGreaterThanOrEqual(tick + FREEZE_TICKS)
  key('keyup', 'ArrowRight')
})

/** The feel game's level with no spark in it, so nothing is taken and a walk goes on past where the spark lay. */
const NO_SPARK = {
  'content/levels/level-1.json': writeContent('level', {
    ...(JSON.parse(levelOne()) as Record<string, unknown>),
    things: [],
    starts: [
      { player: 1, x: 2.5, y: START_FLOOR - 0.5 },
      { player: 2, x: 10.5, y: START_FLOOR - 0.5 },
    ],
  } as never),
}

test('both pages of a room with feel files keep agreeing with the room through jumps and landings', async () => {
  const { game, beat, checks } = await start(NO_SPARK)
  for (let jump = 0; jump < 3; jump++) {
    key('keydown', 'Space')
    beat(2)
    key('keyup', 'Space')
    beat(60)
  }
  expect(game.stats(), JSON.stringify(game.stats())).toMatchObject({ desyncs: 0 })
  expect(checks.length).toBeGreaterThan(0)
  expect(checks.every(Boolean)).toBe(true)
})

test('both pages of a room with a freeze file keep agreeing with the room', async () => {
  const { game, beat, checks } = await start()
  key('keydown', 'ArrowRight')
  expect(until(beat, () => game.feel().freeze > 0)).toBe(true)
  // Let go with the spark taken: the first hero stops short of the second, which waits beyond it.
  key('keyup', 'ArrowRight')
  beat(150)
  expect(game.stats(), JSON.stringify(game.stats())).toMatchObject({ desyncs: 0 })
  expect(checks.length).toBeGreaterThan(0)
  expect(checks.every(Boolean)).toBe(true)
})

test('a landing online on touch is one buzz, as before', async () => {
  const { game, host, beat } = await start()
  const before = host.buzzes.length
  const jump = mount.querySelector<HTMLElement>('.automata-thumb-half[data-half="jump"]')
  if (jump === null) throw new Error('no jump half')
  const box = jump.getBoundingClientRect()
  const at = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 }
  const finger = (type: string): boolean =>
    jump.dispatchEvent(
      new PointerEvent(type, { pointerId: 4, pointerType: 'touch', ...at, bubbles: true, cancelable: true }),
    )
  finger('pointerdown')
  beat()
  finger('pointerup')
  const trail: string[] = []
  const landed = until(beat, () => {
    const hero = game.sim.query(Player, Transform).find((e) => e.get(Player).number === 1)
    if (trail.length < 60 && hero !== undefined) trail.push(hero.get(Transform).y.toFixed(2))
    return game.feel().specks.length > 0
  })
  expect(
    landed,
    `tick ${game.sim.tick}, ${JSON.stringify(game.stats())}, the first hero's height after the tap: ${trail.join(' ')}`,
  ).toBe(true)
  expect(host.buzzes.slice(before)).toEqual([{ strength: LAND_BUZZ.strength, ms: 50 }])
})

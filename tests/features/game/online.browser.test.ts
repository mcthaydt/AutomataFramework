// A page in a room, in each real browser: `startOnlineGame` with a room that lives in the page, reached through the
// scripted wire and stepped beat by beat by the test. A beat is `wire.pump()`, then the room steps, then the page's
// frame and the other player's `advance`, which is the order the net tests use.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { Player } from '#src/features/commands/commands.ts'
import { type OnlineGame, startOnlineGame } from '#src/features/game/online.ts'
import type { Host } from '#src/features/host/host.ts'
import {
  type ClientMessage,
  createRoomEngine,
  createSession,
  type Joined,
  type JoinOptions,
  type joinSession,
  type Link,
  OnlineError,
  type OnlineStatus,
  type RoomEngine,
  type Session,
} from '#src/features/net/net.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { loadOnlineGame, onlineSim } from '../../fixtures/online/game.ts'
import { createWire, type Delay, type Wire } from '../../fixtures/online/wire.ts'

const FRAME = 1000 / 60
const ONE: Delay = { up: 1, down: 1 }

let mount: HTMLDivElement
let online: OnlineGame | undefined
const made: Sim[] = []
const sessions: Session[] = []

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  online?.leave()
  online = undefined
  for (const s of sessions.splice(0)) s.close()
  for (const s of made.splice(0)) s.dispose()
  mount.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function fakeHost(): Host & { hide(): void; show(): void } {
  let visible = true
  const listeners = new Set<(visible: boolean) => void>()
  const set = (next: boolean): void => {
    visible = next
    for (const l of listeners) l(next)
  }
  return {
    target: 'web',
    visible: () => visible,
    onVisibility(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    hide: () => set(false),
    show: () => set(true),
  }
}

interface Scripted {
  readonly session: Session
  hold(...actions: string[]): void
}

interface Setup {
  readonly engine: RoomEngine
  readonly engineSim: Sim
  readonly wire: Wire
  readonly frames: ReturnType<typeof manualFrames>
  readonly host: ReturnType<typeof fakeHost>
  readonly statuses: OnlineStatus[]
  readonly sent: ClientMessage[]
  /** The room's own copy of the page's join: a line on the wire, a session on it, and the room's answer delivered. */
  readonly join: typeof joinSession
  /** Another player, scripted, who joins the same room. */
  other(): Promise<Scripted>
  /** One beat: deliver, the room steps, the page takes a frame, the other players advance. */
  beat(n?: number): void
}

async function room(): Promise<Setup> {
  const engineSim = await onlineSim(2)
  made.push(engineSim)
  const engine = createRoomEngine({ sim: engineSim, level: 'level-1', seats: 2 })
  const wire = createWire(engine)
  const frames = manualFrames()
  const host = fakeHost()
  const statuses: OnlineStatus[] = []
  const sent: ClientMessage[] = []
  const others: { session: Session; pending: { type: string; payload: unknown }[] }[] = []
  const join = async (o: JoinOptions): Promise<Joined> => {
    const inner = wire.link(ONE)
    const link: Link = {
      ...inner,
      send: (m) => {
        sent.push(m)
        inner.send(m)
      },
      listen: (h) => inner.listen(h),
    }
    const session = createSession({
      link: o.wrapLink?.(link) ?? link,
      confirmed: o.confirmed,
      predicted: o.predicted,
      ...(o.onCheck === undefined ? {} : { onCheck: o.onCheck }),
      ...(o.onState === undefined ? {} : { onState: o.onState }),
      ...(o.onLinkClosed === undefined ? {} : { onLinkClosed: o.onLinkClosed }),
    })
    // The room's `seat` and `waiting` arrive.
    wire.pump()
    return {
      session,
      code: 'ROOM',
      rejoin: () => Promise.reject(new Error('no')),
      leave: () => session.close(),
    }
  }
  const setup: Setup = {
    engine,
    engineSim,
    wire,
    frames,
    host,
    statuses,
    sent,
    join,
    async other() {
      const confirmed = await onlineSim(2)
      const predicted = await onlineSim(2)
      made.push(confirmed, predicted)
      const session = createSession({ link: wire.link(ONE), confirmed, predicted })
      sessions.push(session)
      const pending: { type: string; payload: unknown }[] = []
      others.push({ session, pending })
      wire.pump()
      return {
        session,
        hold: (...actions) => pending.push({ type: 'controls', payload: { held: actions } }),
      }
    },
    beat(n = 1) {
      for (let i = 0; i < n; i++) {
        wire.pump()
        engine.step()
        frames.advance(FRAME)
        for (const o of others) o.session.advance(o.pending.splice(0))
      }
    },
  }
  return setup
}

async function start(s: Setup, extra: { join?: typeof joinSession } = {}): Promise<OnlineGame> {
  online = await startOnlineGame({
    content: await loadOnlineGame(),
    plugins: [heroPlugin],
    mount,
    controls: fixtureControls,
    host: s.host,
    frames: s.frames,
    server: 'ws://room.test',
    join: extra.join ?? s.join,
    onStatus: (status) => s.statuses.push(status),
    wrapLink: (link) => link,
  })
  return online
}

const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}
const x = (sim: Sim, n: number): number =>
  sim
    .query(Player, Transform)
    .find((e) => e.get(Player).number === n)
    ?.get(Transform).x ?? Number.NaN

test('waiting, then playing when the second player is in; the picture is on the page', async () => {
  const s = await room()
  const game = await start(s)
  expect(game.code).toBe('ROOM')
  expect(game.seat).toBe(1)
  expect(mount.querySelector('canvas')).not.toBeNull()
  expect(s.statuses).toEqual([{ state: 'waiting', code: 'ROOM', missing: 1 }])
  expect(game.status()).toEqual({ state: 'waiting', code: 'ROOM', missing: 1 })
  await s.other()
  s.beat(3)
  expect(s.statuses.at(-1)).toEqual({ state: 'playing', away: [] })
  expect(game.status()).toEqual({ state: 'playing', away: [] })
})

test('the other player moves on my screen', async () => {
  const s = await room()
  const game = await start(s)
  const two = await s.other()
  s.beat(5)
  const before = x(game.sim, 2)
  expect(before).toBeCloseTo(13.5, 1)
  two.hold('right')
  s.beat(60)
  expect(x(game.sim, 2)).toBeGreaterThan(before + 1)
})

test('my key moves me before the room answers', async () => {
  const s = await room()
  const game = await start(s)
  await s.other()
  s.beat(5)
  const before = x(game.sim, 1)
  const room1 = x(s.engineSim, 1)
  key('keydown', 'ArrowRight')
  // One beat: the page's frame sends the command and has predicted it, and the command has not reached the room yet.
  s.beat()
  expect(x(game.sim, 1)).toBeGreaterThan(before)
  expect(x(s.engineSim, 1)).toBe(room1)
  key('keyup', 'ArrowRight')
})

test('hiding the page lets go, so the room does not run my hero on for everyone else', async () => {
  const s = await room()
  const game = await start(s)
  const two = await s.other()
  s.beat(5)
  key('keydown', 'ArrowRight')
  s.beat(20)
  expect(x(two.session.sim, 1)).toBeGreaterThan(x(game.sim, 1) - 5)
  const moving = x(two.session.sim, 1)
  s.host.hide()
  s.beat(20)
  const letGo = s.sent.filter((m) => m.t === 'cmd' && m.type === 'controls').at(-1)
  expect(letGo).toMatchObject({ t: 'cmd', type: 'controls', payload: { held: [] } })
  // The other player sees the hero stop: it stays where it was a few ticks later.
  const stopped = x(two.session.sim, 1)
  expect(stopped).toBeGreaterThan(moving)
  s.beat(30)
  expect(x(two.session.sim, 1)).toBe(stopped)
  s.host.show()
  key('keyup', 'ArrowRight')
})

test('the input is for my seat: joining second, the arrow moves player 2', async () => {
  const s = await room()
  await s.other()
  const game = await start(s)
  expect(game.seat).toBe(2)
  s.beat(5)
  const one = x(game.sim, 1)
  const two = x(game.sim, 2)
  key('keydown', 'ArrowRight')
  s.beat(30)
  expect(x(game.sim, 2)).toBeGreaterThan(two + 1)
  expect(x(game.sim, 1)).toBeCloseTo(one, 5)
  key('keyup', 'ArrowRight')
})

test('a refused join rejects with the problem and leaves nothing on the page', async () => {
  const s = await room()
  const refuse = (): Promise<Joined> => Promise.reject(new OnlineError('room-full', 'That room is full.'))
  await expect(start(s, { join: refuse })).rejects.toMatchObject({ problem: 'room-full' })
  online = undefined
  expect(mount.children).toHaveLength(0)
})

test('leave takes the canvas and the controls away and disposes the sims, and twice does nothing', async () => {
  const s = await room()
  const game = await start(s)
  await s.other()
  s.beat(5)
  game.leave()
  expect(mount.children).toHaveLength(0)
  expect(s.frames.pending).toBe(false)
  expect(() => game.sim.step([])).toThrow()
  expect(() => game.leave()).not.toThrow()
  online = undefined
})

test('reconnecting, then lost, after each of the waits', async () => {
  vi.useFakeTimers()
  const s = await room()
  const rejoins = vi.fn(() => Promise.reject(new Error('still down')))
  let closed: (() => void) | undefined
  const join = async (o: JoinOptions): Promise<Joined> => {
    const joined = await s.join(o)
    closed = o.onLinkClosed
    return { ...joined, rejoin: rejoins }
  }
  const game = await start(s, { join })
  expect(game.status().state).toBe('waiting')
  closed?.()
  expect(game.status()).toEqual({ state: 'reconnecting' })
  await vi.advanceTimersByTimeAsync(500)
  await vi.advanceTimersByTimeAsync(1000)
  await vi.advanceTimersByTimeAsync(2000)
  await vi.advanceTimersByTimeAsync(4000)
  expect(game.status()).toEqual({ state: 'reconnecting' })
  await vi.advanceTimersByTimeAsync(8000)
  expect(rejoins).toHaveBeenCalledTimes(5)
  expect(game.status()).toEqual({ state: 'ended', problem: 'lost' })
  expect(s.statuses.map((status) => status.state)).toEqual(['waiting', 'reconnecting', 'ended'])
})

test('a phone-size picture of two heroes in a room', async () => {
  await page.viewport(390, 844)
  const s = await room()
  const game = await start(s)
  const two = await s.other()
  s.beat(5)
  two.hold('right')
  key('keydown', 'ArrowLeft')
  s.beat(30)
  key('keyup', 'ArrowLeft')
  expect(game.status().state).toBe('playing')
  await page.screenshot({ element: mount, path: '__screenshots__/online-two-heroes-phone-390x844.png' })
})

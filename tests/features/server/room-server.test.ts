// Proof 2 of M2's networking: real sockets. A room server on port 0 and headless players that join it with the real
// Colyseus SDK end on one hash with a lag and a late command forced, a dropped connection gets back into its seat, and
// every way a join can be refused is told in the problem a person reads.
import { afterEach, expect, test, vi } from 'vitest'
import { controlsCommand, verifyReplay } from '#src/features/commands/commands.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { OnlineError } from '#src/features/net/net.ts'
import { createRoomServer, type RoomServer, type RoomServerOptions } from '#src/server.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { coopSim, loadCoopGame, loadOnlineGame, onlineSim } from '../../fixtures/online/game.ts'
import {
  type HeadlessPlayer,
  type HeadlessSetup,
  headlessPlayer,
  until,
} from '../../fixtures/online/headless-player.ts'
import { onlineScript } from '../../fixtures/online/script.ts'

// Real sockets and real timers: a ten-second play is ten real seconds.
vi.setConfig({ testTimeout: 60_000 })

const servers: RoomServer[] = []
const players: HeadlessPlayer[] = []
afterEach(async () => {
  for (const p of players.splice(0)) p.stop()
  for (const s of servers.splice(0)) await s.close()
})

const game = async () => ({ content: await loadOnlineGame(), plugins: [heroPlugin] })
async function start(extra: Partial<RoomServerOptions> = {}): Promise<{ server: RoomServer; url: string }> {
  const server = await createRoomServer({ game: await game(), ...extra })
  servers.push(server)
  return { server, url: `ws://127.0.0.1:${server.port}` }
}
async function join(setup: Partial<HeadlessSetup> & { server: string }): Promise<HeadlessPlayer> {
  const p = await headlessPlayer({ seats: 2, script: () => [], ...setup })
  players.push(p)
  return p
}
const stateOf = (p: HeadlessPlayer) => p.joined.session.state()
/** A check tick (59, 119 ...) that both players have yet to reach, so a later comparison is about fresh ticks. */
const laterCheck = (...ps: HeadlessPlayer[]): number =>
  Math.ceil((Math.max(...ps.map((p) => p.joined.session.stats().confirmedTick)) + 130) / 60) * 60 - 1

test('two players over real sockets end on the same hash, rollback included', async () => {
  const { server, url } = await start()
  const one = await join({ server: url, script: onlineScript })
  const two = await join({ server: url, room: one.joined.code, lagMs: 120, script: onlineScript })
  await until(
    'both players to reach the check for tick 599',
    () => one.checks.has(599) && two.checks.has(599),
  )
  expect(one.checks.get(599)).toBe(two.checks.get(599))
  const replay = server.replays()[one.joined.code]
  expect(replay).toBeDefined()
  if (replay === undefined) return
  expect(replay.checks.find((c) => c.tick === 600)?.hash).toBe(one.checks.get(599))
  for (const p of [one, two]) {
    const stats = p.joined.session.stats()
    expect(stats.rollbacks).toBeGreaterThan(0)
    expect(stats.desyncs).toBe(0)
  }
  expect(server.stats.late).toBeGreaterThan(0)
  one.stop()
  two.stop()
  const fresh = await onlineSim(2)
  expect(verifyReplay(fresh, replay)).toEqual({ ok: true })
  fresh.dispose()
})

test('a second player joins by the first one’s code', async () => {
  const { url } = await start()
  const one = await join({ server: url })
  await until('the first player to wait', () => {
    const s = stateOf(one)
    return s.state === 'waiting' && s.missing === 1
  })
  expect(one.joined.code).not.toBe('')
  const two = await join({ server: url, room: one.joined.code })
  await until('both to play', () => stateOf(one).state === 'playing' && stateOf(two).state === 'playing')
  expect(two.joined.session.seat).toBe(2)
})

test('a page with no code never lands in a full room', async () => {
  const { url } = await start()
  const one = await join({ server: url })
  const two = await join({ server: url, room: one.joined.code })
  await until('both to play', () => stateOf(one).state === 'playing' && stateOf(two).state === 'playing')
  const three = await join({ server: url })
  expect(three.joined.code).not.toBe(one.joined.code)
  await until('the third to wait in its own room', () => {
    const s = stateOf(three)
    return s.state === 'waiting' && s.missing === 1
  })
})

test('another version is refused before it takes a seat', async () => {
  const { url } = await start()
  const one = await join({ server: url })
  await until('the first player to wait', () => stateOf(one).state === 'waiting')
  const noHero = async () => createGameSim({ content: await loadOnlineGame(), plugins: [], players: [1, 2] })
  const refused = await join({ server: url, room: one.joined.code, makeSim: noHero }).catch((e: unknown) => e)
  expect(refused).toBeInstanceOf(OnlineError)
  expect((refused as OnlineError).problem).toBe('different-version')
  const s = stateOf(one)
  expect(s.state === 'waiting' && s.missing).toBe(1)
})

test('a full room, a wrong code and no server each say what happened', async () => {
  const { server, url } = await start()
  const one = await join({ server: url })
  const two = await join({ server: url, room: one.joined.code })
  await until('both to play', () => stateOf(one).state === 'playing' && stateOf(two).state === 'playing')
  const problem = async (setup: Partial<HeadlessSetup> & { server: string }) => {
    const result = await join(setup).catch((e: unknown) => e)
    return result instanceof OnlineError ? result.problem : result
  }
  expect(await problem({ server: url, room: one.joined.code })).toBe('room-full')
  expect(await problem({ server: url, room: 'NOPE' })).toBe('no-room')
  await server.close()
  expect(await problem({ server: url })).toBe('no-server')
})

test('a level with no start for player 3 cannot be a room', async () => {
  const { url } = await start()
  const result = await join({ server: url, seats: 3, makeSim: () => onlineSim(2) }).catch((e: unknown) => e)
  expect(result).toBeInstanceOf(OnlineError)
  expect((result as OnlineError).problem).toBe('bad-room')
  expect((result as OnlineError).message).toContain('level-1')
})

test('the server says when it is full', async () => {
  const { url } = await start({ maxRooms: 1 })
  await join({ server: url })
  const result = await join({ server: url }).catch((e: unknown) => e)
  expect(result).toBeInstanceOf(OnlineError)
  expect((result as OnlineError).problem).toBe('server-full')
})

// Two rooms asked for at once must not both pass the limit: a room counts from the moment it is asked for.
test('two rooms made at the same moment do not both fit a server of one', async () => {
  const { url } = await start({ maxRooms: 1 })
  const results = await Promise.allSettled([join({ server: url }), join({ server: url })])
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  const refused = results.find((r) => r.status === 'rejected')
  expect((refused as PromiseRejectedResult).reason).toMatchObject({ problem: 'server-full' })
})

test('a dropped connection gets back into its seat and plays on', async () => {
  const { url } = await start()
  const one = await join({ server: url, script: onlineScript })
  const two = await join({ server: url, room: one.joined.code, script: onlineScript })
  await until('both to play', () => stateOf(one).state === 'playing' && stateOf(two).state === 'playing')
  two.drop()
  await until('the first player to see the other away', () => {
    const s = stateOf(one)
    return s.state === 'playing' && s.away.includes(2)
  })
  await two.joined.rejoin()
  await until('the other to be back', () => {
    const s = stateOf(one)
    return s.state === 'playing' && s.away.length === 0
  })
  const target = laterCheck(one, two)
  await until('both to reach a later check', () => one.checks.has(target) && two.checks.has(target))
  expect(one.checks.get(target)).toBe(two.checks.get(target))
  expect(two.joined.session.stats().syncs).toBe(1)
})

test('the seat is kept only for the grace', async () => {
  const { url } = await start({ graceSeconds: 1 })
  const one = await join({ server: url })
  const two = await join({ server: url, room: one.joined.code })
  await until('both to play', () => stateOf(one).state === 'playing' && stateOf(two).state === 'playing')
  two.drop()
  // The one wait on time in this plan: the grace is Colyseus's own timer.
  await new Promise((resolve) => setTimeout(resolve, 1500))
  await expect(two.joined.rejoin()).rejects.toMatchObject({ problem: 'lost' })
  const target = laterCheck(one)
  await until('the first player to reach a later check', () => one.checks.has(target))
})

test('close frees the port', async () => {
  const { server } = await start()
  const { port } = server
  await server.close()
  servers.pop()
  const again = await createRoomServer({ game: await game(), port })
  servers.push(again)
  expect(again.port).toBe(port)
})

// A co-op game: a room of four places, where players come and go while it is played.
const coopGame = async () => ({ content: await loadCoopGame(), plugins: [heroPlugin] })
/** What the third player holds from which tick; the first two do what the lobby's players do. */
const THIRD: Record<number, readonly string[]> = { 200: ['right'], 320: ['jump', 'right'], 420: [] }
const coopScript: HeadlessSetup['script'] = (seat, tick) => {
  if (seat !== 3) return onlineScript(seat, tick)
  const held = THIRD[tick]
  return held === undefined ? [] : [controlsCommand(tick, 3, 0, held)]
}
const coopPlayer = (setup: Partial<HeadlessSetup> & { server: string }): Promise<HeadlessPlayer> =>
  join({ seats: 4, makeSim: coopSim, script: coopScript, ...setup })

test('a third player joins a game already going, and one leaves', async () => {
  const { server, url } = await start({ game: await coopGame() })
  const one = await coopPlayer({ server: url })
  const two = await coopPlayer({ server: url, room: one.joined.code })
  await until('both to play to the check for tick 119', () => one.checks.has(119) && two.checks.has(119))
  const three = await coopPlayer({ server: url, room: one.joined.code, lagMs: 120 })
  await until('the third player to have a place', () => three.joined.session.seat !== undefined)
  expect(three.joined.session.seat).toBe(3)
  await until('the check for tick 359', () => one.checks.has(359) && three.checks.has(359))
  two.stop()
  await until('the check for tick 599', () => one.checks.has(599) && three.checks.has(599))
  expect(one.checks.get(599)).toBe(three.checks.get(599))
  for (const p of [one, three]) expect(p.joined.session.stats().desyncs).toBe(0)
  const replay = server.replays()[one.joined.code]
  expect(replay).toBeDefined()
  if (replay === undefined) return
  expect(replay.checks.find((c) => c.tick === 600)?.hash).toBe(one.checks.get(599))
  expect(replay.commands.filter((c) => c.type === 'join')).toHaveLength(3)
  expect(replay.commands.filter((c) => c.type === 'leave')).toHaveLength(1)
  one.stop()
  three.stop()
  const fresh = await coopSim()
  expect(verifyReplay(fresh, replay)).toEqual({ ok: true })
  fresh.dispose()
})

test('a room for two in a game for four cannot be made', async () => {
  const { url } = await start({ game: await coopGame() })
  const result = await join({ server: url, seats: 2, makeSim: coopSim }).catch((e: unknown) => e)
  expect(result).toBeInstanceOf(OnlineError)
  expect((result as OnlineError).problem).toBe('bad-room')
})

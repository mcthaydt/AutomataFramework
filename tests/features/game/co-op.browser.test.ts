// Up to four people on one screen, end to end in each real browser: the whole game, real key events and a pretend
// gamepad plugged in as the browser's, frames driven by hand. The first test runs once per screen the game is played on.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { verifyReplay } from '#src/features/commands/commands.ts'
import type { GameContent } from '#src/features/content/content.ts'
import type { Game } from '#src/features/game/game.ts'
import type { Claim } from '#src/features/input/input.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { coopFiles } from '../../fixtures/game/co-op.ts'
import { heroOf, key, run, startCoop } from '../../fixtures/game/co-op-game.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'

/** The screens a game is played on: phones and tablets upright and sideways, and a desktop window. */
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
  test(`on ${name} a second player joins with a gamepad, and both heroes run`, async () => {
    await page.viewport(w, h)
    const started = await startCoop(mount)
    game = started.game
    const { frames, pads } = started
    pads.connect(1)
    game.input.invite((pad) => game?.addPlayer(`pad-${pad}` as Claim))
    pads.press('south', 1)
    run(frames, 2)
    expect(game.players()).toEqual([1, 2])

    pads.release('south', 1)
    run(frames, 2)
    const before = [heroOf(game, 1).x, heroOf(game, 2).x]
    pads.press('dpad-right', 1)
    key('keydown', 'ArrowRight')
    run(frames, 60)
    expect(heroOf(game, 1).x).toBeGreaterThan((before[0] ?? 0) + 1)
    expect(heroOf(game, 2).x).toBeGreaterThan((before[1] ?? 0) + 1)

    // What was played is what a fresh sim plays back, joins included.
    const replay = game.replay()
    expect(replay.commands.some((c) => c.type === 'join' && c.source === 2)).toBe(true)
    const fresh = await createGameSim({ content: await loadFixtureGame(coopFiles), plugins: [heroPlugin] })
    try {
      expect(verifyReplay(fresh, replay)).toEqual({ ok: true })
    } finally {
      fresh.dispose()
    }
  })
}

test('the press that joined does not make the new hero jump', async () => {
  const { game: g, frames, pads } = await startCoop(mount)
  game = g
  pads.connect(1)
  g.input.invite((pad) => g.addPlayer(`pad-${pad}` as Claim))
  pads.press('south', 1)
  run(frames, 30)
  expect(g.players()).toEqual([1, 2])
  // Still held: player 2 stands where their start point is, and has not left the ground.
  expect(heroOf(g, 2).y).toBeCloseTo(7.5, 1)
})

test("player 2's pad no longer moves player 1", async () => {
  const { game: g, frames, pads } = await startCoop(mount)
  game = g
  pads.connect(0)
  pads.connect(1)
  expect(g.addPlayer('pad-1').ok).toBe(true)
  run(frames, 5)
  const before = heroOf(g, 1).x
  pads.press('dpad-right', 1)
  run(frames, 60)
  expect(heroOf(g, 1).x).toBeCloseTo(before, 1)
  expect(heroOf(g, 2).x).toBeGreaterThan(4.5 + 1)
})

test('before anyone joins, the pad moves player 1', async () => {
  const { game: g, frames, pads } = await startCoop(mount)
  game = g
  pads.connect(0)
  const before = heroOf(g, 1).x
  pads.press('dpad-right', 0)
  run(frames, 60)
  expect(heroOf(g, 1).x).toBeGreaterThan(before + 1)
})

test('two people share the keyboard', async () => {
  const { game: g, frames } = await startCoop(mount)
  game = g
  expect(g.addPlayer('keyboard')).toEqual({ ok: true, player: 2 })
  run(frames, 5)
  const before = [heroOf(g, 1).x, heroOf(g, 2).x]
  key('keydown', 'KeyD')
  run(frames, 60)
  expect(heroOf(g, 1).x).toBeGreaterThan((before[0] ?? 0) + 1)
  expect(heroOf(g, 2).x).toBeCloseTo(before[1] ?? 0, 1)
  key('keyup', 'KeyD')
  run(frames, 5)
  const middle = heroOf(g, 1).x
  key('keydown', 'ArrowRight')
  run(frames, 60)
  expect(heroOf(g, 2).x).toBeGreaterThan((before[1] ?? 0) + 1)
  expect(heroOf(g, 1).x).toBeCloseTo(middle, 1)
})

test('four can play, and a fifth is told the game is full', async () => {
  const { game: g, frames } = await startCoop(mount)
  game = g
  expect(g.addPlayer('pad-0')).toEqual({ ok: true, player: 2 })
  expect(g.addPlayer('pad-1')).toEqual({ ok: true, player: 3 })
  expect(g.addPlayer('keyboard')).toEqual({ ok: true, player: 4 })
  run(frames, 5)
  expect(g.players()).toEqual([1, 2, 3, 4])
  expect(g.addPlayer('pad-2')).toEqual({
    ok: false,
    reason: 'full',
    message: 'Everyone is in. This game has room for 4 players.',
  })
})

test('a gamepad or the keyboard that already has a player is not given to a second', async () => {
  const { game: g } = await startCoop(mount)
  game = g
  g.addPlayer('pad-1')
  expect(g.addPlayer('pad-1')).toEqual({
    ok: false,
    reason: 'taken',
    message: 'That gamepad already has a player.',
  })
  g.addPlayer('keyboard')
  expect(g.addPlayer('keyboard')).toEqual({
    ok: false,
    reason: 'taken',
    message: 'The keyboard is already shared.',
  })
})

test('a level with two start points has room for two', async () => {
  const loaded = await loadFixtureGame(coopFiles)
  const level = loaded.levels['level-1']
  if (level === undefined) throw new Error('no level')
  // Built by hand: `loadGame` itself refuses a game for four whose level has only two start points.
  const content: GameContent = {
    ...loaded,
    levels: { ...loaded.levels, 'level-1': { ...level, starts: level.starts.slice(0, 2) } },
  }
  const { game: g } = await startCoop(mount, { content })
  game = g
  expect(g.addPlayer('pad-0').ok).toBe(true)
  expect(g.addPlayer('pad-1')).toEqual({
    ok: false,
    reason: 'no-start',
    message: 'This level has room for 2 players.',
  })
})

test('a one-player game says so', async () => {
  const { game: g } = await startCoop(mount, { content: await loadFixtureGame() })
  game = g
  expect(g.addPlayer('pad-0')).toEqual({
    ok: false,
    reason: 'one-player-game',
    message: 'This game is for one player.',
  })
})

test('a game whose keys cannot be shared says to join with a gamepad', async () => {
  const { game: g } = await startCoop(mount, {
    controls: { jump: { label: 'Jump', keys: ['Space'], side: 'right' } },
  })
  game = g
  expect(g.addPlayer('keyboard')).toEqual({
    ok: false,
    reason: 'no-shared',
    message: "This game's keys cannot be shared. Join with a gamepad.",
  })
})

test('a player leaves, and their hero and their seat go', async () => {
  const { game: g, frames, pads } = await startCoop(mount)
  game = g
  pads.connect(0)
  pads.connect(1)
  g.addPlayer('pad-1')
  run(frames, 5)
  expect(g.input.seats()).toHaveLength(2)
  expect(g.removePlayer(2)).toBe(true)
  run(frames, 5)
  expect(g.players()).toEqual([1])
  const seats = g.input.seats()
  expect(seats).toHaveLength(1)
  expect(seats[0]?.devices).toContain('pad-1')
})

test('the last player cannot leave, nor someone who is not playing', async () => {
  const { game: g, frames } = await startCoop(mount)
  game = g
  expect(g.removePlayer(1)).toBe(false)
  expect(g.removePlayer(3)).toBe(false)
  run(frames, 2)
  expect(g.players()).toEqual([1])
})

test("player 2's pad is unplugged: their hero stops, and comes back to hand when a pad is plugged in", async () => {
  const { game: g, frames, pads } = await startCoop(mount)
  game = g
  pads.connect(0)
  pads.connect(1)
  g.addPlayer('pad-1')
  run(frames, 5)
  pads.press('dpad-right', 1)
  run(frames, 20)
  const x = heroOf(g, 2).x
  pads.unplug(1)
  run(frames, 30)
  const stopped = heroOf(g, 2).x
  run(frames, 30)
  expect(heroOf(g, 2).x).toBeCloseTo(stopped, 0)
  expect(stopped).toBeGreaterThan(x)
  expect(g.input.seats()[1]?.connected).toBe(false)

  pads.connect(2)
  run(frames, 2)
  pads.press('dpad-right', 2)
  run(frames, 30)
  expect(g.input.seats()[1]).toEqual({ player: 2, devices: ['pad-2'], connected: true })
  expect(heroOf(g, 2).x).toBeGreaterThan(stopped + 1)
})

test('joining while paused: the hero is there once the game is back', async () => {
  const { game: g, frames } = await startCoop(mount)
  game = g
  g.pause()
  expect(g.addPlayer('pad-1').ok).toBe(true)
  run(frames, 10)
  expect(g.players()).toEqual([1])
  g.resume()
  run(frames, 3)
  expect(g.players()).toEqual([1, 2])
})

test('keys held through a pause do nothing until pressed again', async () => {
  const { game: g, frames } = await startCoop(mount)
  game = g
  key('keydown', 'ArrowRight')
  run(frames, 10)
  g.pause()
  g.resume()
  run(frames, 3)
  const x = heroOf(g, 1).x
  run(frames, 30)
  expect(heroOf(g, 1).x).toBeCloseTo(x, 1)
  key('keyup', 'ArrowRight')
  key('keydown', 'ArrowRight')
  run(frames, 30)
  expect(heroOf(g, 1).x).toBeGreaterThan(x + 1)
})

test('starting with players [1, 2] and a claim for 2 plays the same way', async () => {
  const { game: g, frames, pads } = await startCoop(mount, { players: [1, 2] })
  game = g
  pads.connect(1)
  g.input.claim(2, 'pad-1')
  const before = [heroOf(g, 1).x, heroOf(g, 2).x]
  pads.press('dpad-right', 1)
  run(frames, 60)
  expect(heroOf(g, 2).x).toBeGreaterThan((before[1] ?? 0) + 1)
  expect(heroOf(g, 1).x).toBeCloseTo(before[0] ?? 0, 1)
})

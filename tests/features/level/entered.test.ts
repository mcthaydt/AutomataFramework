// Which level a hero is in (plan W, task 9): in a place of two or more levels each hero carries the level it is in, and
// the sim says each time one passes into another. Every test runs on the links game; room 2 and room 3 are one place. The
// room-2 things are taken out so nothing stands in the way of a hero walking the length of the place.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand } from '#src/features/commands/commands.ts'
import { createGameSim, heroLevels, In, joinCommand } from '#src/features/level/level.ts'
import type { Command, Sim } from '#src/features/sim/sim.ts'
import { editLevel, type LevelJson, loadLinksGame } from '../../fixtures/links-game/read.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** Room 2 with only its door (room 1's `exit` leads to it): no crate, critter, button or gate. */
const bare = (change: (level: LevelJson) => void = () => {}): Record<string, string | undefined> =>
  editLevel('room-2', (level) => {
    level.things = level.things.filter((t) => t.id === 'door-in')
    change(level)
  })

async function open(
  level: string,
  options: { players?: readonly number[]; overrides?: Record<string, string | undefined> } = {},
): Promise<Sim> {
  const sim = await createGameSim({
    content: await loadLinksGame(options.overrides),
    level,
    players: options.players ?? [1],
  })
  made.push(sim)
  return sim
}

interface Crossing {
  readonly tick: number
  readonly payload: { level: string; from: string; player: number; sid: number; x: number; y: number }
}

/** Steps until `until` ticks, the players holding what `held(tick)` says, and returns each `level.entered`. */
function walk(
  sim: Sim,
  until: number,
  held: (tick: number, player: number) => readonly string[],
): Crossing[] {
  const crossings: Crossing[] = []
  const seq = new Map<number, number>()
  while (sim.tick < until) {
    const tick = sim.tick
    const commands: Command[] = [1, 2].map((player) => {
      const n = seq.get(player) ?? 0
      seq.set(player, n + 1)
      return controlsCommand(tick, player, n, held(tick, player))
    })
    for (const e of sim.step(commands).events)
      if (e.type === 'level.entered') crossings.push({ tick, payload: e.payload as Crossing['payload'] })
  }
  return crossings
}

test('a hero walking right from room-2 raises level.entered once, for room-3, with an x under 1', async () => {
  const sim = await open('room-2', { overrides: bare((l) => (l.starts[0] = { player: 1, x: 12, y: 7.5 })) })
  const crossings = walk(sim, 200, () => ['right'])
  expect(crossings).toHaveLength(1)
  expect(crossings[0]?.payload).toMatchObject({ level: 'room-3', from: 'room-2', player: 1 })
  expect(crossings[0]?.payload.x).toBeGreaterThanOrEqual(0)
  expect(crossings[0]?.payload.x).toBeLessThan(1)
  expect(crossings[0]?.payload.y).toBeCloseTo(7.5, 0)
  expect(heroLevels(sim)).toEqual([{ player: 1, level: 'room-3' }])
})

test('walking back raises it once more, the other way', async () => {
  const sim = await open('room-2', { overrides: bare((l) => (l.starts[0] = { player: 1, x: 12, y: 7.5 })) })
  const there = walk(sim, 120, () => ['right'])
  const back = walk(sim, 320, () => ['left'])
  expect([...there, ...back].map((c) => [c.payload.level, c.payload.from])).toEqual([
    ['room-3', 'room-2'],
    ['room-2', 'room-3'],
  ])
  // Going left out of room-3 the hero is a little before room-2's right edge.
  expect(back[0]?.payload.x).toBeGreaterThan(15)
  expect(heroLevels(sim)).toEqual([{ player: 1, level: 'room-2' }])
})

test('standing on the edge for 120 ticks raises nothing: only the middle of the hero decides', async () => {
  // A hero 0.8 wide at 15.95 is half in each level, with its middle in room-2.
  const sim = await open('room-2', {
    overrides: bare((l) => (l.starts[0] = { player: 1, x: 15.95, y: 7.5 })),
  })
  expect(walk(sim, 120, () => [])).toEqual([])
  expect(heroLevels(sim)).toEqual([{ player: 1, level: 'room-2' }])
})

test('two heroes are tracked apart', async () => {
  const sim = await open('room-2', {
    players: [1, 2],
    overrides: bare((l) => {
      l.starts = [
        { player: 1, x: 12, y: 7.5 },
        { player: 2, x: 3.5, y: 7.5 },
      ]
    }),
  })
  const crossings = walk(sim, 150, (_tick, player) => (player === 1 ? ['right'] : []))
  expect(crossings.map((c) => c.payload.player)).toEqual([1])
  expect(heroLevels(sim)).toEqual([
    { player: 1, level: 'room-3' },
    { player: 2, level: 'room-2' },
  ])
})

test('a lone level has no In and no event, and heroLevels says the level it is', async () => {
  const sim = await open('room-1', { players: [1, 2] })
  expect(walk(sim, 120, () => ['right'])).toEqual([])
  expect(() => sim.query(In)).toThrow(/unknown component "level.in"/)
  expect(heroLevels(sim)).toEqual([
    { player: 1, level: 'room-1' },
    { player: 2, level: 'room-1' },
  ])
  // Before the first tick a sim with no `where` knows only what it was opened at.
  const fresh = await open('room-1')
  expect(heroLevels(fresh, 'room-1')).toEqual([{ player: 1, level: 'room-1' }])
})

test("a join at tick 100, after player 1 has crossed into room-3, puts player 2 at room-2's start for player 2", async () => {
  const sim = await open('room-2', { overrides: bare((l) => (l.starts[0] = { player: 1, x: 12, y: 7.5 })) })
  expect(walk(sim, 100, () => ['right'])).toHaveLength(1)
  expect(heroLevels(sim)).toEqual([{ player: 1, level: 'room-3' }])
  expect(sim.tick).toBe(100)
  const events = sim.step([joinCommand(100, 2, 0)]).events
  // The joiner is not "entering" anything: no event at spawn.
  expect(events.filter((e) => e.type === 'level.entered')).toEqual([])
  expect(heroLevels(sim)).toEqual([
    { player: 1, level: 'room-3' },
    { player: 2, level: 'room-2' },
  ])
})

// The built-in hero in the sim (plan H, task 6): a game whose hero has `moves` is walked and jumped by the framework,
// with real physics and no game code.
import { afterEach, describe, expect, test } from 'vitest'
import { commandsPlugin, controlsCommand, Player } from '#src/features/commands/commands.ts'
import {
  createGameSim,
  joinCommand,
  levelPlugin,
  MOVE_EVENTS,
  Moves,
  simContent,
  usesMoves,
} from '#src/features/level/level.ts'
import { Body, physics, Touching, Transform } from '#src/features/physics/physics.ts'
import { type Command, createSim, definePlugin, defineSystem, type Sim } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { movesFiles, type Setup } from '../../fixtures/game/moves-game.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

async function game(setup: Setup = {}, plugins: Parameters<typeof createGameSim>[0]['plugins'] = []) {
  const content = await loadFixtureGame(movesFiles(setup))
  const sim = await createGameSim({
    content,
    plugins,
    ...(setup.players ? { players: Array.from({ length: setup.players }, (_, i) => i + 1) } : {}),
  })
  made.push(sim)
  return { sim, content }
}

interface Said {
  readonly tick: number
  readonly type: string
  readonly payload: { readonly player: number; readonly sid: number }
}
/** Steps `ticks` ticks, each with the commands `script` gives for it, and returns the `hero.*` events as they came. */
function play(sim: Sim, ticks: number, script: (tick: number) => Command[] = () => []): Said[] {
  const said: Said[] = []
  for (let i = 0; i < ticks; i++) {
    const tick = sim.tick
    for (const e of sim.step(script(tick)).events)
      if (e.type.startsWith('hero.')) said.push({ tick, type: e.type, payload: e.payload as Said['payload'] })
  }
  return said
}
const heroOf = (sim: Sim, number: number) => sim.query(Player).find((e) => e.get(Player).number === number)
const xOf = (sim: Sim, number = 1): number => heroOf(sim, number)?.get(Transform).x ?? Number.NaN
const yOf = (sim: Sim, number = 1): number => heroOf(sim, number)?.get(Transform).y ?? Number.NaN
const count = (said: readonly Said[], name: string): number =>
  said.filter((e) => e.type === `hero.${name}`).length

/** Hold `held` from `tick`, as a player's controls command does. */
const hold =
  (steps: readonly (readonly [number, readonly string[]])[], player = 1) =>
  (tick: number): Command[] => {
    const at = steps.findIndex(([when]) => when === tick)
    const step = steps[at]
    // The seq starts above the join's, so a player who joins and then holds keeps the two apart.
    return step ? [controlsCommand(tick, player, at + 10, step[1])] : []
  }

describe('the built-in hero', () => {
  test('createGameSim with no plugins moves the hero: right takes it right, jump takes it up', async () => {
    const { sim, content } = await game()
    expect(usesMoves(content)).toBe(true)
    play(sim, 20)
    const standing = { x: xOf(sim), y: yOf(sim) }
    play(sim, 30, hold([[20, ['right']]]))
    expect(xOf(sim)).toBeGreaterThan(standing.x + 2)
    const jump = hold([
      [50, ['right', 'jump']],
      [51, ['right']],
    ])
    play(sim, 10, jump)
    expect(yOf(sim)).toBeLessThan(standing.y - 0.5)
  })

  test('held right on a floor for 60 ticks, the hero covers walk-speed tiles, give or take 2%', async () => {
    const { sim } = await game()
    // Ten ticks to get up to speed, then a second at it: the walk is not eaten by the floor's friction.
    play(sim, 10, hold([[0, ['right']]]))
    const from = xOf(sim)
    play(sim, 60)
    expect(xOf(sim) - from).toBeGreaterThan(6 * 0.98)
    expect(xOf(sim) - from).toBeLessThan(6 * 1.02)
  })

  test("each event is said once, on the tick it happens, with the player's number", async () => {
    const { sim } = await game()
    const script = hold([
      [20, ['right']],
      [50, []],
      [70, ['jump']],
      [71, []],
    ])
    // The first ticks are the hero settling on the floor, so what they say is left out.
    const said = play(sim, 180, script).filter((e) => e.tick >= 10)
    expect(count(said, 'walked')).toBe(1)
    expect(count(said, 'jumped')).toBe(1)
    expect(count(said, 'landed')).toBe(1)
    expect(count(said, 'left-ground')).toBe(0)
    expect(said.filter((e) => e.type === 'hero.walked').map((e) => e.tick)).toEqual([20])
    expect(said.filter((e) => e.type === 'hero.jumped').map((e) => e.tick)).toEqual([70])
    const hero = heroOf(sim, 1)
    for (const e of said) expect(e.payload).toEqual({ player: 1, sid: hero?.sid })
  })

  test('the numbers come from the tuning file: jump-speed 20 jumps higher than 12', async () => {
    const peak = async (jumpSpeed: number): Promise<number> => {
      const { sim } = await game({ numbers: { 'jump-speed': jumpSpeed } })
      play(sim, 20)
      let top = yOf(sim)
      const script = hold([[20, ['jump']]])
      for (let i = 0; i < 90; i++) {
        play(sim, 1, script)
        top = Math.min(top, yOf(sim))
      }
      return top
    }
    expect(await peak(20)).toBeLessThan((await peak(12)) - 1)
  })

  test('a switch that is off does nothing: no double jump without "double-jump"', async () => {
    const script = hold([
      [20, ['jump']],
      [21, []],
      [35, ['jump']],
      [36, []],
    ])
    for (const [doubleJump, expected] of [
      [false, 0],
      [true, 1],
    ] as const) {
      const { sim } = await game({ doubleJump })
      play(sim, 20)
      const said = play(sim, 60, script)
      expect(count(said, 'jumped')).toBe(1)
      expect(count(said, 'air-jumped')).toBe(expected)
    }
  })

  test('a game without moves has no hero state, no touching, and the sim it had', async () => {
    const content = await loadFixtureGame()
    expect(usesMoves(content)).toBe(false)
    const sim = await createGameSim({ content })
    made.push(sim)
    sim.step([])
    expect(sim.query(Moves)).toEqual([])
    expect(sim.query(Touching)).toEqual([])
    // A sim made of exactly the plugins a game had before the built-in hero accepts this one's snapshot: the schema
    // is the same.
    const old = await createSim({
      seed: 1,
      content: simContent(content),
      plugins: [physics({ gravity: { x: 0, y: 30 }, joints: false }), commandsPlugin, levelPlugin],
    })
    made.push(old)
    expect(() => old.restore(sim.snapshot())).not.toThrow()
  })

  test("the moves plugin runs before the game's own: a game system sees this tick's speed", async () => {
    const seen: number[] = []
    const watcher = definePlugin({
      name: 'watcher',
      systems: [
        defineSystem({
          name: 'watcher.look',
          phase: 'gameplay',
          run(ctx) {
            for (const hero of ctx.query(Player, Body)) seen.push(hero.get(Body).vx)
          },
        }),
      ],
    })
    const { sim } = await game({}, [watcher])
    play(sim, 3, hold([[0, ['right']]]))
    // Three ticks to the walk speed at the default grip: 2, 4, 6.
    expect(seen).toEqual([2, 4, 6])
  })

  test('a game system may run after level.moves', async () => {
    const after = definePlugin({
      name: 'after-moves',
      systems: [
        defineSystem({ name: 'after-moves.run', phase: 'gameplay', after: ['level.moves'], run() {} }),
      ],
    })
    const { sim } = await game({}, [after])
    expect(() => sim.step([])).not.toThrow()
  })

  test('a hero who joins a co-op game has the move state and is moved', async () => {
    const content = await loadFixtureGame(movesFiles({ players: 2 }))
    const joined = await createGameSim({ content, players: [1] })
    made.push(joined)
    joined.step([joinCommand(0, 2, 0)])
    const two = heroOf(joined, 2)
    expect(two?.get(Moves)).toBeDefined()
    expect(two?.get(Touching)).toBeDefined()
    const from = xOf(joined, 2)
    play(joined, 30, hold([[1, ['right']]], 2))
    expect(xOf(joined, 2)).toBeGreaterThan(from + 1)
  })

  test("two heroes: each player's keys move only their own", async () => {
    const { sim } = await game({ players: 2 })
    play(sim, 20)
    const second = xOf(sim, 2)
    play(sim, 30, hold([[20, ['right']]], 1))
    expect(xOf(sim, 1)).toBeGreaterThan(2.5 + 1)
    expect(xOf(sim, 2)).toBeCloseTo(second, 2)
    play(sim, 30, hold([[50, ['left']]], 2))
    expect(xOf(sim, 2)).toBeLessThan(second - 1)
  })

  test('the eight events are the ones the spec lists', () => {
    expect(MOVE_EVENTS).toEqual([
      'walked',
      'jumped',
      'landed',
      'left-ground',
      'air-jumped',
      'wall-slid',
      'wall-jumped',
      'dashed',
    ])
  })
})

// `jumpPaths` held to the real hero (plan G, task 2): the real physics, a flat floor, the hero run to full speed and
// jumped with jump held, jumped twice, and dashed from standing. Where the real hero tops out, lands and ends a dash is
// where the path says, within 0.05 tiles, in Node, Chromium, WebKit and Firefox.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand, Player } from '#src/features/commands/commands.ts'
import { moveNumbersOf, writeContent } from '#src/features/content/content.ts'
import { createGameSim, jumpPaths } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Command, Sim } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { movesFiles } from '../../fixtures/game/moves-game.ts'

/** How near the real hero is to the path: half a tick of walking at the framework's speed. */
const WITHIN = 0.05

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

const WIDTH = 48
const HEIGHT = 16
const FLOOR_ROW = 14

/** A flat floor 48 tiles long with a wall at each end, and the hero's start at x 3.5. Nothing else. */
function flatLevel(): string {
  const tiles = Array.from({ length: HEIGHT }, (_, y) =>
    Array.from({ length: WIDTH }, (_, x) => (y >= FLOOR_ROW || x === 0 || x === WIDTH - 1 ? '#' : '.')).join(''),
  )
  const starts = [{ player: 1, x: 3.5, y: FLOOR_ROW - 0.5 }]
  return writeContent('level', { format: 1, id: 'level-1', tiles, things: [], starts } as never)
}

/** Where the hero was after each tick: `at[t]` is its place once the sim has stepped tick `t`. */
interface Run {
  readonly x: readonly number[]
  readonly y: readonly number[]
}

/** The held actions from each tick on (`[tick, held]`, in order); plays `ticks` ticks of a hero on the flat floor. */
async function play(
  numbers: Readonly<Record<string, number>>,
  held: readonly (readonly [number, readonly string[]])[],
  ticks: number,
): Promise<Run> {
  const content = await loadFixtureGame({
    ...movesFiles({ numbers, doubleJump: true, dash: true }),
    'content/levels/level-1.json': flatLevel(),
  })
  const sim = await createGameSim({ content })
  made.push(sim)
  const hero = sim.query(Player).find((e) => e.get(Player).number === 1)
  const x: number[] = []
  const y: number[] = []
  for (let t = 0; t < ticks; t++) {
    const at = held.findIndex(([when]) => when === sim.tick)
    const step = held[at]
    const commands: Command[] = step ? [controlsCommand(sim.tick, 1, at + 10, step[1])] : []
    sim.step(commands)
    x.push(hero?.get(Transform).x ?? Number.NaN)
    y.push(hero?.get(Transform).y ?? Number.NaN)
  }
  return { x, y }
}

/** The tick the jump is pressed on, with the hero at full speed and the floor settled. */
const T = 40
const RUN: readonly [number, readonly string[]] = [20, ['right']]

/** How high the hero got from where it stood, in tiles, between two ticks (y points down). */
const rise = (run: Run, from: number, to: number): number =>
  (run.y[from - 1] ?? Number.NaN) - Math.min(...run.y.slice(from, to))

/** The first tick after `from` on which the hero is back on the floor it stood on. */
function landing(run: Run, from: number): number {
  const floor = run.y[from - 1] ?? Number.NaN
  for (let t = from + 3; t < run.y.length; t++) if ((run.y[t] ?? Number.NaN) >= floor - 0.02) return t
  return -1
}

test('the real hero, run to full speed and jumped with jump held, tops out and lands where jumpPaths says', async () => {
  const numbers = {}
  const paths = jumpPaths(moveNumbersOf(numbers), { doubleJump: true, wallJump: false, dash: true })
  const run = await play(numbers, [RUN, [T, ['jump', 'right']]], T + 80)
  const land = landing(run, T)
  expect(land, 'it landed').toBeGreaterThan(T)
  const up = rise(run, T, land + 1)
  expect(Math.abs(up - paths.jump.up), `up: real ${up}`).toBeLessThan(WITHIN)
  const across = (run.x[land] ?? Number.NaN) - (run.x[T] ?? Number.NaN)
  expect(Math.abs(across - paths.jump.across), `across: real ${across}`).toBeLessThan(WITHIN)
})

test('the same with an air jump pressed as it stops rising', async () => {
  const numbers = {}
  const paths = jumpPaths(moveNumbersOf(numbers), { doubleJump: true, wallJump: false, dash: true })
  // Held to the top, let go for one tick, pressed again: the press is an up-to-down change.
  const run = await play(
    numbers,
    [RUN, [T, ['jump', 'right']], [T + 23, ['right']], [T + 24, ['jump', 'right']]],
    T + 130,
  )
  const up = rise(run, T, T + 130)
  expect(Math.abs(up - (paths.airJump?.up ?? Number.NaN)), `up: real ${up}`).toBeLessThan(WITHIN)
})

test('a real dash from standing ends within 0.05 tiles of `dash.across`', async () => {
  const numbers = {}
  const n = moveNumbersOf(numbers)
  const paths = jumpPaths(n, { doubleJump: true, wallJump: false, dash: true })
  const run = await play(numbers, [[T, ['dash', 'right']]], T + 40)
  const across = (run.x[T + n.dashTicks] ?? Number.NaN) - (run.x[T] ?? Number.NaN)
  expect(Math.abs(across - (paths.dash?.across ?? Number.NaN)), `across: real ${across}`).toBeLessThan(WITHIN)
})

test('with jump-speed 20 and walk-speed 10 in the tuning file, both still agree', async () => {
  const numbers = { 'jump-speed': 20, 'walk-speed': 10 }
  const paths = jumpPaths(moveNumbersOf(numbers), { doubleJump: true, wallJump: false, dash: true })
  const run = await play(numbers, [RUN, [T, ['jump', 'right']]], T + 120)
  const land = landing(run, T)
  expect(land, 'it landed').toBeGreaterThan(T)
  const up = rise(run, T, land + 1)
  expect(Math.abs(up - paths.jump.up), `up: real ${up}`).toBeLessThan(WITHIN)
  const across = (run.x[land] ?? Number.NaN) - (run.x[T] ?? Number.NaN)
  expect(Math.abs(across - paths.jump.across), `across: real ${across}`).toBeLessThan(WITHIN)
})

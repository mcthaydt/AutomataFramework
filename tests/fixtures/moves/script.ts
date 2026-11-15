// What the player does in the moves game, as one table: a tick and what is held from it. A control is sent only when it
// changes, so most ticks send nothing. Each step says what it is for.
import { controlsCommand } from '#src/features/commands/commands.ts'
import type { Command } from '#src/features/sim/sim.ts'

type Held = readonly string[]
const R = 'right'
const J = 'jump'
const D = 'dash'
const L = 'left'

/** Player 1 in level 1. The ticks were read off a run of the level, so each step lands where its comment says. */
const ONE: readonly (readonly [number, Held])[] = [
  // Settling on the start platform; then a jump held for 30 ticks (the full height), and one tapped (the cut height).
  [30, [J]],
  [60, []],
  [100, [J]],
  [101, []],
  // A tapped jump, and a press four ticks before it lands: the jump comes on the landing.
  [130, [J]],
  [131, []],
  [150, [J]],
  [151, []],
  // A jump, and a second press at the top of it: the double jump.
  [200, [J]],
  [210, []],
  [226, [J]],
  [230, []],
  // Walk right, and off the ledge (left-ground), and a jump three ticks after it: inside the ledge grace.
  [300, [R]],
  [404, [R, J]],
  [405, [R]],
  // A jump onto the crate, and a jump from it.
  [479, [R, J]],
  [480, [R]],
  [526, [R, J]],
  [527, [R]],
  // A dash along the floor.
  [585, [R, D]],
  [586, [R]],
  // A jump at the pit's edge, an air dash over it, and the walk on to the shaft, in at the doorway, to the far wall.
  [649, [R, J]],
  [650, [R]],
  [663, [R, D]],
  [664, [R]],
  // At the far wall: a jump, the slide down it, then three wall jumps, one off each wall in turn.
  [810, [R, J]],
  [811, [R]],
  [845, [L, J]],
  [846, [L]],
  [868, [R, J]],
  [869, [R]],
  [891, [L, J]],
  [892, [L]],
  // Let go and stand still.
  [925, []],
]

/** How long the moves run lasts, in ticks. */
export const MOVES_TICKS = 1000

/** The commands for `tick` in the moves run: player 1 in level 1. */
export function movesScript(tick: number): Command[] {
  const at = ONE.findIndex(([when]) => when === tick)
  const step = ONE[at]
  return step ? [controlsCommand(tick, 1, at, step[1])] : []
}

/** Player 1 and player 2 in level 2: the first dashes into the second, who then jumps and walks away. */
const TWO: readonly (readonly [number, number, Held])[] = [
  [20, 1, [R, D]],
  [21, 1, [R]],
  [40, 2, [J]],
  [41, 2, []],
  [60, 2, [R]],
  [120, 2, []],
  [130, 1, []],
]

/** How long the co-op and online runs last, in ticks. */
export const MOVES_TWO_TICKS = 240

/** The commands for `tick` with two heroes: the same table for the co-op test and for each seat of the online one. */
export function movesTwoScript(tick: number, only?: number): Command[] {
  return TWO.flatMap(([when, player, held], at) =>
    when === tick && (only === undefined || only === player) ? [controlsCommand(tick, player, at, held)] : [],
  )
}

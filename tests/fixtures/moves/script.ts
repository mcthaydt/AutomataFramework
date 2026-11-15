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
  // A tapped jump, and a press as it comes down: the air jump is still there to spend, so it is a double jump.
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
  // A jump toward the crate, and a second press in the air above it: another double jump.
  [479, [R, J]],
  [480, [R]],
  [526, [R, J]],
  [527, [R]],
  // A dash along the floor.
  [585, [R, D]],
  [586, [R]],
  // A held jump from a few tiles before the pit (it carries nearly five tiles), the air dash at the top of it, and the
  // walk on through the doorway to the far wall.
  [683, [R, J]],
  [706, [R, D]],
  [707, [R]],
  // At the far wall: a jump held to the top, the slide down it, then three wall jumps, one off each wall in turn. Each
  // flight takes about thirty ticks, so the next wall jump comes a few ticks after the hero meets the other wall.
  [900, [R, J]],
  [925, [R]],
  [935, [L, J]],
  [936, [L]],
  [972, [R, J]],
  [973, [R]],
  [1008, [L, J]],
  [1009, [L]],
  // Let go and stand still.
  [1050, []],
]

/** How long the moves run lasts, in ticks. */
export const MOVES_TICKS = 1100

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

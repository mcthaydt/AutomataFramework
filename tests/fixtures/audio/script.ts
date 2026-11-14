// What player 1 does in the sounding run: jump at tick 10 and again at tick 120, run right for half a second between.
import { controlsCommand } from '#src/features/commands/commands.ts'
import type { Command } from '#src/features/sim/sim.ts'

/** How long the sounding run is, in ticks (four seconds). */
export const SOUNDING_TICKS = 240

/**
 * The commands for `tick`. Player 1 presses jump at ticks 10 and 120 and lets go ten ticks later, and holds right from
 * tick 60 to tick 90. A control is sent only when it changes, so most ticks send nothing.
 */
export function soundingScript(tick: number): Command[] {
  if (tick === 10 || tick === 120) return [controlsCommand(tick, 1, tick === 10 ? 0 : 4, ['jump'])]
  if (tick === 20) return [controlsCommand(tick, 1, 1, [])]
  if (tick === 60) return [controlsCommand(tick, 1, 2, ['right'])]
  if (tick === 90) return [controlsCommand(tick, 1, 3, [])]
  if (tick === 130) return [controlsCommand(tick, 1, 5, [])]
  return []
}

// What player 1 does in the push-crate run: hold right from tick 10, add jump at tick 200, let go of everything at 260.
import { controlsCommand } from '#src/features/commands/commands.ts'
import type { Command } from '#src/features/sim/sim.ts'

/** How long the push-crate run lasts, in ticks (five seconds). */
export const PUSH_TICKS = 300

/** The commands for `tick`. A control is sent only when it changes, so most ticks send nothing. */
export function pushScript(tick: number): Command[] {
  if (tick === 10) return [controlsCommand(tick, 1, 0, ['right'])]
  if (tick === 200) return [controlsCommand(tick, 1, 1, ['jump', 'right'])]
  if (tick === 260) return [controlsCommand(tick, 1, 2, [])]
  return []
}

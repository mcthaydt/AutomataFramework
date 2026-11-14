// The scripted play the template's recording is taken from: the hero runs right and pushes the crate, jumps on the way,
// lets go, and runs back left. It sends a `controls` command only when what is held changes.
import { controlsCommand } from '#src/features/commands/commands.ts'
import type { Command } from '#src/features/sim/sim.ts'

/** How long the play lasts, in ticks (five seconds). */
export const TEMPLATE_TICKS = 300

/** The commands for `tick`: hold right from tick 0; add jump at 60; let go at 120; hold left from 120 to 180. */
export function templatePlay(tick: number): Command[] {
  if (tick === 0) return [controlsCommand(tick, 1, 0, ['right'])]
  if (tick === 60) return [controlsCommand(tick, 1, 1, ['jump', 'right'])]
  if (tick === 61) return [controlsCommand(tick, 1, 2, ['right'])]
  if (tick === 120) return [controlsCommand(tick, 1, 3, ['left'])]
  if (tick === 180) return [controlsCommand(tick, 1, 4, [])]
  return []
}

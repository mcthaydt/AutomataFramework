// The scripted play the template's recording is taken from: the hero runs right and pushes the crate, turns round, jumps
// once on the way back, and stops. It sends a `controls` command only when what is held changes.
import { controlsCommand } from '#src/features/commands/commands.ts'
import type { Command } from '#src/features/sim/sim.ts'

/** How long the play lasts, in ticks (five seconds). */
export const TEMPLATE_TICKS = 300

/**
 * The commands for `tick`: hold right from tick 0, which runs into the crate and pushes it to the wall; turn round at
 * 120 and hold left, jumping once at 130 on the way back; let go at 180. (A jump while pushing would carry the hero
 * over the crate and leave it where it was.)
 */
export function templatePlay(tick: number): Command[] {
  if (tick === 0) return [controlsCommand(tick, 1, 0, ['right'])]
  if (tick === 120) return [controlsCommand(tick, 1, 1, ['left'])]
  if (tick === 130) return [controlsCommand(tick, 1, 2, ['jump', 'left'])]
  if (tick === 131) return [controlsCommand(tick, 1, 3, ['left'])]
  if (tick === 180) return [controlsCommand(tick, 1, 4, [])]
  return []
}

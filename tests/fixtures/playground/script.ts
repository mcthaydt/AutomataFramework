// What player 1 does in the playground run: hold right from tick 10 until tick 200, then let go.
import { controlsCommand } from '#src/features/commands/commands.ts'
import type { Command } from '#src/features/sim/sim.ts'

/** How long the playground run lasts, in ticks (five seconds). */
export const PLAYGROUND_TICKS = 300

/** The commands for `tick`: a control is sent only when it changes. */
export function playgroundScript(tick: number): Command[] {
  if (tick === 10) return [controlsCommand(tick, 1, 0, ['right'])]
  if (tick === 200) return [controlsCommand(tick, 1, 1, [])]
  return []
}

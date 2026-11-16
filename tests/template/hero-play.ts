// The scripted play the template's recording is taken from: the hero runs right, takes the spark, jumps over the gap a tile
// before its edge, lands, pushes the crate to the door and touches it. It sends a `controls` command only when what is held
// changes. A player who plays this way never falls; one who walks on at the gap does (the game's own tests say so).
import { controlsCommand } from '#src/features/commands/commands.ts'
import type { Command } from '#src/features/sim/sim.ts'

/** How long the play lasts, in ticks (four seconds): the door is touched well before the end, and play goes on a little. */
export const TEMPLATE_TICKS = 240
/** The tick of the jump: the hero walks six tiles a second from x = 2.5, so 36 ticks is a tile before the gap. */
export const JUMP_AT = 36

/** The commands for `tick`: hold right from tick 0; jump (held for a whole jump) at `JUMP_AT`; keep right. */
export function templatePlay(tick: number): Command[] {
  if (tick === 0) return [controlsCommand(tick, 1, 0, ['right'])]
  if (tick === JUMP_AT) return [controlsCommand(tick, 1, 1, ['jump', 'right'])]
  if (tick === JUMP_AT + 24) return [controlsCommand(tick, 1, 2, ['right'])]
  return []
}

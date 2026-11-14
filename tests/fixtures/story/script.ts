// What player 1 does in the story run: hold right from tick 130 (once the opening is over), pick the first answer,
// press Next twice, jump at tick 400 with right still held, and let go of everything at tick 520.
import { controlsCommand } from '#src/features/commands/commands.ts'
import { chooseCommand, nextCommand } from '#src/features/level/level.ts'
import type { Command } from '#src/features/sim/sim.ts'

/** How long the story run lasts, in ticks (ten seconds). */
export const STORY_TICKS = 600

/** The commands for `tick`. A control is sent only when it changes, so most ticks send nothing. */
export function storyScript(tick: number): Command[] {
  if (tick === 130) return [controlsCommand(tick, 1, 0, ['right'])]
  if (tick === 230) return [chooseCommand(tick, 1, 1, 0)]
  if (tick === 250) return [nextCommand(tick, 1, 2)]
  if (tick === 270) return [nextCommand(tick, 1, 3)]
  if (tick === 400) return [controlsCommand(tick, 1, 4, ['jump', 'right'])]
  if (tick === 520) return [controlsCommand(tick, 1, 5, [])]
  return []
}

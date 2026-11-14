// The fixture game made for four players, and a run in which three of them come and one goes. Nothing in the fixture's
// own files changes: these are overrides for `loadFixtureGame`.
import { controlsCommand } from '#src/features/commands/commands.ts'
import { joinCommand, leaveCommand } from '#src/features/level/level.ts'
import type { Command } from '#src/features/sim/sim.ts'
import { fixtureFiles } from './read.ts'

const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] ?? '') as Record<string, unknown>

/** Start points for players 1 to 4, along the floor of the fixture's level. */
const starts = [2.5, 4.5, 9.5, 11.5].map((x, i) => ({ player: i + 1, x, y: 7.5 }))

/** Overrides that make the fixture a game for four people: `players = 4`, and a start point for each. */
export const coopFiles: Record<string, string> = {
  'automata.toml': (fixtureFiles['automata.toml'] ?? '').replace(
    'hero = "hero"\n',
    'hero = "hero"\nplayers = 4\n',
  ),
  'content/levels/level-1.json': JSON.stringify({ ...level, starts }),
}

/** How long the co-op run lasts, in ticks (five seconds). */
export const COOP_TICKS = 300

/**
 * What the four do. Tick 10: player 1 holds right. 30: player 2 joins. 40: player 2 holds right. 90: player 3 joins.
 * 100: player 3 holds jump. 150: player 2 leaves. 240: players 1 and 3 let go.
 */
export function coopScript(tick: number): Command[] {
  switch (tick) {
    case 10:
      return [controlsCommand(tick, 1, 0, ['right'])]
    case 30:
      return [joinCommand(tick, 2, 0)]
    case 40:
      return [controlsCommand(tick, 2, 1, ['right'])]
    case 90:
      return [joinCommand(tick, 3, 0)]
    case 100:
      return [controlsCommand(tick, 3, 1, ['jump'])]
    case 150:
      return [leaveCommand(tick, 2, 2)]
    case 240:
      return [controlsCommand(tick, 1, 1, []), controlsCommand(tick, 3, 2, [])]
    default:
      return []
  }
}

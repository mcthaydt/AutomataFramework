// What the two players do in the online runs: the push-crate run's idea (hold, add a jump, let go), once per seat.
import { controlsCommand } from '#src/features/commands/commands.ts'
import type { Command } from '#src/features/sim/sim.ts'

/** How long the online runs last, in ticks (ten seconds). */
export const ONLINE_TICKS = 600

/** What each seat holds from which tick. A control is sent only when it changes, so most ticks send nothing. */
const SCRIPT: Record<number, Record<number, readonly string[]>> = {
  1: { 10: ['right'], 200: ['jump', 'right'], 260: [] },
  2: { 30: ['left'], 120: ['jump', 'left'], 300: [], 400: ['right'], 520: [] },
}

/** The commands `seat` gives on `tick`. Only `type` and `payload` matter to a session, which stamps the rest. */
export function onlineScript(seat: number, tick: number): Command[] {
  const held = SCRIPT[seat]?.[tick]
  return held === undefined ? [] : [controlsCommand(tick, seat, 0, held)]
}

// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/testing/fixtures/bounce-script.ts
// How the bounce goldens drive the fixture: three balls set up before tick 0, then a kick now and then.
import type { Command, Rng, Sim } from '#src/features/sim/sim.ts'
import { Ball } from './bounce.component.ts'

export const BOUNCE_SEED = 42
export const BOUNCE_TICKS = 300

export function bounceSetup(sim: Sim): void {
  sim.spawn([[Ball, { x: 100, y: 200, vx: 7, vy: 3 }]])
  sim.spawn([[Ball, { x: 500, y: 500, vx: 1, vy: -1 }]])
  sim.spawn([[Ball, { x: 900, y: 50, vx: -11, vy: 9 }]])
}

/** A kick on one of the first three balls every 25 ticks; `seq` is the tick, so it is unique per source. */
export function bounceScript(tick: number, rng: Rng): readonly Command[] {
  if (tick % 25 !== 5) return []
  return [
    {
      tick,
      source: 0,
      seq: tick,
      type: 'bounce.kick',
      payload: { ball: 1 + rng.int(3), dvx: rng.int(7) - 3 },
    },
  ]
}

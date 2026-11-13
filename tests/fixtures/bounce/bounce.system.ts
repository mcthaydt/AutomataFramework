// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/testing/fixtures/bounce.system.ts
import { defineSystem, type SystemDef } from '#src/features/sim/sim.ts'
import { Kick } from './bounce.command.ts'
import { Ball } from './bounce.component.ts'
import { BounceStats } from './bounce.resource.ts'

/** The box is 0..BOX on both axes. */
export const BOX = 1000
const MAX_BALLS = 8

export const BounceKick: SystemDef = defineSystem({
  name: 'bounce.kick',
  phase: 'input',
  run(ctx) {
    for (const kick of ctx.commands.of(Kick)) {
      const ball = ctx.entity(kick.payload.ball)
      if (ball?.has(Ball)) ball.set(Ball, { vx: ball.get(Ball).vx + kick.payload.dvx })
    }
  },
})

/** Reflects a coordinate off the walls; returns the new position and velocity and whether it bounced. */
function reflect(p: number, v: number): { p: number; v: number; bounced: boolean } {
  const next = p + v
  if (next < 0) return { p: -next, v: -v, bounced: true }
  if (next > BOX) return { p: 2 * BOX - next, v: -v, bounced: true }
  return { p: next, v, bounced: false }
}

/**
 * The move system. `nudge` exists only for the diverged twin (bounce-diverged.plugin.ts): at that tick it adds 1
 * to that ball's vx before moving, so the two runs first differ in the hash after that step.
 */
export function moveSystem(nudge?: { readonly tick: number; readonly sid: number }): SystemDef {
  return defineSystem({
    name: 'bounce.move',
    phase: 'gameplay',
    run(ctx) {
      const stats = ctx.resource(BounceStats)
      for (const ball of ctx.query(Ball)) {
        const b = ball.get(Ball)
        const vx = nudge && ctx.tick === nudge.tick && ball.sid === nudge.sid ? b.vx + 1 : b.vx
        const x = reflect(b.x, vx)
        const y = reflect(b.y, b.vy)
        if (x.bounced) stats.bounces += 1
        if (y.bounced) stats.bounces += 1
        ball.set(Ball, { x: x.p, y: y.p, vx: x.v, vy: y.v })
      }
    },
  })
}

export const BounceMove: SystemDef = moveSystem()

/** Every 40 ticks (from tick 20) a ball appears at a random place with a random velocity, up to eight balls. */
export const BounceSpawn: SystemDef = defineSystem({
  name: 'bounce.spawn',
  phase: 'gameplay',
  after: ['bounce.move'],
  run(ctx) {
    if (ctx.tick % 40 !== 20 || ctx.query(Ball).length >= MAX_BALLS) return
    ctx.spawn([
      Ball,
      {
        x: ctx.rng.int(BOX + 1),
        y: ctx.rng.int(BOX + 1),
        vx: ctx.rng.int(25) - 12,
        vy: ctx.rng.int(25) - 12,
      },
    ])
    ctx.resource(BounceStats).spawned += 1
  },
})

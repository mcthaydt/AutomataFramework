// The fixture hero, with a sound to make: the same `hero.move` system as `tests/fixtures/game/hero.ts` with two events
// added, so the audio tests have something to hear. A game is given this plugin or the fixture hero, never both; the
// fixture hero and the goldens made with it stay as they were.
import { z } from 'zod'
import { isHeld, Player, wasPressed } from '#src/features/commands/commands.ts'
import { Body } from '#src/features/physics/physics.ts'
import {
  defineEvent,
  definePlugin,
  defineResource,
  defineSystem,
  type EventDef,
  type PluginDef,
  type ResourceDef,
} from '#src/features/sim/sim.ts'

/** Tiles per second the hero runs at, and the upward speed of a jump (y points down, so up is negative). */
const RUN = 6
const JUMP = -12

const payload: z.ZodObject<Record<string, never>, z.core.$strict> = z.strictObject({})
/** Raised on the tick a jump starts. */
const Jumped: EventDef<typeof payload> = defineEvent('hero.jumped', payload)
/** Raised on the first tick the hero is back on the ground after falling. */
const Landed: EventDef<typeof payload> = defineEvent('hero.landed', payload)

// Whether the hero was falling last tick. The sim snapshots resources, so this survives a restore; a variable in this
// module would not.
const memory: z.ZodObject<{ falling: z.ZodBoolean }, z.core.$strict> = z.strictObject({
  falling: z.boolean(),
})
const Falling: ResourceDef<typeof memory> = defineResource('sounding-hero.falling', memory, () => ({
  falling: false,
}))

const move = defineSystem({
  name: 'hero.move',
  phase: 'gameplay',
  run(ctx) {
    const memo = ctx.resource(Falling)
    for (const hero of ctx.query(Player, Body)) {
      const vy = hero.get(Body).vy
      const left = isHeld(hero, 'left')
      const right = isHeld(hero, 'right')
      const onGround = Math.abs(vy) < 0.01
      // The top of a jump is also `|vy| < 0.01`, so "on the ground" alone would land the hero in mid-air: a landing
      // is the first still tick after a tick of falling (y points down, so falling is a positive `vy`).
      if (onGround && memo.falling) ctx.emit(Landed, {})
      memo.falling = vy > 0.01
      const jumping = wasPressed(hero, 'jump') && onGround
      if (jumping) ctx.emit(Jumped, {})
      hero.set(Body, {
        vx: left === right ? 0 : left ? -RUN : RUN,
        ...(jumping ? { vy: JUMP } : {}),
      })
    }
  },
})

/** The sounding hero's plugin: after physics and commands, since it reads `Player` and writes `Body`. */
export const soundingHeroPlugin: PluginDef = definePlugin({
  name: 'sounding-hero',
  dependsOn: ['physics', 'commands'],
  events: [Jumped, Landed],
  resources: [Falling],
  systems: [move],
})

// The playground's game code: the M1 fixture's hero, and a score kept from the touch events the level makes.
import { z } from 'zod'
import { touchEvent } from '#src/features/level/level.ts'
import {
  definePlugin,
  defineResource,
  defineSystem,
  type PluginDef,
  type ResourceDef,
} from '#src/features/sim/sim.ts'

const scoreSchema: z.ZodObject<{ sparks: z.ZodNumber; inDoor: z.ZodBoolean }> = z.object({
  sparks: z.number().int(),
  inDoor: z.boolean(),
})

/** How many sparks the hero has taken, and whether the hero stands in the door. */
export const Score: ResourceDef<typeof scoreSchema> = defineResource('playground.score', scoreSchema, () => ({
  sparks: 0,
  inDoor: false,
}))

const keep = defineSystem({
  name: 'playground.score',
  phase: 'gameplay',
  run(ctx) {
    const score = ctx.resource(Score)
    score.sparks += ctx.events.of(touchEvent('spark', 'taken')).length
    if (ctx.events.of(touchEvent('door', 'touched')).length > 0) score.inDoor = true
    if (ctx.events.of(touchEvent('door', 'left')).length > 0) score.inDoor = false
  },
})

/** The score. The hero's own plugin is the M1 fixture's. */
export const playgroundPlugin: PluginDef = definePlugin({
  name: 'playground',
  dependsOn: ['level', 'touch'],
  resources: [Score],
  systems: [keep],
})

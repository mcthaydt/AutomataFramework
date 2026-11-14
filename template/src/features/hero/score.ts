// The score: how many sparks the hero has taken. A character with `"touch": "take"` in its file (the spark) is taken
// away when the hero touches it, and the game says so with an event named after its kind: `spark.taken`. A system hears
// the events of its own tick with `ctx.events.of`, and keeps what it learns in a resource, a value the whole game shares.
import {
  defineResource,
  defineSystem,
  type ResourceDef,
  type SystemDef,
  touchEvent,
  z,
} from '@automataframework/framework/headless'

const scoreSchema: z.ZodObject<{ sparks: z.ZodNumber }> = z.object({ sparks: z.number().int() })

/** How many sparks the hero has taken. */
export const Score: ResourceDef<typeof scoreSchema> = defineResource('hero.score', scoreSchema, () => ({
  sparks: 0,
}))

/** Adds the sparks taken this tick. It runs in `gameplay`, after the touches of the tick are made, so it hears them. */
export const countSparks: SystemDef = defineSystem({
  name: 'hero.count-sparks',
  phase: 'gameplay',
  run(ctx) {
    ctx.resource(Score).sparks += ctx.events.of(touchEvent('spark', 'taken')).length
  },
})

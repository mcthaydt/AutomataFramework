// A game that counts sparks, for the flow's score tests (plan Q, Task 8): a resource `hero.score` with `sparks`, a
// system that adds each `spark.taken` of a tick to it, and the plugin that holds both. `score = "hero.score.sparks"` in
// the game's file (`FlowGameOptions.score`) names it; the other two names are ones a game could get wrong.

import { touchEvent } from '#src/features/level/level.ts'
import {
  definePlugin,
  defineResource,
  defineSystem,
  type PluginDef,
  type ResourceDef,
} from '#src/features/sim/sim.ts'
import { z } from '#src/lib/zod.ts'

const schema: z.ZodObject<{ sparks: z.ZodNumber; label: z.ZodString }> = z.object({
  sparks: z.number().int(),
  label: z.string(),
})

/** The sparks taken, and a field that is words and so cannot be a score. */
export const Score: ResourceDef<typeof schema> = defineResource('hero.score', schema, () => ({
  sparks: 0,
  label: 'none',
}))

/** The plugin of the score: it hears the touches of the tick after they are made. */
export const scorePlugin: PluginDef = definePlugin({
  name: 'score',
  dependsOn: ['physics', 'commands', 'level', 'touch'],
  resources: [Score],
  systems: [
    defineSystem({
      name: 'score.count',
      phase: 'gameplay',
      run(ctx) {
        ctx.resource(Score).sparks += ctx.events.of(touchEvent('spark', 'taken')).length
      },
    }),
  ],
})

/** What `automata.toml` says `score` is, for each kind of game the tests make. */
export const SCORE_NAMES = {
  sparks: 'hero.score.sparks',
  /** A resource the game does not have. */
  missing: 'nowhere.sparks',
  /** A field that is words, not a number. */
  words: 'hero.score.label',
} as const

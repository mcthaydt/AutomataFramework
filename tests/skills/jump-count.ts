import {
  defineResource,
  definePlugin,
  defineSystem,
  moveEvent,
  type PluginDef,
  type ResourceDef,
  z,
} from '@automataframework/framework/headless'

const countSchema: z.ZodObject<{ jumps: z.ZodNumber }> = z.object({ jumps: z.number().int() })

/** How many times the hero has jumped, from the ground or in the air. */
export const Jumps: ResourceDef<typeof countSchema> = defineResource('hero.jumps', countSchema, () => ({
  jumps: 0,
}))

/** Adds the jumps of this tick. It runs after the framework's moves, so it hears what they said this tick. */
const countJumps = defineSystem({
  name: 'hero.count-jumps',
  phase: 'gameplay',
  after: ['level.moves'],
  run(ctx) {
    ctx.resource(Jumps).jumps += ctx.events.of(moveEvent('jumped')).length
  },
})

/** The jump counter's plugin: list it in `gamePlugins` after the hero's. */
export const jumpCountPlugin: PluginDef = definePlugin({
  name: 'jump-count',
  dependsOn: ['level'],
  resources: [Jumps],
  systems: [countJumps],
})

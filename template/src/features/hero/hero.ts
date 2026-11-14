// The hero: the rules for the character the player controls. This is a plugin, a named bundle of rules (systems) that
// the game lists in `src/headless.ts`.
import { definePlugin, type PluginDef } from '@automataframework/framework/headless'
import { Hero, moveHero } from './move.ts'

/** The hero's plugin. It runs after physics and commands, because it reads what the player holds and writes the body's speed. */
export const heroPlugin: PluginDef = definePlugin({
  name: 'hero',
  dependsOn: ['physics', 'commands'],
  components: [Hero],
  systems: [moveHero],
})

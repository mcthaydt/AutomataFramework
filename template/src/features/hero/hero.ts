// The hero's rules. The framework walks and jumps the hero from `content/characters/hero.json` (its `moves` line) and the
// numbers in `content/tunings/hero-moves.json`, so this game has no movement code. What is left is the game's own rule: the
// score. This is a plugin, a named bundle of rules (systems) that the game lists in `src/headless.ts`.
import { definePlugin, type PluginDef } from '@automataframework/framework/headless'
import { countSparks, Score } from './score.ts'

/** The hero's plugin. It runs after the level and the touches, because it counts the sparks the hero takes. */
export const heroPlugin: PluginDef = definePlugin({
  name: 'hero',
  dependsOn: ['physics', 'commands', 'level', 'touch'],
  resources: [Score],
  systems: [countSparks],
})

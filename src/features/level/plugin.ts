import { definePlugin, type PluginDef } from '../sim/sim.ts'
import { Look, Thing } from './components.ts'

/**
 * The level's plugin: the components its entities carry. It has no systems, since a level is spawned once and then
 * only physics and the game's own code move things. It needs physics (for the bodies) and commands (for the heroes).
 */
export const levelPlugin: PluginDef = definePlugin({
  name: 'level',
  dependsOn: ['physics', 'commands'],
  components: [Look, Thing],
})

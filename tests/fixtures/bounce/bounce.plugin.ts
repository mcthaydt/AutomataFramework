// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/testing/fixtures/bounce.plugin.ts
// The bounce fixture: integer-math balls in a box, with RNG spawns, a resource and a command.
import { definePlugin, type PluginDef } from '#src/features/sim/sim.ts'
import { Kick } from './bounce.command.ts'
import { Ball } from './bounce.component.ts'
import { BounceStats } from './bounce.resource.ts'
import { BounceKick, BounceMove, BounceSpawn } from './bounce.system.ts'

export const bouncePlugin: PluginDef = definePlugin({
  name: 'bounce',
  components: [Ball],
  commands: [Kick],
  resources: [BounceStats],
  systems: [BounceKick, BounceMove, BounceSpawn],
})

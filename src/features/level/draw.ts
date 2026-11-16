// Where a thing is drawn: behind the ground, or in front of everything. The renderer reads it; no system does, so it
// only ever changes the picture. A thing that is drawn with the hero (as every thing is when its level says nothing)
// has none.
import { type ComponentDef, defineComponent, definePlugin, type PluginDef } from '../sim/sim.ts'

const drawFields = { layer: 'string' } as const
/** `behind` or `in-front`: which of the renderer's layers the thing is on. Drawn. */
export const Draw: ComponentDef<typeof drawFields> = defineComponent('level.draw', drawFields)

/** The plugin a game with a thing drawn behind or in front gets: only the component, since nothing reads it. */
export const drawPlugin: PluginDef = definePlugin({
  name: 'draw',
  dependsOn: ['level'],
  components: [Draw],
})

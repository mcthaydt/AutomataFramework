import { type ComponentDef, defineComponent } from '../sim/sim.ts'

/** The colour of a solid tile, and of the sky behind the level: 0xrrggbb. */
export const TILE_COLOR = 0x3b4a5a
export const SKY_COLOR = 0x9fd3f0

const lookFields = { w: 'f32', h: 'f32', color: 'u32' } as const
/** What is drawn for an entity: a box this many tiles wide and tall, in this colour (0xrrggbb). */
export const Look: ComponentDef<typeof lookFields> = defineComponent('look', lookFields)

const thingFields = { id: 'string', character: 'string' } as const
/**
 * Which thing of the level file an entity is, and which character. Heroes are `player-<number>`; tiles belong to no
 * thing and have none. Not drawn.
 */
export const Thing: ComponentDef<typeof thingFields> = defineComponent('thing', thingFields, {
  render: false,
})

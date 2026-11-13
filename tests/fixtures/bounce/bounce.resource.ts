// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/testing/fixtures/bounce.resource.ts

import { z } from 'zod'
import { defineResource, type ResourceDef } from '#src/features/sim/sim.ts'

const statsSchema: z.ZodObject<{ bounces: z.ZodNumber; spawned: z.ZodNumber }> = z.object({
  bounces: z.number().int(),
  spawned: z.number().int(),
})
/** How many times a ball hit a wall, and how many balls the spawner added. */
export const BounceStats: ResourceDef<typeof statsSchema> = defineResource(
  'bounce.stats',
  statsSchema,
  () => ({
    bounces: 0,
    spawned: 0,
  }),
)

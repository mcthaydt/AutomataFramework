// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/testing/fixtures/bounce.command.ts

import { z } from 'zod'
import { type CommandDef, defineCommand } from '#src/features/sim/sim.ts'

const kickSchema: z.ZodObject<{ ball: z.ZodNumber; dvx: z.ZodNumber }> = z.object({
  ball: z.number().int(),
  dvx: z.number().int(),
})
/** Adds `dvx` to one ball's horizontal velocity. */
export const Kick: CommandDef<typeof kickSchema> = defineCommand('bounce.kick', kickSchema)

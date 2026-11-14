// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/features/2d/physics-2d.event.ts

import { z } from '../../lib/zod.ts'
import { defineEvent, type EventDef } from '../sim/sim.ts'

// Collision events: `a < b` are the two entities' StableIds; `sensor` when either is a sensor.
const pair: z.ZodObject<{ a: z.ZodNumber; b: z.ZodNumber; sensor: z.ZodBoolean }> = z.object({
  a: z.number().int(),
  b: z.number().int(),
  sensor: z.boolean(),
})

/**
 * Two colliders began touching (or, with a sensor, overlapping). `a` and `b` are the entities' StableIds, `a`
 * the lower, and `sensor` is true when either collider is a sensor. Emitted in `postPhysics`, in `(a, b)`
 * order, after that tick's ended events.
 */
export const CollisionStarted: EventDef<typeof pair> = defineEvent('physics.collision-started', pair)
/**
 * Two colliders stopped touching, or one was removed. The payload is the one of `CollisionStarted`; ended
 * events come before started events in a tick.
 */
export const CollisionEnded: EventDef<typeof pair> = defineEvent('physics.collision-ended', pair)

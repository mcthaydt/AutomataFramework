// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/shared/physics.system.ts
import { defineSystem, type SimContext, type SystemDef } from '../sim/sim.ts'
import type { PhysicsWorld } from './physics-world.ts'

// The four physics systems. Each reads its sim's own PhysicsWorld from `ctx.pluginState`; the logic lives in
// physics-world.ts, behind the Rapier adapter.

const physicsOf = (ctx: SimContext): PhysicsWorld<unknown> => ctx.pluginState as PhysicsWorld<unknown>

export const syncInSystem: SystemDef = defineSystem({
  name: 'physics.sync-in',
  phase: 'prePhysics',
  run: (ctx) => physicsOf(ctx).syncIn(ctx),
})
export const stepSystem: SystemDef = defineSystem({
  name: 'physics.step',
  phase: 'physics',
  run: (ctx) => physicsOf(ctx).step(),
})
export const syncOutSystem: SystemDef = defineSystem({
  name: 'physics.sync-out',
  phase: 'postPhysics',
  run: (ctx) => physicsOf(ctx).syncOut(ctx),
})
export const eventsSystem: SystemDef = defineSystem({
  name: 'physics.events',
  phase: 'postPhysics',
  after: ['physics.sync-out'],
  run: (ctx) => physicsOf(ctx).emitEvents(ctx),
})

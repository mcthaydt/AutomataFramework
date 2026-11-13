// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/features/2d/physics-2d.ts
// The physics feature's entry: the plugin, and everything another feature may use of it. Game code never imports Rapier.
import { definePlugin, type PluginDef } from '../sim/sim.ts'
import { Body, Collider, Transform } from './components.ts'
import { CollisionEnded, CollisionStarted } from './events.ts'
import { PhysicsWorld } from './physics-world.ts'
import { eventsSystem, stepSystem, syncInSystem, syncOutSystem } from './systems.ts'

export { Body, Collider, Transform } from './components.ts'
export { CollisionEnded, CollisionStarted } from './events.ts'
export { BodyKind, type ColliderOptions, ShapeKind } from './kinds.ts'
export { body, collider, transform } from './spawn.ts'

/**
 * The options of `physics`. Gravity is part of the sim's schema hash, so a different gravity is a different sim.
 */
export interface PhysicsOptions {
  /** m/s², default { x: 0, y: 9.81 }: y points down, as everywhere in the framework, so the default pulls things down. */
  readonly gravity?: { readonly x: number; readonly y: number }
}

/**
 * The physics plugin. Rapier's wasm loads inside `createSim`, through the dynamic import of rapier.ts, so importing
 * this module costs nothing until a sim uses it.
 */
export function physics(options: PhysicsOptions = {}): PluginDef {
  const given = options.gravity ?? { x: 0, y: 9.81 }
  // A frozen copy: gravity is hashed now, so a caller mutating its own object later must not change what
  // Rapier runs with. `+ 0` turns -0 into 0, which Rapier treats the same, so they hash the same too.
  const gravity = Object.freeze({ x: given.x + 0, y: given.y + 0 })
  return definePlugin({
    name: 'physics',
    // Gravity changes what the plugin simulates, so it is part of the schema hash.
    config: { gravity },
    components: [Transform, Body, Collider],
    events: [CollisionStarted, CollisionEnded],
    systems: [syncInSystem, stepSystem, syncOutSystem, eventsSystem],
    state: async ({ dt }) => {
      const { createRapier } = await import('./rapier.ts')
      return new PhysicsWorld(await createRapier({ gravity, dt }))
    },
  })
}

// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/features/2d/physics-2d.ts
// The physics feature's entry: the plugin, and everything another feature may use of it. Game code never imports Rapier.
import { definePlugin, type PluginDef } from '../sim/sim.ts'
import { Body, Collider, Ground, Joint, Touching, Transform } from './components.ts'
import { CollisionEnded, CollisionStarted } from './events.ts'
import { PhysicsWorld } from './physics-world.ts'
import { eventsSystem, stepSystem, syncInSystem, syncOutSystem } from './systems.ts'

export { Body, Collider, Ground, Joint, Touching, Transform } from './components.ts'
export { CollisionEnded, CollisionStarted } from './events.ts'
export { BodyKind, type ColliderOptions, JointKind, ShapeKind } from './kinds.ts'
export { body, collider, joint, transform } from './spawn.ts'
export { type Felt, type FeltContact, felt, STEEP, TOUCH_SLOP } from './touching.ts'

/**
 * The options of `physics`. Gravity is part of the sim's schema hash, so a different gravity is a different sim.
 */
export interface PhysicsOptions {
  /** m/s², default { x: 0, y: 9.81 }: y points down, as everywhere in the framework, so the default pulls things down. */
  readonly gravity?: { readonly x: number; readonly y: number }
  /**
   * Adds the `Joint` component, so entities can be pinned and roped together. Left out, the sim is exactly as it was
   * before joints existed: the component, like every component, is part of the schema hash.
   */
  readonly joints?: boolean
  /**
   * Adds the `Touching` component, filled after every step with what a body stands on and leans against, for each
   * entity that has one. Left out, the sim is exactly as it was before the component existed.
   */
  readonly touching?: boolean
  /**
   * Adds the `Ground` component, filled beside `Touching` with the normal of what a body stands on, for each entity that
   * has both. Needs `touching`. Left out, the sim is exactly as it was before the component existed.
   */
  readonly slopes?: boolean
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
    config: {
      gravity,
      ...(options.joints ? { joints: true } : {}),
      ...(options.touching ? { touching: true } : {}),
      ...(options.touching && options.slopes ? { slopes: true } : {}),
    },
    components: [
      Transform,
      Body,
      Collider,
      ...(options.joints ? [Joint] : []),
      ...(options.touching ? [Touching] : []),
      ...(options.touching && options.slopes ? [Ground] : []),
    ],
    events: [CollisionStarted, CollisionEnded],
    systems: [syncInSystem, stepSystem, syncOutSystem, eventsSystem],
    state: async ({ dt }) => {
      const { createRapier } = await import('./rapier.ts')
      return new PhysicsWorld(await createRapier({ gravity, dt }), {
        joints: options.joints === true,
        touching: options.touching === true,
        slopes: options.touching === true && options.slopes === true,
      })
    },
  })
}

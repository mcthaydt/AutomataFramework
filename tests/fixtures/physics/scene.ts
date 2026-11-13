// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/testing/scene-2d.ts
// The mixed scene for the snapshot and parity tests.

import { z } from 'zod'
import {
  Body,
  BodyKind,
  body,
  Collider,
  collider,
  physics,
  Transform,
  transform,
} from '#src/features/physics/physics.ts'
import {
  type Command,
  createSim,
  defineCommand,
  definePlugin,
  defineSystem,
  type PluginDef,
  type Sim,
  type SimContext,
} from '#src/features/sim/sim.ts'

// The scene is laid out with y up (the floor under the balls), so it asks for that gravity; the default points down.
const Y_UP_GRAVITY = { x: 0, y: -9.81 }

const Kill = defineCommand('kill', z.object({ sid: z.number().int() }))
const Drop = defineCommand('drop', z.object({ x: z.number() }))
const Walk = defineCommand('walk', z.object({ x: z.number() }))
const Edit = defineCommand('edit', z.object({ index: z.number().int() }))

/** The kinematic capsule is the first entity spawned. */
const WALKER_SID = 1

/**
 * Component edits a game makes between ticks, applied by index from the `edit` command: each one
 * goes through a different sync-in path (collider rebuild, sensor toggle, velocity, kind, damping, removal
 * and re-adding of a collider, teleport, size and groups).
 */
const EDITS: ReadonlyArray<(ctx: SimContext) => void> = [
  (ctx) => ctx.entity(6)?.set(Collider, { friction: 0.1 }),
  (ctx) => ctx.entity(ZONE_SID)?.set(Collider, { sensor: false }),
  (ctx) => ctx.entity(8)?.set(Body, { vx: 3 }),
  (ctx) => ctx.entity(9)?.set(Body, { kind: BodyKind.fixed }),
  (ctx) => ctx.entity(ZONE_SID)?.set(Collider, { sensor: true }),
  (ctx) => ctx.entity(10)?.remove(Collider),
  (ctx) => ctx.entity(9)?.set(Body, { kind: BodyKind.dynamic }),
  (ctx) => ctx.entity(11)?.set(Transform, { x: 1, y: 5 }),
  (ctx) => ctx.entity(13)?.set(Body, { linearDamping: 2 }),
  (ctx) => ctx.entity(10)?.add(Collider, (collider.ball(0.35) as readonly [unknown, never])[1]),
  (ctx) => ctx.entity(15)?.set(Collider, { groups: 0x00010001 }),
  (ctx) => ctx.entity(14)?.set(Collider, { hx: 0.5 }),
]
/** The tick each edit runs at, in EDITS order; some fall either side of the restore at tick 150. */
const EDIT_TICKS: readonly number[] = [60, 70, 80, 95, 100, 110, 130, 140, 145, 155, 170, 200]
const ZONE_SID = 4

const scenePlugin = definePlugin({
  name: 'scene',
  commands: [Kill, Drop, Walk, Edit],
  systems: [
    defineSystem({
      name: 'scene.input',
      phase: 'input',
      run(ctx) {
        for (const c of ctx.commands.of(Kill)) ctx.despawn(c.payload.sid)
        for (const c of ctx.commands.of(Drop))
          ctx.spawn(
            transform({ x: c.payload.x, y: 6, rotation: 0.3 }),
            body(BodyKind.dynamic),
            collider.cuboid(0.3, 0.2, { restitution: 0.3 }),
          )
        for (const c of ctx.commands.of(Edit)) (EDITS[c.payload.index] as (ctx: SimContext) => void)(ctx)
        for (const c of ctx.commands.of(Walk)) {
          const walker = ctx.entity(WALKER_SID)
          if (walker) walker.set(Transform, { x: walker.get(Transform).x + c.payload.x })
        }
      },
    }),
  ],
})

export async function createScene(): Promise<Sim> {
  const sim = await createSim({ seed: 2026, plugins: scenePlugins() })
  spawnScene(sim)
  return sim
}

/** The scene's plugins, for callers that create the sim themselves (the snapshot property test). */
export function scenePlugins(): PluginDef[] {
  return [physics({ gravity: Y_UP_GRAVITY }), scenePlugin]
}

/** The scene's walker, floor, walls, sensor, two dozen bodies and ramp. */
export function spawnScene(sim: Sim): void {
  sim.spawn([transform({ x: -3, y: 0.75 }), body(BodyKind.kinematicPosition), collider.capsule(0.45, 0.3)])
  sim.spawn([transform({ y: -0.1 }), collider.cuboid(8, 0.1)])
  sim.spawn([transform({ x: 8.1, y: 1 }), collider.cuboid(0.1, 1)])
  sim.spawn([transform({ y: 1.5 }), collider.cuboid(1.5, 0.2, { sensor: true })])
  for (let i = 0; i < 24; i++)
    sim.spawn([
      transform({ x: (i % 6) - 2.5, y: 2 + Math.floor(i / 6) * 1.2, rotation: i * 0.1 }),
      body(BodyKind.dynamic, { linearDamping: 0.05 }),
      i % 3 === 0 ? collider.cuboid(0.3, 0.3) : collider.ball(0.35, { friction: 0.7, restitution: 0.4 }),
    ])
  // A tilted lone ramp: its angle reads back from Rapier differently from the authored 0.3.
  sim.spawn([transform({ x: -6, y: 0.5, rotation: 0.3 }), collider.cuboid(1.5, 0.1)])
}

/** The commands for tick `t`: a walk every tick for 120 ticks, drops every 25, two despawns and the edits. */
export function sceneCommands(t: number): Command[] {
  const out: Command[] = []
  let seq = 0
  const add = (type: string, payload: unknown) => out.push({ tick: t, source: 0, seq: seq++, type, payload })
  if (t < 120) add('walk', { x: 0.04 })
  if (t % 25 === 10) add('drop', { x: ((t * 3) % 7) - 3 })
  if (t === 90) add('kill', { sid: 7 })
  if (t === 149) add('kill', { sid: 12 })
  const edit = EDIT_TICKS.indexOf(t)
  if (edit >= 0) add('edit', { index: edit })
  return out
}

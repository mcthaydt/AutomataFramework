// The joints scene for the snapshot and parity tests (plan P): a seesaw, a chain, a swing and eight balls, with
// things dropped on them, a link killed, a rope changed, a joint taken away, a rope added between two balls and a
// pinned link's collider removed, so every path through the joint table runs in every engine.

import { z } from 'zod'
import {
  BodyKind,
  body,
  Collider,
  collider,
  Joint,
  joint,
  physics,
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

const Kill = defineCommand('kill', z.object({ sid: z.number().int() }))
const Drop = defineCommand('drop', z.object({ x: z.number() }))
const Edit = defineCommand('edit', z.object({ index: z.number().int() }))

// The sids, in the order spawnJointsScene spawns them: the fixed anchor with no collider, the floor, the seesaw's
// plank and its joint, four chain links each followed by its joint, the swing's platform and its two ropes, then
// eight balls.
const SEESAW_JOINT = 4
const CHAIN_LINK_2 = 7
const CHAIN_LINK_3 = 9
const LEFT_ROPE = 14
const FIRST_BALL = 16

/** Component edits made between ticks, by index from the `edit` command. */
const EDITS: ReadonlyArray<(ctx: SimContext) => void> = [
  // the left rope gets longer
  (ctx) => ctx.entity(LEFT_ROPE)?.set(Joint, { max: 3 }),
  // the seesaw's joint is taken away, so its plank falls free
  (ctx) => ctx.entity(SEESAW_JOINT)?.remove(Joint),
  // a rope between two balls, made while they move
  (ctx) => {
    ctx.spawn(joint.rope(FIRST_BALL + 1, FIRST_BALL + 2, 2))
  },
  // a pinned link loses its collider: its row is rebuilt as a body alone while it is joined
  (ctx) => ctx.entity(CHAIN_LINK_3)?.remove(Collider),
]
/** The tick each edit runs at, in EDITS order. */
const EDIT_TICKS: readonly number[] = [120, 140, 160, 200]

const scenePlugin = definePlugin({
  name: 'joints-scene',
  commands: [Kill, Drop, Edit],
  systems: [
    defineSystem({
      name: 'joints-scene.input',
      phase: 'input',
      run(ctx) {
        for (const c of ctx.commands.of(Kill)) ctx.despawn(c.payload.sid)
        for (const c of ctx.commands.of(Drop))
          ctx.spawn(
            transform({ x: c.payload.x, y: -2, rotation: 0.3 }),
            body(BodyKind.dynamic, { linearDamping: 0.05 }),
            collider.cuboid(0.3, 0.2, { restitution: 0.3 }),
          )
        for (const c of ctx.commands.of(Edit)) (EDITS[c.payload.index] as (ctx: SimContext) => void)(ctx)
      },
    }),
  ],
})

/** The scene's plugins, for callers that create the sim themselves (the snapshot property test). */
export function jointsScenePlugins(): PluginDef[] {
  return [physics({ joints: true }), scenePlugin]
}

export async function createJointsScene(): Promise<Sim> {
  const sim = await createSim({ seed: 2026, plugins: jointsScenePlugins() })
  spawnJointsScene(sim)
  return sim
}

/** The anchor, floor, seesaw, chain, swing and balls. */
export function spawnJointsScene(sim: Sim): void {
  const anchor = sim.spawn([transform(), body(BodyKind.fixed)])
  sim.spawn([transform({ y: 6 }), collider.cuboid(8, 0.1)])
  // A seesaw: a plank pinned at its middle to a point on the level, free to turn a third of a radian either way.
  const plank = sim.spawn([transform({ x: -3, y: 4.5 }), body(BodyKind.dynamic), collider.cuboid(2, 0.1)])
  sim.spawn([joint.pin(plank, anchor, { bx: -3, by: 4.5, min: -0.35, max: 0.35 })])
  // A chain: four links, each pinned by its top to the bottom of the one above, the first to the level at (3, 0).
  let above = anchor
  for (let i = 0; i < 4; i++) {
    const link = sim.spawn([
      transform({ x: 3, y: 0.3 + i * 0.6 }),
      body(BodyKind.dynamic, { angularDamping: 0.1 }),
      collider.cuboid(0.1, 0.3),
    ])
    sim.spawn([
      i === 0 ? joint.pin(link, above, { ay: -0.3, bx: 3 }) : joint.pin(link, above, { ay: -0.3, by: 0.3 }),
    ])
    above = link
  }
  // A swing: a platform hung from two ropes of 2.5.
  const platform = sim.spawn([transform({ y: 3 }), body(BodyKind.dynamic), collider.cuboid(1.2, 0.1)])
  sim.spawn([joint.rope(platform, anchor, 2.5, { ax: -1.2, bx: -1.2, by: 0.5 })])
  sim.spawn([joint.rope(platform, anchor, 2.5, { ax: 1.2, bx: 1.2, by: 0.5 })])
  for (let i = 0; i < 8; i++)
    sim.spawn([
      transform({ x: -3 + i * 0.9, y: -1 - (i % 3) * 0.7 }),
      body(BodyKind.dynamic, { linearDamping: 0.05 }),
      collider.ball(0.3, { friction: 0.7, restitution: 0.4 }),
    ])
}

/** The commands for tick `t`: a drop every 25 ticks, two despawns and the edits. */
export function jointsCommands(t: number): Command[] {
  const out: Command[] = []
  let seq = 0
  const add = (type: string, payload: unknown) => out.push({ tick: t, source: 0, seq: seq++, type, payload })
  if (t % 25 === 10) add('drop', { x: ((t * 3) % 7) - 3 })
  if (t === 90) add('kill', { sid: CHAIN_LINK_2 })
  if (t === 149) add('kill', { sid: FIRST_BALL })
  const edit = EDIT_TICKS.indexOf(t)
  if (edit >= 0) add('edit', { index: edit })
  return out
}

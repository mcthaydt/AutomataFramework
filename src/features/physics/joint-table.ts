// Which entity owns which Rapier joint, when each is made and removed, and its bytes in a snapshot. The world code
// (physics-world.ts) calls the table at fixed moments of sync-in; everything that calls Rapier itself is behind
// `JointAdapter`, implemented in rapier.ts.

import { type ComponentDef, type EntityRef, type SimContext, SnapshotFormatError } from '../sim/sim.ts'
import { handleBits, sameHandles } from './handle-bits.ts'
import { JointKind } from './kinds.ts'

/** The fields of a `Joint` component, as the table remembers them and Rapier is given them. */
export interface JointSpec {
  readonly kind: number
  readonly a: number
  readonly b: number
  readonly ax: number
  readonly ay: number
  readonly bx: number
  readonly by: number
  readonly limited: boolean
  readonly min: number
  readonly max: number
}

/** The part of Rapier the joint table needs. `World` is Rapier's own world. */
export interface JointAdapter<World> {
  readonly Joint: ComponentDef
  /** Throws an Error naming the sid and field when the entity's joint fields are invalid. */
  validateJoint(entity: EntityRef): void
  /** Joins the two bodies by their handles, `a` and `b` in the spec's own sense; returns the joint's handle. */
  createJoint(world: World, spec: JointSpec, bodyA: number, bodyB: number): number
  removeJoint(world: World, joint: number): void
  /** The handles of the two bodies the joint holds, `a`'s first. */
  jointBodies(world: World, joint: number): { a: number; b: number }
}

/** What one joint entity owns in Rapier, and the fields it was built from. */
export interface JointRow {
  readonly handle: number
  readonly bodyA: number
  readonly bodyB: number
  readonly spec: JointSpec
}

/** The bytes of one joint in a snapshot: 4 + 3 × 8 + 1 + 2 × 4 + 4 × 4 + 1 + 2 × 4. */
const ROW_BYTES = 62

const FIELDS = ['kind', 'a', 'b', 'ax', 'ay', 'bx', 'by', 'limited', 'min', 'max'] as const

function specOf(entity: EntityRef, Joint: ComponentDef): JointSpec {
  const j = entity.get(Joint) as unknown as JointSpec
  return {
    kind: j.kind,
    a: j.a,
    b: j.b,
    ax: j.ax,
    ay: j.ay,
    bx: j.bx,
    by: j.by,
    limited: j.limited,
    min: j.min,
    max: j.max,
  }
}

const sameSpec = (x: JointSpec, y: JointSpec): boolean => FIELDS.every((f) => x[f] === y[f])

/** The joints of one physics world, by the StableId of the entity that carries the `Joint`. */
export class JointTable<World> {
  rows: Map<number, JointRow> = new Map()

  constructor(private readonly adapter: JointAdapter<World>) {}

  /** Every joint handle the table holds. */
  handles(): number[] {
    return [...this.rows.values()].map((row) => row.handle)
  }

  /**
   * Removes, lowest sid first, every joint whose entity is gone or has no `Joint`, whose fields differ from the
   * ones it was built from, or one of whose ends is in `doomed` (a body about to be removed). Rapier would remove
   * a body's joints itself, but then the table and the world would disagree for a moment.
   */
  removeBroken(ctx: SimContext, world: World, doomed: ReadonlySet<number>): void {
    for (const sid of [...this.rows.keys()].sort((x, y) => x - y)) {
      const row = this.rows.get(sid) as JointRow
      const entity = ctx.entity(sid)
      const broken =
        entity === undefined ||
        !entity.has(this.adapter.Joint) ||
        !sameSpec(specOf(entity, this.adapter.Joint), row.spec) ||
        doomed.has(row.spec.a) ||
        doomed.has(row.spec.b)
      if (!broken) continue
      this.adapter.removeJoint(world, row.handle)
      this.rows.delete(sid)
    }
  }

  /**
   * Makes, lowest sid first, a joint for every entity with a `Joint` that has none. An end that is not alive yet
   * makes the joint wait, with no error; an end that is alive but has no body (`bodyOf` finds none) is an Error,
   * because the joint would otherwise wait for ever with nothing to say why.
   */
  createMissing(ctx: SimContext, world: World, bodyOf: (sid: number) => number | undefined): void {
    for (const entity of ctx.query(this.adapter.Joint)) {
      if (this.rows.has(entity.sid)) continue
      this.adapter.validateJoint(entity)
      const spec = specOf(entity, this.adapter.Joint)
      let waiting = false
      for (const [field, end] of [
        ['a', spec.a],
        ['b', spec.b],
      ] as const) {
        if (ctx.entity(end) === undefined) waiting = true
        else if (bodyOf(end) === undefined)
          throw new Error(
            `entity ${entity.sid}: physics.joint.${field} is ${end}; entity ${end} has no physics.body, so nothing can be joined to it`,
          )
      }
      if (waiting) continue
      const bodyA = bodyOf(spec.a) as number
      const bodyB = bodyOf(spec.b) as number
      this.rows.set(entity.sid, {
        handle: this.adapter.createJoint(world, spec, bodyA, bodyB),
        bodyA,
        bodyB,
        spec,
      })
    }
  }

  /** The bytes the table takes in a snapshot: a count, then each joint in ascending sid order. */
  byteLength(): number {
    return 4 + this.rows.size * ROW_BYTES
  }

  /** Writes the table at `at` and returns where it ends. */
  write(view: DataView, start: number): number {
    let at = start
    view.setUint32(at, this.rows.size, true)
    at += 4
    for (const sid of [...this.rows.keys()].sort((x, y) => x - y)) {
      const { handle, bodyA, bodyB, spec } = this.rows.get(sid) as JointRow
      view.setUint32(at, sid, true)
      view.setFloat64(at + 4, handle, true)
      view.setFloat64(at + 12, bodyA, true)
      view.setFloat64(at + 20, bodyB, true)
      view.setUint8(at + 28, spec.kind)
      view.setUint32(at + 29, spec.a, true)
      view.setUint32(at + 33, spec.b, true)
      view.setFloat32(at + 37, spec.ax, true)
      view.setFloat32(at + 41, spec.ay, true)
      view.setFloat32(at + 45, spec.bx, true)
      view.setFloat32(at + 49, spec.by, true)
      view.setUint8(at + 53, spec.limited ? 1 : 0)
      view.setFloat32(at + 54, spec.min, true)
      view.setFloat32(at + 58, spec.max, true)
      at += ROW_BYTES
    }
    return at
  }

  /**
   * Reads the table `write` made. `need(n)` reserves n bytes and returns where they start; `fail` throws the
   * snapshot's format error. Nothing here asks Rapier: `check` does that once the world is made.
   */
  static read(
    view: DataView,
    need: (n: number) => number,
    fail: (why: string) => never,
  ): Map<number, JointRow> {
    const count = view.getUint32(need(4), true)
    const rows = new Map<number, JointRow>()
    let previous = 0
    for (let i = 0; i < count; i++) {
      const at = need(ROW_BYTES)
      const sid = view.getUint32(at, true)
      if (sid <= previous) fail('joints must be in strictly ascending sid order')
      previous = sid
      const kind = view.getUint8(at + 28)
      if (kind > JointKind.rope) fail(`joint ${sid} has invalid kind ${kind}`)
      const limited = view.getUint8(at + 53)
      if (limited > 1) fail(`joint ${sid} has invalid limited byte ${limited}`)
      const spec: JointSpec = {
        kind,
        a: view.getUint32(at + 29, true),
        b: view.getUint32(at + 33, true),
        ax: view.getFloat32(at + 37, true),
        ay: view.getFloat32(at + 41, true),
        bx: view.getFloat32(at + 45, true),
        by: view.getFloat32(at + 49, true),
        limited: limited === 1,
        min: view.getFloat32(at + 54, true),
        max: view.getFloat32(at + 58, true),
      }
      if (spec.a === spec.b) fail(`joint ${sid} joins entity ${spec.a} to itself`)
      rows.set(sid, {
        handle: view.getFloat64(at + 4, true),
        bodyA: view.getFloat64(at + 12, true),
        bodyB: view.getFloat64(at + 20, true),
        spec,
      })
    }
    return rows
  }

  /**
   * The table must name exactly the world's joints, and each must hold the bodies the table says, which must be
   * the bodies of the rows it names. Every comparison uses exact handle bits, as the body check does.
   */
  check(
    world: World,
    rows: ReadonlyMap<number, JointRow>,
    inWorld: readonly number[],
    bodyOf: (sid: number) => number | undefined,
  ): void {
    if (
      !sameHandles(
        inWorld,
        [...rows.values()].map((row) => row.handle),
      )
    )
      throw new SnapshotFormatError('physics: the joint table does not match the world’s joints')
    for (const [sid, row] of rows) {
      const held = this.adapter.jointBodies(world, row.handle)
      const bodyA = bodyOf(row.spec.a)
      const bodyB = bodyOf(row.spec.b)
      if (
        bodyA === undefined ||
        bodyB === undefined ||
        handleBits(held.a) !== handleBits(row.bodyA) ||
        handleBits(held.b) !== handleBits(row.bodyB) ||
        handleBits(row.bodyA) !== handleBits(bodyA) ||
        handleBits(row.bodyB) !== handleBits(bodyB)
      )
        throw new SnapshotFormatError(
          `physics: joint ${sid}: is not attached to the bodies of ${row.spec.a} and ${row.spec.b}`,
        )
    }
  }
}

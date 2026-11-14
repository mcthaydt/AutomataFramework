// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/shared/physics-world.ts
// The world half of the physics plugin: which entity owns which Rapier
// object, the order every Rapier mutation happens in, collision events, and the section 6 bytes. Everything
// that calls Rapier itself sits behind `PhysicsAdapter`, implemented in rapier.ts.

import {
  type ComponentDef,
  type EntityRef,
  type EventDef,
  type PluginState,
  type PreparedRestore,
  type SimContext,
  SnapshotFormatError,
} from '../sim/sim.ts'
import { handleBits, sameHandles } from './handle-bits.ts'
import { type JointAdapter, type JointRow, JointTable } from './joint-table.ts'

/** Rapier, as the world code needs it. `World` is Rapier's own world. */
export interface PhysicsAdapter<World> extends JointAdapter<World> {
  readonly Transform: ComponentDef
  readonly RigidBody: ComponentDef
  readonly Collider: ComponentDef
  readonly started: EventDef
  readonly ended: EventDef
  /** A new world with the plugin's gravity and the sim's timestep. */
  createWorld(): World
  /** A world from `takeSnapshot` bytes; throws on, or returns null for, bytes Rapier rejects. */
  restoreWorld(bytes: Uint8Array): World | null
  takeSnapshot(world: World): Uint8Array
  /** Steps once and reports each collision start or end as (collider handle, collider handle, started). */
  step(world: World, onCollision: (a: number, b: number, started: boolean) => void): void
  free(world: World): void
  /** Frees what the adapter holds for its sim besides worlds (its event queue). Called once, on dispose. */
  close(): void
  /** Every body, collider and joint handle the world holds, as Rapier reports them. */
  handles(world: World): { bodies: number[]; colliders: number[]; joints: number[] }
  /**
   * Throws an Error naming the sid and field when the entity's physics fields are invalid. Called
   * before anything is built from the fields; `updateBody` checks the fields it applies itself.
   */
  validate(entity: EntityRef): void
  createBody(world: World, entity: EntityRef): number
  /** Attached to `body` when given, else a lone collider placed by the entity's transform. */
  createCollider(world: World, entity: EntityRef, body: number | undefined): number
  /** Removes the body and any collider attached to it. */
  removeBody(world: World, body: number): void
  removeCollider(world: World, collider: number): void
  /** Applies whatever differs between the ECS and the body: pose, velocity, kind, damping. */
  updateBody(world: World, body: number, entity: EntityRef): void
  /** True when the Rapier collider still has the entity's shape, size, sensor flag, groups and material. */
  colliderMatches(world: World, collider: number, entity: EntityRef): boolean
  /** Moves a lone collider to the entity's transform if it differs. */
  updateLoneCollider(world: World, collider: number, entity: EntityRef): void
  /**
   * Writes the body's pose and velocities into the entity (sync-out) and returns whether the body is asleep.
   * When it was already asleep at the last write-back nothing can have moved, so it may skip the reads.
   */
  writeBack(world: World, body: number, entity: EntityRef, wasAsleep: boolean): boolean
  isSensor(world: World, collider: number): boolean
  /** The handle of the body the collider is attached to, or undefined for a lone collider. */
  colliderParent(world: World, collider: number): number | undefined
}

/** What one entity owns in Rapier. A row exists only while the entity qualifies. */
interface Row {
  readonly body: number | undefined
  collider: number | undefined
  /** The body was asleep at the last sync-out. Not in the snapshot: after a restore it starts false. */
  asleep?: boolean
}

/** A pair of entities whose colliders touch: started was emitted and ended not yet. Always a < b. */
interface Contact {
  readonly a: number
  readonly b: number
  readonly sensor: boolean
}

const contactKey = (a: number, b: number): string => `${a}:${b}`
const byPair = (x: Contact, y: Contact): number => x.a - y.a || x.b - y.b

// Version 2 added the contact list, so events stay paired across a restore. Version 3 is version 2 with the joint
// table after the contacts; a world made with joints writes 3 and one made without writes 2, and each refuses the
// other's bytes.
const PHYSICS_BYTES_VERSION = 2
const PHYSICS_BYTES_VERSION_WITH_JOINTS = 3
const HAS_BODY = 1
const HAS_COLLIDER = 2

/** The per-sim physics state: the plugin's `PluginState`, read by its systems through `ctx.pluginState`. */
export class PhysicsWorld<World> implements PluginState {
  private world: World
  private rows = new Map<number, Row>()
  private colliderOwner = new Map<number, number>() // collider handle -> sid
  private collisions: Array<{ a: number; b: number; started: boolean }> = []
  /**
   * Every pair currently touching, by contactKey. Events are emitted from changes to this set, so each
   * started is followed by exactly one ended for the same pair: when Rapier reports the
   * separation, or when sync-in removes or rebuilds one of the colliders.
   */
  private touching = new Map<string, Contact>()
  /** Contacts sync-in ended this tick by removing or rebuilding a collider; emitted with this tick's events. */
  private ending: Contact[] = []
  /** Present only in a world made with `joints: true`. */
  private joints: JointTable<World> | undefined
  private disposed = false

  /** `options.joints` is whether the sim has the `Joint` component; left out, there are none. */
  constructor(
    private readonly rapier: PhysicsAdapter<World>,
    options: { readonly joints?: boolean } = {},
  ) {
    this.world = rapier.createWorld()
    this.joints = options.joints ? new JointTable(rapier) : undefined
  }

  private get bytesVersion(): number {
    return this.joints ? PHYSICS_BYTES_VERSION_WITH_JOINTS : PHYSICS_BYTES_VERSION
  }

  private bodyOf = (sid: number): number | undefined => this.rows.get(sid)?.body

  /** What the entity qualifies for: a body, a collider, both or nothing. */
  private wants(entity: EntityRef | undefined): { body: boolean; collider: boolean } {
    const { Transform, RigidBody, Collider } = this.rapier
    if (!entity?.has(Transform)) return { body: false, collider: false }
    return { body: entity.has(RigidBody), collider: entity.has(Collider) }
  }

  private sortedSids(): number[] {
    return [...this.rows.keys()].sort((a, b) => a - b)
  }

  private removeRow(sid: number, row: Row): void {
    if (row.body !== undefined) this.rapier.removeBody(this.world, row.body)
    else if (row.collider !== undefined) this.rapier.removeCollider(this.world, row.collider)
    if (row.collider !== undefined) this.forgetCollider(sid, row.collider)
    this.rows.delete(sid)
  }

  /**
   * The entity's collider is gone from Rapier, so its contacts end now. Rapier would report the separation
   * against a handle that no longer has an owner, which emitEvents could not name, so it is ended here.
   */
  private forgetCollider(sid: number, collider: number): void {
    this.colliderOwner.delete(collider)
    for (const [key, contact] of this.touching) {
      if (contact.a !== sid && contact.b !== sid) continue
      this.touching.delete(key)
      this.ending.push(contact)
    }
  }

  private addCollider(sid: number, row: Row, entity: EntityRef): void {
    row.collider = this.rapier.createCollider(this.world, entity, row.body)
    this.colliderOwner.set(row.collider, sid)
  }

  /**
   * sync-in. Joint removals, then body and collider removals, creations and updates, then joint creations, each
   * in ascending sid order: Rapier reuses freed slots, so this fixed order is what keeps handles, and so the
   * solver, identical everywhere. Joints go first because Rapier removes a body's joints itself when the body
   * goes, and then the joint table and the world would disagree; they come last because a joint needs both bodies.
   */
  syncIn(ctx: SimContext): void {
    const doomed: number[] = []
    for (const sid of this.sortedSids()) {
      const row = this.rows.get(sid) as Row
      const want = this.wants(ctx.entity(sid))
      if (want.body !== (row.body !== undefined) || want.collider !== (row.collider !== undefined))
        doomed.push(sid)
    }
    this.joints?.removeBroken(ctx, this.world, new Set(doomed))
    for (const sid of doomed) this.removeRow(sid, this.rows.get(sid) as Row)
    for (const entity of ctx.query(this.rapier.Transform)) {
      if (this.rows.has(entity.sid)) continue
      const want = this.wants(entity)
      if (!want.body && !want.collider) continue
      this.rapier.validate(entity)
      const row: Row = {
        body: want.body ? this.rapier.createBody(this.world, entity) : undefined,
        collider: undefined,
      }
      this.rows.set(entity.sid, row)
      if (want.collider) this.addCollider(entity.sid, row, entity)
    }
    for (const sid of this.sortedSids()) {
      const row = this.rows.get(sid) as Row
      const entity = ctx.entity(sid) as EntityRef
      if (row.body !== undefined) this.rapier.updateBody(this.world, row.body, entity)
      if (row.collider === undefined) continue
      if (!this.rapier.colliderMatches(this.world, row.collider, entity)) {
        // Rapier cannot reshape every collider in place, so a changed collider is rebuilt.
        this.rapier.validate(entity)
        this.rapier.removeCollider(this.world, row.collider)
        this.forgetCollider(sid, row.collider)
        this.addCollider(sid, row, entity)
      } else if (row.body === undefined) {
        this.rapier.updateLoneCollider(this.world, row.collider, entity)
      }
    }
    this.joints?.createMissing(ctx, this.world, this.bodyOf)
  }

  step(): void {
    this.collisions = []
    this.rapier.step(this.world, (a, b, started) => this.collisions.push({ a, b, started }))
  }

  /** sync-out: Rapier's results into the ECS. Rows of entities despawned this tick are skipped. */
  syncOut(ctx: SimContext): void {
    for (const sid of this.sortedSids()) {
      const row = this.rows.get(sid) as Row
      const entity = ctx.entity(sid)
      if (row.body !== undefined && entity)
        row.asleep = this.rapier.writeBack(this.world, row.body, entity, row.asleep === true)
    }
  }

  /**
   * Collision events from the changes to `touching` this tick: every ended (sync-in's, then Rapier's), then
   * every started, each sorted by (lower sid, higher sid). The order is a contract, not Rapier's pair order.
   * Ended comes first so a contact rebuilt this tick reads as ended then started, leaving it touching.
   * A collider without an owner (removed this tick) drops Rapier's event; sync-in already ended its contacts.
   */
  emitEvents(ctx: SimContext): void {
    const ended = this.ending
    const started: Contact[] = []
    this.ending = []
    for (const c of this.collisions) {
      const sa = this.colliderOwner.get(c.a)
      const sb = this.colliderOwner.get(c.b)
      if (sa === undefined || sb === undefined) continue
      const a = Math.min(sa, sb)
      const b = Math.max(sa, sb)
      const key = contactKey(a, b)
      const current = this.touching.get(key)
      if (c.started) {
        if (current) continue // already touching: never a second started
        const sensor = this.rapier.isSensor(this.world, c.a) || this.rapier.isSensor(this.world, c.b)
        const contact = { a, b, sensor }
        this.touching.set(key, contact)
        started.push(contact)
      } else if (current) {
        this.touching.delete(key)
        // Started and ended in one step: the pair never touched between ticks, so it reports nothing.
        const index = started.indexOf(current)
        if (index >= 0) started.splice(index, 1)
        else ended.push(current)
      }
    }
    ended.sort(byPair)
    started.sort(byPair)
    for (const e of ended) ctx.emit(this.rapier.ended, { a: e.a, b: e.b, sensor: e.sensor })
    for (const e of started) ctx.emit(this.rapier.started, { a: e.a, b: e.b, sensor: e.sensor })
    this.collisions = []
  }

  /**
   * Section 6 bytes: version, the sid -> handle table, the contacts, the joint table (version 3 only), then Rapier's
   * snapshot.
   */
  snapshot(): Uint8Array {
    const world = this.rapier.takeSnapshot(this.world)
    const sids = this.sortedSids()
    const contacts = [...this.touching.values()].sort(byPair)
    let size = 1 + 4 + 4 + contacts.length * 9 + (this.joints?.byteLength() ?? 0) + 4 + world.length
    for (const sid of sids) {
      const row = this.rows.get(sid) as Row
      size += 4 + 1 + (row.body !== undefined ? 8 : 0) + (row.collider !== undefined ? 8 : 0)
    }
    const out = new Uint8Array(size)
    const view = new DataView(out.buffer)
    let at = 0
    view.setUint8(at, this.bytesVersion)
    view.setUint32(at + 1, sids.length, true)
    at += 5
    for (const sid of sids) {
      const row = this.rows.get(sid) as Row
      view.setUint32(at, sid, true)
      view.setUint8(
        at + 4,
        (row.body !== undefined ? HAS_BODY : 0) | (row.collider !== undefined ? HAS_COLLIDER : 0),
      )
      at += 5
      // Handles are f64 bit patterns of (index, generation); setFloat64 keeps the bits exactly.
      if (row.body !== undefined) {
        view.setFloat64(at, row.body, true)
        at += 8
      }
      if (row.collider !== undefined) {
        view.setFloat64(at, row.collider, true)
        at += 8
      }
    }
    view.setUint32(at, contacts.length, true)
    at += 4
    for (const contact of contacts) {
      view.setUint32(at, contact.a, true)
      view.setUint32(at + 4, contact.b, true)
      view.setUint8(at + 8, contact.sensor ? 1 : 0)
      at += 9
    }
    if (this.joints) at = this.joints.write(view, at)
    view.setUint32(at, world.length, true)
    out.set(world, at + 4)
    return out
  }

  prepareRestore(bytes: Uint8Array): PreparedRestore {
    const fail = (why: string): never => {
      throw new SnapshotFormatError(`physics: ${why}`)
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    let at = 0
    const need = (n: number): number => {
      if (at + n > bytes.length) fail(`truncated at byte ${at}`)
      const start = at
      at += n
      return start
    }
    const version = view.getUint8(need(1))
    if (version !== this.bytesVersion) fail(`unsupported version ${version}`)
    const count = view.getUint32(need(4), true)
    const rows = new Map<number, Row>()
    let previous = 0
    for (let i = 0; i < count; i++) {
      const sid = view.getUint32(need(4), true)
      if (sid <= previous) fail('rows must be in strictly ascending sid order, starting at 1')
      previous = sid
      const flags = view.getUint8(need(1))
      if (flags === 0 || flags > (HAS_BODY | HAS_COLLIDER)) fail(`row ${sid} has invalid flags ${flags}`)
      const body = flags & HAS_BODY ? view.getFloat64(need(8), true) : undefined
      const collider = flags & HAS_COLLIDER ? view.getFloat64(need(8), true) : undefined
      rows.set(sid, { body, collider })
    }
    const contactCount = view.getUint32(need(4), true)
    const touching = new Map<string, Contact>()
    let last: Contact | undefined
    for (let i = 0; i < contactCount; i++) {
      const a = view.getUint32(need(4), true)
      const b = view.getUint32(need(4), true)
      const sensorByte = view.getUint8(need(1))
      const contact = { a, b, sensor: sensorByte === 1 }
      if (a >= b) fail(`contact ${a}:${b} must name the lower sid first`)
      if (last && byPair(last, contact) >= 0) fail('contacts must be in strictly ascending (a, b) order')
      if (sensorByte > 1) fail(`contact ${a}:${b} has invalid sensor byte ${sensorByte}`)
      if (rows.get(a)?.collider === undefined || rows.get(b)?.collider === undefined)
        fail(`contact ${a}:${b} names an entity without a collider`)
      touching.set(contactKey(a, b), contact)
      last = contact
    }
    const jointRows = this.joints ? JointTable.read(view, need, fail) : undefined
    const worldLength = view.getUint32(need(4), true)
    const worldBytes = bytes.subarray(need(worldLength), at)
    if (at !== bytes.length) fail(`${bytes.length - at} trailing bytes`)

    let world: World | null
    try {
      world = this.rapier.restoreWorld(worldBytes)
    } catch (err) {
      throw new SnapshotFormatError(`physics: Rapier rejected the world bytes: ${String(err)}`, {
        cause: err,
      })
    }
    // Rapier's restoreSnapshot returns null, rather than throwing, for some bytes it cannot decode.
    if (world == null) throw new SnapshotFormatError('physics: Rapier made no world from the world bytes')
    try {
      this.checkTable(world, rows, jointRows)
    } catch (err) {
      this.rapier.free(world)
      throw err
    }
    return {
      commit: () => {
        this.rapier.free(this.world)
        this.world = world
        this.rows = rows
        this.colliderOwner = new Map()
        for (const [sid, row] of rows)
          if (row.collider !== undefined) this.colliderOwner.set(row.collider, sid)
        if (this.joints && jointRows) this.joints.rows = jointRows
        this.touching = touching
        this.ending = []
        this.collisions = []
      },
      discard: () => this.rapier.free(world),
    }
  }

  /**
   * The table must name exactly the world's bodies and colliders, and attach each collider as the world
   * does: a wrong pairing would report contacts against the wrong entity. Rapier's own lookup is not enough
   * (it resolves some malformed handles to a live object), so every comparison uses exact handle bits.
   */
  private checkTable(
    world: World,
    rows: ReadonlyMap<number, Row>,
    jointRows: ReadonlyMap<number, JointRow> | undefined,
  ): void {
    const inWorld = this.rapier.handles(world)
    const inTable = { bodies: [] as number[], colliders: [] as number[] }
    for (const row of rows.values()) {
      if (row.body !== undefined) inTable.bodies.push(row.body)
      if (row.collider !== undefined) inTable.colliders.push(row.collider)
    }
    if (!sameHandles(inWorld.bodies, inTable.bodies) || !sameHandles(inWorld.colliders, inTable.colliders))
      throw new SnapshotFormatError(
        'physics: the handle table does not match the world’s bodies and colliders',
      )
    for (const [sid, row] of rows) {
      if (row.collider === undefined) continue
      const parent = this.rapier.colliderParent(world, row.collider)
      if (row.body === undefined && parent !== undefined)
        throw new SnapshotFormatError(`physics: row ${sid}: lone collider is attached to a body`)
      if (row.body !== undefined && (parent === undefined || handleBits(parent) !== handleBits(row.body)))
        throw new SnapshotFormatError(`physics: row ${sid}: collider is not attached to the row’s body`)
    }
    if (this.joints && jointRows)
      this.joints.check(world, jointRows, inWorld.joints, (sid) => rows.get(sid)?.body)
  }

  /** Frees the Rapier world and the adapter's queue. Safe to call more than once. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    try {
      this.rapier.free(this.world)
    } finally {
      this.rapier.close() // the event queue is separate wasm memory, so it is freed even if the world's free fails
    }
  }
}

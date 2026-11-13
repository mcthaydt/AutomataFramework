// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/world/entity-store.ts
import { createWorld, type Entity, type World } from 'koota'
import { ownKeyCount, sortedKeys } from '../../lib/sorted.ts'
import type { EntityRef, SpawnPart } from './context.ts'
import type { ComponentDef } from './definitions.ts'
import { coerceField, defaultField, type FieldType } from './fields.ts'

/** One component's field values on an entity, by field name. */
export type FieldRecord = Record<string, number | boolean | string>

/** One entity's render-flagged components (component id -> field values). */
export interface RenderRow {
  readonly sid: number
  readonly components: Readonly<Record<string, Readonly<FieldRecord>>>
}

/**
 * What changed for the renderer since the last delta. `changed` rows carry the entity's full
 * render state, so a removed component shows up as its absence. `resync` deltas list every live render
 * entity as added; the renderer drops everything it had first.
 */
export interface RenderDelta {
  readonly resync: boolean
  readonly added: readonly RenderRow[]
  readonly changed: readonly RenderRow[]
  readonly removed: readonly number[]
}

/**
 * Entities behind the facade: Koota stores the data; this class owns StableIds (monotonic, never reused),
 * iteration order (ascending StableId), field coercion and render dirty-tracking. Koota ids never escape.
 */
/** More sims are alive than Koota allows worlds (16 per process). Dispose sims you no longer need. */
export class SimCapacityError extends Error {
  constructor(cause: unknown) {
    super('too many sims are alive at once (Koota allows 16 worlds); dispose sims you no longer need', {
      cause,
    })
    this.name = 'SimCapacityError'
  }
}

function createKootaWorld(): World {
  try {
    return createWorld()
  } catch (err) {
    throw new SimCapacityError(err)
  }
}

export class EntityStore {
  private readonly world: World = createKootaWorld()
  private readonly registered: Map<string, ComponentDef>
  private readonly entities = new Map<number, Entity>()
  private readonly live: number[] = [] // ascending: StableIds are monotonic, so spawn appends
  private readonly dirty = new Set<number>() // entities changed since last delta
  private readonly rendered = new Set<number>() // entities the renderer currently holds
  nextId = 1

  constructor(components: readonly ComponentDef[]) {
    this.registered = new Map(components.map((c) => [c.id, c]))
  }

  private check(def: ComponentDef): ComponentDef {
    if (this.registered.get(def.id) !== def)
      throw new Error(`unknown component "${def.id}": register it in a plugin`)
    return def
  }

  private coerce(
    def: ComponentDef,
    values: Readonly<Record<string, unknown>>,
    base: FieldRecord,
  ): FieldRecord {
    const out: FieldRecord = { ...base }
    // Walk the component's own (sorted) field names rather than sorting the caller's keys on every write:
    // this runs for every set in every tick. A key count that differs means the caller passed a field the
    // component lacks, and only then are the caller's keys sorted to name the first unknown one.
    let known = 0
    for (const name of def.fieldNames) {
      if (!Object.hasOwn(values, name)) continue
      out[name] = coerceField(def.fields[name] as FieldType, values[name])
      known += 1
    }
    if (known !== ownKeyCount(values)) {
      const unknown = sortedKeys(values).find((name) => !Object.hasOwn(def.fields, name))
      throw new Error(`component "${def.id}" has no field: unknown field "${unknown}"`)
    }
    return out
  }

  private defaults(def: ComponentDef): FieldRecord {
    const out: FieldRecord = {}
    for (const name of def.fieldNames) out[name] = defaultField(def.fields[name] as FieldType)
    return out
  }

  // The traits are factories (array-of-structures, definitions.ts), so Koota's get returns the entity's live
  // record. Copy the schema's fields out, so a caller can never mutate stored state through what it read.
  private read(e: Entity, def: ComponentDef): FieldRecord {
    const raw = e.get(def.trait) as FieldRecord
    const out: FieldRecord = {}
    for (const name of def.fieldNames) out[name] = raw[name] as number | boolean | string
    return out
  }

  private markChanged(sid: number, def: ComponentDef): void {
    if (def.render) this.dirty.add(sid)
  }

  private alive(sid: number): Entity {
    const e = this.entities.get(sid)
    if (!e) throw new Error(`entity ${sid} is not alive`)
    return e
  }

  /** Throws exactly what `spawnWithId(sid, parts)` would for bad parts, without touching the world. */
  checkParts(parts: readonly SpawnPart[]): void {
    const seen = new Set<string>()
    for (const part of parts) {
      const [def, values] = Array.isArray(part) ? part : [part as ComponentDef, {}]
      this.check(def)
      if (seen.has(def.id)) throw new Error(`duplicate component "${def.id}"`)
      seen.add(def.id)
      this.coerce(def, values, this.defaults(def))
    }
  }

  /** Spawns with a fresh StableId. */
  spawn(parts: readonly SpawnPart[]): number {
    return this.spawnWithId(this.nextId++, parts)
  }

  /** Spawns with a given StableId (restore only; ids must arrive in ascending order). */
  spawnWithId(sid: number, parts: readonly SpawnPart[]): number {
    const e = this.world.spawn()
    for (const part of parts) {
      const [def, values] = Array.isArray(part) ? part : [part as ComponentDef, {}]
      this.check(def)
      if (e.has(def.trait)) throw new Error(`entity ${sid} already has "${def.id}"`)
      e.add(def.trait(this.coerce(def, values, this.defaults(def))))
    }
    this.entities.set(sid, e)
    this.live.push(sid)
    this.dirty.add(sid)
    return sid
  }

  despawn(sid: number): void {
    const e = this.alive(sid)
    e.destroy()
    this.entities.delete(sid)
    this.live.splice(this.live.indexOf(sid), 1)
    this.dirty.add(sid)
  }

  liveSids(): readonly number[] {
    return this.live
  }

  componentsOf(sid: number): ComponentDef[] {
    const e = this.alive(sid)
    return [...this.registered.values()].filter((c) => e.has(c.trait))
  }

  query(components: readonly ComponentDef[]): EntityRef[] {
    for (const c of components) this.check(c)
    const out: EntityRef[] = []
    for (const sid of this.live) {
      const e = this.entities.get(sid) as Entity
      if (components.every((c) => e.has(c.trait))) out.push(this.makeRef(sid))
    }
    return out
  }

  /** Every live entity's component values in ascending StableId order: the snapshot's entities section. */
  snapshotRows(): Array<{ sid: number; components: Map<string, FieldRecord> }> {
    const defs = [...this.registered.values()]
    return this.live.map((sid) => {
      const e = this.entities.get(sid) as Entity
      const components = new Map<string, FieldRecord>()
      for (const def of defs) if (e.has(def.trait)) components.set(def.id, this.read(e, def))
      return { sid, components }
    })
  }

  ref(sid: number): EntityRef | undefined {
    return this.entities.has(sid) ? this.makeRef(sid) : undefined
  }

  private makeRef(sid: number): EntityRef {
    // biome-ignore lint/complexity/noUselessThisAlias: methods below are plain object members
    const store = this
    return {
      sid,
      has: (def) => store.alive(sid).has(store.check(def).trait),
      get: (def) => {
        const e = store.alive(sid)
        if (!e.has(store.check(def).trait)) throw new Error(`entity ${sid} does not have "${def.id}"`)
        return Object.freeze(store.read(e, def)) as never // a copy: mutating it must throw, not silently do nothing
      },
      set: (def, values) => {
        const e = store.alive(sid)
        if (!e.has(store.check(def).trait)) throw new Error(`entity ${sid} does not have "${def.id}"`)
        // With array-of-structures traits Koota's set replaces the whole record, so a partial update merges
        // into the current values first; a field the caller leaves out keeps its value.
        e.set(def.trait, store.coerce(def, values as Record<string, unknown>, store.read(e, def)))
        store.markChanged(sid, def)
      },
      add: (def, values = {}) => {
        const e = store.alive(sid)
        if (e.has(store.check(def).trait)) throw new Error(`entity ${sid} already has "${def.id}"`)
        e.add(def.trait(store.coerce(def, values as Record<string, unknown>, store.defaults(def))))
        store.markChanged(sid, def)
      },
      remove: (def) => {
        const e = store.alive(sid)
        if (!e.has(store.check(def).trait)) return
        e.remove(def.trait)
        store.markChanged(sid, def)
      },
    }
  }

  private renderComponents(e: Entity): ComponentDef[] {
    return [...this.registered.values()]
      .filter((c) => c.render && e.has(c.trait))
      .sort((a, b) => (a.id < b.id ? -1 : 1))
  }

  private row(sid: number): RenderRow | null {
    const e = this.entities.get(sid) as Entity
    const comps = this.renderComponents(e)
    if (comps.length === 0) return null
    const components: Record<string, FieldRecord> = {}
    for (const c of comps) components[c.id] = this.read(e, c)
    return { sid, components }
  }

  private rows(sids: Iterable<number>): RenderRow[] {
    const out: RenderRow[] = []
    for (const sid of [...sids].sort((a, b) => a - b)) {
      const r = this.entities.has(sid) ? this.row(sid) : null
      if (r) out.push(r)
    }
    return out
  }

  /** Render changes since the last call, then clears the tracking (built-in `render.collect`). */
  takeDelta(resync: boolean): RenderDelta {
    if (resync) {
      const liveRenderSids = this.live.filter((sid) => this.row(sid) !== null)
      const added = this.rows(liveRenderSids)
      this.rendered.clear()
      for (const sid of liveRenderSids) this.rendered.add(sid)
      this.dirty.clear()
      return { resync: true, added, changed: [], removed: [] }
    }

    const added: RenderRow[] = []
    const changed: RenderRow[] = []
    const removed: number[] = []

    for (const sid of [...this.dirty].sort((a, b) => a - b)) {
      const wasRendered = this.rendered.has(sid)
      const row = this.entities.has(sid) ? this.row(sid) : null

      if (!wasRendered && row) {
        added.push(row)
        this.rendered.add(sid)
      } else if (wasRendered && row) {
        changed.push(row)
      } else if (wasRendered && !row) {
        removed.push(sid)
        this.rendered.delete(sid)
      }
      // !wasRendered && !row → nothing
    }

    this.dirty.clear()
    return { resync: false, added, changed, removed }
  }

  dispose(): void {
    this.world.destroy()
  }
}

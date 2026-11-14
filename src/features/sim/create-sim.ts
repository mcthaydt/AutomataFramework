// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/world/sim.ts

import { canonicalJson, utf8 } from '../../lib/canonical.ts'
import { deepFreeze } from '../../lib/deep-freeze.ts'
import { hex64, xxhash64 } from '../../lib/xxhash64.ts'
import { z } from '../../lib/zod.ts'
import type { CommandRecord, EntityRef, SimContext, SpawnPart } from './context.ts'
import {
  type CommandDef,
  type ComponentDef,
  defineSystem,
  type EventDef,
  type PluginDef,
  type PluginState,
  type PreparedRestore,
  type ResourceDef,
  type SystemDef,
} from './definitions.ts'
import { EntityStore, type RenderDelta, SimCapacityError } from './entity-store.ts'
import { SimDisposedError, SimFaultedError } from './errors.ts'
import { createRng, deriveSeed, type Rng, rngFromState } from './rng.ts'
import { orderPlugins, orderSystems } from './schedule.ts'
import {
  decodeSnapshot,
  decodeSnapshotHeader,
  encodeSnapshot,
  type SnapshotData,
  SnapshotFormatError,
  SnapshotMismatchError,
  type SnapshotView,
  viewSnapshot,
} from './snapshot.ts'

/** Input to the sim, the only way gameplay state changes from outside. `source` is a player slot (u8), `seq` a per-source counter (u32). */
export interface Command {
  readonly tick: number
  readonly source: number
  readonly seq: number
  readonly type: string
  readonly payload: unknown
}

/**
 * Why `step` dropped a command: `bad-header` (a field is missing or out of range), `unknown-command` (no
 * plugin defines its type), `wrong-tick` (not the sim's current tick), `duplicate-seq` (the same source and
 * seq twice in one step) or `invalid-payload` (it fails the command's schema).
 */
export type RejectReason =
  | 'bad-header'
  | 'unknown-command'
  | 'wrong-tick'
  | 'duplicate-seq'
  | 'invalid-payload'

/** A command `step` dropped, with the reason. */
export interface RejectedCommand {
  readonly command: Command
  readonly reason: RejectReason
}

/** An event a system emitted during a step: the event's id as `type`, and its parsed `payload`. */
export interface SimEvent {
  readonly type: string
  readonly payload: unknown
}

/**
 * What one `step` produced: the new tick, the events emitted, the renderer's delta and the commands that were
 * rejected.
 */
export interface StepResult {
  /** The tick the sim is at after this step. */
  readonly tick: number
  readonly events: readonly SimEvent[]
  readonly render: RenderDelta
  /** Invalid commands, in input order. The sim has no I/O, so it reports instead of logging. */
  readonly rejected: readonly RejectedCommand[]
}

/**
 * What `createSim` takes: the root `seed`, the `plugins`, `tickHz` (an integer from 1 to 1000, default 60)
 * and the `content` the systems read as `ctx.content` (default `{}`).
 */
export interface SimOptions {
  readonly seed: number
  readonly tickHz?: number
  readonly content?: unknown
  readonly plugins: readonly PluginDef[]
}

/**
 * A running simulation, stepped with commands, that can snapshot, restore and hash its state. `step` is the
 * only way gameplay state changes. Create one with `createSim`, and `dispose` it when done.
 */
export interface Sim {
  readonly seed: number
  readonly tickHz: number
  readonly tick: number
  /** XXH64 of the canonical content this sim was created with, 16 hex digits; the snapshot header's value. */
  readonly contentHash: string
  step(commands: readonly Command[]): StepResult
  /** Setup and inspection outside `step` (tests, scene setup). Runtime changes go through commands. */
  spawn(parts: readonly SpawnPart[]): number
  entity(sid: number): EntityRef | undefined
  query(...components: ComponentDef[]): EntityRef[]
  resource<Z extends z.ZodType>(def: ResourceDef<Z>): z.output<Z>
  /** Canonical snapshot v1 bytes. */
  snapshot(): Uint8Array
  /** Replaces the whole state. Throws SnapshotFormatError / SnapshotMismatchError and leaves the sim unchanged. */
  restore(bytes: Uint8Array): void
  /**
   * A readable view of `bytes`, or of the current state when none are given. Decodes and checks
   * the header as `restore` does (SnapshotFormatError / SnapshotMismatchError) but not restore's later
   * cross-checks, and changes nothing.
   */
  describeSnapshot(bytes?: Uint8Array): SnapshotView
  /** xxhash64 of the snapshot, 16 hex digits. */
  hash(): string
  /** Frees the Koota world and every plugin's engine. Idempotent; any later call throws SimDisposedError. */
  dispose(): void
}

// The error classes live in errors.ts to keep this file under the line limit; they are re-exported here so callers
// have one place to import the sim from.
export { SimCapacityError, SimDisposedError, SimFaultedError }

/**
 * Each definition's id with its Zod schema as JSON Schema, sorted by id, for the schema hash.
 * `io: 'input'` describes what a snapshot or command must contain; parts JSON Schema cannot express (a
 * transform's function, a refinement) hash as "any", which is why restore also re-checks values (see restore).
 */
function describeSchemas(defs: ReadonlyMap<string, { readonly schema: z.ZodType }>): unknown[] {
  return [...defs.keys()]
    .sort()
    .map((id) => [
      id,
      z.toJSONSchema((defs.get(id) as { schema: z.ZodType }).schema, { io: 'input', unrepresentable: 'any' }),
    ])
}

function register<T extends { id: string }>(what: string, map: Map<string, T>, items: readonly T[]): void {
  for (const item of items) {
    if (map.has(item.id)) throw new Error(`duplicate ${what} "${item.id}"`)
    map.set(item.id, item)
  }
}

const isU = (n: unknown, max: number): boolean =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max

/**
 * Creates a sim from its plugins, seed and content; async, because a plugin may create engine state (a Rapier
 * world). Throws for a bad `tickHz`, a duplicate definition, an unknown plugin dependency or system ordering
 * reference, an ordering cycle, a system name the sim reserves, or an invalid resource start. If a plugin's
 * engine fails to start, the engines already created are disposed first.
 */
export async function createSim(opts: SimOptions): Promise<Sim> {
  const tickHz = opts.tickHz ?? 60
  if (!Number.isInteger(tickHz) || tickHz < 1 || tickHz > 1000)
    throw new Error(`tickHz must be an integer 1..1000`)
  const dt = 1 / tickHz
  const plugins = orderPlugins(opts.plugins)

  const components = new Map<string, ComponentDef>()
  const commandDefs = new Map<string, CommandDef>()
  const eventDefs = new Map<string, EventDef>()
  const resourceDefs = new Map<string, ResourceDef>()
  for (const p of plugins) {
    register('component', components, p.components)
    register('command', commandDefs, p.commands)
    register('event', eventDefs, p.events)
    register('resource', resourceDefs, p.resources)
  }

  // Content: an independent, canonical, deep-frozen copy, so the caller's later edits cannot reach the sim.
  const contentJson = canonicalJson(opts.content === undefined ? {} : opts.content)
  const content = deepFreeze(JSON.parse(contentJson))
  const contentHash = xxhash64(utf8(contentJson))
  const componentList = [...components.values()]
  const resources = new Map<string, unknown>()
  for (const def of resourceDefs.values()) resources.set(def.id, def.schema.parse(def.init()))

  let tick = 0
  let fault: SimFaultedError | undefined
  let disposed = false
  const refuseIfDisposed = (): void => {
    if (disposed) throw new SimDisposedError()
  }
  const refuseIfFaulted = (): void => {
    refuseIfDisposed()
    if (fault) throw fault
  }
  let fullResync = true // a renderer starts empty, so the first delta is a resync
  let events: SimEvent[] = []
  let pendingDespawn = new Set<number>()
  let stagedCommands = new Map<string, Array<CommandRecord<unknown>>>()
  let commandsByType = new Map<string, Array<CommandRecord<unknown>>>()
  let lastDelta: RenderDelta = { resync: false, added: [], changed: [], removed: [] }

  // Built-ins. Every input system runs after commands.apply; every cleanup system before entities.flush.
  const builtins: SystemDef[] = [
    defineSystem({
      name: 'commands.apply',
      phase: 'input',
      run: () => {
        commandsByType = stagedCommands
      },
    }),
    defineSystem({
      name: 'entities.flush',
      phase: 'cleanup',
      run: () => {
        for (const sid of [...pendingDespawn].sort((a, b) => a - b)) store.despawn(sid)
        pendingDespawn = new Set()
      },
    }),
    defineSystem({
      name: 'render.collect',
      phase: 'cleanup',
      after: ['entities.flush'],
      run: () => {
        lastDelta = store.takeDelta(fullResync)
        fullResync = false
      },
    }),
  ]
  const builtinNames = new Set(builtins.map((s) => s.name))
  const userSystems = plugins.flatMap((p) => p.systems)
  for (const s of userSystems)
    if (builtinNames.has(s.name)) throw new Error(`system name "${s.name}" is reserved`)
  const wired = userSystems.map((s) => {
    if (s.phase === 'input' && !s.after.includes('commands.apply'))
      return { ...s, after: [...s.after, 'commands.apply'] }
    if (s.phase === 'cleanup' && !s.before.includes('entities.flush'))
      return { ...s, before: [...s.before, 'entities.flush'] }
    return s
  })
  const systems = orderSystems([...builtins, ...wired])
  const rngs = new Map<string, Rng>(systems.map((s) => [s.name, createRng(deriveSeed(opts.seed, s.name))]))

  // Everything that must match for a snapshot to be restorable here.
  const sortedIds = (m: Map<string, unknown>) => [...m.keys()].sort()
  // `stateful` is only present when a plugin keeps engine state, so the schema hash of a sim without such plugins is unchanged.
  const statefulNames = plugins.filter((p) => p.state).map((p) => p.name)
  const stateful = statefulNames.length > 0 ? { stateful: statefulNames } : {}
  // Likewise `configs` only appears when a plugin has one.
  const configured = plugins.filter((p) => p.config !== undefined).map((p) => [p.name, p.config])
  const configs = configured.length > 0 ? { configs: configured } : {}
  const schemaHash = xxhash64(
    utf8(
      canonicalJson({
        ...stateful,
        ...configs,
        plugins: plugins.map((p) => p.name),
        components: componentList
          .map((c) => ({ id: c.id, fields: c.fields, render: c.render }))
          .sort((a, b) => (a.id < b.id ? -1 : 1)),
        commands: describeSchemas(commandDefs),
        events: describeSchemas(eventDefs),
        resources: describeSchemas(resourceDefs),
        systems: systems.map((s) => `${s.phase}:${s.name}`),
      }),
    ),
  )

  // Everything above only validates. From here the sim takes resources that must be released if setup fails:
  // a Koota world (16 per process) and each plugin's engine state.
  let store = new EntityStore(componentList)
  // Per-sim engine state, created in canonical plugin order. Only the owning plugin's systems
  // see it. If one setup rejects, the states already created are disposed before the error propagates.
  const states: Array<{ name: string; state: PluginState }> = []
  const stateOfSystem = new Map<string, PluginState>()
  try {
    for (const p of plugins) {
      if (!p.state) continue
      const state = await p.state({ dt })
      states.push({ name: p.name, state })
      for (const s of p.systems) stateOfSystem.set(s.name, state)
    }
  } catch (err) {
    releaseAll(store, states)
    throw err
  }
  // Nothing below can throw: it only builds closures over what exists.

  const resourceOf = <Z extends z.ZodType>(def: ResourceDef<Z>): z.output<Z> => {
    if (resourceDefs.get(def.id) !== def)
      throw new Error(`unknown resource "${def.id}": register it in a plugin`)
    return resources.get(def.id) as z.output<Z>
  }

  const contexts = systems.map((system) => {
    const ctx: SimContext = {
      get tick() {
        return tick
      },
      dt,
      get rng() {
        return rngs.get(system.name) as Rng
      },
      content,
      query: (...cs) => store.query(cs),
      entity: (sid) => store.ref(sid),
      spawn: (...parts) => store.spawn(parts),
      despawn: (sid) => {
        if (!store.ref(sid)) throw new Error(`despawn: entity ${sid} is not alive`)
        pendingDespawn.add(sid)
      },
      commands: {
        of: <Z extends z.ZodType>(def: CommandDef<Z>) => {
          if (commandDefs.get(def.id) !== def)
            throw new Error(`unknown command "${def.id}": register it in a plugin`)
          return (commandsByType.get(def.id) ?? []) as ReadonlyArray<CommandRecord<z.output<Z>>>
        },
      },
      emit: (def, payload) => {
        if (eventDefs.get(def.id) !== def)
          throw new Error(`unknown event "${def.id}": register it in a plugin`)
        const parsed = def.schema.safeParse(payload)
        if (!parsed.success) throw new Error(`event "${def.id}" payload invalid: ${parsed.error.message}`)
        events.push({ type: def.id, payload: parsed.data })
      },
      events: {
        of: <Z extends z.ZodType>(def: EventDef<Z>) => {
          if (eventDefs.get(def.id) !== def)
            throw new Error(`unknown event "${def.id}": register it in a plugin`)
          return events.filter((e) => e.type === def.id).map((e) => e.payload as z.output<Z>)
        },
      },
      resource: resourceOf,
      pluginState: stateOfSystem.get(system.name),
    }
    return { system, ctx }
  })

  /** Decodes snapshot bytes and checks they belong to this sim's schema, content and tick rate. */
  function decodeForThisSim(bytes: Uint8Array): SnapshotData {
    // The header first: a snapshot from another schema reports the mismatch, not whatever its body's shape
    // breaks in this build's decoder.
    const header = decodeSnapshotHeader(bytes)
    if (header.schemaHash !== schemaHash)
      throw new SnapshotMismatchError('schemaHash', hex64(schemaHash), hex64(header.schemaHash))
    if (header.contentHash !== contentHash)
      throw new SnapshotMismatchError('contentHash', hex64(contentHash), hex64(header.contentHash))
    if (header.tickHz !== tickHz)
      throw new SnapshotMismatchError('tickHz', String(tickHz), String(header.tickHz))
    try {
      return decodeSnapshot(bytes, componentList)
    } catch (err) {
      if (err instanceof SnapshotFormatError) throw err
      // e.g. RangeError from an invalid UTF-8 code point: the contract is one error type for bad bytes.
      throw new SnapshotFormatError(err instanceof Error ? err.message : String(err), { cause: err })
    }
  }

  function intake(commands: readonly Command[]): RejectedCommand[] {
    const rejected: RejectedCommand[] = []
    const accepted: Array<Command & { parsed: unknown }> = []
    const seen = new Set<string>()
    for (const c of commands) {
      if (
        typeof c !== 'object' ||
        c === null ||
        !isU(c.tick, 4294967295) ||
        !isU(c.source, 255) ||
        !isU(c.seq, 4294967295) ||
        typeof c.type !== 'string'
      ) {
        rejected.push({ command: c, reason: 'bad-header' })
        continue
      }
      const def = commandDefs.get(c.type)
      if (!def) {
        rejected.push({ command: c, reason: 'unknown-command' })
        continue
      }
      if (c.tick !== tick) {
        rejected.push({ command: c, reason: 'wrong-tick' })
        continue
      }
      const key = `${c.source}:${c.seq}`
      if (seen.has(key)) {
        rejected.push({ command: c, reason: 'duplicate-seq' })
        continue
      }
      const parsed = def.schema.safeParse(c.payload)
      if (!parsed.success) {
        rejected.push({ command: c, reason: 'invalid-payload' })
        continue
      }
      seen.add(key)
      accepted.push({ ...c, parsed: parsed.data })
    }
    accepted.sort((a, b) => a.source - b.source || a.seq - b.seq)
    stagedCommands = new Map()
    for (const c of accepted) {
      const list = stagedCommands.get(c.type) ?? []
      list.push({ source: c.source, seq: c.seq, payload: c.parsed })
      stagedCommands.set(c.type, list)
    }
    return rejected
  }

  const sim: Sim = {
    seed: opts.seed,
    tickHz,
    // Never changes for the life of the sim: restore refuses a snapshot taken with other content.
    contentHash: hex64(contentHash),
    get tick() {
      return tick
    },
    step(commands) {
      refuseIfFaulted()
      const rejected = intake(commands)
      events = []
      for (const { system, ctx } of contexts) {
        try {
          system.run(ctx)
        } catch (err) {
          fault = new SimFaultedError(system.name, tick, err)
          throw fault
        }
      }
      tick += 1
      commandsByType = new Map()
      stagedCommands = new Map()
      return { tick, events, render: lastDelta, rejected }
    },
    spawn: (parts) => {
      refuseIfDisposed()
      return store.spawn(parts)
    },
    entity: (sid) => {
      refuseIfDisposed()
      return store.ref(sid)
    },
    query: (...cs) => {
      refuseIfDisposed()
      return store.query(cs)
    },
    resource: (def) => {
      refuseIfDisposed()
      return resourceOf(def)
    },
    snapshot() {
      refuseIfFaulted()
      const entities = store.snapshotRows()
      const resourceRows = sortedIds(resourceDefs).map((id) => {
        const def = resourceDefs.get(id) as ResourceDef
        const checked = def.schema.safeParse(resources.get(id))
        if (!checked.success)
          throw new Error(`resource "${id}" no longer matches its schema: ${checked.error.message}`)
        let json: string
        try {
          json = canonicalJson(checked.data)
        } catch (err) {
          throw new Error(`resource "${id}" does not round-trip through JSON: ${(err as Error).message}`, {
            cause: err,
          })
        }
        const again = def.schema.safeParse(JSON.parse(json))
        if (!again.success || canonicalJson(again.data) !== json)
          throw new Error(`resource "${id}" does not round-trip through JSON`)
        // Zod strips unknown keys, so the checked copy would hide state that restore cannot reproduce.
        if (canonicalJson(resources.get(id)) !== json)
          throw new Error(`resource "${id}" has values outside its schema`)
        return { id, json }
      })
      return encodeSnapshot(
        {
          schemaHash,
          contentHash,
          tick,
          tickHz,
          rng: systems.map((s) => ({ name: s.name, state: (rngs.get(s.name) as Rng).state() })),
          resources: resourceRows,
          nextId: store.nextId,
          entities,
          plugins: states.map(({ name, state }) => ({ name, bytes: state.snapshot() })),
        },
        componentList,
      )
    },
    restore(bytes) {
      refuseIfDisposed()
      const data = decodeForThisSim(bytes)
      // Validate everything first, without touching this sim. Then free the old Koota world before building the
      // new one, so a restore never needs a second world (Koota allows 16 per process).
      let rows: Array<{ sid: number; parts: SpawnPart[] }>
      let nextResources: Map<string, unknown>
      let nextRngs: Map<string, Rng>
      // Each plugin's parsed restore; on any failure every one of them is discarded, so none leaks.
      const prepared: PreparedRestore[] = []
      try {
        rows = data.entities.map((e) => ({
          sid: e.sid,
          parts: [...e.components].map(
            ([id, values]) => [components.get(id) as ComponentDef, values] as const,
          ),
        }))
        for (const row of rows) store.checkParts(row.parts)
        const expectedIds = sortedIds(resourceDefs)
        if (
          data.resources.length !== expectedIds.length ||
          data.resources.some((row, i) => row.id !== expectedIds[i])
        )
          throw new SnapshotFormatError('resource rows do not match the registered resources')
        nextResources = new Map<string, unknown>()
        for (const { id, json } of data.resources) {
          const def = resourceDefs.get(id)
          if (!def) throw new SnapshotFormatError(`unknown resource "${id}"`)
          const value = def.schema.parse(JSON.parse(json))
          // A value this build's schema reshapes (a stripped field, a default filled in) is not the stored state.
          if (canonicalJson(value) !== json)
            throw new SnapshotFormatError(`resource "${id}" does not re-encode to the stored bytes`)
          nextResources.set(id, value)
        }
        nextRngs = new Map<string, Rng>(data.rng.map((r) => [r.name, rngFromState(r.state)]))
        if (nextRngs.size !== rngs.size || systems.some((s) => !nextRngs.has(s.name))) {
          throw new SnapshotFormatError('rng streams do not match the systems')
        }
        if (
          data.plugins.length !== states.length ||
          data.plugins.some((row, i) => row.name !== states[i]?.name)
        )
          throw new SnapshotFormatError('plugin state rows do not match the stateful plugins')
        // Every plugin validates before anything is committed, so one bad row leaves every plugin untouched.
        states.forEach(({ state }, i) => {
          prepared.push(state.prepareRestore((data.plugins[i] as { bytes: Uint8Array }).bytes))
        })
      } catch (err) {
        for (const p of prepared) p.discard()
        throw err instanceof SnapshotFormatError ? err : new SnapshotFormatError(String(err), { cause: err })
      }
      // Commit. Nothing below can fail on snapshot contents; everything it reads was validated above.
      store.dispose()
      store = new EntityStore(componentList)
      for (const row of rows) store.spawnWithId(row.sid, row.parts)
      store.nextId = data.nextId
      store.takeDelta(false)
      for (const [id, v] of nextResources) resources.set(id, v)
      for (const [name, r] of nextRngs) rngs.set(name, r)
      for (const p of prepared) p.commit()
      tick = data.tick
      fault = undefined
      fullResync = true
      pendingDespawn = new Set()
      events = []
    },
    hash() {
      return hex64(xxhash64(sim.snapshot()))
    },
    describeSnapshot(bytes) {
      refuseIfDisposed()
      return viewSnapshot(decodeForThisSim(bytes ?? sim.snapshot()))
    },
    dispose() {
      if (disposed) return
      disposed = true
      const fault = releaseAll(store, states)
      if (fault) throw fault.error
    },
  }
  return sim
}

/**
 * Disposes the store and every plugin state, in that order. A dispose that throws doesn't stop the rest, since
 * each one holds its own engine memory; the first error is returned so the caller decides whether to rethrow.
 */
function releaseAll(
  store: EntityStore,
  states: ReadonlyArray<{ state: PluginState }>,
): { error: unknown } | undefined {
  let fault: { error: unknown } | undefined
  const release = (dispose: () => void) => {
    try {
      dispose()
    } catch (error) {
      fault ??= { error }
    }
  }
  release(() => store.dispose())
  for (const { state } of states) release(() => state.dispose())
  return fault
}

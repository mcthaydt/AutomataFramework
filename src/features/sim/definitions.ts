// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/define/definitions.ts
import { type Trait, trait } from 'koota'
import { canonicalJson } from '../../lib/canonical.ts'
import { deepFreeze } from '../../lib/deep-freeze.ts'
import { sortedKeys } from '../../lib/sorted.ts'
import type { z } from '../../lib/zod.ts'
import type { SimContext } from './context.ts'
import { defaultField, FIELD_TYPES, type FieldSchema, type FieldType } from './fields.ts'

/** Fixed phase order. */
export const PHASES = ['input', 'prePhysics', 'physics', 'postPhysics', 'gameplay', 'cleanup'] as const
/** One of the six phases a tick runs through, in `PHASES` order. */
export type Phase = (typeof PHASES)[number]

// Stable ids key the snapshot, network and save formats: lower-case, dot- or dash-separated words.
const ID_RE = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/
const FIELD_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

function checkId(what: string, id: string): void {
  if (!ID_RE.test(id)) throw new Error(`${what} id "${id}" must match ${ID_RE}`)
}

/**
 * A component: a stable id and a flat record of typed fields. Create one with `defineComponent`; game code
 * addresses entity data through the definition, never through `trait`.
 */
export interface ComponentDef<S extends FieldSchema = FieldSchema> {
  readonly kind: 'component'
  readonly id: string
  readonly fields: S
  /** Field names in sorted order: the order used by snapshots. */
  readonly fieldNames: readonly string[]
  /** Included in RenderDelta rows (default true). */
  readonly render: boolean
  /** Internal Koota storage. Game code never touches it. */
  readonly trait: Trait
}

/**
 * Defines a component from an id (lower-case words separated by dots or dashes) and its fields by name and
 * type. `render: false` keeps it out of the renderer's deltas. Throws for a bad id, no fields, a bad field
 * name or an unknown field type.
 */
export function defineComponent<S extends FieldSchema>(
  id: string,
  fields: S,
  opts: { render?: boolean } = {},
): ComponentDef<S> {
  checkId('component', id)
  const fieldNames = sortedKeys(fields)
  if (fieldNames.length === 0) throw new Error(`component "${id}" needs at least one field`)
  const defaults: Record<string, number | boolean | string> = {}
  for (const name of fieldNames) {
    const type = fields[name] as FieldType
    if (!FIELD_RE.test(name)) throw new Error(`component "${id}" has invalid field name "${name}"`)
    if (!FIELD_TYPES.includes(type))
      throw new Error(`component "${id}" field "${name}" has unknown field type "${type}"`)
    defaults[name] = defaultField(type)
  }
  // A factory, not a schema object: Koota builds structure-of-arrays accessors for a schema object with
  // `new Function`, which a strict content security policy (no 'unsafe-eval') blocks. Each entity holds its own record instead
  // (array-of-structures); the entity store always writes whole records, so nothing else changes.
  const traitDef = trait(() => ({ ...defaults }))
  return { kind: 'component', id, fields, fieldNames, render: opts.render ?? true, trait: traitDef }
}

/**
 * A command the sim accepts as input: an id and the Zod schema its payload must match. Create one with
 * `defineCommand`.
 */
export interface CommandDef<Z extends z.ZodType = z.ZodType> {
  readonly kind: 'command'
  readonly id: string
  readonly schema: Z
}

/**
 * Defines a command by id and payload schema. Throws for an id that is not lower-case words separated by dots
 * or dashes.
 */
export function defineCommand<Z extends z.ZodType>(id: string, schema: Z): CommandDef<Z> {
  checkId('command', id)
  return { kind: 'command', id, schema }
}

/**
 * An event a system emits: an id and the Zod schema its payload must match. Create one with `defineEvent`.
 */
export interface EventDef<Z extends z.ZodType = z.ZodType> {
  readonly kind: 'event'
  readonly id: string
  readonly schema: Z
}

/**
 * Defines an event by id and payload schema, to emit from a system with `ctx.emit`. Events come back in
 * `StepResult.events`; `ctx.emit` throws for a payload that fails the schema.
 */
export function defineEvent<Z extends z.ZodType>(id: string, schema: Z): EventDef<Z> {
  checkId('event', id)
  return { kind: 'event', id, schema }
}

/**
 * A value the sim keeps once, not on any entity: an id, a Zod schema and the `init` that gives its starting
 * value. Create one with `defineResource`.
 */
export interface ResourceDef<Z extends z.ZodType = z.ZodType> {
  readonly kind: 'resource'
  readonly id: string
  readonly schema: Z
  readonly init: () => z.input<Z>
}

/**
 * Defines a resource by id, schema and starting value. `createSim` parses `init()` with the schema, so a bad
 * start fails there.
 */
export function defineResource<Z extends z.ZodType>(
  id: string,
  schema: Z,
  init: () => z.input<Z>,
): ResourceDef<Z> {
  checkId('resource', id)
  return { kind: 'resource', id, schema, init }
}

/**
 * A system: a name, the phase it runs in, the systems it must run `before` or `after` within that phase, and
 * its `run`, called once per tick. Create one with `defineSystem`.
 */
export interface SystemDef {
  readonly kind: 'system'
  readonly name: string
  readonly phase: Phase
  readonly before: readonly string[]
  readonly after: readonly string[]
  readonly run: (ctx: SimContext) => void
}

/** The object form of `defineSystem`: a name, a phase, the optional `before`/`after` ordering and the run. */
export interface SystemSpec {
  name: string
  phase: Phase
  before?: readonly string[]
  after?: readonly string[]
  run: (ctx: SimContext) => void
}

/**
 * A system: `defineSystem(name, run)` runs in `gameplay`, `defineSystem(name, phase, run)` in that phase, and the
 * object form also takes `before`/`after`. All three build the same SystemDef.
 */
export function defineSystem(name: string, run: (ctx: SimContext) => void): SystemDef
export function defineSystem(name: string, phase: Phase, run: (ctx: SimContext) => void): SystemDef
export function defineSystem(spec: SystemSpec): SystemDef
export function defineSystem(
  nameOrSpec: string | SystemSpec,
  phaseOrRun?: Phase | ((ctx: SimContext) => void),
  run?: (ctx: SimContext) => void,
): SystemDef {
  if (typeof nameOrSpec !== 'string') return defineSystemFrom(nameOrSpec)
  if (typeof phaseOrRun === 'function')
    return defineSystemFrom({ name: nameOrSpec, phase: 'gameplay', run: phaseOrRun })
  return defineSystemFrom({
    name: nameOrSpec,
    phase: phaseOrRun as Phase,
    run: run as (ctx: SimContext) => void,
  })
}

function defineSystemFrom(spec: SystemSpec): SystemDef {
  checkId('system', spec.name)
  if (!PHASES.includes(spec.phase)) throw new Error(`system "${spec.name}" has unknown phase "${spec.phase}"`)
  return {
    kind: 'system',
    name: spec.name,
    phase: spec.phase,
    before: spec.before ?? [],
    after: spec.after ?? [],
    run: spec.run,
  }
}

/**
 * Engine state a plugin keeps outside the ECS, such as a Rapier world. `createSim` creates
 * one per sim, so a PluginDef shared by many sims never shares engine state between them.
 */
export interface PluginState {
  /** Bytes for snapshot section 6. Must be canonical: the same state gives the same bytes in every engine. */
  snapshot(): Uint8Array
  /**
   * Validates and parses `bytes` without touching the live state. Throwing here (a SnapshotFormatError for bad
   * bytes) leaves the sim exactly as it was. Otherwise the sim later calls exactly one of the result's
   * methods: `commit` when every part of the snapshot was valid, `discard` when another part was not.
   */
  prepareRestore(bytes: Uint8Array): PreparedRestore
  /** Frees the engine. The sim calls it once, on `dispose` or when `createSim` fails after creating it. */
  dispose(): void
}

/** A plugin's parsed restore, held until the sim knows whether the whole snapshot is valid. */
export interface PreparedRestore {
  /** Adopts the parsed state and frees the state it replaces. Must not throw. */
  commit(): void
  /** Frees whatever `prepareRestore` built (a restored engine world). Must not throw. */
  discard(): void
}

/** What a plugin's state may know when it is created. */
export interface PluginStateSetup {
  /** The sim's fixed step, 1 / tickHz seconds. */
  readonly dt: number
}

/**
 * A bundle of definitions the sim registers together: components, commands, events, resources and systems,
 * the plugins it depends on, and optionally per-sim engine state and `config`. Create one with
 * `definePlugin`.
 */
export interface PluginDef {
  readonly kind: 'plugin'
  readonly name: string
  /** Creates this plugin's per-sim engine state; its systems see it as `ctx.pluginState`. */
  readonly state: ((setup: PluginStateSetup) => Promise<PluginState>) | undefined
  readonly dependsOn: readonly string[]
  readonly components: readonly ComponentDef[]
  readonly commands: readonly CommandDef[]
  readonly events: readonly EventDef[]
  readonly resources: readonly ResourceDef[]
  readonly systems: readonly SystemDef[]
  /**
   * Settings that change what the plugin simulates (physics gravity), as plain JSON. Part of the schema hash,
   * so a snapshot never restores into a sim configured differently. Undefined when the plugin has none.
   */
  readonly config: unknown
}

/** Anything `definePlugin`'s flat `defs` list takes. */
export type Def = ComponentDef | CommandDef | EventDef | ResourceDef | SystemDef

/**
 * Defines a plugin from a name, its dependencies and its definitions, given in the keyed lists or in one flat
 * `defs` list sorted by kind. A plugin written either way registers the same lists and gets the same schema
 * hash. `config` is copied as canonical, frozen JSON, so anything that cannot hash exactly throws a
 * `CanonicalJsonError` here.
 */
export function definePlugin(spec: {
  name: string
  dependsOn?: readonly string[]
  /** One flat list, sorted into the keyed lists by `kind`; each entry follows that list's keyed entries. */
  defs?: readonly Def[]
  components?: readonly ComponentDef[]
  commands?: readonly CommandDef[]
  events?: readonly EventDef[]
  resources?: readonly ResourceDef[]
  systems?: readonly SystemDef[]
  state?: (setup: PluginStateSetup) => Promise<PluginState>
  config?: unknown
}): PluginDef {
  checkId('plugin', spec.name)
  // A canonical, frozen copy: it throws CanonicalJsonError for anything that cannot hash exactly, and nobody
  // can change it after it joins the schema hash.
  const config = spec.config === undefined ? undefined : deepFreeze(JSON.parse(canonicalJson(spec.config)))
  // Keyed entries first, then `defs` in order, so a plugin written either way registers the same lists in the
  // same order and gets the same schema hash. Duplicates are left for createSim to reject, as they are today.
  const components = [...(spec.components ?? [])]
  const commands = [...(spec.commands ?? [])]
  const events = [...(spec.events ?? [])]
  const resources = [...(spec.resources ?? [])]
  const systems = [...(spec.systems ?? [])]
  for (const def of spec.defs ?? []) {
    if (def.kind === 'component') components.push(def)
    else if (def.kind === 'command') commands.push(def)
    else if (def.kind === 'event') events.push(def)
    else if (def.kind === 'resource') resources.push(def)
    else if (def.kind === 'system') systems.push(def)
    else
      throw new Error(
        `plugin "${spec.name}" defs has an entry of unknown kind "${(def as { kind: unknown }).kind}"`,
      )
  }
  return {
    kind: 'plugin',
    name: spec.name,
    dependsOn: spec.dependsOn ?? [],
    components,
    commands,
    events,
    resources,
    systems,
    state: spec.state,
    config,
  }
}

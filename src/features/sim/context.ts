// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/define/context.ts
import type { z } from 'zod'
import type { CommandDef, ComponentDef, EventDef, ResourceDef } from './definitions.ts'
import type { FieldSchema, FieldValues } from './fields.ts'
import type { Rng } from './rng.ts'

/** A live entity, addressed by its StableId. Writes are coerced per field type and mark the entity changed. */
export interface EntityRef {
  readonly sid: number
  has(component: ComponentDef): boolean
  get<S extends FieldSchema>(component: ComponentDef<S>): Readonly<FieldValues<S>>
  set<S extends FieldSchema>(component: ComponentDef<S>, values: Partial<FieldValues<S>>): void
  add<S extends FieldSchema>(component: ComponentDef<S>, values?: Partial<FieldValues<S>>): void
  remove(component: ComponentDef): void
}

/** A component to spawn with: the definition alone (defaults) or [definition, initial values]. */
export type SpawnPart = ComponentDef | readonly [ComponentDef, Readonly<Record<string, unknown>>]

/**
 * A command as a system reads it this tick: the player slot that sent it (`source`), its per-source `seq` and
 * its parsed `payload`.
 */
export interface CommandRecord<P> {
  readonly source: number
  readonly seq: number
  readonly payload: P
}

/** What a system's `run` receives each tick. */
export interface SimContext {
  readonly tick: number
  /** Fixed step, 1 / tickHz. */
  readonly dt: number
  /** This system's own RNG substream. */
  readonly rng: Rng
  /** Compiled content, deep-frozen. */
  readonly content: unknown
  /** Live entities that have every listed component, in ascending StableId order. */
  query(...components: ComponentDef[]): EntityRef[]
  entity(sid: number): EntityRef | undefined
  /** Spawns immediately; returns the new StableId. */
  spawn(...parts: SpawnPart[]): number
  /** Despawn is deferred to the end of the tick (built-in `entities.flush`). */
  despawn(sid: number): void
  readonly commands: {
    of<Z extends z.ZodType>(def: CommandDef<Z>): ReadonlyArray<CommandRecord<z.output<Z>>>
  }
  emit<Z extends z.ZodType>(def: EventDef<Z>, payload: z.input<Z>): void
  readonly events: {
    /**
     * The payloads of this event emitted so far in this tick, in the order they were emitted: nothing from an
     * earlier tick, and nothing a later system has yet to emit. Events are not part of a snapshot, so a restored
     * sim has none until its systems run again.
     */
    of<Z extends z.ZodType>(def: EventDef<Z>): ReadonlyArray<z.output<Z>>
  }
  resource<Z extends z.ZodType>(def: ResourceDef<Z>): z.output<Z>
  /** The per-sim state of the plugin that registered this system (`definePlugin({ state })`), else undefined. */
  readonly pluginState: unknown
}

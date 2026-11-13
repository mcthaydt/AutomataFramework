// The sim feature's entry: everything another feature may use of the sim, and nothing else.
// Game code never imports Koota; it goes through these definitions and the Sim.
export type { CommandRecord, EntityRef, SimContext, SpawnPart } from './context.ts'
export type {
  Command,
  RejectedCommand,
  RejectReason,
  Sim,
  SimEvent,
  SimOptions,
  StepResult,
} from './create-sim.ts'
export { createSim } from './create-sim.ts'
export {
  type CommandDef,
  type ComponentDef,
  type Def,
  defineCommand,
  defineComponent,
  defineEvent,
  definePlugin,
  defineResource,
  defineSystem,
  type EventDef,
  PHASES,
  type Phase,
  type PluginDef,
  type PluginState,
  type PluginStateSetup,
  type PreparedRestore,
  type ResourceDef,
  type SystemDef,
  type SystemSpec,
} from './definitions.ts'
export * from './dmath.ts'
export type { FieldRecord, RenderDelta, RenderRow } from './entity-store.ts'
export { SimCapacityError } from './entity-store.ts'
export { SimDisposedError, SimFaultedError } from './errors.ts'
export type { FieldSchema, FieldType, FieldValue, FieldValues } from './fields.ts'
export { createRng, deriveSeed, type Rng, type RngState } from './rng.ts'
export {
  SNAPSHOT_VERSION,
  SnapshotFormatError,
  SnapshotMismatchError,
  type SnapshotView,
} from './snapshot.ts'
export { FRAMEWORK_VERSION } from './version.ts'

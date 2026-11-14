// Save slots: progress kept through a host's store. Three rules from the first attempt hold everything together:
// a save from a newer build is never changed, a save that cannot be read is kept and shown as damaged (never read as
// empty), and the host's "no" is an answer the game is given, never something quietly kept in memory instead.
// Nothing here waits on a timer, an event or a frame, so a save asked for as a page closes is already with the host.
import { type SaveDef, type SaveProblem, slotKey, upgrade } from './define.ts'
import { readEnvelope, writeEnvelope } from './envelope.ts'
import type { SaveStore, StoreResult } from './store.ts'

/** One slot, as a saves screen lists it. */
export type SlotState =
  | { readonly slot: number; readonly kind: 'empty' }
  | { readonly slot: number; readonly kind: 'ready'; readonly savedAt: number; readonly label?: string }
  | {
      readonly slot: number
      readonly kind: 'damaged' | 'newer' | 'too-old'
      readonly problem: SaveProblem
    }

/** What `load` answers. `data` is at this build's version, upgraded if it was stored older; `null` for an empty slot. */
export type LoadResult<S> =
  | { readonly ok: true; readonly data: S | null; readonly savedAt?: number; readonly label?: string }
  | { readonly ok: false; readonly problem: SaveProblem }

/** What `save` answers. */
export type SaveResult = { readonly ok: true } | { readonly ok: false; readonly problem: SaveProblem }

export interface Saves<S> {
  /** Can the host keep a save right now? A title screen asks before a player has played for five minutes. */
  check(): Promise<StoreResult<void>>
  /** Every slot, in order, read afresh from the host each time. */
  list(): Promise<StoreResult<readonly SlotState[]>>
  load(slot: number): Promise<LoadResult<S>>
  /**
   * Writes the slot. A slot that is damaged, newer or too old is not written over unless `replace` is true (a saves
   * screen passes it after the player has said yes); the answer is then that slot's problem.
   * Rejects with a `RangeError`, before anything is written, for a slot the game does not have, data its schema
   * refuses, or data JSON cannot keep.
   */
  save(
    slot: number,
    data: S,
    options?: { readonly label?: string; readonly replace?: boolean },
  ): Promise<SaveResult>
  erase(slot: number): Promise<StoreResult<void>>
}

/** What a slot holds, once read: nothing, a save this build can use, or the reason it cannot. */
type Reading<S> =
  | { readonly kind: 'empty' }
  | { readonly kind: 'ready'; readonly data: S; readonly savedAt: number; readonly label?: string }
  | { readonly kind: 'problem'; readonly problem: SaveProblem }

/** Reads and understands one slot from the host. */
async function read<S>(def: SaveDef<S>, store: SaveStore, slot: number): Promise<Reading<S>> {
  const got = await store.get(slotKey(def, slot))
  if (!got.ok)
    return { kind: 'problem', problem: { kind: 'refused', refusal: got.refusal, detail: got.detail } }
  if (got.value === null) return { kind: 'empty' }
  const envelope = readEnvelope(got.value)
  if (!envelope.ok) return { kind: 'problem', problem: { kind: 'damaged', detail: envelope.detail } }
  const upgraded = upgrade(def, envelope.envelope)
  if (!upgraded.ok) return { kind: 'problem', problem: upgraded.problem }
  const { savedAt, label } = envelope.envelope
  return { kind: 'ready', data: upgraded.data, savedAt, ...(label === undefined ? {} : { label }) }
}

/** The state a list shows for what a slot holds. */
function stateOf(slot: number, reading: Reading<unknown>): SlotState {
  if (reading.kind === 'empty') return { slot, kind: 'empty' }
  if (reading.kind === 'ready') {
    const { savedAt, label } = reading
    return { slot, kind: 'ready', savedAt, ...(label === undefined ? {} : { label }) }
  }
  const { problem } = reading
  // A refusal is not about one slot, so `list` answers it for the whole list before it gets here.
  return { slot, kind: problem.kind === 'refused' ? 'damaged' : problem.kind, problem }
}

/** The save slots of one game on one host's store. `now` is for the slot list only: it never reaches the sim. */
export function createSaves<S>(options: {
  readonly def: SaveDef<S>
  readonly store: SaveStore
  /** Milliseconds since 1970. Default `Date.now`. */
  readonly now?: () => number
}): Saves<S> {
  const { def, store, now = Date.now } = options
  return {
    check: () => store.check(),
    async list() {
      const states: SlotState[] = []
      for (let slot = 0; slot < def.slots; slot++) {
        const reading = await read(def, store, slot)
        if (reading.kind === 'problem' && reading.problem.kind === 'refused') {
          const { refusal, detail } = reading.problem
          return { ok: false, refusal, detail }
        }
        states.push(stateOf(slot, reading))
      }
      return { ok: true, value: states }
    },
    async load(slot) {
      const reading = await read(def, store, slot)
      if (reading.kind === 'empty') return { ok: true, data: null }
      if (reading.kind === 'problem') return { ok: false, problem: reading.problem }
      const { data, savedAt, label } = reading
      return { ok: true, data, savedAt, ...(label === undefined ? {} : { label }) }
    },
    async save(slot, data, saveOptions = {}) {
      const key = slotKey(def, slot)
      const checked = def.schema.safeParse(data)
      if (!checked.success)
        throw new RangeError(
          `This is not what "${def.game}" saves: ${checked.error.issues.map((i) => i.message).join('; ')}.`,
        )
      const { label, replace = false } = saveOptions
      // Written to text first, so data JSON cannot keep throws here and the host is not touched.
      const text = writeEnvelope({
        format: 1,
        version: def.version,
        savedAt: now(),
        ...(label === undefined ? {} : { label }),
        data: checked.data,
      })
      const reading = await read(def, store, slot)
      if (reading.kind === 'problem' && (reading.problem.kind === 'refused' || !replace))
        return { ok: false, problem: reading.problem }
      const wrote = await store.set(key, text)
      if (!wrote.ok)
        return { ok: false, problem: { kind: 'refused', refusal: wrote.refusal, detail: wrote.detail } }
      return { ok: true }
    },
    async erase(slot) {
      return store.remove(slotKey(def, slot))
    },
  }
}

/** The ready slot saved last, for "Continue"; `undefined` when none is ready. Ties go to the lower slot. */
export function latestSlot(states: readonly SlotState[]): number | undefined {
  let best: { slot: number; savedAt: number } | undefined
  for (const state of states) {
    if (state.kind !== 'ready') continue
    if (
      best === undefined ||
      state.savedAt > best.savedAt ||
      (state.savedAt === best.savedAt && state.slot < best.slot)
    )
      best = { slot: state.slot, savedAt: state.savedAt }
  }
  return best?.slot
}

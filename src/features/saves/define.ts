// A game's save definition and the rules that turn stored data into data this build can use: the keys it is stored
// under, and upgrading it one version at a time. Policy, kept from the first attempt because it was learned the hard
// way: a save from a newer build is never touched, and a save that cannot be read is never read as empty.
import type { z } from 'zod'
import type { Envelope } from './envelope.ts'
import type { StoreRefusal } from './store.ts'

/** A game's progress save: what it holds, and how older versions become this one. */
export interface SaveDef<S> {
  /** The game's own short id, e.g. 'crate-game': 1 to 40 of a-z, 0-9 and '-'. Never the display name, which may change. */
  readonly game: string
  /** This build's version of the data, a whole number from 1. Raise it when `schema` changes shape. */
  readonly version: number
  readonly schema: z.ZodType<S>
  /** How many slots the game has, 1 to 9. */
  readonly slots: number
  /** `upgrades[n]` turns version `n` data into version `n + 1` data. */
  readonly upgrades?: Readonly<Record<number, (data: unknown) => unknown>>
}

/** Why a stored save cannot be used as it is. */
export type SaveProblem =
  /** The host would not give the text back (or keep it). */
  | { readonly kind: 'refused'; readonly refusal: StoreRefusal; readonly detail: string }
  /** Not a save envelope, or data its schema refuses. */
  | { readonly kind: 'damaged'; readonly detail: string }
  /** Written by a newer version of the game. */
  | { readonly kind: 'newer'; readonly version: number }
  /** No upgrade from that version, or the upgrade threw. */
  | { readonly kind: 'too-old'; readonly version: number }

const GAME_ID = /^[a-z0-9-]{1,40}$/

function checkGame(game: string): void {
  if (!GAME_ID.test(game))
    throw new RangeError(`A save's game id is 1 to 40 of a-z, 0-9 and "-", like "crate-game". Got "${game}".`)
}

/** Checks `game`, `version` and `slots` and throws a `RangeError` with a plain message; otherwise returns `def`. */
export function defineSave<S>(def: SaveDef<S>): SaveDef<S> {
  checkGame(def.game)
  if (!Number.isInteger(def.version) || def.version < 1)
    throw new RangeError(`A save's version is a whole number from 1. Got ${def.version}.`)
  if (!Number.isInteger(def.slots) || def.slots < 1 || def.slots > 9)
    throw new RangeError(`A save has 1 to 9 slots. Got ${def.slots}.`)
  return def
}

/** Where slot `slot` is stored: `automata.<game>.save.<slot>`. Throws a `RangeError` for a slot the game does not have. */
export function slotKey(def: SaveDef<unknown>, slot: number): string {
  if (!Number.isInteger(slot) || slot < 0 || slot >= def.slots)
    throw new RangeError(`This game has slots 0 to ${def.slots - 1}. Got ${slot}.`)
  return `automata.${def.game}.save.${slot}`
}

/** Where the game's settings are stored: `automata.<game>.settings`. Throws a `RangeError` for a bad game id. */
export function settingsKey(game: string): string {
  checkGame(game)
  return `automata.${game}.settings`
}

/** Brings a read envelope to this build's version and checks it against the schema. */
export function upgrade<S>(
  def: SaveDef<S>,
  envelope: Envelope,
): { readonly ok: true; readonly data: S } | { readonly ok: false; readonly problem: SaveProblem } {
  if (envelope.version > def.version)
    return { ok: false, problem: { kind: 'newer', version: envelope.version } }
  const tooOld = { ok: false, problem: { kind: 'too-old', version: envelope.version } } as const
  // A copy, so an upgrade that changes its argument cannot change what the slot still holds.
  let data = structuredClone(envelope.data)
  for (let from = envelope.version; from < def.version; from++) {
    const step = def.upgrades?.[from]
    if (step === undefined) return tooOld
    try {
      data = step(data)
    } catch {
      return tooOld
    }
  }
  const checked = def.schema.safeParse(data)
  if (!checked.success)
    return {
      ok: false,
      problem: { kind: 'damaged', detail: 'This save does not hold what this game saves.' },
    }
  return { ok: true, data: checked.data }
}

// The storage port: where a host keeps a game's saved text. A host adapter makes one; nothing else stores anything.
// A "no" from the host is an answer the game is given (a `StoreRefusal`), never an exception, and never quietly
// replaced by some other way of keeping the text.

/** Why a host would not keep or give back a value. */
export type StoreRefusal =
  /** The host is not letting the game save at all (storage blocked, a private window, a locked frame). */
  | 'unavailable'
  /** There is no room left. */
  | 'full'
  /** Anything else; `detail` says what. */
  | 'failed'

/** What a store call answers: the value, or why not. */
export type StoreResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly refusal: StoreRefusal; readonly detail: string }

/**
 * Where a host keeps a game's saved text. Every host adapter makes one; nothing else stores anything. An adapter
 * answers, it never rejects: a "no" is a `StoreResult`. (`guardStore` turns a rejection that slips through into a
 * `failed` answer, so a game is not brought down by an adapter's mistake.)
 */
export interface SaveStore {
  /** Can a value be kept right now? A title screen asks this before a player has played for five minutes. */
  check(): Promise<StoreResult<void>>
  /** `null` when nothing is stored under `key`. */
  get(key: string): Promise<StoreResult<string | null>>
  set(key: string, value: string): Promise<StoreResult<void>>
  remove(key: string): Promise<StoreResult<void>>
}

/** A store in memory, for the test host and for tests. It can be told to refuse, and shows what it holds. */
export interface MemoryStore extends SaveStore {
  /** From now on every call is refused this way; `undefined` lets calls through again. */
  refuse(refusal: StoreRefusal | undefined): void
  /** Everything stored, by key. A copy: changing it changes nothing. */
  entries(): Readonly<Record<string, string>>
}

/** What an adapter's own failure becomes: a refusal with the error's words. */
function failed(error: unknown): { ok: false; refusal: 'failed'; detail: string } {
  return { ok: false, refusal: 'failed', detail: error instanceof Error ? error.message : String(error) }
}

/**
 * The same store, but a call that rejects or throws answers `failed` instead. The call itself is made at once, with
 * nothing awaited first, so a save asked for as a page closes is still already with the host.
 */
export function guardStore(store: SaveStore): SaveStore {
  const guard = async <T>(call: () => Promise<StoreResult<T>>): Promise<StoreResult<T>> => {
    try {
      return await call()
    } catch (error) {
      return failed(error)
    }
  }
  return {
    check: () => guard(() => store.check()),
    get: (key) => guard(() => store.get(key)),
    set: (key, value) => guard(() => store.set(key, value)),
    remove: (key) => guard(() => store.remove(key)),
  }
}

const OK: StoreResult<void> = { ok: true, value: undefined }

/** A store in memory. `initial` is what it holds from the start. */
export function memoryStore(initial: Readonly<Record<string, string>> = {}): MemoryStore {
  const held = new Map<string, string>(Object.entries(initial))
  let refusing: StoreRefusal | undefined
  /** The refusal to answer with, or `undefined` while calls go through. */
  const refusal = (): StoreResult<never> | undefined =>
    refusing === undefined
      ? undefined
      : { ok: false, refusal: refusing, detail: 'The test store was told to refuse.' }
  return {
    async check() {
      return refusal() ?? OK
    },
    async get(key) {
      return refusal() ?? { ok: true, value: held.get(key) ?? null }
    },
    async set(key, value) {
      const no = refusal()
      if (no) return no
      held.set(key, value)
      return OK
    },
    async remove(key) {
      const no = refusal()
      if (no) return no
      held.delete(key)
      return OK
    },
    refuse(next) {
      refusing = next
    },
    entries() {
      return Object.fromEntries(held)
    },
  }
}

// A save store over the browser's `localStorage`. The browser can say no in several ways (storage blocked in a private
// window or a locked-down frame, no room left, anything else), and each is an answer the game is given. Nothing is
// ever kept in memory instead: a save that was not stored is not a save.
import type { SaveStore, StoreRefusal, StoreResult } from '../saves/saves.ts'

/** The key `check` writes and removes at once, to learn whether a value can be kept. */
const CHECK_KEY = 'automata.check'

/** What a browser's "no" means: SecurityError is storage blocked; the two quota names are no room left. */
function refusalOf(error: unknown): { refusal: StoreRefusal; detail: string } {
  const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : ''
  const detail = error instanceof Error ? error.message : String(error)
  if (name === 'SecurityError') return { refusal: 'unavailable', detail }
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED')
    return { refusal: 'full', detail }
  return { refusal: 'failed', detail }
}

/**
 * A SaveStore over a page's localStorage. `storage` is called afresh for each call, and may throw: a browser can
 * refuse even to hand it over. Every method does its work before it returns its promise, with no `await` first, so a
 * save asked for as the page closes is already kept.
 */
export function webStore(storage: () => Storage): SaveStore {
  /** Runs one storage call and answers with its value, or with what the browser's "no" means. */
  const run = <T>(call: (s: Storage) => T): Promise<StoreResult<T>> => {
    try {
      return Promise.resolve({ ok: true, value: call(storage()) })
    } catch (error) {
      return Promise.resolve({ ok: false, ...refusalOf(error) })
    }
  }
  return {
    check: () =>
      run((s) => {
        s.setItem(CHECK_KEY, '1')
        s.removeItem(CHECK_KEY)
      }),
    get: (key) => run((s) => s.getItem(key)),
    set: (key, value) =>
      run((s) => {
        s.setItem(key, value)
      }),
    remove: (key) =>
      run((s) => {
        s.removeItem(key)
      }),
  }
}

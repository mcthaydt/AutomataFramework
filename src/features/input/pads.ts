// The page's side of gamepads: reading every pad the browser shows, keeping what was held when hands changed from
// acting until it is let go, and telling when a pad arrives or goes. The reading of one pad is `gamepad.ts`, pure.
import type { PadInput } from '../commands/commands.ts'
import { isUsable, type PadLike, readPad } from './gamepad.ts'

/** Browsers give four slots; a pad past them cannot be named (`pad-4` is not a device), so it is not usable. */
const SLOTS = 4

/** One pad the browser reports. */
export interface ListedPad {
  readonly index: number
  readonly id: string
  readonly usable: boolean
}

export interface Pads {
  /** Reads every pad now. Returns what is held on each usable pad, masked inputs left out. */
  read(): ReadonlyMap<number, ReadonlySet<PadInput>>
  /** Every pad the browser reports, usable or not, asked of the browser now. */
  list(): readonly ListedPad[]
  /** The same list as the last `read` saw it: what one frame or one tick works from, so its parts agree. */
  last(): readonly ListedPad[]
  /** Whatever is held right now, on one pad or on all, does nothing until it is let go. */
  mask(index?: number): void
  /** The left stick of a usable pad as the browser reports it, for a menu to pick its stronger axis. */
  leftStick(index: number): { readonly x: number; readonly y: number }
  /** Called after a `read` that found a pad arrive or go, or one that was not readable turn readable. */
  onChange(listener: () => void): () => void
}

/** The browser's pads, called on `navigator` itself. A page that may not see gamepads throws; that is no pads. */
function browserPads(): readonly (PadLike | null)[] {
  try {
    return typeof navigator.getGamepads === 'function' ? Array.from(navigator.getGamepads()) : []
  } catch {
    return []
  }
}

export function createPads(gamepads: () => readonly (PadLike | null)[] = browserPads): Pads {
  const snapshot = (): PadLike[] => {
    try {
      return gamepads().filter((pad): pad is PadLike => pad !== null && pad !== undefined)
    } catch {
      return []
    }
  }
  const usable = (pad: PadLike): boolean => pad.index >= 0 && pad.index < SLOTS && isUsable(pad)
  const listOf = (pads: readonly PadLike[]): ListedPad[] =>
    pads.map((pad) => ({ index: pad.index, id: pad.id, usable: usable(pad) }))
  // Per pad: what was held when `mask` was called and has not been let go since.
  const masked = new Map<number, Set<PadInput>>()
  const listeners = new Set<() => void>()
  // Every pad the browser lists and whether the game can read it: a pad that cannot be read still arrived.
  const keyOf = (pads: readonly PadLike[]): string =>
    listOf(pads)
      .map((pad) => `${pad.index}${pad.usable ? '+' : '-'}`)
      .sort()
      .join(',')
  let latest = snapshot()
  let known = keyOf(latest)

  return {
    read() {
      // One look at the browser's pads per read: what changed, what is held and the list all come from it.
      latest = snapshot()
      // Told first, so a listener that masks the pad that just arrived hides its press from this very read.
      const now = keyOf(latest)
      if (now !== known) {
        known = now
        for (const listener of [...listeners]) listener()
      }
      const held = new Map<number, ReadonlySet<PadInput>>()
      for (const pad of latest.filter(usable)) {
        const reading = readPad(pad)
        const hidden = masked.get(pad.index)
        if (hidden !== undefined) {
          for (const input of [...hidden]) if (!reading.has(input)) hidden.delete(input)
          for (const input of hidden) reading.delete(input)
          if (hidden.size === 0) masked.delete(pad.index)
        }
        held.set(pad.index, reading)
      }
      for (const index of [...masked.keys()]) if (!held.has(index)) masked.delete(index)
      return held
    },
    list: () => listOf(snapshot()),
    last: () => listOf(latest),
    mask(index) {
      for (const pad of snapshot().filter(usable)) {
        if (index !== undefined && pad.index !== index) continue
        const now = readPad(pad)
        const hidden = masked.get(pad.index) ?? new Set<PadInput>()
        for (const input of now) hidden.add(input)
        if (hidden.size > 0) masked.set(pad.index, hidden)
      }
    },
    leftStick(index) {
      const pad = latest.find((one) => one.index === index && usable(one))
      return { x: pad?.axes[0] ?? 0, y: pad?.axes[1] ?? 0 }
    },
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

// Which device each player last used, so the screens can show the right hint (the key, the button, or the on-screen
// button) and a "join with a gamepad" does not hand a person's own pad to the next player.
import type { PadInput } from '../commands/commands.ts'
import type { Controls } from './controls.ts'
import type { Seat } from './seats.ts'

/** What a player is playing with right now. */
export type DeviceKind = 'keyboard' | 'touch' | 'gamepad'

/** Everything down right now, as `held.ts` reads it. */
export interface Used {
  readonly keys: ReadonlySet<string>
  readonly touch: ReadonlySet<string>
  readonly pads: ReadonlyMap<number, ReadonlySet<PadInput>>
}

export interface Use {
  /** What this player last used; before that, `fallback(player)`. */
  device(player: number): DeviceKind
  /** The pad the player last pressed, while it is what they last used. */
  lastPad(player: number): number | undefined
  /** Looks at what is down and notes the first new thing each seat's device was used for. */
  observe(seats: readonly Seat[], controls: Controls, now: Used): void
  /** Forgets a player who left. */
  forget(player: number): void
  onDevice(listener: (player: number, kind: DeviceKind) => void): () => void
}

/** The key codes a keyboard device of a seat reads in these controls. */
function keysOf(device: string, controls: Controls): ReadonlySet<string> {
  const codes = new Set<string>()
  for (const control of Object.values(controls)) {
    const list =
      device === 'keyboard'
        ? control.keys
        : device === 'keyboard-1'
          ? control.shared?.[0]
          : control.shared?.[1]
    for (const code of list ?? []) codes.add(code)
  }
  return codes
}

export function createUse(fallback: (player: number) => DeviceKind): Use {
  const kinds = new Map<number, DeviceKind>()
  const pads = new Map<number, number | undefined>()
  const listeners = new Set<(player: number, kind: DeviceKind) => void>()
  let before: Used = { keys: new Set(), touch: new Set(), pads: new Map() }
  const device = (player: number): DeviceKind => kinds.get(player) ?? fallback(player)
  const note = (player: number, kind: DeviceKind, pad?: number): void => {
    const was = device(player)
    kinds.set(player, kind)
    pads.set(player, kind === 'gamepad' ? pad : undefined)
    if (was !== kind) for (const listener of [...listeners]) listener(player, kind)
  }
  return {
    device,
    lastPad: (player) => (device(player) === 'gamepad' ? pads.get(player) : undefined),
    observe(seats, controls, now) {
      for (const seat of seats)
        for (const name of seat.devices) {
          if (name === 'touch') {
            if ([...now.touch].some((action) => !before.touch.has(action))) note(seat.player, 'touch')
          } else if (name.startsWith('pad-')) {
            const index = Number(name.slice(4))
            const was = before.pads.get(index)
            if ([...(now.pads.get(index) ?? [])].some((input) => !was?.has(input)))
              note(seat.player, 'gamepad', index)
          } else {
            const codes = keysOf(name, controls)
            if ([...now.keys].some((code) => codes.has(code) && !before.keys.has(code)))
              note(seat.player, 'keyboard')
          }
        }
      before = { keys: new Set(now.keys), touch: new Set(now.touch), pads: new Map(now.pads) }
    },
    forget(player) {
      kinds.delete(player)
      pads.delete(player)
    },
    onDevice(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

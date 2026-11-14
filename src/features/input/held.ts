// What one player is holding: their seat's devices, read against the controls and what is down right now. Pure.
import type { PadInput } from '../commands/commands.ts'
import type { Controls } from './controls.ts'
import type { Seat } from './seats.ts'

/** Everything down right now, by device kind. */
export interface Down {
  /** Key codes. */
  readonly keys: ReadonlySet<string>
  /** Action names held by a finger on a button. */
  readonly touch: ReadonlySet<string>
  /** What is held on each usable pad, by pad index. */
  readonly pads: ReadonlyMap<number, ReadonlySet<PadInput>>
}

/** The actions this seat's player is holding, sorted, each once. */
export function heldBy(seat: Seat, controls: Controls, down: Down): string[] {
  const held = new Set<string>()
  for (const [action, control] of Object.entries(controls))
    for (const device of seat.devices) {
      const keys =
        device === 'keyboard'
          ? control.keys
          : device === 'keyboard-1'
            ? control.shared?.[0]
            : device === 'keyboard-2'
              ? control.shared?.[1]
              : undefined
      if (keys !== undefined) {
        if (keys.some((code) => down.keys.has(code))) held.add(action)
      } else if (device === 'touch') {
        if (down.touch.has(action)) held.add(action)
      } else if (device.startsWith('pad-')) {
        const pad = down.pads.get(Number(device.slice(4)))
        if (pad !== undefined && (control.pad ?? []).some((name) => pad.has(name))) held.add(action)
      }
    }
  return [...held].sort()
}

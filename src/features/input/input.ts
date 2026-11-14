// The input feature's entry: keyboard and touch become one `controls` command whenever what is held changes.
// The sim never sees a key or a finger, only that command, which is also all a replay records.
import { controlsCommand, MAX_PLAYERS } from '../commands/commands.ts'
import type { Command } from '../sim/sim.ts'
import { type Controls, checkControls } from './controls.ts'
import { createKeyboard } from './keyboard.ts'
import { createTouch } from './touch.ts'

export {
  type Control,
  type ControlEntry,
  type Controls,
  checkControls,
  controlsFromList,
} from './controls.ts'

export interface Input {
  /** The commands to send this tick: one `controls` command when what is held has changed, otherwise none. */
  poll(tick: number): Command[]
  /** How many CSS pixels the touch buttons take from the bottom of the mount: 0 while they are hidden. */
  inset(): number
  /** Calls `listener` with the new room whenever the buttons show, hide or change size. */
  onInset(listener: (px: number) => void): void
  /** Removes the buttons and stops listening. Safe to call twice. */
  destroy(): void
}

/**
 * Listens to the keyboard (on the window) and to on-screen buttons (inside `mount`) for `player`, 1 to 4.
 * Throws a plain message if the controls or the player number are wrong.
 */
export function createInput(options: { mount: HTMLElement; controls: Controls; player?: number }): Input {
  const { mount, controls, player = 1 } = options
  checkControls(controls)
  if (!Number.isInteger(player) || player < 1 || player > MAX_PLAYERS)
    throw new Error(`Player ${player} does not exist. Players are numbered 1 to ${MAX_PLAYERS}.`)
  const keyboard = createKeyboard(controls)
  const touch = createTouch(mount, controls)
  // What the last command said, as one string; the sim starts every player holding nothing.
  let sent = ''
  let seq = 0
  let destroyed = false
  return {
    poll(tick) {
      if (destroyed) return []
      // Sorted, so the same hands always make the same command, whichever finger or key came first.
      const held = [...new Set([...keyboard.held(), ...touch.held()])].sort()
      const now = held.join(',')
      if (now === sent) return []
      sent = now
      return [controlsCommand(tick, player, seq++, held)]
    },
    inset: touch.inset,
    onInset: touch.onInset,
    destroy() {
      if (destroyed) return
      destroyed = true
      keyboard.destroy()
      touch.destroy()
    },
  }
}

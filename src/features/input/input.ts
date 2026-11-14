// The input feature's entry: keyboard, touch and gamepads become one `controls` command per player, whenever what
// that player is holding changes. The sim never sees a key, a finger or a pad, only that command, which is also all a
// replay records. This file only wires: seats say who holds what (`seats.ts`), `held.ts` reads a seat's devices against
// the controls, `pads.ts` reads the pads, and the bindings are `bindings.ts`.

import { type Frames, pageFrames } from '../../lib/frames.ts'
import type { Words } from '../../lib/message.ts'
import {
  controlsCommand,
  createSequence,
  MAX_PLAYERS,
  type PadInput,
  type Sequence,
} from '../commands/commands.ts'
import type { Command } from '../sim/sim.ts'
import {
  applySettings,
  type BindingSlot,
  type InputSettings,
  type Rebound,
  rebind as rebound,
  settingsOf,
} from './bindings.ts'
import { type Capture, type RunningCapture, startCapture } from './capture.ts'
import { type Controls, checkControls } from './controls.ts'
import type { PadLike } from './gamepad.ts'
import { heldBy } from './held.ts'
import { createInvites } from './invite.ts'
import { createKeyboard } from './keyboard.ts'
import { createMenu, type MenuPress } from './menu.ts'
import { createPads, type ListedPad } from './pads.ts'
import { type Claim as ClaimType, type Seat, seatsFor } from './seats.ts'
import { createTouch } from './touch.ts'
import { createUse, type DeviceKind } from './use.ts'

export {
  applySettings,
  type BindingOverride,
  type BindingSlot,
  INPUT_SETTINGS_DEFAULT,
  type InputSettings,
  InputSettingsSchema,
  type Rebound,
  rebind,
  settingsOf,
} from './bindings.ts'
export {
  type Control,
  type ControlEntry,
  type Controls,
  checkControls,
  controlsFromList,
} from './controls.ts'

/** What `createInput` takes. */
export interface InputOptions {
  readonly mount: HTMLElement
  readonly controls: Controls
  /** Saved bindings, as `settings()` gave them. Anything that does not fit the game is dropped, never thrown. */
  readonly settings?: unknown
  /** Only for tests: stands in for `navigator.getGamepads`. */
  readonly gamepads?: () => readonly (PadLike | null)[]
  /** Default: the page's animation frames. Pads are read every frame, so menus work while the game is paused. */
  readonly frames?: Frames
  /** Default: a new one. Share one with whoever else makes this game's commands, so no seq is used twice. */
  readonly sequence?: Sequence
  /** The touch buttons' words (a `Locale`'s `words`): `controls.<action>` and `automata.touch.label`. Default: each control's own label. */
  readonly words?: Words
}

export interface Input {
  /** One `controls` command for each player whose hands changed, lowest player first. */
  poll(tick: number): Command[]
  /** How many CSS pixels the touch buttons take from the bottom of the mount: 0 while they are hidden. */
  inset(): number
  /** Calls `listener` with the new room whenever the buttons show, hide or change size. Stops on `destroy`. */
  onInset(listener: (px: number) => void): void
  /** Says the touch buttons' words again in other words (a new language). What is held stays held. */
  relabel(words: Words): void
  /** Who is in the game, from the sim. Starts as [1]. A player who arrives is holding nothing. */
  setPlayers(players: readonly number[]): void
  /** Gives a joining player their device. Kept until the player leaves. */
  claim(player: number, claim: ClaimType): void
  /** One seat per player: who holds which device. */
  seats(): readonly Seat[]
  /** Calls `listener` when a player, a claim or a pad changes who holds what. */
  onSeats(listener: (seats: readonly Seat[]) => void): () => void
  /** Every gamepad the browser shows, and whether the game can read it. */
  pads(): readonly ListedPad[]
  /** Calls `listener` with the pads when one arrives, goes, or turns out to be one the game cannot read. */
  onPads(listener: (pads: readonly ListedPad[]) => void): () => void
  /** Every player lets go until the returned function is called; what is down then does nothing until let go. */
  silence(): () => void
  /** Waits for people to pick up a gamepad: calls `onPad` with the index of each free pad a button is pressed on. Returns stop. */
  invite(onPad: (pad: number) => void): () => void
  /** Gamepad presses for menus, from any usable pad, silenced or not. */
  onMenu(listener: (press: MenuPress, pad: number) => void): () => void
  /** What this player last used. */
  device(player: number): DeviceKind
  /** Calls `listener` when a player starts using a different kind of device. */
  onDevice(listener: (player: number, kind: DeviceKind) => void): () => void
  /** What to press for an action on the device the player is using: key codes, PadInput names, or [] for touch. */
  inputsFor(player: number, action: string): readonly string[]
  /** The controls in use now: the game's own with the player's changes. */
  controls(): Controls
  /** What to save. `{ format: 1, bindings: {} }` when nothing was changed. */
  settings(): InputSettings
  /** Saved actions that could not be applied when the input was made (`'*'`: none of it could be read). */
  dropped(): readonly string[]
  /** Changes a binding now. On refusal nothing changes and the answer says why, in words for the person. */
  rebind(action: string, slot: BindingSlot, input: string): Rebound
  /** Back to the game's own controls. */
  resetBindings(): void
  /** Calls `listener` with what to save, whenever a binding changes or is reset. */
  onBindings(listener: (settings: InputSettings) => void): () => void
  /** Waits for the next key (a keys or shared slot) or gamepad press (the pad slot). */
  capture(slot: BindingSlot): Capture
  /** Removes the buttons and stops listening. Safe to call twice. */
  destroy(): void
}

export type { Capture, CaptureAnswer } from './capture.ts'
export type { PadLike } from './gamepad.ts'
export type { MenuPress } from './menu.ts'
export type { ListedPad } from './pads.ts'
export type { Claim, Device, Seat } from './seats.ts'
export type { DeviceKind } from './use.ts'

/**
 * Listens to the keyboard (on the window), on-screen buttons (inside `mount`) and gamepads for every player, and
 * returns what each is holding as commands. Throws a plain message if the controls are wrong.
 */
export function createInput(options: InputOptions): Input {
  const { mount, frames = pageFrames, sequence = createSequence() } = options
  checkControls(options.controls)
  const defaults = options.controls
  const applied = applySettings(defaults, options.settings ?? { format: 1, bindings: {} })
  let controls = applied.controls
  const bindingListeners = new Set<(settings: InputSettings) => void>()
  const keyboard = createKeyboard(() => boundKeys(controls))
  const touch = createTouch(mount, controls, options.words === undefined ? {} : { words: options.words })
  const pads = createPads(options.gamepads)

  let players: readonly number[] = [1]
  const claims = new Map<number, ClaimType>()
  /** What the last command said for each player, as one string; a player starts holding nothing. */
  const sent = new Map<number, string>([[1, '']])
  const seatListeners = new Set<(seats: readonly Seat[]) => void>()
  const padListeners = new Set<(pads: readonly ListedPad[]) => void>()
  let lastSeats = ''
  let silent = 0
  let waiting: RunningCapture | undefined
  // Listeners a finished capture left behind, waiting for its key to come up.
  const lingering = new Set<() => void>()
  const invites = createInvites()
  const menu = createMenu()
  const coarse = (): boolean => window.matchMedia?.('(pointer: coarse)').matches === true
  // Before a player has pressed anything: what they brought, and for the first player the screen's own kind.
  const use = createUse((player) => {
    const claim = claims.get(player)
    if (claim === 'keyboard') return 'keyboard'
    if (claim !== undefined) return 'gamepad'
    return player === players[0] && coarse() ? 'touch' : 'keyboard'
  })
  let destroyed = false

  const usableIn = (listed: readonly ListedPad[]): number[] =>
    listed.filter((pad) => pad.usable).map((pad) => pad.index)
  /** Who holds what, from `listed`: the pads one frame or one tick already looked at, or the browser's own now. */
  const seats = (listed: readonly ListedPad[] = pads.list()): Seat[] =>
    seatsFor(players, claims, usableIn(listed))
  const announce = (listed?: readonly ListedPad[]): void => {
    const now = seats(listed)
    const text = JSON.stringify(now)
    if (text === lastSeats) return
    lastSeats = text
    for (const listener of [...seatListeners]) listener(now)
  }
  lastSeats = JSON.stringify(seats())

  // A pad that arrives goes to the player who lost theirs, the lowest first, and the press that plugged it in does
  // nothing until let go. A pad that goes changes nothing here: its player simply holds nothing until it is back.
  let before = new Set(usableIn(pads.list()))
  pads.onChange(() => {
    for (const listener of [...padListeners]) listener(pads.last())
    const present = new Set(usableIn(pads.last()))
    const claimed = new Set(claims.values())
    for (const index of [...present].filter((i) => !before.has(i)).sort((a, b) => a - b)) {
      if (claimed.has(`pad-${index}` as ClaimType)) continue
      const [lost] = [...claims]
        .filter(
          ([player, claim]) =>
            player !== players[0] && claim !== 'keyboard' && !present.has(Number(claim.slice(4))),
        )
        .sort((a, b) => a[0] - b[0])
      if (lost === undefined) break
      claims.set(lost[0], `pad-${index}` as ClaimType)
      claimed.add(`pad-${index}` as ClaimType)
      pads.mask(index)
    }
    before = present
    announce()
  })

  // Pads are read on every frame, not only on a tick: arrivals and departures are noticed while the game is paused.
  let frame: number | undefined
  /** A pad the next player may take: nobody but the first player has it, and it is not the one the first player uses. */
  const free = (pad: number): boolean => {
    const [first] = players
    const claimed = [...claims].some(([player, claim]) => player !== first && claim === `pad-${pad}`)
    return !claimed && (first === undefined || use.lastPad(first) !== pad)
  }
  const observe = (held: ReadonlyMap<number, ReadonlySet<PadInput>>, listed: readonly ListedPad[]): void =>
    use.observe(seats(listed), controls, { keys: keyboard.down(), touch: touch.held(), pads: held })
  const onFrame = (ms: number): void => {
    frame = undefined
    if (destroyed) return
    const held = pads.read()
    const capturing = waiting !== undefined && !waiting.ended
    waiting?.step(held)
    if (waiting?.ended) waiting = undefined
    // A press that answers a capture, or joins an invite, is that and nothing else: the menu does not hear it too.
    // This frame callback must run before the game loop's step in every frame (it asks for frames first, and both ask
    // again in the same order). The invite refuses "the pad the first player used last", and that is only known to be
    // the first player's own pad when the loop has not yet polled this press as theirs. Polled first, a joining press
    // would count as the first player's and be refused.
    const taken = capturing ? new Set(held.keys()) : invites.step(held, free)
    menu.step(held, ms, pads.leftStick, taken)
    const listed = pads.last()
    observe(held, listed)
    announce(listed)
    frame = frames.request(onFrame)
  }
  frame = frames.request(onFrame)

  const api: Input = {
    poll(tick) {
      if (destroyed) return []
      const down = { keys: keyboard.down(), touch: touch.held(), pads: pads.read() }
      // The seats and what each seat holds come from the same look at the pads.
      const listed = pads.last()
      const now = seats(listed)
      use.observe(now, controls, down)
      const commands: Command[] = []
      for (const seat of now) {
        // Sorted, so the same hands always make the same command, whichever finger or key came first.
        const held = silent > 0 ? [] : heldBy(seat, controls, down)
        const now = held.join(',')
        if (now === sent.get(seat.player)) continue
        sent.set(seat.player, now)
        commands.push(controlsCommand(tick, seat.player, sequence.next(seat.player), held))
      }
      announce(listed)
      return commands
    },
    inset: touch.inset,
    onInset: touch.onInset,
    relabel: touch.relabel,
    setPlayers(next) {
      for (const player of next)
        if (!Number.isInteger(player) || player < 1 || player > MAX_PLAYERS)
          throw new Error(`Player ${player} does not exist. Players are numbered 1 to ${MAX_PLAYERS}.`)
      const staying = new Set(next)
      for (const player of players)
        if (!staying.has(player)) {
          claims.delete(player)
          sent.delete(player)
          use.forget(player)
        }
      for (const player of next) if (!sent.has(player)) sent.set(player, '')
      players = [...staying].sort((a, b) => a - b)
      announce()
    },
    claim(player, claim) {
      claims.set(player, claim)
      if (claim !== 'keyboard') pads.mask(Number(claim.slice(4)))
      announce()
    },
    seats,
    onPads(listener) {
      padListeners.add(listener)
      return () => padListeners.delete(listener)
    },
    onSeats(listener) {
      seatListeners.add(listener)
      return () => seatListeners.delete(listener)
    },
    pads: () => pads.list(),
    silence() {
      silent++
      keyboard.clear()
      let released = false
      return () => {
        if (released || destroyed) return
        released = true
        silent--
        if (silent === 0) {
          // What is down now does nothing until let go: a key or a button that was pressed to leave a screen must not
          // also act in the game.
          keyboard.clear()
          pads.mask()
          touch.mask()
        }
      }
    },
    invite: (onPad) => invites.open(onPad, pads.read()),
    onMenu: (listener) => menu.on(listener),
    device: use.device,
    onDevice: use.onDevice,
    inputsFor(player, action) {
      const control = controls[action]
      const seat = seats().find((one) => one.player === player)
      if (control === undefined || seat === undefined) return []
      const kind = use.device(player)
      if (kind === 'touch') return []
      if (kind === 'gamepad') return control.pad ?? []
      if (seat.devices.includes('keyboard')) return control.keys
      if (seat.devices.includes('keyboard-1')) return control.shared?.[0] ?? []
      if (seat.devices.includes('keyboard-2')) return control.shared?.[1] ?? []
      return []
    },
    controls: () => controls,
    settings: () => settingsOf(defaults, controls),
    dropped: () => applied.dropped,
    rebind(action, slot, input) {
      const answer = rebound(controls, action, slot, input)
      if (answer.ok) {
        controls = answer.controls
        for (const listener of [...bindingListeners]) listener(settingsOf(defaults, controls))
      }
      return answer
    },
    resetBindings() {
      controls = defaults
      for (const listener of [...bindingListeners]) listener(settingsOf(defaults, controls))
    },
    onBindings(listener) {
      bindingListeners.add(listener)
      return () => bindingListeners.delete(listener)
    },
    capture(slot) {
      // A second capture ends the first.
      waiting?.cancel()
      const running = startCapture(slot, {
        win: window,
        silence: () => api.silence(),
        maskPads: () => pads.mask(),
        lingering,
      })
      waiting = running
      // What is held now is not an answer: the wait starts from here.
      running.step(pads.read())
      return running
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      waiting?.cancel()
      for (const drop of [...lingering]) drop()
      if (frame !== undefined) frames.cancel(frame)
      keyboard.destroy()
      touch.destroy()
      seatListeners.clear()
      bindingListeners.clear()
    },
  }
  return api
}

/** Every key code any slot binds: the whole keyboard, and each half of a shared one. */
function boundKeys(controls: Controls): ReadonlySet<string> {
  const codes = new Set<string>()
  for (const control of Object.values(controls))
    for (const code of [...control.keys, ...(control.shared?.flat() ?? [])]) codes.add(code)
  return codes
}

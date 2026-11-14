// The keys and buttons a player has changed, and how they are kept. Pure: nothing here touches a page, so a settings
// screen, a test and an agent editing the saved file all go through the same rules. Three promises:
//  - a change never refuses for want of a free key: the action that would be left with nothing takes the old one;
//  - what is saved is only what differs from the game's own controls, in a fixed order, so the same bindings are the
//    same bytes;
//  - what is loaded never throws: a binding that no longer fits the game (renamed action, a key the game now uses
//    elsewhere) is dropped and named, and the rest still apply.
import { z } from '../../lib/zod.ts'
import { PAD_BUTTONS, PAD_STICKS, type PadInput, RESERVED_KEYS, RESERVED_PAD } from '../commands/commands.ts'
import { type Control, type Controls, checkControls } from './controls.ts'

/** Which list of inputs a change is about: the keyboard, either half of a shared one, or the gamepad. */
export type BindingSlot = 'keys' | 'shared-1' | 'shared-2' | 'pad'

/** What a player changed for one action: only the slots they touched. */
export interface BindingOverride {
  readonly keys?: readonly string[] | undefined
  readonly shared?: readonly [readonly string[], readonly string[]] | undefined
  readonly pad?: readonly PadInput[] | undefined
}

/** The bindings as kept between runs: plain JSON, so an agent can read and write them too. */
export interface InputSettings {
  readonly format: 1
  readonly bindings: Readonly<Record<string, BindingOverride>>
}

/** No changes: the game's own controls. */
export const INPUT_SETTINGS_DEFAULT: InputSettings = Object.freeze({ format: 1, bindings: Object.freeze({}) })

const keyList = z.array(z.string())
const override = z.strictObject({
  keys: keyList.optional(),
  shared: z.tuple([keyList, keyList]).optional(),
  pad: z.array(z.enum([...PAD_BUTTONS, ...PAD_STICKS])).optional(),
})

/**
 * The strict shape of saved bindings, and nothing more. It never checks that an action exists or that a key is free:
 * that is `applySettings`' job, so a game that renamed one action loses that one binding and not all of them.
 */
export const InputSettingsSchema: z.ZodType<InputSettings, InputSettings> = z.strictObject({
  format: z.literal(1),
  bindings: z.record(z.string(), override),
})

const RESERVED_PAD_NAMES: ReadonlySet<string> = new Set<string>(RESERVED_PAD)

/** The list a slot holds on a control; `undefined` when the control has none. */
function slotOf(control: Control, slot: BindingSlot): readonly string[] | undefined {
  if (slot === 'keys') return control.keys
  if (slot === 'pad') return control.pad
  return control.shared?.[slot === 'shared-1' ? 0 : 1]
}

/** The control with one slot's list replaced. */
function withSlot(control: Control, slot: BindingSlot, list: readonly string[]): Control {
  if (slot === 'keys') return { ...control, keys: list }
  if (slot === 'pad') return { ...control, pad: list as readonly PadInput[] }
  const [first, second] = control.shared ?? [[], []]
  return { ...control, shared: slot === 'shared-1' ? [list, second] : [first, list] }
}

const SLOTS: readonly BindingSlot[] = ['keys', 'shared-1', 'shared-2', 'pad']

const same = (a: readonly string[] | undefined, b: readonly string[] | undefined): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

/** The game's controls with each override laid over them, all at once. */
function overlay(defaults: Controls, overrides: ReadonlyMap<string, BindingOverride>): Controls {
  const controls: Record<string, Control> = {}
  for (const [action, control] of Object.entries(defaults)) {
    const o = overrides.get(action)
    if (o === undefined) {
      controls[action] = control
      continue
    }
    controls[action] = {
      ...control,
      ...(o.keys === undefined ? {} : { keys: o.keys }),
      ...(o.shared === undefined ? {} : { shared: o.shared }),
      ...(o.pad === undefined ? {} : { pad: o.pad }),
    }
  }
  return controls
}

/** True when this override cannot stand on its own: a menu key, an empty half, or a shared keyboard the game lacks. */
function unfit(override: BindingOverride, gameIsShared: boolean): boolean {
  const keys = [...(override.keys ?? []), ...(override.shared?.flat() ?? [])]
  if (keys.some((code) => RESERVED_KEYS.includes(code))) return true
  if ((override.pad ?? []).some((name) => RESERVED_PAD_NAMES.has(name))) return true
  if (override.shared !== undefined && (!gameIsShared || override.shared.some((half) => half.length === 0)))
    return true
  return false
}

/** Every action that shares an input with another in one slot, or a shared key with the other person's half. */
function clashing(controls: Controls): Set<string> {
  const clash = new Set<string>()
  const owners = new Map<string, string>()
  for (const [action, control] of Object.entries(controls))
    for (const slot of SLOTS)
      for (const input of slotOf(control, slot) ?? []) {
        // Per slot: the keyboard whole and a shared keyboard are never live together, so they may share keys.
        const other = owners.get(`${slot}:${input}`)
        if (other !== undefined && other !== action) {
          clash.add(action)
          clash.add(other)
        }
        owners.set(`${slot}:${input}`, action)
      }
  // A shared key on both halves belongs to both people.
  const firstHalf = new Map<string, string>()
  for (const [action, control] of Object.entries(controls))
    for (const code of control.shared?.[0] ?? []) firstHalf.set(code, action)
  for (const [action, control] of Object.entries(controls))
    for (const code of control.shared?.[1] ?? []) {
      const other = firstHalf.get(code)
      if (other !== undefined) {
        clash.add(action)
        clash.add(other)
      }
    }
  return clash
}

/**
 * The game's controls with the player's saved changes. Never throws: what no longer fits is dropped, and named in
 * `dropped` (sorted); `'*'` means none of it could be read, and the game's own controls stand.
 */
export function applySettings(
  defaults: Controls,
  saved: unknown,
): { readonly controls: Controls; readonly dropped: readonly string[] } {
  const parsed = InputSettingsSchema.safeParse(saved)
  if (!parsed.success) return { controls: defaults, dropped: ['*'] }
  const dropped = new Set<string>()
  const overrides = new Map<string, BindingOverride>()
  for (const [action, o] of Object.entries(parsed.data.bindings)) {
    if (Object.hasOwn(defaults, action)) overrides.set(action, o)
    else dropped.add(action)
  }
  const gameIsShared = Object.values(defaults).some((control) => control.shared !== undefined)
  // Applied together, since a saved swap only makes sense whole; then drop what does not fit, and look again, since
  // dropping one binding gives its inputs back to the action that had them.
  for (let again = true; again; ) {
    again = false
    const clash = clashing(overlay(defaults, overrides))
    for (const [action, o] of [...overrides])
      if (unfit(o, gameIsShared) || clash.has(action)) {
        overrides.delete(action)
        dropped.add(action)
        again = true
      }
  }
  const controls = overlay(defaults, overrides)
  try {
    checkControls(controls)
  } catch {
    return { controls: defaults, dropped: ['*'] }
  }
  return { controls, dropped: [...dropped].sort() }
}

/**
 * Only what differs from the game's own controls, actions sorted, so two saves of the same bindings are the same
 * bytes.
 */
export function settingsOf(defaults: Controls, current: Controls): InputSettings {
  const bindings: Record<string, BindingOverride> = {}
  for (const action of Object.keys(current).sort()) {
    const was = defaults[action]
    const now = current[action]
    if (was === undefined || now === undefined) continue
    const changed: { keys?: readonly string[]; shared?: Control['shared']; pad?: readonly PadInput[] } = {}
    if (!same(was.keys, now.keys)) changed.keys = now.keys
    if (
      now.shared !== undefined &&
      !(same(was.shared?.[0], now.shared[0]) && same(was.shared?.[1], now.shared[1]))
    )
      changed.shared = now.shared
    if (now.pad !== undefined && !same(was.pad, now.pad)) changed.pad = now.pad
    if (Object.keys(changed).length > 0) bindings[action] = changed
  }
  return { format: 1, bindings }
}

/** The answer to a change: the new controls, or why not, in words for the person. */
export type Rebound =
  | {
      readonly ok: true
      readonly controls: Controls
      /** The action that gave the input up and took the old one. */
      readonly swapped?: string
    }
  | {
      readonly ok: false
      readonly reason: 'unknown-action' | 'unknown-input' | 'reserved' | 'no-shared' | 'other-half'
      readonly message: string
    }

/** `input` (a key code, or a PadInput for the `pad` slot) becomes the action's only input in that slot. */
export function rebind(current: Controls, action: string, slot: BindingSlot, input: string): Rebound {
  const target = current[action]
  if (target === undefined)
    return { ok: false, reason: 'unknown-action', message: `This game has no action called "${action}".` }
  if (slot === 'pad') {
    if (RESERVED_PAD_NAMES.has(input))
      return {
        ok: false,
        reason: 'reserved',
        message: `The ${input} button is kept for the game's menus. Pick another button.`,
      }
    if (
      !(PAD_BUTTONS as readonly string[]).includes(input) &&
      !(PAD_STICKS as readonly string[]).includes(input)
    )
      return {
        ok: false,
        reason: 'unknown-input',
        message: 'That is not a button on a gamepad. Pick another button.',
      }
  } else if (RESERVED_KEYS.includes(input))
    return {
      ok: false,
      reason: 'reserved',
      message: `${input} is kept for the game's menus. Pick another key.`,
    }
  if (slot === 'shared-1' || slot === 'shared-2') {
    if (!Object.values(current).some((control) => control.shared !== undefined))
      return { ok: false, reason: 'no-shared', message: "This game's keys cannot be shared." }
    const otherSlot: BindingSlot = slot === 'shared-1' ? 'shared-2' : 'shared-1'
    if (Object.values(current).some((control) => slotOf(control, otherSlot)?.includes(input)))
      return { ok: false, reason: 'other-half', message: "That key is the other person's. Pick another key." }
  }

  const gave = slotOf(target, slot) ?? []
  const controls: Record<string, Control> = {}
  let swapped: string | undefined
  for (const [name, control] of Object.entries(current)) {
    if (name === action) {
      controls[name] = withSlot(control, slot, [input])
      continue
    }
    const list = slotOf(control, slot)
    if (list?.includes(input)) {
      const left = list.filter((one) => one !== input)
      // Left with nothing, it takes what the changed action gave up, so no action is ever left without an input.
      if (left.length === 0) swapped = name
      controls[name] = withSlot(control, slot, left.length === 0 ? gave : left)
    } else controls[name] = control
  }
  return swapped === undefined ? { ok: true, controls } : { ok: true, controls, swapped }
}

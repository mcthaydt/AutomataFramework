// What a person does on the flow's page, for the journeys: a thumb held on a touch button, a gamepad's button tapped, the
// focus walked to a button with the pad, and a walk to the door by any of the three. Each acts on a `Drive`, and nothing
// here calls the flow: a journey does only what a person could.
import { expect } from 'vitest'
import type { PadInput } from '#src/features/commands/commands.ts'
import type { Drive } from './drive.ts'

/** One tick of the game, in ms. */
export const TICK: number = 1000 / 60

/** The most ticks a walk to the door may take before the journey says it never got there. */
const WALK_LIMIT = 400

/** What a person is told the focused control says: its words, or the name a picture carries. */
export const focusedName = (): string => {
  const active = document.activeElement as HTMLElement | null
  return (active?.textContent ?? '').trim() || (active?.getAttribute('aria-label') ?? '')
}

/** A gamepad's button is down for one frame and up for the next, as a press is. */
export function tapPad(drive: Drive, name: PadInput, index = 0): void {
  drive.pads.press(name, index)
  drive.frames.advance(TICK)
  drive.pads.release(name, index)
  drive.frames.advance(TICK)
}

/** Walks the focus with the pad to the button called `label` (down first, then up), and presses it. */
export function padPress(drive: Drive, label: string): void {
  for (const way of ['dpad-down', 'dpad-up'] as const) {
    for (let step = 0; step < 10 && focusedName() !== label; step++) tapPad(drive, way)
    if (focusedName() === label) break
  }
  const reached = focusedName() === label
  expect(reached, `The pad could not reach "${label}". They say: ${drive.buttons().join(' | ')}`).toBe(true)
  tapPad(drive, 'south')
}

/** The touch button called `label`. */
const touchButton = (drive: Drive, label: string): HTMLElement => {
  const found = [...drive.mount.querySelectorAll<HTMLElement>('button')].find(
    (one) => (one.textContent ?? '').trim() === label,
  )
  if (found === undefined)
    throw new Error(`No touch button says "${label}". They say: ${drive.buttons().join(' | ')}`)
  return found
}

/** A finger goes down on the touch button `label`; the returned function lifts it. */
export function thumbDown(drive: Drive, label: string, id = 1): () => void {
  const button = touchButton(drive, label)
  const event = (type: string): PointerEvent =>
    new PointerEvent(type, { pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true })
  button.dispatchEvent(event('pointerdown'))
  return () => button.dispatchEvent(event('pointerup'))
}

/** Lets the game run `ticks` ticks. */
export function ticks(drive: Drive, count: number): void {
  for (let tick = 0; tick < count; tick++) drive.frames.advance(TICK)
}

/** Runs the game until the step is no longer `playing`, at most a walk's worth of ticks. */
export function untilOver(drive: Drive): void {
  for (let tick = 0; tick < WALK_LIMIT && drive.step() === 'playing'; tick++) drive.frames.advance(TICK)
}

/** Walks the hero to the door with a thumb on the Right button. */
export function walkByThumb(drive: Drive): void {
  const up = thumbDown(drive, 'Right')
  untilOver(drive)
  up()
}

/** Walks the hero to the door with the pad's d-pad. */
export function walkByPad(drive: Drive, index = 0): void {
  drive.pads.press('dpad-right', index)
  untilOver(drive)
  drive.pads.release('dpad-right', index)
}

/** Walks the hero to the door holding `code` (the key for "right"). */
export function walkByKey(drive: Drive, code = 'ArrowRight'): void {
  drive.key('keydown', code)
  untilOver(drive)
  drive.key('keyup', code)
}

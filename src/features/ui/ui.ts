// The ui feature's entry: the small kit every screen is made of (Svelte 5, dressed by CSS custom properties a game sets).
// Each part is given its own type here, so the declarations and the API report never name a `.svelte` file.
import type { Component } from 'svelte'
import ButtonPart from './Button.svelte'
import DialogPart from './Dialog.svelte'
import FramePart from './Frame.svelte'
import KeyRowPart from './KeyRow.svelte'
import ListPart from './List.svelte'
import type {
  ButtonProps,
  DialogProps,
  FrameProps,
  KeyRowProps,
  ListProps,
  SliderProps,
  ToggleProps,
} from './props.ts'
import SliderPart from './Slider.svelte'
import TogglePart from './Toggle.svelte'

export { menuKeys } from './menu-keys.ts'
export type {
  ButtonProps,
  DialogProps,
  FrameProps,
  IconName,
  KeyRowProps,
  ListProps,
  SliderProps,
  ToggleProps,
} from './props.ts'
export { type Size, sizeOf } from './size.ts'

/** A button: 44 px, or 48 px for the one primary thing on a screen. Pressed by a tap, Enter or Space. */
export const Button: Component<ButtonProps> = ButtonPart as never
/** A slider from 0 to 1: dragged anywhere on its track, stepped by left and right. */
export const Slider: Component<SliderProps> = SliderPart as never
/** An on-off switch whose whole row is the target. */
export const Toggle: Component<ToggleProps> = TogglePart as never
/** The one region of a screen that may scroll. */
export const List: Component<ListProps> = ListPart as never
/** One line of the controls screen: an action, its key and a button to change it. */
export const KeyRow: Component<KeyRowProps> = KeyRowPart as never
/** A question over the screen. It holds the focus, and Escape and the gamepad's right button say no. */
export const Dialog: Component<DialogProps> = DialogPart as never
/**
 * The shape of a screen: a title, a body and buttons, inside the safe area, laid out by the room it has. Not `Frame`: that
 * is already the name of a frame of a sprite sheet.
 */
export const ScreenFrame: Component<FrameProps> = FramePart as never

/**
 * The CSS custom properties a game sets, on the mount or above it, to dress every screen: the screen's background and
 * text colour, the accent (the primary button) and the colour of its text, the border, the corner radius, the font and
 * the scrim over a paused game.
 */
export const UI_PROPERTIES: readonly string[] = [
  '--automata-ui-background',
  '--automata-ui-color',
  '--automata-ui-accent',
  '--automata-ui-accent-color',
  '--automata-ui-border',
  '--automata-ui-radius',
  '--automata-ui-font',
  '--automata-ui-scrim',
]

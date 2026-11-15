// The ui feature's entry: the small kit every screen is made of (Svelte 5, dressed by CSS custom properties a game sets).
// Each part is given its own type here, so the declarations and the API report never name a `.svelte` file.
import type { Component } from 'svelte'
import ButtonPart from './Button.svelte'
import type { ButtonProps } from './props.ts'

export type { ButtonProps, IconName } from './props.ts'

/** A button: 44 px, or 48 px for the one primary thing on a screen. Pressed by a tap, Enter or Space. */
export const Button: Component<ButtonProps> = ButtonPart as never

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

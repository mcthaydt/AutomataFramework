// The props of every part of the kit. They are plain interfaces, so a screen's props and the API report read the same
// in `.ts` as they do in the `.svelte` file that takes them.
import type { Snippet } from 'svelte'

/** The seven drawings the kit has, in `library/`. */
export type IconName = 'pause' | 'play' | 'back' | 'gear' | 'plus' | 'check' | 'reload'

export interface ButtonProps {
  /** What the button says, and what a screen reader says when only the icon shows. */
  readonly label: string
  /** `primary` is the one thing to press on a screen: 48 px and the accent colour. Default `plain` (44 px). */
  readonly kind?: 'primary' | 'plain' | 'danger'
  readonly icon?: IconName
  /** Shows only the icon; `label` is still what a screen reader says. */
  readonly iconOnly?: boolean
  readonly disabled?: boolean
  readonly onpress: () => void
}

export interface SliderProps {
  readonly label: string
  /** 0 to 1. */
  readonly value: number
  /** Default 0.05. */
  readonly step?: number
  readonly onchange: (value: number) => void
  /** The thumb, key or stick was let go. */
  readonly onrelease?: (value: number) => void
}

export interface ToggleProps {
  readonly label: string
  readonly on: boolean
  readonly onchange: (on: boolean) => void
}

/** The one region of a screen that may scroll. */
export interface ListProps {
  readonly label: string
  readonly children: Snippet
}

export interface KeyRowProps {
  /** What the key does, in the player's words: "Jump". */
  readonly action: string
  /** The key or button now, as a person says it: "Space". */
  readonly input: string
  /** "Change". */
  readonly change: string
  /** Waiting for the new key: the row says `waiting` and its button says `cancel`. */
  readonly waiting?: string
  readonly cancel?: string
  readonly onchange: () => void
  readonly oncancel?: () => void
}

export interface DialogProps {
  readonly title: string
  readonly text?: string
  readonly yes: string
  readonly no: string
  /** `yes` loses something: it is the danger colour, and `no` has the focus. */
  readonly danger?: boolean
  readonly onyes: () => void
  readonly onno: () => void
}

export interface FrameProps {
  readonly title?: string
  /** A see-through background (`--automata-ui-scrim`), for a screen over a game that stays in sight. */
  readonly scrim?: boolean
  readonly back?: { readonly label: string; readonly onpress: () => void }
  /** The body. */
  readonly children: Snippet
  /** The buttons: a column on a narrow screen, a row at the bottom on a wide short one. */
  readonly actions?: Snippet
}

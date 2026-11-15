// The props of every part of the kit. They are plain interfaces, so a screen's props and the API report read the same
// in `.ts` as they do in the `.svelte` file that takes them.

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

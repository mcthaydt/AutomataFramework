// How much room a screen has, as two yes-or-no answers every part lays itself out by. Read from the screen's own box,
// never the window's, so a game in a frame on a page lays out by the frame.

/** The room a screen has. */
export interface Size {
  readonly width: 'narrow' | 'wide'
  readonly height: 'short' | 'tall'
}

/** Under this many CSS pixels wide a screen is narrow: a phone held upright. */
const NARROW_UNDER = 600
/** Under this many CSS pixels high a screen is short: a phone held sideways. */
const SHORT_UNDER = 480

/** Narrow under 600 px wide; short under 480 px high. */
export function sizeOf(width: number, height: number): Size {
  return { width: width < NARROW_UNDER ? 'narrow' : 'wide', height: height < SHORT_UNDER ? 'short' : 'tall' }
}

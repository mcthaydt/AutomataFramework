// The page events the flow raises on the game's audio (`GameAudio.raise`). A cues file may name any of them in `on`, so
// a menu can have its own music and a button its own click, as a sim event does.

/** What the flow says to the sound: a screen came up, or a screen's control was moved, pressed or backed out of. */
export const FLOW_EVENTS = [
  'screen.menu',
  'screen.pause',
  'screen.done',
  'ui.move',
  'ui.press',
  'ui.back',
] as const

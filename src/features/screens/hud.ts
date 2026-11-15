// What sits over the game while it plays: the pause button, a number over each hero when more than one plays, and, while
// the game plays itself, the line that says a tap takes over. It is an overlay: every touch goes through it to the
// game's own buttons except a touch on its own.
import { type Component, flushSync } from 'svelte'
import type { HeroBox } from '../render/render.ts'
import HudPart from './Hud.svelte'
import type { Screen, ScreenBase } from './screens.ts'
import { show } from './show.ts'

/** The card at the top of a level that has not been played yet: what to do, and what to press to do it. */
export type HudCard = { readonly goal?: string; readonly hint?: string }

/** What the HUD draws. */
export type HudProps = {
  readonly pause: string
  /** The corner the pause button sits in. */
  readonly side: 'left' | 'right'
  readonly onpause: () => void
  /** The line shown while the game plays itself, and what a tap on it does. */
  readonly watching?: { readonly line: string; readonly ontake: () => void }
  /** The level's goal and what to press, shown at the top while the card is up. */
  readonly card?: HudCard
  /** "Score: 3", at the top in the middle, when the game counts one. */
  readonly score?: string
  /** Told how to give the HUD the heroes' boxes after each draw. */
  readonly register: (draw: (boxes: readonly HeroBox[]) => void) => void
}

const Part: Component<HudProps> = HudPart as never

/** The pause button, the numbers over the heroes, and the line for a game that plays itself. */
export function hud(
  options: ScreenBase & {
    /**
     * Which side the jumping thumb is on, so the button sits on the other. A hero with no `moves` has M1's touch
     * buttons, whose jump is on the right, so the answer is `'right'` unless the sides are swapped.
     */
    readonly jumpSide: () => 'left' | 'right'
    readonly onPause: () => void
    /** Each hero's box after the last draw; a number is drawn over each when more than one plays. */
    readonly heroes?: () => readonly HeroBox[]
    /**
     * The level's goal and what to press, at the top: asked each frame, so it changes when the player's language or
     * device does and goes when `undefined` comes back.
     */
    readonly card?: () => HudCard | undefined
    /** The score now, or `undefined` for a game that counts none: asked each frame. */
    readonly score?: () => number | undefined
    /** Shown in place of the pause button while the game plays itself. */
    readonly watching?: { readonly onTake: () => void }
  },
): Screen & {
  /** Called after each draw: puts the numbers where the heroes are now. */
  draw(): void
} {
  const { jumpSide, onPause, heroes, watching } = options
  let card = options.card?.()
  let cardKey = JSON.stringify(card ?? null)
  let score = options.score?.()
  let paint: ((boxes: readonly HeroBox[]) => void) | undefined
  // Where the jumping thumb was when the button was put down.
  let jumping = jumpSide()
  const screen = show(
    Part,
    { ...options, name: 'hud', overlay: true },
    (words): HudProps => ({
      pause: words('automata.pause.button'),
      // The pause button is on the side away from the jumping thumb.
      side: jumping === 'right' ? 'left' : 'right',
      onpause: onPause,
      ...(card === undefined ? {} : { card }),
      ...(score === undefined ? {} : { score: words('automata.hud.score', { score }) }),
      ...(watching === undefined
        ? {}
        : { watching: { line: words('automata.watch.tap'), ontake: watching.onTake } }),
      register(draw) {
        paint = draw
      },
    }),
  )
  return {
    destroy: screen.destroy,
    draw() {
      // The player may have swapped the sides since: the button goes to the other corner.
      if (jumpSide() !== jumping) {
        jumping = jumpSide()
        screen.update()
      }
      const asked = options.card?.()
      const askedKey = JSON.stringify(asked ?? null)
      const counted = options.score?.()
      if (askedKey !== cardKey || counted !== score) {
        card = asked
        cardKey = askedKey
        score = counted
        screen.update()
      }
      if (paint === undefined) return
      const boxes = heroes?.() ?? []
      // A number is only for telling heroes apart, so a game of one has none.
      paint(boxes.length > 1 ? boxes : [])
      flushSync()
    },
  }
}

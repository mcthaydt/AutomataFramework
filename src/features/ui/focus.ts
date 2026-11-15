// Ported from AutomataFrameworkFailed@ed8592e8: packages/automata/src/shared/ui/focus/focus-nav.ts (its spatial `steer`,
// as a pure function over boxes). Where to move the focus next when a D-pad, a stick or an arrow key says a direction.

/** A control's box, in any one unit and from any one corner. */
export interface Box {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

type Direction = 'up' | 'down' | 'left' | 'right'

/**
 * The index of the nearest box in `direction` from `from`, or `from` when there is none. Never wraps. A box is "that
 * way" when its middle is: the score is the distance along the direction plus twice the sideways distance, so a straight
 * line beats a diagonal, and a wide button over two narrow ones is left for the nearer of them by their middles.
 */
export function nextFocus(boxes: readonly Box[], from: number, direction: Direction): number {
  const start = boxes[from]
  if (start === undefined) return from
  const x = start.x + start.w / 2
  const y = start.y + start.h / 2
  const vertical = direction === 'up' || direction === 'down'
  let best = from
  let bestScore = Number.POSITIVE_INFINITY
  for (const [index, box] of boxes.entries()) {
    if (index === from) continue
    const dx = box.x + box.w / 2 - x
    const dy = box.y + box.h / 2 - y
    const along = direction === 'down' ? dy : direction === 'up' ? -dy : direction === 'right' ? dx : -dx
    if (along <= 0) continue
    const score = along + 2 * Math.abs(vertical ? dx : dy)
    if (score < bestScore) {
      best = index
      bestScore = score
    }
  }
  return best
}

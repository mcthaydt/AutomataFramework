// The sentence for a place that is outside its level, in one place so the level's own rules and the checks of a
// thing's values say the same words.

/** One axis of a place that is outside the level: which one, and what to tell the person. */
export interface Outside {
  readonly axis: 'x' | 'y'
  readonly message: string
}

/** What is wrong with `at` in a level `width` tiles wide and `height` tall: nothing, or one sentence for each axis out. */
export function outsideOf(
  at: { readonly x: number; readonly y: number },
  width: number,
  height: number,
): Outside[] {
  const found: Outside[] = []
  if (at.x < 0 || at.x > width)
    found.push({ axis: 'x', message: `${at.x} is outside the level, which is ${width} tiles wide.` })
  if (at.y < 0 || at.y > height)
    found.push({ axis: 'y', message: `${at.y} is outside the level, which is ${height} tiles tall.` })
  return found
}

/** Where the world goes in the box: one scale (pixels per tile) and the pixel offset of its top-left corner. */
export interface Fit {
  readonly scale: number
  readonly left: number
  readonly top: number
}

/**
 * The largest scale at which the whole world fits the box, centred, with bars on the sides or the top and bottom.
 * An empty box or an empty world (zero, negative or not a number) is `{ scale: 0, left: 0, top: 0 }`, never NaN.
 */
export function fitWorld(box: { w: number; h: number }, world: { w: number; h: number }): Fit {
  if (!(box.w > 0 && box.h > 0 && world.w > 0 && world.h > 0)) return { scale: 0, left: 0, top: 0 }
  const scale = Math.min(box.w / world.w, box.h / world.h)
  return { scale, left: (box.w - world.w * scale) / 2, top: (box.h - world.h * scale) / 2 }
}

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

/** CSS pixels kept free of the level on each side. The sky and the backdrop still fill the canvas. */
export interface Room {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

/**
 * `fitWorld` of the box less its room, moved right and down by the room, so the level is centred in what is left. No
 * room left (the room is as big as the box, or bigger) is `{ scale: 0, left: 0, top: 0 }`, never NaN.
 */
export function fitInRoom(box: { w: number; h: number }, room: Room, world: { w: number; h: number }): Fit {
  const fit = fitWorld({ w: box.w - room.left - room.right, h: box.h - room.top - room.bottom }, world)
  return fit.scale === 0 ? fit : { scale: fit.scale, left: fit.left + room.left, top: fit.top + room.top }
}

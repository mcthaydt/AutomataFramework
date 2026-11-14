// A cutscene read at a tick, as plain values: no sim. The sim moves the actors by it and the page moves the camera by
// it, so both read one answer. Only `+ - * /` are used, so every engine rounds it the same way.
import type { ActorKey, CameraKey, CutsceneFile, CutsceneLine } from '../content/content.ts'

/** Where the camera is: `x` and `y` are the middle of the picture, in tiles. */
export interface SceneCamera {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

/** Where one actor is at a tick, and the way it last faced. */
export interface ActorPlace {
  readonly who: string
  readonly x: number
  readonly y: number
  readonly face?: 'left' | 'right'
}

/** The last key at or before `t`, with the key it moves towards: the later of two keys at one tick counts. */
function around<K extends { readonly at: number }>(
  keys: readonly K[],
  t: number,
): { readonly from: K; readonly to: K | undefined } | undefined {
  const index = keys.findLastIndex((key) => key.at <= t)
  const from = keys[index]
  if (from === undefined) return undefined
  const after = keys[index + 1]
  if (after === undefined) return { from, to: undefined }
  return { from, to: keys.findLast((key) => key.at === after.at) }
}

/** `a` to `b`, `u` of the way. */
function blend(a: number, b: number, u: number): number {
  return a + (b - a) * u
}

/** The camera at tick `t`: on the first key before it, steady after the last, eased between two. */
export function cameraAt(file: CutsceneFile, t: number): SceneCamera {
  const first = file.camera[0] as CameraKey
  const found = around(file.camera, t)
  if (found === undefined) return { x: first.x, y: first.y, zoom: first.zoom }
  const { from, to } = found
  if (to === undefined || to.ease === 'cut') return { x: from.x, y: from.y, zoom: from.zoom }
  const u = (t - from.at) / (to.at - from.at)
  const eased = to.ease === 'smooth' ? u * u * (3 - 2 * u) : u
  return {
    x: blend(from.x, to.x, eased),
    y: blend(from.y, to.y, eased),
    zoom: blend(from.zoom, to.zoom, eased),
  }
}

/** The actors at tick `t`, in the order each first appears in the file. One is nowhere until its first key. */
export function actorsAt(file: CutsceneFile, t: number): readonly ActorPlace[] {
  const byWho = new Map<string, ActorKey[]>()
  for (const key of file.actors) {
    const keys = byWho.get(key.who)
    if (keys === undefined) byWho.set(key.who, [key])
    else keys.push(key)
  }
  const places: ActorPlace[] = []
  for (const [who, keys] of byWho) {
    const found = around(keys, t)
    if (found === undefined) continue
    const { from, to } = found
    const u = to === undefined ? 0 : (t - from.at) / (to.at - from.at)
    const x = to === undefined ? from.x : blend(from.x, to.x, u)
    const y = to === undefined ? from.y : blend(from.y, to.y, u)
    const face = keys.findLast((key) => key.at <= t && key.face !== undefined)?.face
    places.push(face === undefined ? { who, x, y } : { who, x, y, face })
  }
  return places
}

/** The lines on screen at tick `t`: from their `at` until just before their `until`, in file order. */
export function linesAt(file: CutsceneFile, t: number): readonly CutsceneLine[] {
  return file.lines.filter((line) => line.at <= t && t < line.until)
}

// A colour as OKLab, the space the photo pipeline works in: equal steps in it look like equal steps to an eye. The cube
// root and the power come through `dmath`'s `pow`, never `Math.cbrt` or `**`, so every engine gives the same three numbers
// and a photo is painted the same everywhere.
import { pow } from '../sim/sim.ts'

/** An sRGB channel, 0 to 255, as linear light, 0 to 1. */
function linear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
}

/** The cube root of a number that is not below zero. */
function cubeRoot(x: number): number {
  return x <= 0 ? 0 : pow(x, 1 / 3)
}

/** 0xrrggbb as OKLab. Roots and powers through `dmath`'s `pow`, so every engine gives the same three numbers. */
export function labOf(rgb: number): readonly [number, number, number] {
  const r = linear((rgb >> 16) & 255)
  const g = linear((rgb >> 8) & 255)
  const b = linear(rgb & 255)
  const l = cubeRoot(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = cubeRoot(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = cubeRoot(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

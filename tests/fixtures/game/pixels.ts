// Reading what a Pixi (WebGL) canvas drew. A WebGL buffer is cleared once the page has shown it, so every function here
// must run in the same task as the draw it reads.
import { SKY_COLOR } from '#src/features/level/level.ts'

/** A copy of the canvas on a 2D canvas, which can be read. */
function copyOf(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const copy = document.createElement('canvas')
  copy.width = canvas.width
  copy.height = canvas.height
  const context = copy.getContext('2d', { willReadFrequently: true })
  if (context === null) throw new Error('no 2D canvas to read pixels with')
  context.drawImage(canvas, 0, 0)
  return context
}

/** One pixel of the canvas as [r, g, b], at a position in CSS pixels. */
export function pixel(canvas: HTMLCanvasElement, cssX: number, cssY: number): [number, number, number] {
  const [r = 0, g = 0, b = 0] = copyOf(canvas).getImageData(
    Math.round(cssX * window.devicePixelRatio),
    Math.round(cssY * window.devicePixelRatio),
    1,
    1,
  ).data
  return [r, g, b]
}

export const brightness = ([r, g, b]: [number, number, number]): number => (r + g + b) / 3

/** How far a colour may stray from the sky and still count as sky (edges are blended by antialiasing). */
const SKY_SLACK = 40

/**
 * The first and last rows, in CSS pixels, that hold anything but sky: the top and bottom of what the game drew.
 * `undefined` when the canvas shows sky alone.
 */
export function drawnRows(canvas: HTMLCanvasElement): { top: number; bottom: number } | undefined {
  const { width, height } = canvas
  const data = copyOf(canvas).getImageData(0, 0, width, height).data
  const sky = [(SKY_COLOR >> 16) & 255, (SKY_COLOR >> 8) & 255, SKY_COLOR & 255]
  let top: number | undefined
  let bottom = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const away = [0, 1, 2].some((c) => Math.abs((data[i + c] ?? 0) - (sky[c] ?? 0)) > SKY_SLACK)
      if (!away) continue
      top ??= y
      bottom = y + 1
      break
    }
  }
  return top === undefined
    ? undefined
    : { top: top / window.devicePixelRatio, bottom: bottom / window.devicePixelRatio }
}

/**
 * Every pixel of the canvas read once, as a function from a position in CSS pixels to [r, g, b]. For a test that looks
 * at many places, since `pixel` copies the whole canvas each time. Call it in the task that drew.
 */
export function snapshot(
  canvas: HTMLCanvasElement,
): (cssX: number, cssY: number) => [number, number, number] {
  const { width, height } = canvas
  const data = copyOf(canvas).getImageData(0, 0, width, height).data
  return (cssX, cssY) => {
    const x = Math.min(width - 1, Math.max(0, Math.floor(cssX * window.devicePixelRatio)))
    const y = Math.min(height - 1, Math.max(0, Math.floor(cssY * window.devicePixelRatio)))
    const i = (y * width + x) * 4
    return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]
  }
}

// Every pixel of a Pixi (WebGL) canvas read once, for a test that looks at many places. `pixel` (pixels.ts) copies the
// whole canvas at each call. As there, a WebGL buffer is cleared once the page has shown it, so call `snapshot` in the same
// task as the draw it reads.

/**
 * A function from a position in CSS pixels to [r, g, b]. A position off the canvas is the nearest one on it.
 */
export function snapshot(
  canvas: HTMLCanvasElement,
): (cssX: number, cssY: number) => [number, number, number] {
  const { width, height } = canvas
  const copy = document.createElement('canvas')
  copy.width = width
  copy.height = height
  const context = copy.getContext('2d', { willReadFrequently: true })
  if (context === null) throw new Error('no 2D canvas to read pixels with')
  context.drawImage(canvas, 0, 0)
  const data = context.getImageData(0, 0, width, height).data
  return (cssX, cssY) => {
    const x = Math.min(width - 1, Math.max(0, Math.floor(cssX * window.devicePixelRatio)))
    const y = Math.min(height - 1, Math.max(0, Math.floor(cssY * window.devicePixelRatio)))
    const i = (y * width + x) * 4
    return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]
  }
}

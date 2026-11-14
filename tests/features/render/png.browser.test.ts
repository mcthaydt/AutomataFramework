// A real browser reads our PNG as the picture we wrote: the palette, the clear colour and the rows are all as given.
import { expect, test } from 'vitest'
import { encodePng } from '#src/lib/png.ts'

test('a browser reads our PNG as the picture we wrote', async () => {
  const picture = { width: 2, height: 2, palette: [0, 0x111314, 0xfdd4bd], pixels: Uint8Array.of(0, 1, 2, 1) }
  const bitmap = await createImageBitmap(new Blob([encodePng(picture)], { type: 'image/png' }), {
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  })
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (context === null) throw new Error('no 2D canvas to read pixels with')
  context.drawImage(bitmap, 0, 0)
  const at = (x: number, y: number): number[] => [...context.getImageData(x, y, 1, 1).data]
  expect(at(0, 0)[3]).toBe(0)
  expect(at(1, 0)).toEqual([0x11, 0x13, 0x14, 255])
  expect(at(0, 1)).toEqual([0xfd, 0xd4, 0xbd, 255])
  expect(at(1, 1)).toEqual([0x11, 0x13, 0x14, 255])
})

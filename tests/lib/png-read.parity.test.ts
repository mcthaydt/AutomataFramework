// The PNG reader gives the same pixels in Node and in every browser, as recorded in tests/golden/photos.json.
import { expect, test } from 'vitest'
import { decodePng } from '#src/lib/png-read.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'
import { photoBytes } from '../fixtures/content/photo-files.ts'
import { expectRecorded } from '../fixtures/golden.ts'
import golden from '../golden/photos.json' with { type: 'json' }

test('the brick photo is the same pixels in every engine', async () => {
  const picture = decodePng(await photoBytes('brick.png'))
  expect([picture.width, picture.height]).toEqual([128, 128])
  expectRecorded('png-read:brick', hex64(xxhash64(picture.rgba)), (golden as Record<string, string>).brick)
})

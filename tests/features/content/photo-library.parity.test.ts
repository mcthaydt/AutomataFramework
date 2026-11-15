// Every library photo reads to the same pixels in Node and in all three browsers, as recorded in tests/golden/photos.json.
import { expect, test } from 'vitest'
import { PHOTO_LIBRARY } from '#src/features/content/photo-library.ts'
import { decodePng } from '#src/lib/png-read.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'
import { photoBytes } from '../../fixtures/content/photo-files.ts'
import golden from '../../golden/photos.json' with { type: 'json' }

test('every photo decodes to the same pixels in every engine', async () => {
  const actual: Record<string, string> = {}
  for (const [id, record] of Object.entries(PHOTO_LIBRARY)) {
    actual[id] = hex64(xxhash64(decodePng(await photoBytes(record.file)).rgba))
  }
  // All 38 are asked for at once, so one run's log holds the whole file to commit.
  if (Object.keys(PHOTO_LIBRARY).some((id) => !(golden as Record<string, string>)[id]))
    throw new Error(
      `GOLDEN NOT RECORDED. Commit this as tests/golden/photos.json:\n${JSON.stringify(actual, null, 2)}\n`,
    )
  expect(actual).toEqual(golden)
})

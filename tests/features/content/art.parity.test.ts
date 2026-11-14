// The full game's pictures and atlases are the same bytes in Node and in every browser, as recorded in
// tests/golden/art.json. A recorded hash moves only with a look at the new pictures (the sheets CI keeps).
import { expect, test } from 'vitest'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'
import { fullGamePictures } from '../../fixtures/full-game/pictures.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import golden from '../../golden/art.json' with { type: 'json' }

const recorded: Record<string, string> = golden

test("the full game's art is the same bytes in every engine, as recorded", async () => {
  const files = await fullGamePictures()
  expect(Object.keys(files).length).toBeGreaterThan(0)
  const actual = Object.fromEntries(
    Object.entries(files).map(([path, bytes]) => [path, hex64(xxhash64(bytes))]),
  )
  // Every hash not yet recorded is reported at once, so one run gives the whole file to commit.
  if (Object.keys(actual).some((path) => (recorded[path] ?? '') === ''))
    throw new Error(
      `GOLDEN NOT RECORDED. Commit this as tests/golden/art.json:\n${JSON.stringify({ ...recorded, ...actual }, null, 2)}\n`,
    )
  for (const [path, hash] of Object.entries(actual)) expectRecorded(path, hash, recorded[path])
})

test('every recorded hash is of a picture the game still has', async () => {
  const files = await fullGamePictures()
  expect(Object.keys(recorded).filter((name) => !name.startsWith('png:') && !(name in files))).toEqual([])
})

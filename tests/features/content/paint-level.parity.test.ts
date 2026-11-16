// The links game's pictures are the same bytes in Node and in every browser, as recorded in tests/golden/level-picture.json:
// a level as it plays, the same level with what its things hold, and the world map. A recorded hash moves only with a look
// at the new picture (`automata picture` draws it).
import { expect, test } from 'vitest'
import { paintLevel, paintWorld } from '#src/features/content/content.ts'
import { encodePng } from '#src/lib/png.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import { loadLinksGame } from '../../fixtures/links-game/read.ts'
import golden from '../../golden/level-picture.json' with { type: 'json' }

const recorded: Record<string, string> = golden

test('the pictures of the links game are the same bytes in every engine, as recorded', async () => {
  const content = await loadLinksGame()
  const world = paintWorld(content)
  expect(world).toBeDefined()
  const pictures = {
    'room-2': paintLevel(content, 'room-2').picture,
    'room-2.what': paintLevel(content, 'room-2', { whatItIs: true }).picture,
    world: world?.picture,
  }
  const actual = Object.fromEntries(
    Object.entries(pictures).map(([name, picture]) => [name, hex64(xxhash64(encodePng(picture as never)))]),
  )
  // Every hash not yet recorded is reported at once, so one run gives the whole file to commit.
  if (Object.keys(actual).some((name) => (recorded[name] ?? '') === ''))
    throw new Error(
      `GOLDEN NOT RECORDED. Commit this as tests/golden/level-picture.json:\n${JSON.stringify({ ...recorded, ...actual }, null, 2)}\n`,
    )
  for (const [name, hash] of Object.entries(actual)) expectRecorded(name, hash, recorded[name])
  expect(Object.keys(recorded).sort()).toEqual(Object.keys(actual).sort())
})

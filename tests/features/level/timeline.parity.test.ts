// The camera and the actors of every cutscene of the story game, at every tick, hash the same in Node and in every
// browser: easing is `+ - * /` only, so no engine can round it another way.
import { expect, test } from 'vitest'
import { actorsAt, cameraAt } from '#src/features/level/timeline.ts'
import { canonicalJson, utf8 } from '#src/lib/canonical.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import { loadStory } from '../../fixtures/story/game.ts'
import golden from '../../golden/story.json' with { type: 'json' }

test('the camera and the actors at every tick of the story fixture’s cutscenes hash the same everywhere', async () => {
  const content = await loadStory()
  const rows: unknown[] = []
  for (const id of Object.keys(content.cutscenes ?? {}).sort()) {
    const file = content.cutscenes?.[id]
    if (file === undefined) continue
    for (let t = 0; t <= file.length; t++) rows.push([id, t, cameraAt(file, t), actorsAt(file, t)])
  }
  expect(rows.length).toBeGreaterThan(200)
  const hash = hex64(xxhash64(utf8(canonicalJson(rows))))
  expectRecorded('timeline', hash, (golden as { timeline?: string }).timeline)
})

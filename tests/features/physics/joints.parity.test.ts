import { expect, test } from 'vitest'
import { createJointsScene, jointsCommands } from '../../fixtures/physics/joints-scene.ts'
import { runScene } from '../../fixtures/physics/run-scene.ts'

// A restore must continue exactly like the straight run in every engine, state and events. The scene's own hash is
// pinned by joints-scene.parity.test.ts against tests/golden/joints-scene.json.
test('joints: 300 ticks, straight and restored at 150, agree in every engine', async () => {
  const straight = await runScene(createJointsScene, jointsCommands, 300)
  expect(straight.eventCount).toBeGreaterThan(10) // not vacuous
  expect(await runScene(createJointsScene, jointsCommands, 300, 150)).toEqual(straight)
})

// The ticks just after a joined thing went (a link killed at 90), a Joint was removed (the seesaw's, at 140) and a
// pinned link's row was rebuilt (at 200): each restore lands between the change and its first effect.
test.each([91, 141, 201])(
  'restored at %i, just after a joined thing changed, the run still agrees',
  async (at) => {
    const straight = await runScene(createJointsScene, jointsCommands, 300)
    expect(await runScene(createJointsScene, jointsCommands, 300, at)).toEqual(straight)
  },
)

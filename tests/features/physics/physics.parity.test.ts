// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/tests/browser/2d/physics-2d.test.ts
import { expect, test } from 'vitest'
import { runScene } from '../../fixtures/physics/run-scene.ts'
import { createScene, sceneCommands } from '../../fixtures/physics/scene.ts'

// A restore at tick 150 must continue exactly like the straight run in every engine, state and events. The scene's
// own hash is pinned by physics-scene.parity.test.ts against tests/golden/physics-scene.json.
test('physics: 300 ticks, straight and restored at 150, agree in every engine', async () => {
  const straight = await runScene(createScene, sceneCommands, 300)
  const restored = await runScene(createScene, sceneCommands, 300, 150)
  expect(straight.eventCount).toBeGreaterThan(10) // not vacuous
  expect(restored).toEqual(straight)
})

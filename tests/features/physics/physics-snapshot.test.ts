// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/tests/unit/2d/physics-2d-snapshot.test.ts
import { expect, test } from 'vitest'
import { runScene } from '../../fixtures/physics/run-scene.ts'
import { createScene, sceneCommands } from '../../fixtures/physics/scene.ts'

test('a restore at tick 150 continues identically to the straight run (state and events)', async () => {
  const straight = await runScene(createScene, sceneCommands, 300)
  const restored = await runScene(createScene, sceneCommands, 300, 150)
  expect(straight.eventCount).toBeGreaterThan(0)
  expect(restored).toEqual(straight)
})

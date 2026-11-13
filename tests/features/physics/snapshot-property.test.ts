// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/tests/unit/shared/snapshot-property.test.ts
// Exit 4 on the physics scenes (M2.3 spec §7): snapshot -> restore -> continue equals the straight run over 200
// cases, restoring both into a fresh sim and into one that has moved on. About 15 s and 19 s
// in Node on a cloud container (2026-10-11); under the 60 s the spec allows before a project of their own.

import { expect, test } from 'vitest'
import { sceneCommands, scenePlugins, spawnScene } from '../../fixtures/physics/scene.ts'
import { snapshotRoundTripProperty } from '../../fixtures/property.ts'

test('the scene: 200 snapshot round trips equal the straight run', async () => {
  const { failures } = await snapshotRoundTripProperty({
    plugins: scenePlugins(),
    setup: (sim) => spawnScene(sim),
    script: (tick) => sceneCommands(tick),
  })
  expect(failures.map((f) => f.report)).toEqual([])
}, 300_000)

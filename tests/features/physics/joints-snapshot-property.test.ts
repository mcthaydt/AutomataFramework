// Snapshot -> restore -> continue equals the straight run over 200 cases on the joints scene, restoring both into a
// fresh sim and into one that has moved on, as snapshot-property.test.ts does for the mixed scene.

import { expect, test } from 'vitest'
import { jointsCommands, jointsScenePlugins, spawnJointsScene } from '../../fixtures/physics/joints-scene.ts'
import { snapshotRoundTripProperty } from '../../fixtures/property.ts'

test('the joints scene: 200 snapshot round trips equal the straight run', async () => {
  const { failures } = await snapshotRoundTripProperty({
    plugins: jointsScenePlugins(),
    setup: (sim) => spawnJointsScene(sim),
    script: (tick) => jointsCommands(tick),
  })
  expect(failures.map((f) => f.report)).toEqual([])
}, 300_000)

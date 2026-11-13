// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/browser/world/snapshot.test.ts
import { expect, test } from 'vitest'
import { createSim } from '#src/features/sim/create-sim.ts'
import { Body, fixturePlugin, Tag } from '../../fixtures/fixture-world.ts'

test('a 300-tick run with churn, every field type and a mid-run restore hashes identically in every engine', async () => {
  const run = async (restoreAt?: number) => {
    let sim = await createSim({ seed: 2026, plugins: [fixturePlugin], content: { level: 'parity' } })
    for (let i = 0; i < 8; i++)
      sim.spawn([
        [Body, { x: i, vy: 0.5 }],
        [Tag, { name: `s${i}`, hp: -i }],
      ])
    for (let t = 0; t < 300; t++) {
      if (t === restoreAt) {
        const bytes = sim.snapshot()
        sim.dispose()
        sim = await createSim({ seed: 2026, plugins: [fixturePlugin], content: { level: 'parity' } })
        sim.restore(bytes)
      }
      sim.step(
        t % 11 === 0
          ? [{ tick: t, source: 0, seq: t, type: 'push', payload: { sid: 1 + (t % 9), dx: 0.1 } }]
          : [],
      )
    }
    const out = { hash: sim.hash(), live: sim.query(Tag).length, seed: sim.seed, ticks: sim.tick }
    sim.dispose()
    return out
  }
  const straight = await run()
  const restored = await run(150)
  expect(straight.live).toBeGreaterThan(100) // not vacuous
  expect(restored.hash).toBe(straight.hash)
  expect(straight.hash).toBe(SIM_EXPECTED)
})

// Was 2dfe1971eaf6af8f until the schema hash covered resource, command and event schemas (M2.1 spec §10.4).
const SIM_EXPECTED = '98cc273719c10ef2'

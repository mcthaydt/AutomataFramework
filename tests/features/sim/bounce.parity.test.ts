// The first golden: the bounce fixture run for 300 ticks must end on the committed hash in Node and in every
// browser, and a snapshot taken half way must restore to the same end.
import { expect, test } from 'vitest'
import { createRng, createSim, deriveSeed, type Sim } from '#src/features/sim/sim.ts'
import { bouncePlugin } from '../../fixtures/bounce/bounce.plugin.ts'
import { BOUNCE_SEED, BOUNCE_TICKS, bounceScript, bounceSetup } from '../../fixtures/bounce/bounce-script.ts'
import { expectGolden, runGolden } from '../../fixtures/golden.ts'
import bounceGolden from '../../golden/bounce.json' with { type: 'json' }

const newBounceSim = async (): Promise<Sim> => {
  const sim = await createSim({ seed: BOUNCE_SEED, plugins: [bouncePlugin] })
  bounceSetup(sim)
  return sim
}

// The script's kicks come from a stream of their own, derived from the seed, so they are the same on every run.
const scriptFor = () => {
  const rng = createRng(deriveSeed(BOUNCE_SEED, 'golden-script'))
  return (tick: number) => bounceScript(tick, rng)
}

test('the bounce run ends on its golden hash, and on the same check hashes on the way', async () => {
  const sim = await newBounceSim()
  expectGolden(runGolden(sim, BOUNCE_TICKS, scriptFor()), bounceGolden)
  sim.dispose()
})

test('a snapshot taken at tick 150 restores into a new sim that ends on the same hash', async () => {
  const straight = await newBounceSim()
  const script = scriptFor()
  runGolden(straight, 150, script)
  const bytes = straight.snapshot()

  const restored = await newBounceSim()
  restored.restore(bytes)
  expect(restored.tick).toBe(150)

  for (let t = 150; t < BOUNCE_TICKS; t++) {
    const commands = script(t)
    straight.step(commands)
    restored.step(commands)
  }
  expect(restored.hash()).toBe(straight.hash())
  straight.dispose()
  restored.dispose()
})

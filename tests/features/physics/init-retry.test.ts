// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/tests/unit/shared/init-retry.test.ts
import { expect, test, vi } from 'vitest'

const IMP_ENTRY = '#src/features/physics/physics.ts'

// Audit (spec §5): a failed RAPIER.init() must not be cached, so a sim created after a transient wasm failure
// (a dropped fetch) can retry instead of failing for the rest of the page's life.
test.each([[IMP_ENTRY, '@dimforge/rapier2d-deterministic-compat', 'physics']] as const)(
  '%s: createSim retries RAPIER.init after it rejected once',
  async (entry, rapier, factory) => {
    vi.resetModules()
    let calls = 0
    vi.doMock(rapier, async (importOriginal) => {
      const original = (await importOriginal()) as { default: { init(): Promise<void> } }
      const init = () => {
        calls += 1
        return calls === 1 ? Promise.reject(new Error('wasm fetch failed')) : original.default.init()
      }
      return { ...original, default: { ...original.default, init } }
    })
    const mod = (await import(/* @vite-ignore */ entry)) as Record<string, () => never>
    const { createSim } = await import('#src/features/sim/sim.ts')
    await expect(createSim({ seed: 1, plugins: [(mod[factory] as () => never)()] })).rejects.toThrow(
      'wasm fetch failed',
    )
    const sim = await createSim({ seed: 1, plugins: [(mod[factory] as () => never)()] })
    expect(calls).toBe(2)
    sim.dispose()
    vi.doUnmock(rapier)
  },
)

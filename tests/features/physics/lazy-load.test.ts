// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/tests/unit/shared/lazy-load.test.ts
import { expect, test, vi } from 'vitest'

const IMP_ENTRY = '#src/features/physics/physics.ts'

// Spec §3.5: importing an entry point loads no Rapier; the wasm loads inside createSim.
test.each([[IMP_ENTRY, '@dimforge/rapier2d-deterministic', 'physics']] as const)(
  'importing %s loads no Rapier until createSim',
  async (entry, rapier, factory) => {
    vi.resetModules()
    const loads: string[] = []
    vi.doMock(rapier, async (importOriginal) => {
      loads.push(rapier)
      return importOriginal()
    })
    const mod = (await import(/* @vite-ignore */ entry)) as Record<string, () => unknown>
    expect(loads).toEqual([])
    const { createSim } = await import('#src/features/sim/sim.ts')
    const sim = await createSim({ seed: 1, plugins: [(mod[factory] as () => never)()] })
    expect(loads).toEqual([rapier])
    sim.dispose()
    vi.doUnmock(rapier)
  },
)

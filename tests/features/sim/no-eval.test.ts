// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/world/no-eval.test.ts
import { afterEach, beforeEach, expect, it } from 'vitest'
import { z } from 'zod'
import { createSim } from '#src/features/sim/create-sim.ts'
import { defineCommand, defineComponent, definePlugin, defineSystem } from '#src/features/sim/definitions.ts'

// Portals and hosts serve games under a CSP with no 'unsafe-eval' (script-src 'self' 'wasm-unsafe-eval'), so nothing the
// sim does may build code from strings. Koota generates accessors with `new Function` for schema-object
// (structure-of-arrays) traits; this pins that the sim never reaches it. Here the Function constructor throws,
// as it does under that CSP. (Zod's own probe is turned off by `config({ jitless: true })`, which `src/lib/zod.ts`
// sets for the framework; z.object parsing is exercised below with that mode set.)

const RealFunction = globalThis.Function
beforeEach(async () => {
  const { config } = await import('zod')
  config({ jitless: true })
  globalThis.Function = new Proxy(RealFunction, {
    construct() {
      throw new EvalError('blocked by CSP: unsafe-eval is not allowed')
    },
    apply() {
      throw new EvalError('blocked by CSP: unsafe-eval is not allowed')
    },
  })
})
afterEach(async () => {
  globalThis.Function = RealFunction
  const { config } = await import('zod')
  config({ jitless: false })
})

it('defines components, spawns, steps, reads, writes and snapshots without generating code', async () => {
  const Body = defineComponent('body-csp', { x: 'f32', y: 'i32', alive: 'bool', name: 'string' })
  const Nudge = defineCommand('nudge-csp', z.object({ dx: z.number() }))
  const plugin = definePlugin({
    name: 'csp',
    components: [Body],
    commands: [Nudge],
    systems: [
      defineSystem({
        name: 'nudge',
        phase: 'gameplay',
        run(ctx) {
          for (const c of ctx.commands.of(Nudge))
            for (const e of ctx.query(Body)) e.set(Body, { x: e.get(Body).x + c.payload.dx })
        },
      }),
    ],
  })
  const sim = await createSim({ seed: 1, plugins: [plugin] })
  const sid = sim.spawn([[Body, { y: 2, name: 'a' }]])
  sim.step([{ tick: 0, source: 0, seq: 0, type: 'nudge-csp', payload: { dx: 1.5 } }])
  expect(sim.entity(sid)?.get(Body)).toEqual({ alive: false, name: 'a', x: 1.5, y: 2 })
  const bytes = sim.snapshot()
  sim.restore(bytes)
  expect(sim.entity(sid)?.get(Body).x).toBe(1.5)
  sim.dispose()
})

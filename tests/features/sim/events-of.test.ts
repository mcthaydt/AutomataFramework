import { expect, test } from 'vitest'
import { z } from 'zod'
import { createSim, SimFaultedError } from '#src/features/sim/create-sim.ts'
import { defineEvent, definePlugin, defineSystem } from '#src/features/sim/definitions.ts'

// ctx.events.of: a system reads, in order, what was emitted earlier in the same tick. The touch plugin of plan P
// needs it, because physics emits its collision events inside the tick and events otherwise only leave through
// StepResult.

const Ping = defineEvent('ping', z.object({ n: z.number().int() }))
const Stray = defineEvent('stray', z.object({}))

function pingPlugin(seen: { early: unknown[]; late: unknown[] }) {
  return definePlugin({
    name: 'pinger',
    events: [Ping],
    systems: [
      defineSystem({
        name: 'early',
        phase: 'gameplay',
        run: (ctx) => {
          seen.early.push([...ctx.events.of(Ping)])
        },
      }),
      defineSystem({
        name: 'emitter',
        phase: 'gameplay',
        after: ['early'],
        run: (ctx) => {
          ctx.emit(Ping, { n: ctx.tick })
          ctx.emit(Ping, { n: ctx.tick })
        },
      }),
      defineSystem({
        name: 'late',
        phase: 'gameplay',
        after: ['emitter'],
        run: (ctx) => {
          seen.late.push([...ctx.events.of(Ping)])
        },
      }),
    ],
  })
}

test('a system reads what was emitted earlier in the same tick, in order, and nothing older', async () => {
  const seen = { early: [] as unknown[], late: [] as unknown[] }
  const sim = await createSim({ seed: 1, plugins: [pingPlugin(seen)] })
  sim.step([])
  sim.step([])
  expect(seen.early).toEqual([[], []])
  expect(seen.late).toEqual([
    [{ n: 0 }, { n: 0 }],
    [{ n: 1 }, { n: 1 }],
  ])
  sim.dispose()
})

test('an event no plugin registered is refused by name', async () => {
  const stray = definePlugin({
    name: 'stray-reader',
    systems: [
      defineSystem({
        name: 'reads-stray',
        phase: 'gameplay',
        run: (ctx) => {
          ctx.events.of(Stray)
        },
      }),
    ],
  })
  const sim = await createSim({ seed: 1, plugins: [stray] })
  let caught: unknown
  try {
    sim.step([])
  } catch (err) {
    caught = err
  }
  expect(caught).toBeInstanceOf(SimFaultedError)
  expect(((caught as SimFaultedError).cause as Error).message).toBe(
    'unknown event "stray": register it in a plugin',
  )
  sim.dispose()
})

test('a payload a system reads cannot be changed: it throws, and what the step returns is unchanged', async () => {
  const tried: string[] = []
  const meddler = definePlugin({
    name: 'meddler',
    events: [Ping],
    systems: [
      defineSystem({
        name: 'emit',
        phase: 'gameplay',
        run: (ctx) => ctx.emit(Ping, { n: 7 }),
      }),
      defineSystem({
        name: 'meddle',
        phase: 'gameplay',
        after: ['emit'],
        run: (ctx) => {
          const [first] = ctx.events.of(Ping)
          try {
            ;(first as { n: number }).n = 0
          } catch (error) {
            tried.push((error as Error).name)
          }
        },
      }),
    ],
  })
  const sim = await createSim({ seed: 1, plugins: [meddler] })
  const said = sim.step([]).events
  expect(tried).toEqual(['TypeError'])
  expect(said).toEqual([{ type: 'ping', payload: { n: 7 } }])
  sim.dispose()
})

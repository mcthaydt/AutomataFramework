// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/testing/fixture-world.ts
// Test fixture shared by snapshot tests: every field type, resources, RNG use, spawns and despawns whose
// outcome depends on iteration order. Not exported from the package.
import { z } from 'zod'
import {
  type CommandDef,
  type ComponentDef,
  defineCommand,
  defineComponent,
  definePlugin,
  defineResource,
  defineSystem,
  type PluginDef,
  type ResourceDef,
} from '#src/features/sim/definitions.ts'

const bodyFields = { x: 'f32', y: 'f32', vx: 'f64', vy: 'f64' } as const
const tagFields = { name: 'string', alive: 'bool', team: 'u32', hp: 'i32', target: 'entity' } as const
export const Body: ComponentDef<typeof bodyFields> = defineComponent('body', bodyFields)
export const Tag: ComponentDef<typeof tagFields> = defineComponent('tag', tagFields)
export const Hidden: ComponentDef<{ readonly secret: 'f32' }> = defineComponent(
  'hidden',
  { secret: 'f32' },
  { render: false },
)
export const Push: CommandDef<z.ZodObject<{ sid: z.ZodNumber; dx: z.ZodNumber }>> = defineCommand(
  'push',
  z.object({ sid: z.number().int(), dx: z.number() }),
)
export const Stats: ResourceDef<
  z.ZodObject<{ spawned: z.ZodNumber; fold: z.ZodNumber; log: z.ZodArray<z.ZodString> }>
> = defineResource(
  'stats',
  z.object({ spawned: z.number(), fold: z.number(), log: z.array(z.string()) }),
  () => ({
    spawned: 0,
    fold: 0,
    log: [],
  }),
)

const NAMES = ['ant', 'bee', 'cat', 'dog', 'eel']

export const fixturePlugin: PluginDef = definePlugin({
  name: 'fixture',
  components: [Body, Tag, Hidden],
  commands: [Push],
  resources: [Stats],
  systems: [
    defineSystem({
      name: 'push',
      phase: 'input',
      run(ctx) {
        for (const c of ctx.commands.of(Push)) {
          const e = ctx.entity(c.payload.sid)
          if (e?.has(Body)) e.set(Body, { vx: e.get(Body).vx + c.payload.dx })
        }
      },
    }),
    defineSystem({
      name: 'move',
      phase: 'gameplay',
      run(ctx) {
        for (const e of ctx.query(Body)) {
          const b = e.get(Body)
          e.set(Body, { x: b.x + b.vx * ctx.dt, y: b.y + b.vy * ctx.dt })
        }
      },
    }),
    defineSystem({
      name: 'churn',
      phase: 'gameplay',
      after: ['move'],
      run(ctx) {
        const stats = ctx.resource(Stats)
        const all = ctx.query(Tag)
        for (const e of all) stats.fold = (Math.imul(stats.fold, 31) + e.sid) >>> 0 // order-sensitive
        const victim = all[ctx.rng.int(Math.max(1, all.length))]
        if (victim && all.length > 3 && ctx.tick % 2 === 0) ctx.despawn(victim.sid) // net growth: +1 spawn/tick
        const other = all[ctx.rng.int(Math.max(1, all.length))]
        const sid = ctx.spawn(
          [
            Body,
            {
              x: ctx.rng.next() * 10,
              y: ctx.rng.next() * 10,
              vx: ctx.rng.next() - 0.5,
              vy: ctx.rng.next() - 0.5,
            },
          ],
          [
            Tag,
            {
              name: NAMES[ctx.rng.int(NAMES.length)] as string,
              alive: ctx.rng.next() < 0.5,
              team: ctx.rng.int(4),
              hp: ctx.rng.int(200) - 100,
              target: other?.sid ?? 0,
            },
          ],
          [Hidden, { secret: ctx.rng.next() }],
        )
        stats.spawned += 1
        if (stats.log.length < 20) stats.log.push(`t${ctx.tick}:${sid}`)
      },
    }),
  ],
})

import {
  Body,
  type ComponentDef,
  defineComponent,
  definePlugin,
  defineSystem,
  Player,
  type PluginDef,
  wasPressed,
} from '@automataframework/framework/headless'

/** How fast a jump leaves the ground, in tiles a second. */
const JUMP = 12
/** How many ticks in a row without moving up or down count as standing on something. */
const STANDING = 2

/** Jumps left in the air, and how long the hero has been standing still. */
export const AirJumps: ComponentDef<{ left: 'u32'; still: 'u32' }> = defineComponent(
  'air-jumps',
  { left: 'u32', still: 'u32' },
  { render: false },
)

const doubleJump = defineSystem({
  name: 'hero.double-jump',
  phase: 'gameplay',
  before: ['hero.move'],
  run(ctx) {
    for (const hero of ctx.query(Player, Body)) {
      if (!hero.has(AirJumps)) hero.add(AirJumps)
      const { left, still } = hero.get(AirJumps)
      const standing = Math.abs(hero.get(Body).vy) < 0.01 ? Math.min(still + 1, STANDING) : 0
      // On the ground the second jump is back. In the air a press spends it, once.
      if (standing >= STANDING) hero.set(AirJumps, { left: 1, still: standing })
      else if (wasPressed(hero, 'jump') && left > 0) {
        hero.set(Body, { vy: -JUMP })
        hero.set(AirJumps, { left: 0, still: 0 })
      } else hero.set(AirJumps, { still: standing })
    }
  },
})

/** The double jump's plugin: list it in `gamePlugins` after the hero's. */
export const doubleJumpPlugin: PluginDef = definePlugin({
  name: 'double-jump',
  dependsOn: ['physics', 'commands'],
  components: [AirJumps],
  systems: [doubleJump],
})

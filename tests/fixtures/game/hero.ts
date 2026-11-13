// The smallest game code there is: run left and right, jump when pressed on the ground. It stands in for the hero a
// game in the Examples repo writes, and uses only what a game may: `definePlugin`, `defineSystem`, `Player`, `isHeld`,
// `wasPressed`, `Body`.
import { isHeld, Player, wasPressed } from '#src/features/commands/commands.ts'
import { Body } from '#src/features/physics/physics.ts'
import { definePlugin, defineSystem, type PluginDef } from '#src/features/sim/sim.ts'

/** Tiles per second the hero runs at, and the upward speed of a jump (y points down, so up is negative). */
const RUN = 6
const JUMP = -12

const move = defineSystem({
  name: 'hero.move',
  phase: 'gameplay',
  run(ctx) {
    for (const hero of ctx.query(Player, Body)) {
      const left = isHeld(hero, 'left')
      const right = isHeld(hero, 'right')
      const onGround = Math.abs(hero.get(Body).vy) < 0.01
      hero.set(Body, {
        vx: left === right ? 0 : left ? -RUN : RUN,
        ...(wasPressed(hero, 'jump') && onGround ? { vy: JUMP } : {}),
      })
    }
  },
})

/** The hero's plugin: after physics and commands, since it reads `Player` and writes `Body`. */
export const heroPlugin: PluginDef = definePlugin({
  name: 'hero',
  dependsOn: ['physics', 'commands'],
  systems: [move],
})

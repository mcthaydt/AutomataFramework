// How the hero moves: run left and right, and jump once for each press while standing on something. Each tick the
// system asks what the player holds (`isHeld`, `wasPressed`) and sets the body's speed; physics does the rest.
// These rules have no clock and no dice: a tick is the only time there is (`ctx.tick`), and `ctx.rng` is the only
// chance. That is why the same keys give the same game on every machine.
import {
  Body,
  defineSystem,
  isHeld,
  Player,
  type SystemDef,
  wasPressed,
} from '@automataframework/framework/headless'

/** How fast the hero runs, in tiles a second. */
const RUN = 6
/** How fast a jump leaves the ground, in tiles a second. The level's y points down, so up is negative. */
const JUMP = -12

/** Runs and jumps for every player; each player's keys move only their own hero. */
export const moveHero: SystemDef = defineSystem({
  name: 'hero.move',
  phase: 'gameplay',
  run(ctx) {
    for (const hero of ctx.query(Player, Body)) {
      const left = isHeld(hero, 'left')
      const right = isHeld(hero, 'right')
      // Standing on something means not moving up or down.
      const standing = Math.abs(hero.get(Body).vy) < 0.01
      hero.set(Body, {
        vx: left === right ? 0 : left ? -RUN : RUN,
        ...(wasPressed(hero, 'jump') && standing ? { vy: JUMP } : {}),
      })
    }
  },
})

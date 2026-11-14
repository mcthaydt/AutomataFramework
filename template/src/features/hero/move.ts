// How the hero moves: run left and right, and jump once for each press while standing on something. Each tick the
// system asks what the player holds (`isHeld`, `wasPressed`) and sets the body's speed; physics does the rest.
// These rules have no clock and no dice: a tick is the only time there is (`ctx.tick`), and `ctx.rng` is the only
// chance. That is why the same keys give the same game on every machine.
import {
  Body,
  type ComponentDef,
  defineComponent,
  defineSystem,
  isHeld,
  Player,
  type SystemDef,
  wasPressed,
} from '@automataframework/framework/headless'

/** How fast the hero runs, in tiles a second. */
const RUN = 6
/** How fast a jump leaves the ground, in tiles a second. */
const JUMP = 12
/** How many ticks in a row without moving up or down count as standing on something. */
const STANDING = 2

/**
 * What the hero remembers between ticks: how many ticks in a row it has not moved up or down, counted up to
 * `STANDING`. One tick is not enough, because at the very top of a jump the hero stops for exactly one tick, and
 * that must not count as ground. `render: false` keeps it out of the picture: it is for the rules only.
 */
export const Hero: ComponentDef<{ still: 'u32' }> = defineComponent(
  'hero',
  { still: 'u32' },
  { render: false },
)

/** Runs and jumps for every player; each player's keys move only their own hero. */
export const moveHero: SystemDef = defineSystem({
  name: 'hero.move',
  phase: 'gameplay',
  run(ctx) {
    for (const hero of ctx.query(Player, Body)) {
      if (!hero.has(Hero)) hero.add(Hero)
      const left = isHeld(hero, 'left')
      const right = isHeld(hero, 'right')
      const standing = hero.get(Hero).still >= STANDING
      // Counted before this tick's jump, so a press on the tick the hero lands waits for the ground to be felt.
      const still = Math.abs(hero.get(Body).vy) < 0.01 ? Math.min(hero.get(Hero).still + 1, STANDING) : 0
      const jump = wasPressed(hero, 'jump') && standing
      // The level's y points down, so up is negative.
      hero.set(Body, { vx: left === right ? 0 : left ? -RUN : RUN, ...(jump ? { vy: -JUMP } : {}) })
      hero.set(Hero, { still: jump ? 0 : still })
    }
  },
})

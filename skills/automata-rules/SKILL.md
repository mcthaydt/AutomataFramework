---
name: automata-rules
description: Use when you add or change what a character can do, such as a new move, a new rule or a new thing that happens. It walks through a plugin, a system, a test and the recording, with one whole example.
---

# Adding a rule

A rule is code in `src/features/<name>/`. The game's rules are `src/headless.ts` and every file it reaches, so they run
with no page, no clock and no files. Skill `automata` says why. Skill `automata-api` says what you may import.

## The steps

1. **A plugin** bundles the rules of one feature: `definePlugin({ name, dependsOn, components, systems })`. List it in
   `gamePlugins` in `src/headless.ts`.
2. **A system** is one rule that runs every tick, in a phase. `gameplay` is where a game's own rules go, after physics.
   `defineSystem({ name, phase, run })`. If one system must run before or after another, say so with `before` or `after`,
   naming the other system.
3. **A component** is something an entity remembers between ticks: `defineComponent(id, { field: 'u32' })`. Use
   `render: false` for what is for the rules only.
4. **A command** is what a player does (`controls` is the framework's own: what is held this tick). Read it with
   `isHeld(entity, 'jump')` and `wasPressed(entity, 'jump')`. An **event** says what happened, for sound and the page to
   hear. Neither needs a new definition for a move that only reads what is held.
5. **A test** steps the sim and looks at the answer. Copy `tests/features/hero/hero.test.ts`.
6. **Check, then the recording.** Run `npx --no automata check`. If the play changed on purpose, the replays step says the
   recording no longer ends where it did: run `npx --no automata replay --accept`, and say why it moved.

## A whole example: a double jump

The hero jumps once from the ground. This plugin lets it jump once more in the air, and not a third time. It runs
before `hero.move`, so on the tick of a press it sees the hero as it was, and `hero.move` does the first jump as usual.

```ts
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
```

Then add `doubleJumpPlugin` to the list in `src/headless.ts`, after the hero's: `gamePlugins = [heroPlugin, doubleJumpPlugin]`.

The test steps a sim with both plugins: press jump on the ground, press again in the air (it rises again), press a third
time (nothing happens). When it passes, `replay` will show the recording has not moved, since the recorded play never
pressed jump in the air. A recording that did would move, and you would accept it.

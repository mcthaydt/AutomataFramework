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
   hear. Neither needs a new definition for a move that only reads what is held. The hero's own moves are the
   framework's; see below.
5. **A test** steps the sim and looks at the answer. Copy `tests/features/hero/hero.test.ts`.
6. **Check, then the recording.** Run `npx --no automata check`. If the play changed on purpose, the replays step says the
   recording no longer ends where it did: run `npx --no automata replay --accept`, and say why it moved.

## Answering an event

An **event** says what happened in a tick, and a rule can answer it. The template does this for its spark: a character
whose file says `"touch": "take"` is taken away when the hero touches it, and the game says `spark.taken` (the character's
`kind`, then what happened). `src/features/hero/score.ts` answers it. `touchEvent('spark', 'taken')` names the event,
`ctx.events.of(...)` lists the ones raised in this tick, and the answer is kept in a **resource**, a value the whole game
shares, made with `defineResource(id, schema, start)` and listed in the plugin's `resources`.

To answer another event, copy that file, name the event you want and list the system in the plugin, the way
`src/features/hero/hero.ts` lists `countSparks`. Put the system in `gameplay`: it runs after the touches of the tick, so
it hears them. A plugin that answers a touch lists `level` and `touch` in `dependsOn`, and a game with no character that
can be touched has no `touch`, so add one before you depend on it. Test it by stepping a sim and reading the resource
with `sim.resource(Score)`, as `tests/features/hero/hero.test.ts` does for the sparks.

## The hero is the framework's

A game whose hero's character file has `moves` has no movement code: the framework walks and jumps it, and the game
writes no rule for it. `moves` names the tuning file (`"tuning": "hero-moves"`) and switches on `"double-jump"`,
`"wall-jump"` and `"dash"`. The numbers are in that tuning file, each with its range: `walk-speed`, `walk-grip`,
`air-grip`, `jump-speed`, `jump-cut`, `ledge-grace`, `early-press`, `fall-speed`, `air-jumps`, `air-jump-speed`,
`wall-slide-speed`, `wall-jump-out`, `wall-jump-up`, `wall-jump-lock`, `dash-speed`, `dash-ticks`, `dash-rest` and
`air-dashes`. The controls are in the same file. To change how the hero moves, change a number; do not copy movement
into code.

The framework says what the hero did with eight events: `hero.walked`, `hero.jumped`, `hero.landed`,
`hero.left-ground`, `hero.air-jumped`, `hero.wall-slid`, `hero.wall-jumped` and `hero.dashed`. Name one with
`moveEvent('jumped')`. A rule of your own that answers one, or reads the hero's body after it moved, runs
`after: ['level.moves']`.

## A whole example: a jump counter

The hero jumps by itself. This plugin counts the jumps, in the air as well as from the ground, by answering the
`hero.jumped` event. It runs after the framework's moves, so it hears the jump of the tick it happened in.

```ts
import {
  defineResource,
  definePlugin,
  defineSystem,
  moveEvent,
  type PluginDef,
  type ResourceDef,
  z,
} from '@automataframework/framework/headless'

const countSchema: z.ZodObject<{ jumps: z.ZodNumber }> = z.object({ jumps: z.number().int() })

/** How many times the hero has jumped, from the ground or in the air. */
export const Jumps: ResourceDef<typeof countSchema> = defineResource('hero.jumps', countSchema, () => ({
  jumps: 0,
}))

/** Adds the jumps of this tick. It runs after the framework's moves, so it hears what they said this tick. */
const countJumps = defineSystem({
  name: 'hero.count-jumps',
  phase: 'gameplay',
  after: ['level.moves'],
  run(ctx) {
    ctx.resource(Jumps).jumps += ctx.events.of(moveEvent('jumped')).length
  },
})

/** The jump counter's plugin: list it in `gamePlugins` after the hero's. */
export const jumpCountPlugin: PluginDef = definePlugin({
  name: 'jump-count',
  dependsOn: ['level'],
  resources: [Jumps],
  systems: [countJumps],
})
```

Then add `jumpCountPlugin` to the list in `src/headless.ts`, after the hero's: `gamePlugins = [heroPlugin, jumpCountPlugin]`.

The test steps a sim with both plugins: press jump on the ground (the count is 1), press again in the air (still 1, since
this hero has no double jump), land and press once more (2). When it passes, `replay` will show the recording has not
moved, since the plugin only reads. A rule that changed what the hero does would move it, and you would accept it.

// What the story's tests share: the events of a step that belong to a story, and a game plugin that does what a game's
// own system would do (open a conversation, start a cutscene) on chosen ticks.
import {
  definePlugin,
  defineSystem,
  type PluginDef,
  type SimContext,
  type SimEvent,
  type StepResult,
} from '#src/features/sim/sim.ts'

/** The story's events of one step, in the order they were emitted. */
export function storyEventsOf(result: StepResult): SimEvent[] {
  return result.events.filter((e) => e.type.startsWith('conversation.') || e.type.startsWith('cutscene.'))
}

/** A game plugin, named `name`, whose one system runs `act` in `gameplay` on each of `ticks`: a game's own system. */
export function callOn(name: string, ticks: readonly number[], act: (ctx: SimContext) => void): PluginDef {
  return definePlugin({
    name,
    dependsOn: ['level'],
    systems: [
      defineSystem({
        name: `${name}.run`,
        phase: 'gameplay',
        run(ctx) {
          if (ticks.includes(ctx.tick)) act(ctx)
        },
      }),
    ],
  })
}

// The story game, loaded, and the game code it needs: the hero's controls, and the one line of code a game writes to
// have the keeper talk when a hero comes up to it.
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import { Story, startConversation } from '#src/features/level/level.ts'
import { definePlugin, defineSystem, type PluginDef } from '#src/features/sim/sim.ts'
import { heroPlugin } from '../game/hero.ts'
import { readStory } from './read.ts'

/** Loads the story game, with `overrides` as `readStory` takes them. Throws, naming every problem, if it does not load. */
export async function loadStory(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Promise<GameContent> {
  const loaded = await loadGame(readStory(overrides))
  if (!loaded.ok)
    throw new Error(`The story game did not load:\n${loaded.diagnostics.map((d) => d.message).join('\n')}`)
  return loaded.value
}

/**
 * The keeper talks to a hero who comes up to it, until the player has been through the talk once. This is the game's
 * own code: the framework keeps who is within reach (`Story.met`), and a game decides what that means.
 */
const talkToKeeper = defineSystem({
  name: 'story-game.talk',
  phase: 'gameplay',
  after: ['level.story.meet'],
  run(ctx) {
    const story = ctx.resource(Story)
    if (story.talk !== null || story.scene !== null || story.ended.keeper !== undefined) return
    const first = story.met[0]
    if (first === undefined) return
    const [thing, player] = first.split(':').map(Number)
    if (thing !== undefined && player !== undefined) startConversation(ctx, 'keeper', player, thing)
  },
})

/** The story game's own code, after the hero's controls. */
export const storyGamePlugin: PluginDef = definePlugin({
  name: 'story-game',
  dependsOn: ['level'],
  systems: [talkToKeeper],
})

/** What a game of the story game's code is: the hero's controls, then the keeper's talk. */
export const storyPlugins: readonly PluginDef[] = [heroPlugin, storyGamePlugin]

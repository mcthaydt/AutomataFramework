import { commandsPlugin } from '../commands/commands.ts'
import type { GameContent } from '../content/content.ts'
import { physics } from '../physics/physics.ts'
import { createSim, type PluginDef, type Sim } from '../sim/sim.ts'
import { behaviourPlugin, usesBehaviours } from './behaviour.ts'
import { joinPlugin } from './join.ts'
import { levelPlugin } from './plugin.ts'
import { simContent } from './sim-content.ts'
import { spawnLevel } from './spawn-level.ts'
import { storyPlugin, usesStory } from './story.ts'
import { Story, type StoryProgress } from './story-state.ts'
import { touchPlugin } from './touch.ts'
import { touchKinds, usesJoints } from './uses.ts'

/** What `createGameSim` takes. Only the content is required. */
export interface GameSimOptions {
  readonly content: GameContent
  /** The game's own plugins, after the framework's. */
  readonly plugins?: readonly PluginDef[]
  /** Default 1. */
  readonly seed?: number
  /** The level to open: default the project's `start`. */
  readonly level?: string
  /** Which players are in: default `[1]`. Each needs a start point in the level. */
  readonly players?: readonly number[]
  /** Default `{ x: 0, y: 30 }`: y points down, so this pulls things down the screen, a little harder than Earth. */
  readonly gravity?: { readonly x: number; readonly y: number }
  /**
   * What an earlier play of this game finished: a cutscene in `seen` does not open its level again. A start condition,
   * like `level` and `players`.
   */
  readonly story?: StoryProgress
}

/**
 * The sim a game runs: physics, commands, the level plugin and the game's own plugins, with the level spawned, at
 * tick 0. The content goes into the sim, but not its sound, music and cue files (`simContent`), so it is part of
 * `contentHash` and a replay knows if it changed, except for what a game sounds like. If the level cannot be
 * spawned, the sim is disposed and the `LevelError` is thrown.
 */
export async function createGameSim(options: GameSimOptions): Promise<Sim> {
  const { content } = options
  const players = content.project.players ?? 1
  const kinds = touchKinds(content)
  const sim = await createSim({
    seed: options.seed ?? 1,
    content: simContent(content),
    plugins: [
      physics({ gravity: options.gravity ?? { x: 0, y: 30 }, joints: usesJoints(content) }),
      commandsPlugin,
      levelPlugin,
      // Only a game for two or more players can have people join and leave (see join.ts).
      ...(players >= 2 ? [joinPlugin({ level: options.level ?? content.project.start, max: players })] : []),
      // Only a game with a touched character has the touch plugin, so every other game keeps the sim it had.
      ...(kinds.sense.length + kinds.take.length > 0 ? [touchPlugin(kinds)] : []),
      // Only a game with a character that has a behaviour gets the rules' system, for the same reason.
      ...(usesBehaviours(content) ? [behaviourPlugin] : []),
      // The same for a game with a conversation or a cutscene.
      ...(usesStory(content) ? [storyPlugin] : []),
      ...(options.plugins ?? []),
    ],
  })
  try {
    const level = options.level ?? content.project.start
    spawnLevel(sim, content, level, options.players ?? [1])
    if (usesStory(content)) {
      const story = sim.resource(Story)
      story.level = level
      story.ended = { ...options.story?.ended }
      story.seen = [...new Set(options.story?.seen)].sort()
    }
  } catch (error) {
    sim.dispose()
    throw error
  }
  return sim
}

import { commandsPlugin } from '../commands/commands.ts'
import type { GameContent } from '../content/content.ts'
import { physics } from '../physics/physics.ts'
import { createSim, type PluginDef, type Sim } from '../sim/sim.ts'
import { joinPlugin } from './join.ts'
import { levelPlugin } from './plugin.ts'
import { simContent } from './sim-content.ts'
import { spawnLevel } from './spawn-level.ts'
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
      ...(options.plugins ?? []),
    ],
  })
  try {
    spawnLevel(sim, content, options.level ?? content.project.start, options.players ?? [1])
  } catch (error) {
    sim.dispose()
    throw error
  }
  return sim
}

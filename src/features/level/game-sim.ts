import { commandsPlugin } from '../commands/commands.ts'
import type { GameContent } from '../content/content.ts'
import { physics } from '../physics/physics.ts'
import { createSim, type PluginDef, type Sim } from '../sim/sim.ts'
import type { Arrive } from './arrive.ts'
import { joinPlugin } from './join.ts'
import { movesPlugin } from './moves.ts'
import { levelsOf } from './place.ts'
import { levelPlugin } from './plugin.ts'
import { simContent } from './sim-content.ts'
import { spawnPlace } from './spawn-place.ts'
import { spritesPlugin } from './sprite.ts'
import { openKinds, switchPlugin } from './switches.ts'
import { touchPlugin } from './touch.ts'
import { touchKinds, usesJoints, usesMoves, usesSprites, usesSwitches, usesValues } from './uses.ts'
import { wherePlugin } from './where.ts'

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
  /**
   * Where the heroes come in, in the opened level: beside a thing of it (a door they came through), or at a spot in its
   * own tiles. Default: its start points. A hero is never put inside a door (see `arrivalSpots`).
   */
  readonly arrive?: Arrive
  /** Default `{ x: 0, y: 30 }`: y points down, so this pulls things down the screen, a little harder than Earth. */
  readonly gravity?: { readonly x: number; readonly y: number }
}

/**
 * The sim a game runs: physics, commands, the level plugin and the game's own plugins, with the level spawned, at
 * tick 0. The content goes into the sim, so it is part of `contentHash` and a replay knows if it changed, but not the
 * game's words or its sound, music and cue files (see `simContent`), so a replay does not notice what a game says or
 * sounds like. The level is spawned from the whole content. If the level cannot be spawned, the sim is disposed and the
 * `LevelError` is thrown.
 */
export async function createGameSim(options: GameSimOptions): Promise<Sim> {
  const { content } = options
  const players = content.project.players ?? 1
  const kinds = touchKinds(content)
  const gravity = options.gravity ?? { x: 0, y: 30 }
  const moved = usesMoves(content)
  const opened = options.level ?? content.project.start
  // The levels the sim holds: the opened level's place, or the opened level alone.
  const levels = levelsOf(content, opened)
  const sim = await createSim({
    seed: options.seed ?? 1,
    content: simContent(content),
    plugins: [
      physics({ gravity, joints: usesJoints(content), touching: moved }),
      commandsPlugin,
      levelPlugin,
      // Only a game for two or more players can have people join and leave (see join.ts).
      ...(players >= 2
        ? [
            joinPlugin({
              level: opened,
              max: players,
              ...(options.arrive === undefined ? {} : { arrive: options.arrive }),
            }),
          ]
        : []),
      // Only a game with a figure or a camera has sprites, so every other game keeps the sim it had.
      ...(usesSprites(content) ? [spritesPlugin] : []),
      // Only a game with a touched character has the touch plugin, so every other game keeps the sim it had.
      ...(kinds.sense.length + kinds.take.length > 0 ? [touchPlugin(kinds)] : []),
      // Only a game whose hero has `moves` has the built-in hero, so every other game keeps the sim it had.
      ...(moved ? [movesPlugin({ gravity })] : []),
      // Only a game with a character that has `values`, a switch or a gate, or a place of joined levels, knows which levels it holds.
      ...(usesValues(content) || usesSwitches(content) || levels.length > 1 ? [wherePlugin(levels)] : []),
      // Only a game with a switch or a gate has the switch plugin (its components, events and the `facts` command).
      ...(usesSwitches(content) ? [switchPlugin(openKinds(content))] : []),
      ...(options.plugins ?? []),
    ],
  })
  try {
    spawnPlace(sim, content, opened, options.players ?? [1], options.arrive)
  } catch (error) {
    sim.dispose()
    throw error
  }
  return sim
}

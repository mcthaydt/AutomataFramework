// The story game, loaded, and the game code it needs: the hero's controls. The keeper talks when a hero walks up to it,
// by the framework's own rule, so a game writes no code for that.
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import type { PluginDef } from '#src/features/sim/sim.ts'
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

/** What a game of the story game's code is: the hero's controls. */
export const storyPlugins: readonly PluginDef[] = [heroPlugin]

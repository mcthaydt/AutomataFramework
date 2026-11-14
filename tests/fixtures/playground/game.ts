// The playground game, loaded.
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import { readPlayground } from './read.ts'

/** Loads the playground, with `overrides` as `readPlayground` takes them. Throws, naming every problem, if it does not load. */
export async function loadPlayground(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Promise<GameContent> {
  const loaded = await loadGame(readPlayground(overrides))
  if (!loaded.ok)
    throw new Error(`The playground did not load:\n${loaded.diagnostics.map((d) => d.message).join('\n')}`)
  return loaded.value
}

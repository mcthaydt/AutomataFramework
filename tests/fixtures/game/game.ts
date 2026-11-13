// The fixture game, loaded: the content the level and game tests build sims from.
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import { readFixture } from './read.ts'

/** Loads the fixture game, with `overrides` as `readFixture` takes them. Throws, naming every problem, if it does not load. */
export async function loadFixtureGame(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Promise<GameContent> {
  const loaded = await loadGame(readFixture(overrides))
  if (!loaded.ok)
    throw new Error(`The fixture game did not load:\n${loaded.diagnostics.map((d) => d.message).join('\n')}`)
  return loaded.value
}

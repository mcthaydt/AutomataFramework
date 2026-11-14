// The list of the game's rules. `automata check`, `automata replay` and every test read this file, and it is named
// `headless.ts` because everything it reaches runs with no page, no clock and no files, so the same play ends the same
// on every machine. Add a plugin here when you add a rule.
import type { PluginDef } from '@automataframework/framework/headless'
import { heroPlugin } from './features/hero/hero.ts'

export const gamePlugins: readonly PluginDef[] = [heroPlugin]

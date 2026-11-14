// The list of the game's rules. `automata check`, `automata replay` and every test read this file, and it is named
// `headless.ts` because everything it reaches runs with no page, no clock and no files, so the same play ends the same
// on every machine. Add a plugin here when you add a rule.
import type { PluginDef } from '@automataframework/framework/headless'
import { heroPlugin } from './features/hero/hero.ts'

export const gamePlugins: readonly PluginDef[] = [heroPlugin]

/**
 * What a player can hold, in the order a person reads them. An agent's play session refuses a name that is not here, so
 * a typo is told at once and not played as nothing. The page's controls name the same actions.
 */
export const actions: readonly string[] = ['left', 'right', 'jump']

// A small game's folder as a map of files, for the cli feature's tests: the fixture game's content, and the code a
// game written with `automata create` has: `src/headless.ts` listing the rules, and one plugin that uses only the
// framework's headless entry. The command's tests run on it in memory, so nothing here is read from disk.
import { fixtureFiles } from '../game/read.ts'

/** The hero's rules, written the way a game's own would be: imports the headless entry and nothing else. */
export const HERO_SOURCE = `import {
  Body,
  definePlugin,
  defineSystem,
  isHeld,
  Player,
  wasPressed,
} from '@automataframework/framework/headless'

const RUN = 6
const JUMP = -12

const move = defineSystem({
  name: 'hero.move',
  phase: 'gameplay',
  run(ctx) {
    for (const hero of ctx.query(Player, Body)) {
      const left = isHeld(hero, 'left')
      const right = isHeld(hero, 'right')
      const onGround = Math.abs(hero.get(Body).vy) < 0.01
      hero.set(Body, {
        vx: left === right ? 0 : left ? -RUN : RUN,
        ...(wasPressed(hero, 'jump') && onGround ? { vy: JUMP } : {}),
      })
    }
  },
})

export const heroPlugin = definePlugin({
  name: 'hero',
  dependsOn: ['physics', 'commands'],
  systems: [move],
})
`

/** The file that lists a game's rules, as `automata create` writes it. */
export const HEADLESS_SOURCE = `import { heroPlugin } from './features/hero/hero.ts'

export const gamePlugins = [heroPlugin]
`

/** The fixture game, its code and a package.json, by path from the game's root. A fresh object every time. */
export function smallGame(): Record<string, string> {
  return {
    ...fixtureFiles,
    'package.json': `${JSON.stringify({ name: 'small-game', private: true, type: 'module' }, null, 2)}\n`,
    'src/headless.ts': HEADLESS_SOURCE,
    'src/features/hero/hero.ts': HERO_SOURCE,
  }
}

/** The same files with `folder/` in front of every path, as the memory layer keys a game that is not at the root. */
export function under(folder: string, files: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(files).map(([path, text]) => [`${folder}/${path}`, text]))
}

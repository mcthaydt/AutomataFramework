// The page's build. `base: './'` makes every address in the built page relative, so the folder works from any path.
// `appType: 'mpa'` answers a file that is not there with "not found", never with the page: a missing game file must
// be seen, not hidden. `npm test` runs no browser: the play test (tests/play, which opens the built game in real browsers)
// has its own command, `npm run play-test`.
/// <reference types="vitest/config" />
import { cpSync, existsSync } from 'node:fs'
import { defineConfig, type Plugin, type UserConfig } from 'vite'

/** The game's own files, put beside the built page, since the page reads them from beside itself. */
const GAME_FILES = ['automata.toml', 'content', 'replays']
const gameFiles = (): Plugin => ({
  name: 'game-files',
  apply: 'build',
  closeBundle() {
    for (const name of GAME_FILES) if (existsSync(name)) cpSync(name, `dist/${name}`, { recursive: true })
  },
})

const config: UserConfig = defineConfig({
  base: './',
  appType: 'mpa',
  plugins: [gameFiles()],
  test: { exclude: ['tests/play/**', 'node_modules/**', 'dist/**'] },
})

export default config

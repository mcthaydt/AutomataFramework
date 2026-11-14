// The README's "Start here" commands, as a list. The create smoke and the create journey run these and no others, and
// the README's test reads the fenced block and compares it to this, so the page a person reads and the commands CI
// runs cannot drift apart.

/** The five commands of "Start here", in order. */
export const START_HERE: readonly string[] = [
  'npx @automataframework/framework create my-game',
  'cd my-game',
  'npm install',
  'npm run check',
  'npm run dev',
]

/** The game's folder in those commands. */
export const GAME_FOLDER: string = 'my-game'

/** The words the smoke swaps in the first command: the package, for the tarball CI packed. Nothing else is swapped. */
export const PACKAGE_NAME: string = '@automataframework/framework'

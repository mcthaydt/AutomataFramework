// The moves game as a player sees it on a screen: one hero with a figure, so its box can be found on the canvas, the
// first level with or without a camera, and a feel file that buzzes on a dash. The pictures are painted the way
// `automata art` paints them.
import { artFiles, type GameContent, loadGame, writeContent } from '#src/features/content/content.ts'
import { readFiles } from '../content/kind.ts'
import { movesFiles } from '../game/moves-game.ts'
import { levelOne, START_FLOOR } from './level.ts'

/** The strength and length of the buzz on a dash, so a test can say what the host was asked. */
export const DASH_BUZZ = { strength: 0.4, ticks: 3 } as const

/** The moves game, with a figure for the hero and a buzz on `hero.dashed`; `view` switches the camera on. */
export async function movesScreenContent(
  options: { readonly view?: { readonly w: number; readonly h: number } } = {},
): Promise<GameContent> {
  const files = movesFiles({ doubleJump: true, wallJump: true, dash: true, figure: true })
  const level = JSON.parse(levelOne()) as Record<string, unknown>
  files['content/levels/level-1.json'] = writeContent('level', {
    ...level,
    things: [],
    starts: [{ player: 1, x: 2.5, y: START_FLOOR - 0.5 }],
    ...(options.view === undefined ? {} : { view: options.view }),
  } as never)
  const listed = '\n[[content]]\ntype = "feel"\npath = "content/feels/dash.json"\n'
  files['automata.toml'] = `${files['automata.toml'] ?? ''}${listed}`
  files['content/feels/dash.json'] = writeContent('feel', {
    format: 1,
    id: 'dash',
    on: 'hero.dashed',
    buzz: DASH_BUZZ,
  } as never)
  const loaded = await loadGame(readFiles(files))
  if (!loaded.ok) {
    const problems = loaded.diagnostics.map((d) => d.message).join('\n')
    throw new Error(`The moves screen game did not load:\n${problems}`)
  }
  return loaded.value
}

/** A `readPicture` for `content`: each picture of the game, painted once. */
export function paintedPictures(content: GameContent): (path: string) => Promise<Blob> {
  const painted = new Map(artFiles(content).map((file) => [file.path, file.bytes]))
  return async (path) => {
    const bytes = painted.get(path)
    if (bytes === undefined) throw new Error(`${path}: the game has no such picture`)
    return new Blob([bytes.slice()], { type: path.endsWith('.png') ? 'image/png' : 'application/json' })
  }
}

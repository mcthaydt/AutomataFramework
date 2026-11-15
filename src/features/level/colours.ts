import type { GameContent, Level, SceneFile } from '../content/content.ts'
import { SKY_COLOR, TILE_COLOR } from './components.ts'

/** A content file's `#rrggbb` as the 0xrrggbb number the sim and the renderer use. */
export const colourNumber = (hex: string): number => Number.parseInt(hex.slice(1), 16)

/** The scene a level names, or undefined for a level with its own rows or a scene the game lacks. */
const sceneOf = (content: GameContent, level: Level): SceneFile | undefined =>
  level.scene === undefined ? undefined : content.scenes?.[level.scene]

/** The colour behind a level: its scene's, or what its own file says, or the framework's own light blue. */
export function skyOf(content: GameContent, level: Level): number {
  const sky = sceneOf(content, level)?.sky ?? level.sky
  return sky === undefined ? SKY_COLOR : colourNumber(sky)
}

/** The colour of a level's solid tiles: its scene's, or what its own file says, or the framework's own slate. */
export function groundOf(content: GameContent, level: Level): number {
  const color = sceneOf(content, level)?.ground.color ?? level.ground
  return color === undefined ? TILE_COLOR : colourNumber(color)
}

import type { Level } from '../content/content.ts'
import { SKY_COLOR, TILE_COLOR } from './components.ts'

/** A content file's `#rrggbb` as the 0xrrggbb number the sim and the renderer use. */
export const colourNumber = (hex: string): number => Number.parseInt(hex.slice(1), 16)

/** The colour behind a level: what its file says, or the framework's own light blue. */
export const skyOf = (level: Level): number => (level.sky === undefined ? SKY_COLOR : colourNumber(level.sky))

/** The colour of a level's solid tiles: what its file says, or the framework's own slate. */
export const groundOf = (level: Level): number =>
  level.ground === undefined ? TILE_COLOR : colourNumber(level.ground)

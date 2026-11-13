import type { Level } from '../content/content.ts'

/** A row's unbroken stretch of solid tiles: where it starts and how many tiles long it is. */
export interface TileRun {
  readonly row: number
  readonly col: number
  readonly length: number
}

/**
 * Each unbroken horizontal run of `#`, rows top to bottom and runs left to right. A run becomes one collider, so a
 * floor of sixteen tiles is one box and not sixteen.
 */
export function tileRuns(tiles: readonly string[]): TileRun[] {
  const runs: TileRun[] = []
  tiles.forEach((text, row) => {
    let start = -1
    // One step past the end closes a run that reaches the edge.
    for (let col = 0; col <= text.length; col++) {
      const solid = text[col] === '#'
      if (solid && start < 0) start = col
      else if (!solid && start >= 0) {
        runs.push({ row, col: start, length: col - start })
        start = -1
      }
    }
  })
  return runs
}

/** The level's width and height in tiles. */
export function levelSize(level: Level): { readonly w: number; readonly h: number } {
  return { w: level.tiles[0]?.length ?? 0, h: level.tiles.length }
}

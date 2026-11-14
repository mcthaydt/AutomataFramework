import type { Level } from '../content/content.ts'

/** A row's unbroken stretch of solid tiles: where it starts and how many tiles long it is. */
export interface TileRun {
  readonly row: number
  readonly col: number
  readonly length: number
}

/**
 * Each unbroken horizontal run of solid tiles, rows top to bottom and runs left to right. A run becomes one collider,
 * so a floor of sixteen tiles is one box and not sixteen. `isSolid` says which letters are solid (a level with a
 * tileset takes that from it); left out, `#` is.
 */
export function tileRuns(
  tiles: readonly string[],
  isSolid: (letter: string) => boolean = (letter) => letter === '#',
): TileRun[] {
  const runs: TileRun[] = []
  tiles.forEach((text, row) => {
    let start = -1
    // One step past the end closes a run that reaches the edge.
    for (let col = 0; col <= text.length; col++) {
      const letter = text[col]
      const solid = letter !== undefined && isSolid(letter)
      if (solid && start < 0) start = col
      else if (!solid && start >= 0) {
        runs.push({ row, col: start, length: col - start })
        start = -1
      }
    }
  })
  return runs
}

/** A block of solid tiles that is one collider: where its top left tile is, and how many tiles wide and tall it is. */
export interface TileBox {
  readonly row: number
  readonly col: number
  readonly w: number
  readonly h: number
}

/**
 * The runs of `tileRuns`, with each run that sits directly under a box of the same column and width joined to that
 * box, so a wall five tiles tall is one box, not five boxes with a seam between each (a hero sliding down a wall, or
 * a crate pushed along one, can catch on a seam). The boxes come in the order of their first run. A wall whose rows
 * differ, like a ledge, keeps its joins, and a level in `#` and `.` keeps one box a row: only a level with a tileset
 * is spawned from boxes, so the games already recorded play as they did.
 */
export function tileBoxes(
  tiles: readonly string[],
  isSolid?: (letter: string) => boolean,
): TileBox[] {
  const boxes: { row: number; col: number; w: number; h: number }[] = []
  for (const run of tileRuns(tiles, isSolid)) {
    const above = boxes.find((b) => b.col === run.col && b.w === run.length && b.row + b.h === run.row)
    if (above === undefined) boxes.push({ row: run.row, col: run.col, w: run.length, h: 1 })
    else above.h++
  }
  return boxes
}

/** The level's width and height in tiles. */
export function levelSize(level: Level): { readonly w: number; readonly h: number } {
  return { w: level.tiles[0]?.length ?? 0, h: level.tiles.length }
}

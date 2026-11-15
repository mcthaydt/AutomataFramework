// A scene's ground as the fixed colliders the sim spawns: plain data, in tiles, with no physics in it. A level with its own
// rows spawns boxes from them; a level with a scene spawns these, so a slope, a ledge and a box all come from one list,
// in one order, and the order is part of what a recorded play hashes.
import { type GroundGrid, runBottom, runTop, slopeRuns, tilesUnder } from '../content/content.ts'
import { tileBoxes, tileRuns } from './tile-runs.ts'

/** One fixed collider of a scene's ground, in tiles: a box by its top left corner, or a slope by its box's. */
export type GroundCollider =
  | {
      readonly kind: 'box'
      readonly col: number
      readonly row: number
      readonly w: number
      readonly h: number
    }
  | { readonly kind: 'ledge'; readonly col: number; readonly row: number; readonly w: number }
  | {
      readonly kind: 'slope'
      readonly col: number
      readonly row: number
      readonly w: number
      readonly h: number
      /** 1: rises to the right. -1: rises to the left. */
      readonly rises: 1 | -1
    }

/** What `groundColliders` reads of a scene's ground: its letters' shapes, its rows, and whether it is an old level's. */
export type GroundSource = GroundGrid & { readonly oneBoxPerRow?: true | undefined }

/**
 * A scene's colliders in spawn order: boxes (as `tileBoxes` gives them, or with `oneBoxPerRow` one a run of each row),
 * then each slope by `slopeRuns`' order, then ledges, rows top to bottom.
 *
 * A box is made of `solid` tiles only, less every tile under a slope's line inside its triangle: those are inside the
 * slope's own collider, and a box corner on the line is what a foot catches on. A slope is its triangle's bounding
 * box (`h` is how far the line climbs). A half slope that is a run of one tile, or a run that ends on a `high` tile at
 * its foot, stands on half a tile less than its tile has, so it is followed by a box for the half tile under it.
 */
export function groundColliders(ground: GroundSource): GroundCollider[] {
  const runs = slopeRuns(ground)
  const covered = new Set<string>()
  for (const run of runs) for (const { col, row } of tilesUnder(run)) covered.add(`${col},${row}`)

  // A letter is solid for the box when it is a solid tile that no slope's triangle holds.
  const solidLetters = new Set(ground.letters.filter((l) => l.shape === 'solid').map((l) => l.letter))
  const colliders: GroundCollider[] = []
  const rows = ground.rows.map((text, row) =>
    [...text]
      .map((letter, col) => (solidLetters.has(letter) && !covered.has(`${col},${row}`) ? '#' : '.'))
      .join(''),
  )
  if (ground.oneBoxPerRow === true)
    for (const run of tileRuns(rows))
      colliders.push({ kind: 'box', col: run.col, row: run.row, w: run.length, h: 1 })
  else for (const box of tileBoxes(rows)) colliders.push({ kind: 'box', ...box })

  for (const run of runs) {
    colliders.push({
      kind: 'slope',
      col: run.col,
      row: runTop(run),
      w: run.w,
      h: Math.abs(run.rise),
      rises: run.rise > 0 ? 1 : -1,
    })
    const bottom = runBottom(run)
    // The foot of the line is half way down a tile: the half under it is ground too.
    if (bottom % 1 !== 0)
      colliders.push({
        kind: 'box',
        col: run.rise > 0 ? run.col : run.col + run.w - 1,
        row: bottom,
        w: 1,
        h: 0.5,
      })
  }

  const ledgeLetters = new Set(ground.letters.filter((l) => l.shape === 'ledge').map((l) => l.letter))
  for (const run of tileRuns(ground.rows, (letter) => ledgeLetters.has(letter)))
    colliders.push({ kind: 'ledge', col: run.col, row: run.row, w: run.length })
  return colliders
}

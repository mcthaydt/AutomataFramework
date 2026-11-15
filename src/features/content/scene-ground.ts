// The shapes a scene's ground is made of, as plain geometry: no schema, no picture, no physics. The file's own checks, the
// painter and the sim all ask these same few questions of a tile (what is its surface, is this point inside it) and of a
// slope (where does its line run, and what must be under it), so each answer is given once, here.
//
// A tile is one unit. Inside a tile `x` goes right and `y` goes down, each 0 to 1. Everything is `+ - * /` and
// comparisons on numbers that are whole or halves, so every engine gives the same answer.

/** The nine shapes a tile of the ground may have. */
export const GROUND_SHAPES = [
  'solid',
  'slope-up',
  'slope-down',
  'half-up-low',
  'half-up-high',
  'half-down-high',
  'half-down-low',
  'ledge',
  'back',
] as const

export type GroundShape = (typeof GROUND_SHAPES)[number]

/** How much of a ledge's tile is ledge, from its top. */
export const LEDGE_DEEP = 0.25

/** What the questions below read of a scene's ground: a letter for each shape, and the rows of letters. */
export interface GroundGrid {
  readonly letters: readonly { readonly letter: string; readonly shape: GroundShape }[]
  readonly rows: readonly string[]
}

/** How far below the tile's top the shape's surface is at `x` (0 to 1 across the tile): 0 for solid, 1 - x for slope-up. */
export function surfaceAt(shape: GroundShape, x: number): number {
  switch (shape) {
    case 'solid':
    case 'ledge':
      return 0
    case 'slope-up':
      return 1 - x
    case 'slope-down':
      return x
    case 'half-up-low':
      return 1 - x / 2
    case 'half-up-high':
      return 0.5 - x / 2
    case 'half-down-high':
      return x / 2
    case 'half-down-low':
      return 0.5 + x / 2
    case 'back':
      return 1
  }
}

/**
 * True when the point (`x`, `y`, each 0 to 1 inside the tile, y down) is inside the shape. A point on a slope's line is
 * inside it. A ledge is its top `LEDGE_DEEP` only. `back` is seen and never solid, so nothing is inside it.
 */
export function covers(shape: GroundShape, x: number, y: number): boolean {
  if (shape === 'back') return false
  if (shape === 'ledge') return y >= 0 && y < LEDGE_DEEP
  return y >= surfaceAt(shape, x)
}

/** The shape of each tile: `shapeAt(col, row)` is undefined for air and outside the scene. */
export function shapesOf(ground: GroundGrid): (col: number, row: number) => GroundShape | undefined {
  const byLetter = new Map(ground.letters.map((entry) => [entry.letter, entry.shape] as const))
  return (col, row) => {
    const letter = ground.rows[row]?.[col]
    return letter === undefined || letter === '.' ? undefined : byLetter.get(letter)
  }
}

/**
 * A straight line of slope tiles, left to right. `rise` is how many tiles up (negative: down) the line goes from the
 * run's left end to its right. `row` is the row of its lowest tile and `col` its leftmost column; `leftY` is where the
 * line meets the run's left edge, in tiles from the scene's top (a half slope may start half way down a tile).
 */
export interface SlopeRun {
  readonly col: number
  readonly row: number
  readonly w: number
  readonly rise: number
  readonly leftY: number
}

/** The tile after one in a run: where it is, relative to the tile, and what shape it must have. */
interface Successor {
  readonly dx: number
  readonly dy: number
  readonly shape: GroundShape
}

/** One family of slope: how its tiles follow each other, and what its line does across a tile. */
interface Family {
  readonly successor: (shape: GroundShape) => Successor | undefined
  /** How far the line climbs across one tile, in tiles; negative going down. */
  readonly climb: number
  /** Where the line meets a tile's left edge, in tiles below the tile's top. */
  readonly leftAt: (shape: GroundShape) => number
}

/**
 * The four families of slope. A tile of a family has at most one tile before it and one after, so the tiles of a
 * family that touch in its pattern form paths, and each path is one run.
 */
const FAMILIES: readonly Family[] = [
  {
    successor: (s) => (s === 'slope-up' ? { dx: 1, dy: -1, shape: 'slope-up' } : undefined),
    climb: 1,
    leftAt: () => 1,
  },
  {
    successor: (s) => (s === 'slope-down' ? { dx: 1, dy: 1, shape: 'slope-down' } : undefined),
    climb: -1,
    leftAt: () => 0,
  },
  {
    successor: (s) => {
      if (s === 'half-up-low') return { dx: 1, dy: 0, shape: 'half-up-high' }
      if (s === 'half-up-high') return { dx: 1, dy: -1, shape: 'half-up-low' }
      return undefined
    },
    climb: 0.5,
    leftAt: (s) => (s === 'half-up-low' ? 1 : 0.5),
  },
  {
    successor: (s) => {
      if (s === 'half-down-high') return { dx: 1, dy: 0, shape: 'half-down-low' }
      if (s === 'half-down-low') return { dx: 1, dy: 1, shape: 'half-down-high' }
      return undefined
    },
    climb: -0.5,
    leftAt: (s) => (s === 'half-down-high' ? 0 : 0.5),
  },
]

/** True when the tile at (`col`, `row`) has a tile before it in its run. */
function hasPrevious(
  family: Family,
  shapeAt: (col: number, row: number) => GroundShape | undefined,
  col: number,
  row: number,
): boolean {
  const here = shapeAt(col, row)
  return GROUND_SHAPES.some((before) => {
    const step = family.successor(before)
    return step !== undefined && step.shape === here && shapeAt(col - step.dx, row - step.dy) === before
  })
}

/**
 * Every slope tile in exactly one run, runs ordered by `col`, then `row`. A run is as long as its line stays
 * straight: the tile after a `slope-up` is a `slope-up` one column right and one row up; a half slope goes in pairs,
 * `half-up-low` then `half-up-high` in one row, then the next pair one row up (and the mirror going down). A half tile
 * with no partner is a run of one tile.
 */
export function slopeRuns(ground: GroundGrid): SlopeRun[] {
  const shapeAt = shapesOf(ground)
  const runs: SlopeRun[] = []
  ground.rows.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const first = shapeAt(col, row)
      if (first === undefined) continue
      const family = FAMILIES.find((f) => f.successor(first) !== undefined)
      if (family === undefined || hasPrevious(family, shapeAt, col, row)) continue
      let tiles = 1
      let lowest = row
      let at = { x: col, y: row, shape: first }
      for (;;) {
        const step = family.successor(at.shape)
        if (step === undefined || shapeAt(at.x + step.dx, at.y + step.dy) !== step.shape) break
        at = { x: at.x + step.dx, y: at.y + step.dy, shape: step.shape }
        tiles++
        lowest = Math.max(lowest, at.y)
      }
      runs.push({ col, row: lowest, w: tiles, rise: tiles * family.climb, leftY: row + family.leftAt(first) })
    }
  })
  return runs.sort((a, b) => a.col - b.col || a.row - b.row || a.leftY - b.leftY || a.rise - b.rise)
}

/** Where the line of a run is at column `x` (a whole number from `col` to `col + w`), in tiles from the scene's top. */
export function lineAt(run: SlopeRun, x: number): number {
  return run.leftY - ((x - run.col) * run.rise) / run.w
}

/** The lowest edge of a run's triangle, in tiles from the scene's top: the level its foot stands on. */
export function runBottom(run: SlopeRun): number {
  return Math.max(run.leftY, run.leftY - run.rise)
}

/** The highest edge of a run's triangle. */
export function runTop(run: SlopeRun): number {
  return Math.min(run.leftY, run.leftY - run.rise)
}

/**
 * The tiles under a run's line, wholly inside its triangle, whatever they hold: the ground a slope stands on, which the
 * slope's own collider covers. Reading order, top row first.
 */
export function tilesUnder(run: SlopeRun): { col: number; row: number }[] {
  const inside: { col: number; row: number }[] = []
  for (let row = Math.floor(runTop(run)); row < Math.ceil(runBottom(run)); row++) {
    for (let col = run.col; col < run.col + run.w; col++) {
      // A tile is inside when its corner nearest the line is on or below it, and its bottom is above the foot.
      const nearest = lineAt(run, run.rise > 0 ? col : col + 1)
      if (row >= nearest && row + 1 <= runBottom(run)) inside.push({ col, row })
    }
  }
  return inside
}

/**
 * The tiles a run's triangle reaches into without holding whole, in the row its foot is half way down: a half slope
 * whose foot is a `high` tile ends half way down that tile, so the triangle's lowest half-row runs on under every
 * other tile of that row the line crosses. The foot tile itself is left out: the slope's own box (`groundColliders`)
 * covers the half under it. Empty when the foot is on a tile's edge, since `tilesUnder` asks for that row whole.
 */
function footRowTiles(run: SlopeRun): { col: number; row: number }[] {
  const bottom = runBottom(run)
  if (bottom % 1 === 0) return []
  const foot = run.rise > 0 ? run.col : run.col + run.w - 1
  const tiles: { col: number; row: number }[] = []
  for (let col = run.col; col < run.col + run.w; col++)
    if (col !== foot) tiles.push({ col, row: Math.floor(bottom) })
  return tiles
}

/**
 * The tiles under a run's line that are not `solid`: what a slope asks to be filled so a foot never catches between
 * two tiles, or so no ground is solid that nobody can see. Those wholly inside its triangle (`tilesUnder`, reading
 * order, top row first), then the tiles its half-high foot runs on over (`footRowTiles`), left to right.
 */
export function gapsUnder(ground: GroundGrid, run: SlopeRun): { col: number; row: number }[] {
  const shapeAt = shapesOf(ground)
  return [...tilesUnder(run), ...footRowTiles(run)].filter(({ col, row }) => shapeAt(col, row) !== 'solid')
}

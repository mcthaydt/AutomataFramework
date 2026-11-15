// The levels of the moves game, drawn as code so a reader sees the shapes: each is a grid of tiles, 1 tile a cell.
// y points down. Level 1 is built for the script in script.ts and level 2 for two heroes on one floor.

/** A grid `width` by `height` of `#` (a tile) and `.` (empty), a tile wherever `solid(x, y)` says so. */
function grid(width: number, height: number, solid: (x: number, y: number) => boolean): string[] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (solid(x, y) ? '#' : '.')).join(''),
  )
}

/** Where the floors are, so the script and the level agree: tile rows, which are also the y of each floor's top. */
export const START_FLOOR = 15
export const LOW_FLOOR = 17

/** The pit's first and last column; the air dash is the only way across. */
export const PIT = { from: 40, to: 44 } as const
/** The shaft: wall B, a doorway under it, then 3 tiles of air, then wall A. */
export const SHAFT = { b: { from: 52, to: 53 }, a: { from: 57, to: 58 } } as const

/**
 * Level 1, 64 by 20. From the left: a platform two tiles above the rest (the ledge); a floor with a crate on it; a long
 * floor to dash along; a pit five wide; a shaft of two walls three tiles apart, the left one with a doorway under it.
 */
export function levelOne(): string {
  const tiles = grid(64, 20, (x, y) => {
    if (x === 63) return true
    if (x < 12) return y >= START_FLOOR
    if (y < LOW_FLOOR) {
      const inB = x >= SHAFT.b.from && x <= SHAFT.b.to && y <= 14
      const inA = x >= SHAFT.a.from && x <= SHAFT.a.to
      return inB || inA
    }
    // The pit is two deep: its bottom row is the level's last.
    return !(x >= PIT.from && x <= PIT.to) || y === 19
  })
  return JSON.stringify({
    format: 1,
    id: 'level-1',
    tiles,
    things: [{ id: 'crate-1', character: 'crate', x: 24, y: LOW_FLOOR - 0.5 }],
    starts: [
      { player: 1, x: 2.5, y: START_FLOOR - 0.5 },
      { player: 2, x: 4.5, y: START_FLOOR - 0.5 },
    ],
  })
}

/** Level 2, 16 by 10: one floor, the two heroes three tiles apart. */
export function levelTwo(): string {
  const tiles = grid(16, 10, (x, y) => y >= 8 || x === 0 || x === 15)
  return JSON.stringify({
    format: 1,
    id: 'level-2',
    tiles,
    things: [],
    starts: [
      { player: 1, x: 5.5, y: 7.5 },
      { player: 2, x: 9.5, y: 7.5 },
    ],
  })
}

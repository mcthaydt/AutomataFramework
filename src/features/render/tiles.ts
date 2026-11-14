// Which square of its picture each tile of a level is drawn with. A pure function of the level and its tileset, so it is
// tested without a page and the stage only has to place what it says.
import type { Level, TilesetFile, TileWhen } from '../content/content.ts'

/** One tile to draw: where it is in the level and which square of the tileset's picture shows it. */
export interface PlacedTile {
  readonly col: number
  readonly row: number
  readonly frame: number
}

type Side = 'up' | 'down' | 'left' | 'right'
const SIDES: readonly Side[] = ['up', 'down', 'left', 'right']

/**
 * The squares of a level's tiles. A tile is drawn with the first picture of its kind whose `when` fits (and with the
 * kind's last picture when none does). A neighbour is `same` when it holds the same letter; one outside the level
 * counts as `same`, so the ground does not grow an edge where the level ends. `.` and a letter the tileset does not
 * have are not drawn.
 */
export function tilePictures(level: Level, tileset: TilesetFile): PlacedTile[] {
  const kinds = new Map(tileset.tiles.map((kind) => [kind.letter, kind]))
  const placed: PlacedTile[] = []
  level.tiles.forEach((text, row) => {
    for (let col = 0; col < text.length; col++) {
      const letter = text[col] as string
      const kind = kinds.get(letter)
      if (kind === undefined) continue
      const neighbour = (side: Side): 'same' | 'other' => {
        const dc = side === 'left' ? -1 : side === 'right' ? 1 : 0
        const dr = side === 'up' ? -1 : side === 'down' ? 1 : 0
        const there = level.tiles[row + dr]?.[col + dc]
        return there === undefined || there === letter ? 'same' : 'other'
      }
      const fits = (when: TileWhen | undefined): boolean =>
        when === undefined ||
        SIDES.every((side) => when[side] === undefined || when[side] === neighbour(side))
      const picture = kind.pictures.find((one) => fits(one.when)) ?? kind.pictures.at(-1)
      if (picture !== undefined) placed.push({ col, row, frame: picture.frame })
    }
  })
  return placed
}

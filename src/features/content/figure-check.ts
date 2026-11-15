// The checks of a rigged figure against other files (plan R, Task 2): the palette it names, and the colours it asks for
// in that palette. What needs nothing but the file is in `figure-rigged.ts`. Later tasks add the pieces, gait and stand
// it names, and the size of its sheet.
import type { RiggedFigure } from './figure-rigged.ts'
import { LIBRARY_PALETTE, type PaletteFile } from './palette.ts'
import { list, noSuch } from './shared.ts'
import type { Listed, Report } from './type-info.ts'

/**
 * The palette a figure is painted in: the game's own with that id, else the framework's. `undefined` when there is none
 * (said once, here) or the game's file did not read (its own file says why).
 */
function paletteOf(figure: RiggedFigure, game: Listed, report: Report): PaletteFile | undefined {
  if (figure.palette === undefined) return LIBRARY_PALETTE
  // The game's own file wins over the library's, as for every other library thing.
  if (game.has('palette', figure.palette)) return game.get('palette', figure.palette)
  if (figure.palette === LIBRARY_PALETTE.id) return LIBRARY_PALETTE
  const known = [...game.ids('palette'), LIBRARY_PALETTE.id]
  report('palette', noSuch('palette', figure.palette, known, 'This game and the framework'))
  return undefined
}

/** The checks of a rigged figure that look at other files: its palette is the game's or the framework's, and every colour it names is a ramp in that palette. */
export function checkRigged(figure: RiggedFigure, game: Listed, report: Report): void {
  const palette = paletteOf(figure, game, report)
  if (palette === undefined) return
  const known = palette.ramps.map((ramp) => ramp.id)
  const ask = (path: string, id: string | undefined): void => {
    if (id !== undefined && !known.includes(id))
      report(
        path,
        `There is no colour called "${id}" in the palette "${palette.id}". It has: ${list(known)}.`,
      )
  }
  ask('paints.skin', figure.paints.skin)
  ask('paints.hair', figure.paints.hair)
  ask('paints.eyes', figure.paints.eyes)
  figure.variants?.forEach((variant, i) => {
    ask(`variants[${i}].paints.skin`, variant.paints?.skin)
    ask(`variants[${i}].paints.hair`, variant.paints?.hair)
    ask(`variants[${i}].paints.eyes`, variant.paints?.eyes)
  })
}

// The poses a figure has, by name (plan R). A free figure lists its own. A rigged one has `idle-1` for now: its walks, runs
// and own poses come with the tasks that make them, and this one function is where they are counted, so a clip, a
// backdrop prop and the sheet all read the same list. It imports only the type of a figure, so the sheet, which a
// figure's checks need, may use it without a cycle.
import type { FigureFile } from './figure.ts'

/** The names of the poses a figure has, in the order of its sheet. */
export function posesOf(figure: FigureFile): readonly string[] {
  return figure.format === 2 ? ['idle-1'] : figure.poses.map((pose) => pose.id)
}

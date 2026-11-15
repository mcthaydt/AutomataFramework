// The places a game is saved in, as sentences a player can read: what each one holds, or why it cannot be opened, and
// what may be done with it. Pure over the saves feature: a test needs no page.
import type { Words } from '../../lib/message.ts'
import type { SaveProblem, SlotState } from '../saves/saves.ts'

/** What may be done with a place. */
export type SaveAction = 'continue' | 'new' | 'erase'

/** One place, as the saved games screen lists it. */
export interface SaveRow {
  readonly slot: number
  /** "Game 1": places are numbered from 1 for a player. */
  readonly name: string
  /** The level reached, "Empty", or why it cannot be opened. */
  readonly says: string
  /** Nothing is saved here: "New game here" writes at once, with no question. */
  readonly empty: boolean
  readonly can: readonly SaveAction[]
}

/** A refusal or a problem as one sentence in the player's words. */
export function saveSentence(problem: SaveProblem, words: Words): string {
  switch (problem.kind) {
    case 'refused':
      return problem.refusal === 'unavailable'
        ? words('automata.saves.refused.unavailable')
        : problem.refusal === 'full'
          ? words('automata.saves.refused.full')
          : words('automata.saves.refused.failed')
    case 'damaged':
      return words('automata.saves.damaged')
    case 'newer':
      return words('automata.saves.newer')
    case 'too-old':
      return words('automata.saves.too-old')
  }
}

/**
 * A row for each place, in order. A place that holds a game says the level it reached (the label it was saved with);
 * one that cannot be opened (damaged, newer or too old) says why, and can only be deleted.
 */
export function saveRows(slots: readonly SlotState[], words: Words): readonly SaveRow[] {
  return slots.map((state): SaveRow => {
    const name = words('automata.saves.place', { number: state.slot + 1 })
    if (state.kind === 'empty')
      return { slot: state.slot, name, says: words('automata.saves.empty'), empty: true, can: ['new'] }
    if (state.kind === 'ready')
      return {
        slot: state.slot,
        name,
        says: state.label ?? '',
        empty: false,
        can: ['continue', 'new', 'erase'],
      }
    return { slot: state.slot, name, says: saveSentence(state.problem, words), empty: false, can: ['erase'] }
  })
}

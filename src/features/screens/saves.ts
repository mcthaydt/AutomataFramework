// The saved games screen: each place, what it holds and what may be done with it. Starting a game over a used place and
// deleting one each ask first, because neither can be taken back; the place's own words decide nothing here.
import type { Component } from 'svelte'
import type { Words } from '../../lib/message.ts'
import type { SaveProblem, SlotState } from '../saves/saves.ts'
import SavesPart from './Saves.svelte'
import { type SaveAction, type SaveRow, saveRows, saveSentence } from './saves-rows.ts'
import type { Screen, ScreenBase } from './screens.ts'
import { show } from './show.ts'

/** One button of a place. */
export type SaveButton = {
  readonly id: string
  readonly label: string
  readonly kind: 'primary' | 'plain' | 'danger'
  readonly onpress: () => void
}

/** One place as the screen draws it. */
export type SavePlace = {
  readonly slot: number
  readonly name: string
  readonly says: string
  readonly buttons: readonly SaveButton[]
}

/** What the saved games screen draws. */
export type SavesProps = {
  readonly title: string
  readonly back: { readonly label: string; readonly onpress: () => void }
  /** Said in place of the places when the whole list was refused. */
  readonly refused?: string
  readonly places: readonly SavePlace[]
  /** The question before a place is written over or emptied, while it is asked. */
  readonly asking?: {
    readonly title: string
    readonly yes: string
    readonly no: string
    readonly onyes: () => void
    readonly onno: () => void
  }
}

const Part: Component<SavesProps> = SavesPart as never

/** The words of each button, written out so the check that every word is used can find them. */
const LABELS: Record<SaveAction, (words: Words) => string> = {
  continue: (words) => words('automata.saves.continue'),
  new: (words) => words('automata.saves.new'),
  erase: (words) => words('automata.saves.erase'),
}

/**
 * The saved games screen. `onContinue` opens a place that holds a game, `onNew` starts a new game in a place, and
 * `onErase` empties one; the last two are told only after the player has said yes where a game would be lost.
 */
export function savesScreen(
  options: ScreenBase & {
    /** The places, as `Saves.list` read them. */
    readonly slots: readonly SlotState[]
    /** Why the list could not be read, when it could not: said in place of the places. */
    readonly problem?: SaveProblem
    readonly onContinue: (slot: number) => void
    readonly onNew: (slot: number) => void
    readonly onErase: (slot: number) => void
    readonly onBack: () => void
  },
): Screen {
  const { slots, problem, onContinue, onNew, onErase } = options
  let asking: { readonly slot: number; readonly what: 'replace' | 'erase' } | undefined
  const ask = (next: typeof asking): void => {
    asking = next
    screen.update()
  }
  const screen = show(Part, { ...options, name: 'saves' }, (words): SavesProps => {
    // The one to press: the first game that can be opened, else the first place that can start one.
    const rows = saveRows(slots, words)
    const first =
      rows.find((row) => row.can.includes('continue')) ?? rows.find((row) => row.can.includes('new'))
    const press = (row: SaveRow, action: SaveAction): (() => void) => {
      if (action === 'continue') return () => onContinue(row.slot)
      if (action === 'erase') return () => ask({ slot: row.slot, what: 'erase' })
      // A place with nothing in it is written at once; one with a game in it asks first.
      return row.empty ? () => onNew(row.slot) : () => ask({ slot: row.slot, what: 'replace' })
    }
    const kindOf = (row: SaveRow, action: SaveAction): SaveButton['kind'] => {
      if (action === 'erase') return 'danger'
      return row === first && (action === 'continue' || !row.can.includes('continue')) ? 'primary' : 'plain'
    }
    const replacing = asking?.what === 'replace'
    return {
      title: words('automata.saves.title'),
      back: { label: words('automata.back'), onpress: options.onBack },
      ...(problem === undefined ? {} : { refused: saveSentence(problem, words) }),
      places: rows.map((row) => ({
        slot: row.slot,
        name: row.name,
        says: row.says,
        buttons: row.can.map((action) => ({
          id: action,
          label: LABELS[action](words),
          kind: kindOf(row, action),
          onpress: press(row, action),
        })),
      })),
      ...(asking === undefined
        ? {}
        : {
            asking: {
              title: replacing ? words('automata.saves.replace-ask') : words('automata.saves.erase-ask'),
              yes: replacing ? words('automata.saves.replace-yes') : words('automata.saves.erase-yes'),
              no: words('automata.keep'),
              onyes: () => {
                const { slot, what } = asking as NonNullable<typeof asking>
                asking = undefined
                if (what === 'replace') onNew(slot)
                else onErase(slot)
              },
              onno: () => ask(undefined),
            },
          }),
    }
  })
  return screen
}

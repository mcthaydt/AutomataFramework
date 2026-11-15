// The places a visit's progress is kept in: which saved game is being played, what it holds, and the reads and writes
// that follow. The flow asks; the screens show. A host that keeps nothing is not an error here: the visit goes on from
// memory, and the sentence that says so is the caller's.
import type { Words } from '../../lib/message.ts'
import type { GameContent } from '../content/content.ts'
import { levelOrder } from '../content/content.ts'
import type { SaveProblem, SaveResult, Saves, SlotState, StoreResult } from '../saves/saves.ts'
import { type FlowSave, firstEmpty, newest, type Progress, progressLabel, reached } from './progress.ts'

/** What the places need from the flow: the saves (once there are any), the game's save, its project and the words. */
export interface PlacesContext<S extends Progress> {
  readonly saves: () => Saves<S> | undefined
  readonly save: FlowSave<S>
  readonly project: () => GameContent['project']
  readonly words: Words
}

/** The saved games of a visit. */
export interface Places<S extends Progress> {
  /** The places as last read. */
  slots(): readonly SlotState[]
  /** The saved game being played: `undefined` on the main menu. */
  progress(): S | undefined
  /** The place it is kept in: `undefined` when there is none to keep it in. */
  slot(): number | undefined
  /** Why the places could not be read, when they could not. */
  problem(): SaveProblem | undefined
  /** Every place holds something, so a new game needs one to be written over: the player picks which. */
  full(): boolean
  /** Reads the places again. A host that will not say leaves none. */
  refresh(): Promise<void>
  /** Starts a new game in `place` (replacing what is there), or in the first empty one. */
  begin(place?: number): Promise<void>
  /** Opens the saved game in `place` and answers the level to play; a place with nothing opens a new game. */
  open(place: number): Promise<string>
  /** Opens the newest saved game, as `open`; with none, a new game. */
  openNewest(): Promise<string>
  /** The level the newest saved game would open, read without opening it; `undefined` when there is none. */
  newestLevel(): Promise<string | undefined>
  /** Writes that the player has reached `level`; the problem, as the sentence the player is told, if it was not kept. */
  reach(level: string, notKept: string): Promise<string | undefined>
  /** Replaces what the saved game holds (the game's own data), and keeps it. */
  keep(data: S): Promise<SaveResult>
  /** Empties a place. */
  erase(place: number): Promise<StoreResult<void>>
  /** Back on the main menu: no saved game is being played. */
  forget(): void
}

export function createPlaces<S extends Progress>(context: PlacesContext<S>): Places<S> {
  const { save, words } = context
  let slots: readonly SlotState[] = []
  let progress: S | undefined
  let slot: number | undefined
  let unread: SaveProblem | undefined

  async function refresh(): Promise<void> {
    const listed = await context.saves()?.list()
    slots = listed?.ok ? listed.value : []
    unread =
      listed === undefined || listed.ok
        ? undefined
        : { kind: 'refused', refusal: listed.refusal, detail: listed.detail }
  }

  async function begin(place?: number): Promise<void> {
    const start = context.project().start
    progress = save.fresh(start)
    slot = place ?? firstEmpty(slots)
    const saves = context.saves()
    if (slot !== undefined && saves !== undefined)
      await saves.save(slot, progress, { label: progressLabel(words, start), replace: place !== undefined })
  }

  async function open(place: number): Promise<string> {
    const project = context.project()
    const loaded = await context.saves()?.load(place)
    if (loaded === undefined || !loaded.ok || loaded.data === null) {
      await begin(place)
      return project.start
    }
    progress = loaded.data
    slot = place
    // A level the game no longer has opens the first.
    return levelOrder(project).includes(loaded.data.level) ? loaded.data.level : project.start
  }

  return {
    slots: () => slots,
    problem: () => unread,
    full: () => slots.length > 0 && firstEmpty(slots) === undefined,
    progress: () => progress,
    slot: () => slot,
    refresh,
    begin,
    open,
    async openNewest() {
      const at = newest(slots)
      if (at === undefined) {
        await begin()
        return context.project().start
      }
      return open(at)
    },
    async newestLevel() {
      const at = newest(slots)
      if (at === undefined) return undefined
      const loaded = await context.saves()?.load(at)
      if (loaded === undefined || !loaded.ok || loaded.data === null) return undefined
      const project = context.project()
      return levelOrder(project).includes(loaded.data.level) ? loaded.data.level : project.start
    },
    async reach(level, notKept) {
      if (progress === undefined) return undefined
      progress = reached(progress, level, levelOrder(context.project()))
      const saves = context.saves()
      if (slot === undefined || saves === undefined) return notKept
      const written = await saves.save(slot, progress, { label: progressLabel(words, level) })
      return written.ok ? undefined : notKept
    },
    async keep(data) {
      progress = data
      const saves = context.saves()
      if (slot === undefined || saves === undefined)
        return {
          ok: false,
          problem: { kind: 'refused', refusal: 'unavailable', detail: 'There is no place to keep it.' },
        }
      return saves.save(slot, data)
    },
    erase(place) {
      const saves = context.saves()
      if (saves === undefined) {
        const none: StoreResult<void> = {
          ok: false,
          refusal: 'unavailable',
          detail: 'There is no place to keep it.',
        }
        return Promise.resolve(none)
      }
      return saves.erase(place)
    },
    forget() {
      progress = undefined
      slot = undefined
    },
  }
}

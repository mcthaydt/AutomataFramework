// The places a visit's progress is kept in: which saved game is being played, what it holds, and the reads and writes
// that follow. The flow asks; the screens show. A host that keeps nothing is not an error here: the visit goes on from
// memory, and the sentence that says so is the caller's.
import type { Words } from '../../lib/message.ts'
import type { GameContent } from '../content/content.ts'
import { levelOrder } from '../content/content.ts'
import type { Arrive } from '../level/level.ts'
import type { SaveProblem, SaveResult, Saves, SlotState, StoreResult } from '../saves/saves.ts'
import {
  cameIn,
  continueAt,
  type FlowSave,
  firstEmpty,
  type Last,
  newest,
  type Progress,
  progressLabel,
  reached,
  remembered,
} from './progress.ts'

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
  /** Where the heroes come in on the level `open` and `openNewest` answered: where the player left off, if anywhere. */
  arrive(): Arrive | undefined
  /** Writes where the player was last and how they came into it. Not keeping it does not stop the visit. */
  cameIn(last: Last): Promise<void>
  /** Writes what was done for good. Not keeping it does not stop the visit. */
  remember(fact: string): Promise<void>
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
  /** Empties every place, one that is damaged too. Answers how many could not be emptied. */
  eraseAll(): Promise<number>
  /** Back on the main menu: no saved game is being played. */
  forget(): void
}

export function createPlaces<S extends Progress>(context: PlacesContext<S>): Places<S> {
  const { save, words } = context
  let slots: readonly SlotState[] = []
  let progress: S | undefined
  let slot: number | undefined
  let arrive: Arrive | undefined
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
    arrive = undefined
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
    // Where the player left off, when the game still has that level; else the level reached, else the first.
    const at = continueAt(loaded.data, levelOrder(project), project.start)
    arrive = at.arrive
    return at.level
  }

  /** Keeps `progress` as it is now, when there is a place to keep it in; a host that will not is not an error. */
  async function write(): Promise<void> {
    const saves = context.saves()
    if (progress !== undefined && slot !== undefined && saves !== undefined) await saves.save(slot, progress)
  }

  function erase(place: number): Promise<StoreResult<void>> {
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
  }

  return {
    slots: () => slots,
    problem: () => unread,
    full: () => slots.length > 0 && firstEmpty(slots) === undefined,
    progress: () => progress,
    slot: () => slot,
    arrive: () => arrive,
    async cameIn(last) {
      if (progress === undefined) return
      const was = progress
      progress = cameIn(progress, last)
      if (progress !== was) await write()
    },
    async remember(fact) {
      if (progress === undefined) return
      const was = progress
      progress = remembered(progress, fact)
      if (progress !== was) await write()
    },
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
      return continueAt(loaded.data, levelOrder(project), project.start).level
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
    erase,
    async eraseAll() {
      await refresh()
      let failed = 0
      for (let place = 0; place < slots.length; place++) {
        const done = await erase(place)
        if (!done.ok) failed += 1
      }
      await refresh()
      return failed
    },
    forget() {
      progress = undefined
      slot = undefined
      arrive = undefined
    },
  }
}

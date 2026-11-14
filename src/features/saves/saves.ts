// The saves feature's entry: progress in save slots and the game's settings in one record, written through the
// storage port a host provides. Headless: it runs in Node, with no page.

export { defineSave, type SaveDef, type SaveProblem } from './define.ts'
export {
  type MemoryStore,
  memoryStore,
  type SaveStore,
  type StoreRefusal,
  type StoreResult,
} from './store.ts'

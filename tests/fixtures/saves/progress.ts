// The fixture game's save, used by every test of saves and by the journey: version 1 stored `{ level }`; version 2
// adds how many doors the player has been through.
import { z } from 'zod'
import { defineSave, type SaveDef } from '#src/features/saves/saves.ts'

/** What the fixture game keeps in a slot. */
export interface Progress {
  readonly level: string
  readonly doors: number
}

export const progress: SaveDef<Progress> = defineSave({
  game: 'fixture-game',
  version: 2,
  slots: 3,
  schema: z.strictObject({ level: z.string(), doors: z.number().int().min(0) }),
  upgrades: { 1: (data: unknown): unknown => ({ ...(data as { level: string }), doors: 0 }) },
})

// The fixture game's save, used by every test of saves and by the journey: version 1 stored `{ level }`; version 2
// adds how many doors the player has been through.
import { z } from 'zod'
import { defineSave } from '#src/features/saves/saves.ts'

export const progress = defineSave({
  game: 'fixture-game',
  version: 2,
  slots: 3,
  schema: z.strictObject({ level: z.string(), doors: z.number().int().min(0) }),
  upgrades: { 1: (data) => ({ ...(data as { level: string }), doors: 0 }) },
})

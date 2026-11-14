// Content for the audio tests: the full game with cue lists and sounds a test chooses.
import { type Cue, type GameContent, loadGame, type SoundFile } from '#src/features/content/content.ts'
import type { SimEvent } from '#src/features/sim/sim.ts'
import { readFullGame } from '../full-game/read.ts'

/** The full game, loaded. */
export async function loadFull(): Promise<GameContent> {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error(loaded.diagnostics.map((d) => d.message).join('\n'))
  return loaded.value
}

/**
 * The full game with its cue lists replaced by one list holding `cues`, and `sounds` added to its own two. Built by
 * hand, so a cue may name a sound or a track the game does not have.
 */
export async function contentWithCues(
  cues: readonly Cue[],
  sounds: readonly SoundFile[] = [],
): Promise<GameContent> {
  const full = await loadFull()
  return {
    ...full,
    sounds: { ...full.sounds, ...Object.fromEntries(sounds.map((sound) => [sound.id, sound])) },
    cues: { cues: { format: 1, id: 'cues', cues } },
  }
}

/** `count` sounds `beep-1` to `beep-<count>`, each one 0.1 s sine voice, for the limit on sounds in all. */
export function beeps(count: number): SoundFile[] {
  return Array.from({ length: count }, (_, i) => ({
    format: 1,
    id: `beep-${i + 1}`,
    volume: 1,
    voices: [{ kind: 'tone', wave: 'sine', from: 440, to: 440, at: 0, length: 0.1, volume: 1 }],
  }))
}

/** `count` `{ type, payload: {} }` events, for a step's `events`. */
export function events(type: string, count = 1): SimEvent[] {
  return Array.from({ length: count }, () => ({ type, payload: {} }))
}

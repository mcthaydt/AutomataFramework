import type { SoundVoice } from '../content/content.ts'

/** Where a voice plays: sound effects or the music. Each has its own volume. */
export type Bus = 'sound' | 'music'

/**
 * 'waiting': nothing can be heard until the player taps or presses a key. 'on': voices are heard. 'unavailable': this
 * device has no sound at all.
 */
export type SpeakerState = 'waiting' | 'on' | 'unavailable'

/**
 * What audio plays through. Every way of making sound is one of these; nothing else makes a noise. The page's speaker
 * (`webSpeaker`) uses Web Audio and `testSpeaker` remembers what it was given, so the whole feature runs in Node.
 */
export interface Speaker {
  state(): SpeakerState
  /** Called on every change of state. Returns a function that stops listening. */
  onState(listener: (state: SpeakerState) => void): () => void
  /** Seconds on the speaker's own clock. It stands still while the state is not 'on' and while the speaker sleeps. */
  now(): number
  /** Called several times a second while the speaker is on and awake, so music can be handed over a little ahead. */
  onClock(listener: () => void): () => void
  /** Plays one voice on a bus. `voice.at` counts from `when` (speaker seconds). Does nothing unless the state is 'on'. */
  play(bus: Bus, voice: SoundVoice, when: number): void
  /** A bus's volume as the player set it, 0 to 1. Kept while waiting, so it is right when sound starts. */
  volume(bus: Bus, value: number): void
  /** Fades out everything on a bus, voices handed over for later included. */
  cut(bus: Bus): void
  /** Lets go of everything. Safe to call twice. */
  close(): void
}

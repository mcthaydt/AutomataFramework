// A sound as the voices a speaker plays. A sound's motif voice is a tune, so it becomes the tones of its notes; a tone,
// a hiss and a recording pass through. A cue and an editor's Play button both go through here, so they sound the same.
import type { SoundFile } from '../content/content.ts'
import { instrumentVoices } from './instruments.ts'
import { motifNotes, type SongParts, TICKS_PER_BEAT } from './plain-notes.ts'
import type { Bus, Speaker, SpeakerVoice } from './speaker.ts'

/**
 * A sound's voices as a speaker plays them: each motif voice becomes its notes' voices, and each volume is times the
 * sound's. Throws an `Error` in plain words for a motif the parts do not have.
 */
export function soundVoices(sound: SoundFile, parts: SongParts): SpeakerVoice[] {
  const voices: SpeakerVoice[] = []
  for (const voice of sound.voices) {
    const volume = voice.volume * sound.volume
    if (voice.kind !== 'motif') {
      voices.push({ ...voice, volume })
      continue
    }
    const motif = parts.motifs?.[voice.motif]
    if (motif === undefined)
      throw new Error(
        `The sound "${sound.id}" uses a motif called "${voice.motif}", which this game does not have.`,
      )
    const notes = motifNotes(motif, {
      key: voice.key,
      mode: voice.mode ?? 'major',
      instrument: voice.instrument,
      volume,
      shift: voice.shift,
      speed: voice.speed,
      backwards: voice.backwards,
    })
    for (const note of notes) {
      // Seconds from ticks, once, the same in every engine.
      const start = voice.at + (note.at * 60) / (voice.tempo * TICKS_PER_BEAT)
      for (const part of instrumentVoices(note, voice.tempo)) voices.push({ ...part, at: start + part.at })
    }
  }
  return voices
}

/** Seconds until the sound's last voice ends. */
export function soundSeconds(sound: SoundFile, parts: SongParts): number {
  let end = 0
  for (const voice of soundVoices(sound, parts)) end = Math.max(end, voice.at + voice.length)
  return end
}

/**
 * Plays a sound once, now, on a bus: every voice of `soundVoices`, handed to the speaker. What `createAudio` does for a
 * cue, and what an editor does for a Play button. Does nothing unless the speaker is on.
 */
export function playSound(speaker: Speaker, bus: Bus, sound: SoundFile, parts: SongParts): void {
  if (speaker.state() !== 'on') return
  const when = speaker.now()
  for (const voice of soundVoices(sound, parts)) speaker.play(bus, voice, when)
}

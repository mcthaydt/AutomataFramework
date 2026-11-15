import type { ArrangedMusic, MusicFile } from '../content/content.ts'
import { instrumentVoices } from './instruments.ts'
import { hertzOf } from './notes.ts'
import { notesOf, type SongParts, TICKS_PER_BAR, TICKS_PER_BEAT } from './plain-notes.ts'
import type { SpeakerVoice } from './speaker.ts'

/** One note of a track, timed. */
export interface ScoreNote {
  readonly part: string
  /** Seconds from the track's start. */
  readonly at: number
  /** What a speaker plays: `at` is 0 and `volume` is the part's times the track's. */
  readonly voice: SpeakerVoice
}

/** A track as timed notes, in the order they start. */
export interface Score {
  readonly id: string
  /** How long one pass lasts. */
  readonly seconds: number
  readonly loop: boolean
  readonly notes: readonly ScoreNote[]
}

/**
 * A format 2 track as timed notes: each plain note is the voices of its instrument, at the seconds its ticks come to.
 * Throws an `Error` in plain words for a loop or motif the parts do not have.
 */
function songScore(music: ArrangedMusic, parts: SongParts): Score {
  const seconds = (ticks: number): number => (ticks * 60) / (music.tempo * TICKS_PER_BEAT)
  const notes: ScoreNote[] = []
  for (const note of notesOf(music, parts))
    for (const voice of instrumentVoices(note, music.tempo))
      notes.push({ part: note.lane, at: seconds(note.at), voice })
  return { id: music.id, seconds: seconds(music.bars * TICKS_PER_BAR), loop: music.loop, notes }
}

/** A drum hit is always a short hiss, however long its step is. */
const HIT_PITCH = 150
const HIT_LENGTH = 0.1

/** The steps of a part: its rows joined, so a hold carries on across the end of a row. */
const stepsOf = (rows: readonly string[]): string[] =>
  rows.flatMap((row) => (row === '' ? [] : row.split(' ')))

/**
 * A music file as timed notes. One step lasts `60 / (tempo * stepsPerBeat)` seconds. A note lasts its step and one
 * more for each `=` after it; `-` is a rest, and so is an `=` with nothing to hold (at the start of a part, or after a
 * rest), since a hold never wraps round from the end of the track. Notes are in the order they start, and those that
 * start together are in the parts' order.
 */
export function scoreOf(music: MusicFile, parts: SongParts = {}): Score {
  if (music.format === 2) return songScore(music, parts)
  const stepSeconds = 60 / (music.tempo * music.stepsPerBeat)
  const notes: ScoreNote[] = []
  let count = 0
  for (const [index, part] of music.parts.entries()) {
    const steps = stepsOf(part.notes)
    if (index === 0) count = steps.length
    const volume = part.volume * music.volume
    // The note being held: where it started and how many steps it has so far.
    let held: { start: number; hertz: number; steps: number } | undefined
    const flush = (): void => {
      if (held === undefined || part.kind !== 'tone') return
      notes.push({
        part: part.id,
        at: held.start * stepSeconds,
        voice: {
          kind: 'tone',
          wave: part.wave,
          from: held.hertz,
          to: held.hertz,
          at: 0,
          length: held.steps * stepSeconds,
          volume,
        },
      })
      held = undefined
    }
    steps.forEach((step, i) => {
      if (part.kind === 'drums') {
        if (step === 'x')
          notes.push({
            part: part.id,
            at: i * stepSeconds,
            voice: { kind: 'noise', pitch: HIT_PITCH, at: 0, length: HIT_LENGTH, volume },
          })
        return
      }
      if (step === '=') {
        if (held !== undefined) held.steps++
        return
      }
      flush()
      const hertz = hertzOf(step)
      if (hertz !== undefined) held = { start: i, hertz, steps: 1 }
    })
    flush()
  }
  // Each part's notes are already in order and the sort is stable, so ties stay in the parts' order.
  notes.sort((a, b) => a.at - b.at)
  return { id: music.id, seconds: count * stepSeconds, loop: music.loop, notes }
}

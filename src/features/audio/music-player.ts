import type { MusicFile } from '../content/content.ts'
import type { SongParts } from './plain-notes.ts'
import { type Score, scoreOf } from './score.ts'
import type { Speaker } from './speaker.ts'

/** Seconds between wanting a track and its first note, so the first note is not already late when it is handed over. */
const LEAD = 0.05
/** How far ahead of the clock notes are handed over, so a slow frame cannot leave a gap in the music. */
const AHEAD = 0.3

export interface MusicPlayer {
  /**
   * The track to be hearing. The track already wanted is left playing; another replaces it. `from` is how many seconds
   * into the track to begin (held inside the track; default 0): only the notes from there on are handed over, each
   * that much sooner.
   */
  want(music: MusicFile, from?: number): void
  /** Fades the music out and wants none. */
  stop(): void
  /** The id of the track wanted, playing or waiting for the speaker. */
  wanted(): string | undefined
  /** Stops listening to the speaker. */
  close(): void
}

/** The track being played and how far its notes have been handed over. */
interface Playing {
  readonly score: Score
  /** Seconds into the track it began at: the first pass is that much shorter. */
  readonly from: number
  /** Speaker seconds the track began at; undefined while the speaker is not on and it has not begun. */
  start: number | undefined
  /** Which time through a looping track the next note is in. */
  pass: number
  /** The next note, of that pass, to hand over. */
  next: number
}

/**
 * Plays one track at a time on a speaker. It hands the speaker notes a little ahead of its clock (`AHEAD`) every time
 * the clock ticks, and drops a note whose time has already gone by instead of playing it late, so a stalled page comes
 * back to where the clock is with no burst of missed notes. While the speaker is not on, the track is wanted but does
 * not begin: it begins, from its first note, when the speaker turns on.
 */
export function createMusicPlayer(speaker: Speaker, parts: SongParts = {}): MusicPlayer {
  let playing: Playing | undefined

  /** Hands over every note now inside the window, and lets go of a track that has ended. */
  const handOver = (): void => {
    if (playing === undefined || speaker.state() !== 'on') return
    const track = playing
    const now = speaker.now()
    if (track.start === undefined) track.start = now + LEAD
    const { notes, seconds, loop } = track.score
    if (notes.length > 0) {
      for (;;) {
        const note = notes[track.next]
        if (note === undefined) {
          // The end of a pass: a looping track goes round again, any other has handed over everything.
          if (!loop) break
          track.pass++
          track.next = 0
          continue
        }
        const time = track.start + track.pass * seconds + note.at - track.from
        if (time >= now + AHEAD) break
        if (time >= now) speaker.play('music', note.voice, time)
        track.next++
      }
    }
    if (!loop && track.next >= notes.length && now >= track.start + seconds - track.from) playing = undefined
  }

  const offClock = speaker.onClock(handOver)
  const offState = speaker.onState(handOver)

  return {
    want(music, from = 0) {
      if (playing?.score.id === music.id) return
      if (playing !== undefined) speaker.cut('music')
      const score = scoreOf(music, parts)
      const begin = Math.min(Math.max(from, 0), score.seconds)
      // The notes before `begin` are not handed over: the track starts at the first one from there on.
      const next = score.notes.findIndex((note) => note.at >= begin)
      playing = { score, from: begin, start: undefined, pass: 0, next: next === -1 ? score.notes.length : next }
      handOver()
    },
    stop() {
      speaker.cut('music')
      playing = undefined
    },
    wanted: () => playing?.score.id,
    close() {
      offClock()
      offState()
    },
  }
}

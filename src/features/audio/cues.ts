import type { GameContent, MusicFile, SoundFile } from '../content/content.ts'

/** What to do for one event, in the order to do it. */
export type CueAction =
  | { readonly do: 'sound'; readonly sound: SoundFile; readonly ticks: number }
  | { readonly do: 'music'; readonly music: MusicFile }
  | { readonly do: 'stop-music' }

/** One thing a cue asked for. `skipped` is there only when it was not played. */
export interface CueLogEntry {
  /** The tick of the step it was heard in; for a page event, the last tick heard. */
  readonly tick: number
  /** 'sim': an event from a step. 'page': an event raised outside the sim (a level starting, a menu). */
  readonly from: 'sim' | 'page'
  readonly on: string
  readonly do: 'sound' | 'music' | 'stop-music'
  /** The sound's or track's id; left out for 'stop-music'. */
  readonly id?: string
  /** 'busy': too many sounds were already playing (see the limits). */
  readonly skipped?: 'busy'
}

/** At most this many of one sound at once, and this many sounds in all. Counted in ticks, so it is the same everywhere. */
export const MAX_SAME = 4
export const MAX_SOUNDS = 16
/** The cue log keeps the newest this many entries. */
export const LOG_MAX = 1024

/**
 * How many ticks a sound lasts: until its last voice ends, rounded up. The `1e-9` keeps a sum like `0.1 + 0.2`
 * (0.30000000000000004) at the 18 ticks its author meant, not 19; the number is the same in every engine either way.
 */
function soundTicks(sound: SoundFile, tickHz: number): number {
  const end = Math.max(...sound.voices.map((voice) => voice.at + voice.length))
  return Math.ceil(end * tickHz - 1e-9)
}

/**
 * Every cue list of the game as one table, by event name: cue lists in id order, each list in its own order. Throws,
 * in plain words, for a sound or a track that is not in the content (content built by hand can name one that is not;
 * `loadGame` never gives such content).
 */
export function cueTable(content: GameContent, tickHz: number): ReadonlyMap<string, readonly CueAction[]> {
  const table = new Map<string, CueAction[]>()
  for (const id of Object.keys(content.cues ?? {}).sort()) {
    for (const cue of content.cues?.[id]?.cues ?? []) {
      let action: CueAction
      if (cue.do === 'sound') {
        const sound = content.sounds?.[cue.sound]
        if (sound === undefined)
          throw new Error(
            `The cue for "${cue.on}" names a sound called "${cue.sound}", which this game does not have.`,
          )
        action = { do: 'sound', sound, ticks: soundTicks(sound, tickHz) }
      } else if (cue.do === 'music') {
        const music = content.music?.[cue.music]
        if (music === undefined)
          throw new Error(
            `The cue for "${cue.on}" names a track called "${cue.music}", which this game does not have.`,
          )
        action = { do: 'music', music }
      } else action = { do: 'stop-music' }
      const list = table.get(cue.on)
      if (list === undefined) table.set(cue.on, [action])
      else list.push(action)
    }
  }
  return table
}

/** The cue log: what the cues asked for, oldest first, the newest `LOG_MAX` kept. */
export interface CueLog {
  add(entry: CueLogEntry): void
  /** A copy. */
  entries(): readonly CueLogEntry[]
}

export function createCueLog(): CueLog {
  const entries: CueLogEntry[] = []
  return {
    add(entry) {
      entries.push(entry)
      if (entries.length > LOG_MAX) entries.splice(0, entries.length - LOG_MAX)
    },
    entries: () => [...entries],
  }
}

/**
 * The limits on sounds from the sim, kept in ticks and never from the speaker, so the log is the same in every engine
 * and whenever the player tapped. A sound lasts from the tick it started for `ticks` ticks.
 */
export interface Limiter {
  /** A new sim is about to be heard: nothing is playing. */
  reset(): void
  /** Counts a sound starting at `tick` if it may; false, and not counted, when it is over a limit. */
  admit(id: string, tick: number, ticks: number): boolean
}

export function createLimiter(): Limiter {
  /** What is still playing: a sound and the tick it is over. */
  let playing: { readonly id: string; readonly until: number }[] = []
  let tickOf = -1
  let startedNow = new Set<string>()
  return {
    reset() {
      playing = []
      tickOf = -1
      startedNow = new Set()
    },
    admit(id, tick, ticks) {
      if (tick !== tickOf) {
        tickOf = tick
        startedNow = new Set()
      }
      playing = playing.filter((p) => p.until > tick)
      if (startedNow.has(id)) return false
      if (playing.filter((p) => p.id === id).length >= MAX_SAME) return false
      if (playing.length >= MAX_SOUNDS) return false
      startedNow.add(id)
      playing.push({ id, until: tick + ticks })
      return true
    },
  }
}

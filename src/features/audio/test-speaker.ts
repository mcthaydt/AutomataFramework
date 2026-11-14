import type { SoundVoice } from '../content/content.ts'
import type { Bus, Speaker, SpeakerState } from './speaker.ts'

/** One voice a speaker was given, as the test speaker remembers it. */
export interface PlayedVoice {
  readonly bus: Bus
  readonly voice: SoundVoice
  readonly when: number
}

/** A speaker that makes no sound and remembers everything, for Node and for tests. */
export interface TestSpeaker extends Speaker {
  /** The first tap: 'waiting' becomes 'on'. Nothing happens when unavailable. */
  tap(): void
  /** 'on' becomes 'waiting', as when a phone call takes the sound away. */
  interrupt(): void
  /** Moves the clock on (only while 'on'), then calls the clock listeners once. */
  advance(seconds: number): void
  /** Every voice it was given while on, in order. */
  readonly played: readonly PlayedVoice[]
  /** Every `cut`, in order. */
  readonly cuts: readonly Bus[]
  /** The last volume given for each bus; 1 until told. */
  readonly levels: Readonly<Record<Bus, number>>
  readonly closed: boolean
}

/**
 * A speaker for Node and for tests: it starts `waiting` (or as asked), turns on at `tap()`, and its clock moves only
 * when a test calls `advance`, so a test moves time by hand.
 */
export function testSpeaker(options: { readonly state?: SpeakerState } = {}): TestSpeaker {
  let state: SpeakerState = options.state ?? 'waiting'
  let time = 0
  let closed = false
  const stateListeners = new Set<(state: SpeakerState) => void>()
  const clockListeners = new Set<() => void>()
  const played: PlayedVoice[] = []
  const cuts: Bus[] = []
  const levels: Record<Bus, number> = { sound: 1, music: 1 }

  const change = (next: SpeakerState): void => {
    if (state === next) return
    state = next
    for (const listener of [...stateListeners]) listener(next)
  }
  /** Adds a listener to a set and gives back the function that removes it. */
  const listen = <T>(set: Set<T>, listener: T): (() => void) => {
    set.add(listener)
    return () => {
      set.delete(listener)
    }
  }

  return {
    state: () => state,
    onState: (listener) => listen(stateListeners, listener),
    now: () => time,
    onClock: (listener) => listen(clockListeners, listener),
    play(bus, voice, when) {
      if (state === 'on') played.push({ bus, voice, when })
    },
    volume(bus, value) {
      levels[bus] = value
    },
    cut(bus) {
      cuts.push(bus)
    },
    close() {
      closed = true
      stateListeners.clear()
      clockListeners.clear()
    },
    tap() {
      if (state === 'waiting') change('on')
    },
    interrupt() {
      if (state === 'on') change('waiting')
    },
    advance(seconds) {
      if (state !== 'on') return
      time += seconds
      for (const listener of [...clockListeners]) listener()
    },
    get played() {
      return played
    },
    get cuts() {
      return cuts
    },
    get levels() {
      return { ...levels }
    },
    get closed() {
      return closed
    },
  }
}

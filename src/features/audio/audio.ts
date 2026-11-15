// The audio feature's entry: what a game sounds like, played when the sim's events say so. It is handed a step's events
// and never the sim, so it has nothing to change; it plays through a `Speaker`, which a page makes with Web Audio
// (`webSpeaker`, in the web feature) and a test makes with `testSpeaker`.
import type { GameContent, SoundVoice } from '../content/content.ts'
import type { SimEvent } from '../sim/sim.ts'
import { type CueAction, type CueLogEntry, createCueLog, createLimiter, cueTable } from './cues.ts'
import { createMusicPlayer } from './music-player.ts'
import { SOUND_SETTINGS_DEFAULT, type SoundSettings } from './settings.ts'
import type { Bus, Speaker, SpeakerState } from './speaker.ts'

export { type CueLogEntry, LOG_MAX, MAX_SAME, MAX_SOUNDS } from './cues.ts'
export { hertzOf } from './notes.ts'
export { type Score, type ScoreNote, scoreOf } from './score.ts'
export { SOUND_SETTINGS_DEFAULT, type SoundSettings, SoundSettingsSchema } from './settings.ts'
export type { Bus, Speaker, SpeakerState } from './speaker.ts'
export { type PlayedVoice, type TestSpeaker, testSpeaker } from './test-speaker.ts'

export interface GameAudio {
  /** True when the game has no cue at all: there is nothing to play and nothing to tell the player. */
  readonly silent: boolean
  /** A new sim is about to be heard: forgets the last tick and which sounds are still playing. Music carries on. */
  begin(): void
  /** Answers one step's events. A step whose tick was already heard is ignored. */
  hear(result: { readonly tick: number; readonly events: readonly SimEvent[] }): void
  /** Answers an event from outside the sim, by name. A name no cue answers does nothing. */
  raise(event: string): void
  /** What the cues asked for, oldest first. A copy. */
  log(): readonly CueLogEntry[]
  /** The track wanted now, playing or waiting for the first tap; `undefined` for none. */
  music(): string | undefined
  volumes(): SoundSettings
  /** Throws a `RangeError` in plain words for a volume that is not a number from 0 to 1. */
  setVolumes(volumes: SoundSettings): void
  /** A short tone on one bus, so a player hears the volume they just set. Not a cue, so not in the log. */
  sample(bus: Bus): void
  state(): SpeakerState
  onState(listener: (state: SpeakerState) => void): () => void
  /** Stops the music and fades every sound. Cues go on being answered. */
  stop(): void
  /** `stop`, and stops listening to the speaker. The speaker is closed by whoever made it. Safe to call twice. */
  close(): void
}

/** What a slider plays when it is let go: a short tone at a pitch that is easy on the ear. */
const SAMPLE: SoundVoice = {
  kind: 'tone',
  wave: 'sine',
  from: 660,
  to: 660,
  at: 0,
  length: 0.12,
  volume: 0.4,
}

/**
 * The audio a game plays: the cues in its content, answered through `speaker`. Throws an `Error` in plain words when a
 * cue names a sound or a track the content does not have.
 */
export function createAudio(options: {
  readonly content: GameContent
  readonly speaker: Speaker
  /** Ticks a second, for counting how long a sound lasts. Default 60. */
  readonly tickHz?: number
}): GameAudio {
  const { speaker } = options
  const table = cueTable(options.content, options.tickHz ?? 60)
  const log = createCueLog()
  const limiter = createLimiter()
  const player = createMusicPlayer(speaker)
  /** What `onState` gave out, so `close` can take them all back. */
  const listening = new Set<() => void>()
  let volumes: SoundSettings = SOUND_SETTINGS_DEFAULT
  let closed = false
  speaker.volume('music', volumes.music)
  speaker.volume('sound', volumes.sound)
  /** The last tick heard since `begin`; undefined before any. */
  let heard: number | undefined

  /** Does one action of a cue. `last` is whether it is the last change to the music that its event asked for. */
  const run = (action: CueAction, on: string, tick: number, from: 'sim' | 'page', last: boolean): void => {
    if (action.do === 'sound') {
      const entry = { tick, from, on, do: 'sound', id: action.sound.id } as const
      if (from === 'sim' && !limiter.admit(action.sound.id, tick, action.ticks)) {
        log.add({ ...entry, skipped: 'busy' })
        return
      }
      log.add(entry)
      // A sound asked for while nothing can be heard is logged and not played, and is not played late.
      if (speaker.state() !== 'on') return
      for (const voice of action.sound.voices)
        speaker.play('sound', { ...voice, volume: voice.volume * action.sound.volume }, speaker.now())
      return
    }
    log.add(
      action.do === 'music'
        ? { tick, from, on, do: 'music', id: action.music.id }
        : { tick, from, on, do: 'stop-music' },
    )
    if (!last) return
    if (action.do === 'music') player.want(action.music)
    else player.stop()
  }

  /** Does what the cues for `on` say. A page event is not limited, and its sounds are not counted. */
  const answer = (on: string, tick: number, from: 'sim' | 'page'): void => {
    const actions = table.get(on) ?? []
    // Every change to the music is logged, but of several for one event only the last one counts.
    const lastMusic = actions.findLastIndex((action) => action.do !== 'sound')
    for (const [i, action] of actions.entries()) run(action, on, tick, from, i === lastMusic)
  }

  const stop = (): void => {
    speaker.cut('sound')
    player.stop()
  }

  return {
    silent: table.size === 0,
    begin() {
      heard = undefined
      limiter.reset()
    },
    hear(result) {
      if (table.size === 0 || (heard !== undefined && result.tick <= heard)) return
      heard = result.tick
      for (const event of result.events) answer(event.type, result.tick, 'sim')
    },
    raise(event) {
      answer(event, heard ?? 0, 'page')
    },
    log: () => log.entries(),
    music: () => player.wanted(),
    volumes: () => volumes,
    setVolumes(next) {
      for (const bus of ['music', 'sound'] as const) {
        const value: unknown = next[bus]
        if (typeof value !== 'number' || !(value >= 0 && value <= 1))
          throw new RangeError(`A volume is a number from 0 to 1. Got ${String(value)} for ${bus}.`)
      }
      volumes = Object.freeze({ format: 1, music: next.music, sound: next.sound })
      speaker.volume('music', volumes.music)
      speaker.volume('sound', volumes.sound)
    },
    sample: (bus) => speaker.play(bus, SAMPLE, speaker.now()),
    state: () => speaker.state(),
    onState(listener) {
      const off = speaker.onState(listener)
      listening.add(off)
      return () => {
        listening.delete(off)
        off()
      }
    },
    stop,
    close() {
      if (closed) return
      closed = true
      stop()
      player.close()
      for (const off of listening) off()
      listening.clear()
    },
  }
}

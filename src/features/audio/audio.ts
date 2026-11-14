// The audio feature's entry: what a game sounds like, played when the sim's events say so. It is handed a step's events
// and never the sim, so it has nothing to change; it plays through a `Speaker`, which a page makes with Web Audio
// (`webSpeaker`, in the web feature) and a test makes with `testSpeaker`.
import type { GameContent } from '../content/content.ts'
import type { SimEvent } from '../sim/sim.ts'
import { type CueAction, type CueLogEntry, createCueLog, createLimiter, cueTable } from './cues.ts'
import type { Speaker, SpeakerState } from './speaker.ts'

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
  state(): SpeakerState
  onState(listener: (state: SpeakerState) => void): () => void
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
  /** The last tick heard since `begin`; undefined before any. */
  let heard: number | undefined

  const run = (action: CueAction, on: string, tick: number, from: 'sim' | 'page'): void => {
    // Music is the next task's.
    if (action.do !== 'sound') return
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
  }

  /** Does what the cues for `on` say. A page event is not limited, and its sounds are not counted. */
  const answer = (on: string, tick: number, from: 'sim' | 'page'): void => {
    for (const action of table.get(on) ?? []) run(action, on, tick, from)
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
    state: () => speaker.state(),
    onState: (listener) => speaker.onState(listener),
  }
}

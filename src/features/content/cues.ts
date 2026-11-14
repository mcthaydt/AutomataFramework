import { z } from 'zod'
import { Id } from './ids.ts'
import { EventName, noSuch, variants } from './shared.ts'
import type { ContentTypeInfo, Listed, Report } from './type-info.ts'

/** Play a sound when an event fires. */
export interface SoundCue {
  readonly on: string
  readonly do: 'sound'
  readonly sound: string
}

/** Start a track when an event fires. */
export interface MusicCue {
  readonly on: string
  readonly do: 'music'
  readonly music: string
}

/** Stop the music when an event fires. */
export interface StopMusicCue {
  readonly on: string
  readonly do: 'stop-music'
}

/** One thing that happens when an event fires. */
export type Cue = SoundCue | MusicCue | StopMusicCue

/** A cues file once read: what plays when. */
export interface CuesFile {
  readonly format: 1
  readonly id: string
  readonly cues: readonly Cue[]
}

const on = EventName.describe('The event that sets it off, like "hero.jumped".')

const cue = variants('do', [
  z.strictObject({
    on,
    do: z.literal('sound').describe('Play a sound.'),
    sound: Id.describe('Which sound to play, by id, like "jump".'),
  }),
  z.strictObject({
    on,
    do: z.literal('music').describe('Start a track.'),
    music: Id.describe('Which track to start, by id, like "meadow".'),
  }),
  z.strictObject({ on, do: z.literal('stop-music').describe('Stop the music.') }),
])

/** Two cues that would both change the music at once, or both play a sound, for one event. */
function checkCues(cues: readonly Cue[], ctx: z.core.$RefinementCtx): void {
  const sounds = new Set<string>()
  const musics = new Set<string>()
  cues.forEach((one, i) => {
    const seen = one.do === 'sound' ? sounds : musics
    if (seen.has(one.on))
      ctx.addIssue({
        code: 'custom',
        path: ['cues', i, 'on'],
        message:
          one.do === 'sound'
            ? `"${one.on}" already plays a sound here. Remove one of the two.`
            : `"${one.on}" already changes the music here. Remove one of the two.`,
      })
    seen.add(one.on)
  })
}

/** Every sound and track a cue names must be in the game. */
function checkNames(file: CuesFile, game: Listed, report: Report): void {
  file.cues.forEach((one, i) => {
    if (one.do === 'sound' && !game.has('sound', one.sound))
      report(`cues[${i}].sound`, noSuch('sound', one.sound, game.ids('sound')))
    if (one.do === 'music' && !game.has('music', one.music))
      report(`cues[${i}].music`, noSuch('music', one.music, game.ids('music')))
  })
}

/** The rules for a cues file; unknown keys are refused. */
export const CuesSchema: z.ZodType<CuesFile, CuesFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this list of cues, like "cues". It matches the file name.'),
    cues: z.array(cue).max(256).describe('What plays when, one entry for each thing that happens.'),
  })
  .superRefine((file, ctx) => checkCues(file.cues ?? [], ctx))

/** The cues' row of the content table. */
export const cuesInfo: ContentTypeInfo<CuesFile, CuesFile> = {
  schema: CuesSchema,
  title: 'Cues',
  plural: 'cues',
  editor: 'sound',
  part: 'audio',
  noun: 'cue list',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the list a name like "cues".',
    cues: 'Write [] if nothing plays yet.',
    'cues.on': 'Write the event that sets it off, like "hero.jumped".',
    'cues.do': 'Write "sound", "music" or "stop-music".',
    'cues.sound': 'Write which sound to play, like "jump".',
    'cues.music': 'Write which track to start, like "meadow".',
  },
  check: checkNames,
}

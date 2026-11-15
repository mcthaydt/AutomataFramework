// One game with every sound format in it, in every engine: a song of loops, a motif that plays as a sound, a recording
// that plays as a sound, and cues for each, all in folders. Adding all of it moves no hash (the sim and the script are
// the sounding game's, and so are its hashes), and what the cues asked for is one recorded text in Node and in three
// browsers.
import { afterEach, expect, test } from 'vitest'
import { createAudio, type GameAudio, soundVoices, testSpeaker } from '#src/features/audio/audio.ts'
import { createRecorder } from '#src/features/commands/commands.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { canonicalJson } from '#src/lib/canonical.ts'
import { loadFullSoundGame } from '../../fixtures/audio/full-sound-game.ts'
import { SOUNDING_TICKS, soundingScript } from '../../fixtures/audio/script.ts'
import { soundingHeroPlugin } from '../../fixtures/audio/sounding-hero.ts'
import { expectGolden, expectRecorded } from '../../fixtures/golden.ts'
import golden from '../../golden/full-sound.json' with { type: 'json' }
import sounding from '../../golden/sounding.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** Plays the sounding run with the full sound game's audio, hearing every step. */
async function play() {
  const { content, recordings } = await loadFullSoundGame()
  const sim = await createGameSim({ content, plugins: [soundingHeroPlugin] })
  made.push(sim)
  const speaker = testSpeaker()
  speaker.tap()
  const audio: GameAudio = createAudio({ content, speaker, recordings })
  audio.begin()
  audio.raise('level.started')
  const recorder = createRecorder(sim)
  const checks: { tick: number; hash: string }[] = []
  for (let i = 0; i < SOUNDING_TICKS; i++) {
    const result = recorder.step(soundingScript(sim.tick))
    audio.hear({ tick: result.tick, events: result.events })
    if (sim.tick % 60 === 0 && sim.tick < SOUNDING_TICKS) checks.push({ tick: sim.tick, hash: sim.hash() })
  }
  return { sim, audio, speaker, content, checks }
}

test("with every sound file added, the run's hashes are the sounding run's own, in every engine", async () => {
  const { sim, checks } = await play()
  expectGolden({ ticks: SOUNDING_TICKS, finalHash: sim.hash(), checks }, sounding)
})

test('the cue log is one recorded text in every engine', async () => {
  const { audio } = await play()
  expectRecorded('cueLog', canonicalJson(audio.log()), golden.cueLog)
})

test('the song starts, the motif plays on a jump and the recording on a landing', async () => {
  const { audio, speaker, content } = await play()
  expect(audio.log().map((entry) => `${entry.on} ${entry.do} ${entry.id ?? ''}`.trim())).toEqual([
    'level.started music meadow',
    'hero.jumped sound theme',
    'hero.landed sound voice',
    'hero.jumped sound theme',
    'hero.landed sound voice',
  ])
  // The motif's notes were played as tones, and the recording as a recording voice.
  const theme = content.sounds?.theme
  if (theme === undefined) throw new Error('the game has no theme sound')
  const motifNotes = soundVoices(theme, content).length
  expect(motifNotes).toBeGreaterThan(1)
  const kinds = speaker.played.map((voice) => voice.voice.kind)
  expect(kinds.filter((kind) => kind === 'recording')).toHaveLength(2)
})

// The game with every sound format, through the page's own speaker and a real audio context, in each browser: what its
// cues ask for is the text the Node run recorded, and what it plays is heard, not silence.
import { afterEach, expect, test } from 'vitest'
import { createAudio, soundVoices } from '#src/features/audio/audio.ts'
import { createRecorder } from '#src/features/commands/commands.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { webSpeaker } from '#src/features/web/web.ts'
import { canonicalJson } from '#src/lib/canonical.ts'
import { loadFullSoundGame } from '../../fixtures/audio/full-sound-game.ts'
import { peak, renderVoices } from '../../fixtures/audio/render.ts'
import { SOUNDING_TICKS, soundingScript } from '../../fixtures/audio/script.ts'
import { soundingHeroPlugin } from '../../fixtures/audio/sounding-hero.ts'
import golden from '../../golden/full-sound.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

test('the same run through the real speaker asks for the same sounds as the Node run recorded', async () => {
  const { content, recordings } = await loadFullSoundGame()
  const sim = await createGameSim({ content, plugins: [soundingHeroPlugin] })
  made.push(sim)
  const speaker = webSpeaker()
  const audio = createAudio({ content, speaker, recordings })
  try {
    audio.begin()
    audio.raise('level.started')
    const recorder = createRecorder(sim)
    for (let i = 0; i < SOUNDING_TICKS; i++) {
      const result = recorder.step(soundingScript(sim.tick))
      audio.hear({ tick: result.tick, events: result.events })
    }
    expect(canonicalJson(audio.log())).toBe(golden.cueLog)
  } finally {
    audio.close()
    speaker.close()
  }
})

test('the sound that plays a motif is heard in its first half second', async () => {
  const { content } = await loadFullSoundGame()
  const theme = content.sounds?.theme
  if (theme === undefined) throw new Error('the game has no theme sound')
  const samples = await renderVoices(soundVoices(theme, content), 2)
  expect(peak(samples, 0, 0.5)).toBeGreaterThan(0.01)
})

// The template's recorded play, with the template's own feel file (dust on a landing) and a freeze and a shake besides,
// heard on every step: the recording still ends on its hash. Feel is presentation, so a golden never moves for it.
import { afterEach, expect, test } from 'vitest'
import { createRecorder, parseReplay } from '#src/features/commands/commands.ts'
import type { FeelFile } from '#src/features/content/content.ts'
import { createFeel } from '#src/features/feel/feel.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { gamePlugins } from '../../template/src/headless.ts'
import { loadTemplateGame } from './game.ts'
import { TEMPLATE_TICKS, templatePlay } from './hero-play.ts'

const recordings = import.meta.glob('../../template/replays/level-1.json', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const recorded = Object.values(recordings)[0]

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** What the template's play raises, answered with every kind of effect. */
const EXTRA: Readonly<Record<string, FeelFile>> = {
  hop: { format: 1, id: 'hop', on: 'hero.jumped', shake: { strength: 0.3, ticks: 10 } },
  take: {
    format: 1,
    id: 'take',
    on: 'spark.taken',
    freeze: { ticks: 6 },
    dust: { count: 12, color: '#ffd23f', speed: 3, life: 24 },
  },
}

test('the recorded play ends on its hash with a feel hearing every step', async () => {
  if (recorded === undefined) throw new Error('REPLAY NOT RECORDED: see replay.parity.test.ts.')
  const content = await loadTemplateGame()
  const sim = await createGameSim({ content, plugins: gamePlugins })
  made.push(sim)
  const feel = createFeel({
    content: { feels: { ...content.feels, ...EXTRA } },
    tickHz: 60,
    settings: { format: 1, shake: true },
  })
  const recorder = createRecorder(sim)
  let drawn = 0
  for (let tick = 0; tick < TEMPLATE_TICKS; tick++) {
    feel.hear(recorder.step(templatePlay(sim.tick)))
    feel.hold(1 / 60)
    drawn += feel.frame(1 / 60, () => ({ x: 4, y: 4, w: 1, h: 1 })).specks.length
  }
  expect(recorder.replay().finalHash).toBe(parseReplay(recorded).finalHash)
  // The feel did something: the landing's dust, at least, was drawn.
  expect(drawn).toBeGreaterThan(0)
})

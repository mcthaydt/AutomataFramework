// A cutscene's actors with figures: the clip a key names plays from that key on, a key's face turns the actor, a clip is
// let go when the cutscene ends or is skipped, and an actor with no figure is only moved. Made in memory, never in
// the story fixture: a figure switches the sprites on, which would change the story game's recorded hash.
import { afterEach, expect, test } from 'vitest'
import { loadGame, writeContent } from '#src/features/content/content.ts'
import {
  createGameSim,
  SKIP_AFTER,
  Sprite,
  skipCommand,
  startCutscene,
  Thing,
} from '#src/features/level/level.ts'
import type { Command, Sim } from '#src/features/sim/sim.ts'
import { artGame } from '../../fixtures/content/art.ts'
import { readFiles } from '../../fixtures/content/kind.ts'
import { KEEPER_PATH, keeperCharacter } from '../../fixtures/content/story.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { callOn } from '../../fixtures/level/story-helpers.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** What a cutscene's keeper does: turns left and talks from tick 10 on. */
const keys = {
  talking: { at: 10, who: 'keeper', x: 8.5, y: 7.5, face: 'left', clip: 'talk' },
  turning: { at: 10, who: 'keeper', x: 9.5, y: 7.5, face: 'left' },
}
const chat = (second: object) => ({
  format: 1 as const,
  id: 'chat',
  level: 'level-1',
  length: 60,
  camera: [{ at: 0, x: 8, y: 4.5, zoom: 1, ease: 'cut' }],
  actors: [{ at: 0, who: 'keeper', x: 8.5, y: 7.5 }, second],
  lines: [],
})

/** A sim of the art game with the cutscene `chat` starting on tick 5. */
async function chatSim(second: object, replace: Record<string, string | undefined> = {}): Promise<Sim> {
  const scene = { type: 'cutscene' as const, path: 'content/cutscenes/chat.json' }
  const files = artGame([{ ...scene, text: writeContent('cutscene', chat(second) as never) }], replace)
  const loaded = await loadGame(readFiles(files))
  if (!loaded.ok) throw new Error(loaded.diagnostics.map((d) => d.message).join('\n'))
  const start = callOn('start', [5], (ctx) => void startCutscene(ctx, 'chat'))
  const sim = await createGameSim({ content: loaded.value, plugins: [heroPlugin, start] })
  made.push(sim)
  return sim
}

const keeper = (sim: Sim) => sim.query(Thing, Sprite).find((e) => e.get(Thing).id === 'keeper')

/** What the keeper's sprite held after each step, by the tick it ran at: `by` is the clip asked for, `face` 1 or -1. */
function watch(sim: Sim, until: number, send: (tick: number) => Command[] = () => []) {
  const seen: { by: string; face: number }[] = []
  while (sim.tick < until) {
    sim.step(send(sim.tick))
    const sprite = keeper(sim)?.get(Sprite)
    seen.push({ by: sprite?.by ?? 'no sprite', face: sprite?.face ?? 0 })
  }
  return seen
}

test('an actor plays the clip its key names from that key on, and its own again after', async () => {
  const seen = watch(await chatSim(keys.talking), 80)
  // The cutscene starts on tick 5, so the key at 10 is reached on tick 15 and the cutscene ends on tick 65.
  expect(seen[14]?.by).toBe('')
  expect(seen[15]?.by).toBe('talk')
  expect(seen[64]?.by).toBe('talk')
  expect(seen[65]?.by).toBe('')
})

test('an actor faces the way its key says', async () => {
  const seen = watch(await chatSim(keys.talking), 40)
  expect(seen[14]?.face).toBe(1)
  expect(seen[15]?.face).toBe(-1)
})

test('a skipped cutscene lets the clip go too', async () => {
  const at = 5 + SKIP_AFTER + 5
  const sim = await chatSim(keys.talking)
  const seen = watch(sim, at + 3, (tick) => (tick === at ? [skipCommand(tick, 1, 0)] : []))
  expect(seen[at - 1]?.by).toBe('talk')
  expect(seen[at]?.by).toBe('')
})

test('an actor with no figure is moved, and nothing throws', async () => {
  const sim = await chatSim(keys.turning, { [KEEPER_PATH]: keeperCharacter() })
  const seen = watch(sim, 80)
  // Its sprite is there but names no clip, and it is no figure's picture: the turn is the only thing that lands.
  expect(seen.every((s) => s.by === '')).toBe(true)
  const thing = sim.query(Thing).find((e) => e.get(Thing).id === 'keeper')
  expect(thing).toBeDefined()
})

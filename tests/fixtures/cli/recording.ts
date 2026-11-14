// A recorded play of the fixture game, and the game's code in the shapes the replay tests need: the hero as recorded, the
// same hero a little faster (same shape, so it plays differently), and the same hero that stops the game at tick 20.
import type { GameCode } from '#src/features/cli/ports.ts'
import { createRecorder, writeReplay } from '#src/features/commands/commands.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { definePlugin, defineSystem, type PluginDef } from '#src/features/sim/sim.ts'
import * as framework from '#src/headless.ts'
import { loadFixtureGame } from '../game/game.ts'
import { heroPlugin } from '../game/hero.ts'
import { PUSH_TICKS, pushScript } from '../game/script.ts'

/** The fixture game's code with these plugins as its rules. */
export const codeWith = (plugins: readonly PluginDef[]): GameCode => ({
  framework,
  rules: { plugins },
})

/** The game as it was when the play was recorded. */
export const RECORDED_CODE: GameCode = codeWith([heroPlugin])

/** A hero with the shape of `heroPlugin` (the same plugin, system and phase names) that does something else. */
function variant(name: string, step: (tick: number) => void): PluginDef {
  const system = defineSystem({
    name: 'hero.move',
    phase: 'gameplay',
    run(ctx) {
      step(ctx.tick)
      for (const hero of ctx.query(framework.Player, framework.Body)) {
        const right = framework.isHeld(hero, 'right')
        hero.set(framework.Body, { vx: right ? (name === 'fast' ? 7 : 6) : 0 })
      }
    },
  })
  return definePlugin({ name: 'hero', dependsOn: ['physics', 'commands'], systems: [system] })
}

/** Runs right a little faster than the recorded hero does. */
export const fasterHero: PluginDef = variant('fast', () => undefined)

/** Runs as the recorded hero does, until tick 20, when the rules fail. */
export const failingHero: PluginDef = variant('same', (tick) => {
  if (tick === 20) throw new Error('boom')
})

/** Runs as `failingHero` does (it never jumps), and prints a line on its first tick, as a rule being debugged might. */
export const noisyHero: PluginDef = variant('same', (tick) => {
  if (tick === 1) console.log('the rules said hello')
})

/**
 * A play of the fixture game that started with nobody, as a co-op room's does (heroes join by command): its `meta` says
 * `players: ''`, and nothing is held.
 */
export async function nobodysPlay(): Promise<string> {
  const sim = await createGameSim({ content: await loadFixtureGame(), plugins: [heroPlugin], players: [] })
  try {
    const recorder = createRecorder(sim, { meta: { level: 'level-1', players: '' } })
    for (let t = 0; t < 120; t++) recorder.step([])
    return writeReplay(recorder.replay())
  } finally {
    sim.dispose()
  }
}

/** The play of the push-crate run, as a replay file's text, with the level and the players in its `meta`. */
export async function recordedPlay(): Promise<string> {
  const sim = await createGameSim({ content: await loadFixtureGame(), plugins: [heroPlugin] })
  try {
    const recorder = createRecorder(sim, { meta: { level: 'level-1', players: '1' } })
    for (let t = 0; t < PUSH_TICKS; t++) recorder.step(pushScript(sim.tick))
    return writeReplay(recorder.replay())
  } finally {
    sim.dispose()
  }
}

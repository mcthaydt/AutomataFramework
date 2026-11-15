// `automata replay` on a recording a tunable game made (plan G, task 4): the recording holds `tune` commands, which only a
// sim made `tunable` reads, so the recording's `meta.tunable` is what makes it verify. Without the key, a game that was
// tuned while it played would be reported as a game whose rules changed.
import { expect, test } from 'vitest'
import { main } from '#src/features/cli/cli.ts'
import { controlsCommand, createRecorder, parseReplay, writeReplay } from '#src/features/commands/commands.ts'
import { moveNumbersOf } from '#src/features/content/content.ts'
import { createGameSim, tuneCommand } from '#src/features/level/level.ts'
import { under } from '../../fixtures/cli/game.ts'
import { memoryLayer } from '../../fixtures/cli/memory.ts'
import { codeWith } from '../../fixtures/cli/recording.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { movesFiles } from '../../fixtures/game/moves-game.ts'

const FILE = 'replays/level-1.json'
const TICKS = 120

/** The moves fixture game as a folder: its content, the file a game folder has at its root, and no code of its own. */
function tunedGame(): Record<string, string> {
  const files = Object.entries(movesFiles({})).filter((e): e is [string, string] => e[1] !== undefined)
  return { ...Object.fromEntries(files), 'package.json': '{"name":"tuned","private":true,"type":"module"}\n' }
}

/** A play of the game made tunable: a tune at tick 5, a held jump from tick 10 to tick 40. */
async function tunedPlay(meta: Record<string, string>): Promise<string> {
  const sim = await createGameSim({ content: await loadFixtureGame(movesFiles({})), tunable: true })
  try {
    const recorder = createRecorder(sim, { meta })
    for (let t = 0; t < TICKS; t++) {
      recorder.step(
        t === 5
          ? [tuneCommand(t, 0, moveNumbersOf({ 'jump-speed': 20 }))]
          : t === 10
            ? [controlsCommand(t, 1, 1, ['jump', 'right'])]
            : t === 40
              ? [controlsCommand(t, 1, 2, [])]
              : [],
      )
    }
    return writeReplay(recorder.replay())
  } finally {
    sim.dispose()
  }
}

const run = async (text: string): Promise<{ code: number; out: string[] }> => {
  const memory = memoryLayer(under('game', { ...tunedGame(), [FILE]: text }), { code: codeWith([]) })
  const code = await main(['replay', 'game'], memory.layer)
  return { code, out: memory.out }
}

test('a recording whose meta says tunable verifies, with its tune command played', async () => {
  const text = await tunedPlay({ level: 'level-1', players: '1', tunable: 'true' })
  expect(parseReplay(text).commands.map((c) => c.type)).toContain('tune')
  const { code, out } = await run(text)
  expect(code).toBe(0)
  expect(out).toHaveLength(1)
  expect(out[0]).toMatch(
    /^replays\/level-1\.json: Played 120 ticks and ended on [0-9a-f]{16}, as recorded\.$/,
  )
})

test('the same recording without the key does not verify', async () => {
  const text = await tunedPlay({ level: 'level-1', players: '1' })
  const { code, out } = await run(text)
  expect(code).toBe(1)
  expect(out.join('\n')).not.toContain('as recorded')
})

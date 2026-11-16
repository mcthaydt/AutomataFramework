import { describe, expect, test } from 'vitest'
import { formatDiagnostic, loadGame, readGame } from '#src/features/content/content.ts'
import { readFiles } from '../../fixtures/content/kind.ts'
import { editLevel, linksFiles } from '../../fixtures/links-game/read.ts'

const WORLD = 'content/worlds/world.json'

/** The links game with its world file changed: where each level sits, by level id. */
function worldWith(at: Record<string, { x: number; y: number }>): Record<string, string> {
  const world = JSON.parse(linksFiles()[WORLD] ?? '') as {
    levels: { level: string; at: { x: number; y: number } }[]
  }
  const levels = Object.entries(at).map(([level, where]) => ({ level, at: where }))
  return { [WORLD]: `${JSON.stringify({ ...world, levels }, null, 2)}\n` }
}

const read = (overrides: Record<string, string | undefined> = {}) =>
  readGame(readFiles(linksFiles(overrides)))
const loaded = (overrides: Record<string, string | undefined> = {}) =>
  loadGame(readFiles(linksFiles(overrides)))

describe('readGame gives a game and its problems together', () => {
  test('a clean game gives its content and no problems, the same as loadGame', async () => {
    const [game, whole] = [await read(), await loaded()]
    expect(game.diagnostics).toEqual([])
    expect(whole.ok).toBe(true)
    if (whole.ok) expect(game.content).toEqual(whole.value)
  })

  test('a door that leads to a level that is not there gives the game and that one sentence', async () => {
    const files = editLevel('room-1', (level) => {
      const door = level.things.find((thing) => thing.id === 'exit')
      if (door !== undefined) door.values = { to: { level: 'room-9', thing: 'door-in' } }
    })
    const game = await read(files)
    const whole = await loaded(files)
    expect(game.content?.levels['room-1']).toBeDefined()
    expect(game.diagnostics).toHaveLength(1)
    expect(whole.ok).toBe(false)
    if (!whole.ok) expect(game.diagnostics).toEqual(whole.diagnostics)
    expect(formatDiagnostic(game.diagnostics[0] ?? { file: '', path: '', message: '' })).toContain('room-9')
  })

  test('a level file that is not JSON gives no game, and the sentence for that file', async () => {
    const game = await read({ 'content/levels/room-3.json': 'this is not json' })
    expect(game.content).toBeUndefined()
    expect(game.diagnostics.length).toBeGreaterThan(0)
    expect(game.diagnostics.every((d) => d.file === 'content/levels/room-3.json')).toBe(true)
  })

  test('a project file that is missing gives no game and the one sentence loadGame gives', async () => {
    const game = await read({ 'automata.toml': undefined })
    const whole = await loaded({ 'automata.toml': undefined })
    expect(game.content).toBeUndefined()
    expect(whole.ok).toBe(false)
    if (!whole.ok) expect(game.diagnostics).toEqual(whole.diagnostics)
  })

  test('a world file that names a level that is not there gives the game with no places', async () => {
    const files = worldWith({
      'room-1': { x: 0, y: 0 },
      'room-2': { x: 20, y: 0 },
      'room-3': { x: 36, y: 0 },
      'room-9': { x: 60, y: 0 },
    })
    const game = await read(files)
    const whole = await loaded(files)
    expect(game.content).toBeDefined()
    expect(game.content?.places).toBeUndefined()
    expect(game.diagnostics.length).toBeGreaterThan(0)
    expect(game.diagnostics.every((d) => d.file === WORLD)).toBe(true)
    expect(whole.ok).toBe(false)
    if (!whole.ok) expect(game.diagnostics).toEqual(whole.diagnostics)
  })

  test('two levels that sit on top of one another give the game, its places and the sentence for that', async () => {
    // Room 1 is moved over rooms 2 and 3, which still touch each other and still make one place.
    const files = worldWith({
      'room-1': { x: 30, y: 0 },
      'room-2': { x: 20, y: 0 },
      'room-3': { x: 36, y: 0 },
    })
    const game = await read(files)
    const whole = await loaded(files)
    expect(game.content?.places).toEqual({
      'room-2': [
        { level: 'room-2', x: 0, y: 0 },
        { level: 'room-3', x: 16, y: 0 },
      ],
    })
    expect(game.diagnostics.some((d) => d.message.includes('sits on top of'))).toBe(true)
    expect(whole.ok).toBe(false)
    if (!whole.ok) expect(game.diagnostics).toEqual(whole.diagnostics)
  })

  test('it never throws, even when the reader does', async () => {
    const game = await readGame(() => {
      throw new Error('no disk')
    })
    expect(game.content).toBeUndefined()
    expect(game.diagnostics.length).toBeGreaterThan(0)
  })
})

// Why a join is refused, in the words of the player's language, said when the answer is made. The game, the sim and the
// rules are real; the input is a stand-in that holds nothing.
import { afterEach, expect, test } from 'vitest'
import { createSequence } from '#src/features/commands/commands.ts'
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import { createPlayers, type JoinAnswer, type Players } from '#src/features/game/players.ts'
import { testHost } from '#src/features/host/host.ts'
import type { Input } from '#src/features/input/input.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { createLocale, type Locale } from '#src/features/locale/locale.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { coopFiles } from '../../fixtures/game/co-op.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'

const input = { seats: () => [], claim: () => undefined, setPlayers: () => undefined } as unknown as Input
let sim: Sim | undefined
afterEach(() => {
  sim?.dispose()
  sim = undefined
})

async function playersOf(
  content: GameContent,
  extra: { readonly canShare?: boolean; readonly locale?: Locale } = {},
): Promise<Players> {
  sim = await createGameSim({ content, plugins: [heroPlugin] })
  return createPlayers({
    sim,
    content,
    level: content.project.start,
    input,
    sequence: createSequence(),
    canShare: extra.canShare ?? true,
    ...(extra.locale === undefined ? {} : { words: extra.locale.words }),
  })
}

/** The refusal's message, or a failure of the test when the join was allowed. */
const refused = (answer: JoinAnswer): string => {
  if (answer.ok) throw new Error('the join was allowed')
  return answer.message
}

/**
 * The coop fixture with a level that has start points for the given players only. Built by hand: `loadGame` itself
 * refuses a game for four whose level has fewer start points.
 */
async function withStarts(players: readonly number[]): Promise<GameContent> {
  const content = await loadFixtureGame(coopFiles)
  const level = content.levels['level-1']
  if (level === undefined) throw new Error('no level-1')
  const starts = level.starts.filter((start) => players.includes(start.player))
  return { ...content, levels: { ...content.levels, 'level-1': { ...level, starts } } }
}

async function fullLocale(deviceLanguages: readonly string[] = []): Promise<Locale> {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  const host = testHost({ deviceLanguages })
  const settings = await openSettings({ game: 'full-game', store: host.store })
  return createLocale({ content: loaded.value, host, settings })
}

test('with no locale every refusal is said in English', async () => {
  const one = await playersOf(await loadFixtureGame())
  expect(one.addPlayer('keyboard')).toEqual({
    ok: false,
    reason: 'one-player-game',
    message: 'This game is for one player.',
  })
  sim?.dispose()
  const four = await playersOf(await loadFixtureGame(coopFiles))
  four.addPlayer('pad-0')
  four.addPlayer('pad-1')
  four.addPlayer('pad-2')
  expect(refused(four.addPlayer('pad-3'))).toBe('Everyone is in. This game has room for 4 players.')
})

test('a taken device, and a keyboard that cannot be shared', async () => {
  const players = await playersOf(await loadFixtureGame(coopFiles), { canShare: false })
  expect(players.addPlayer('pad-0').ok).toBe(true)
  expect(refused(players.addPlayer('pad-0'))).toBe('That gamepad already has a player.')
  expect(refused(players.addPlayer('keyboard'))).toBe(
    "This game's keys cannot be shared. Join with a gamepad.",
  )
  sim?.dispose()
  const shared = await playersOf(await loadFixtureGame(coopFiles))
  expect(shared.addPlayer('keyboard').ok).toBe(true)
  expect(refused(shared.addPlayer('keyboard'))).toBe('The keyboard is already shared.')
})

test('a level with room for fewer people than the game says', async () => {
  const one = await playersOf(await withStarts([1]))
  expect(refused(one.addPlayer('pad-0'))).toBe('This level has room for one player.')
  sim?.dispose()
  const two = await playersOf(await withStarts([1, 2]))
  expect(two.addPlayer('pad-0').ok).toBe(true)
  expect(refused(two.addPlayer('pad-1'))).toBe('This level has room for 2 players.')
})

test("with a locale, a refused join is said in the player's language, as it is when asked", async () => {
  const locale = await fullLocale(['es-MX'])
  const players = await playersOf(await loadFixtureGame(), { locale })
  expect(refused(players.addPlayer('keyboard'))).toBe('Este juego es para un jugador.')
  await locale.set('ja')
  expect(refused(players.addPlayer('keyboard'))).toBe('このゲームは1人用です。')
})

test('every kind of refusal has words in every language, never its key', async () => {
  const locale = await fullLocale()
  for (const language of locale.languages) {
    await locale.set(language)
    const four = await playersOf(await loadFixtureGame(coopFiles), { locale, canShare: false })
    const said = [refused(four.addPlayer('keyboard'))]
    four.addPlayer('pad-0')
    said.push(refused(four.addPlayer('pad-0')))
    four.addPlayer('pad-1')
    four.addPlayer('pad-2')
    said.push(refused(four.addPlayer('pad-3')))
    for (const text of said) expect(text, language).not.toMatch(/^automata\./)
    sim?.dispose()
  }
})

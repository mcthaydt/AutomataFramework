// `compileWords` runs Paraglide for real, in a temporary folder on disk, over the full game's words held in memory. What it
// writes goes through the files port, so the test reads it from the map. Paraglide's own file names are checked only where
// the command depends on them: the runtime that says the base language, and a file for each word.
import { Effect } from 'effect'
import { expect, test } from 'vitest'
import { compileWords, functionName, outdirProblem } from '#src/features/cli/words.ts'
import { LANGUAGES } from '#src/features/content/content.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'
import { withSource } from '../../fixtures/content/kind.ts'
import { fullGameFiles } from '../../fixtures/full-game/read.ts'

/** Paraglide starts a compiler and loads a plugin: allow it well over the usual. */
const SLOW = 60_000

const OUTDIR = 'src/paraglide'
const GAME: Record<string, string> = {
  ...fullGameFiles,
  'package.json': '{"name":"full-game","private":true,"type":"module"}\n',
}

/** The full game's six messages files with `words` added to every language, so the languages stay in step. */
function withWords(words: Readonly<Record<string, string>>): Record<string, string> {
  const files: Record<string, string> = { ...GAME }
  for (const language of LANGUAGES) {
    const path = `content/messages/${language}.json`
    const file = JSON.parse(fullGameFiles[path] as string) as { messages: Record<string, string> }
    files[path] = `${JSON.stringify({ ...file, messages: { ...file.messages, ...words } }, null, 2)}\n`
  }
  return files
}

const run = (memory: Memory, outdir = OUTDIR) =>
  Effect.runPromise(compileWords({ folder: 'game', outdir }).pipe(Effect.provide(memory.layer)))

const failure = async (memory: Memory, outdir = OUTDIR): Promise<string> => {
  const result = await Effect.runPromise(
    Effect.either(compileWords({ folder: 'game', outdir }).pipe(Effect.provide(memory.layer))),
  )
  if (result._tag === 'Right') throw new Error('the compile was allowed')
  return result.left.message
}

/** A file as text: the compile writes bytes. */
const textOf = (data: string | Uint8Array | undefined): string =>
  typeof data === 'string' ? data : new TextDecoder().decode(data)

const written = (memory: Memory): string[] =>
  [...memory.files.keys()].filter((key) => key.startsWith(`game/${OUTDIR}/`)).sort()

test(
  "the words compile to a runtime with the game's own language as the base and a function for each word",
  async () => {
    const memory = memoryLayer(under('game', GAME))
    const files = await run(memory)
    expect(files).toEqual([...files].sort())
    expect(files).toContain('runtime.js')
    expect(files).toContain('messages.js')
    expect(textOf(memory.files.get(`game/${OUTDIR}/runtime.js`))).toMatch(/baseLocale = "en"/)
    expect(written(memory).some((key) => key.includes('keeper_hello'))).toBe(true)
    expect(written(memory).some((key) => key.includes('level_level_1_name'))).toBe(true)
  },
  SLOW,
)

test(
  'a second compile of the same words writes nothing and touches no file',
  async () => {
    const memory = memoryLayer(under('game', GAME))
    await run(memory)
    const before = new Map(memory.files)
    expect(await run(memory)).toEqual([])
    expect(new Map(memory.files)).toEqual(before)
  },
  SLOW,
)

test(
  'a word added to every language is a new file, and taking it out removes the file, not its neighbours',
  async () => {
    const joke = { 'keeper.joke': 'Why did the crate cross the ledge?' }
    const memory = memoryLayer(under('game', withWords(joke)))
    const first = await run(memory)
    expect(first.filter((file) => file.includes('keeper_joke')).length).toBeGreaterThan(0)
    const keeper = written(memory).filter((key) => key.includes('keeper_joke'))
    expect(keeper.length).toBeGreaterThan(0)
    // A stray file of the game's own beside the generated ones is left alone.
    memory.files.set(`game/${OUTDIR}/notes.txt`, 'mine')
    // So is one of the game's own under messages/ that is not a word's code: only `messages/<word>.js` is Paraglide's.
    memory.files.set(`game/${OUTDIR}/messages/notes.txt`, 'mine too')
    memory.files.set(`game/${OUTDIR}/messages/drafts/keeper.js`, 'a draft')

    for (const [path, text] of Object.entries(under('game', GAME))) memory.files.set(path, text)
    const second = await run(memory)
    expect(second).not.toContain('messages.js')
    expect(written(memory).some((key) => key.includes('keeper_joke'))).toBe(false)
    expect(written(memory).some((key) => key.includes('keeper_hello'))).toBe(true)
    expect(memory.files.get(`game/${OUTDIR}/notes.txt`)).toBe('mine')
    expect(memory.files.get(`game/${OUTDIR}/messages/notes.txt`)).toBe('mine too')
    expect(memory.files.get(`game/${OUTDIR}/messages/drafts/keeper.js`)).toBe('a draft')
  },
  SLOW,
)

test("a folder that is not the generated code's own is refused, and nothing is written", async () => {
  const memory = memoryLayer(under('game', GAME))
  for (const outdir of [
    'content/words',
    'content',
    '../x',
    '/tmp/x',
    'src\\paraglide',
    '',
    'src//x',
    'automata.toml',
  ]) {
    const sentence = await failure(memory, outdir)
    expect(sentence, outdir).toContain(outdir === '' ? 'must be a folder inside the game' : outdir)
  }
  expect([...memory.files.keys()].filter((key) => !key.startsWith('game/')).length).toBe(0)
  expect(written(memory)).toEqual([])
  expect(outdirProblem('src/paraglide')).toBeUndefined()
})

test('two words that would be one function are named, and nothing is written', async () => {
  const memory = memoryLayer(under('game', withWords({ 'a.b': 'One', 'a-b': 'Two' })))
  const sentence = await failure(memory)
  expect(sentence).toContain('"a.b" and "a-b" would both be the function a_b')
  expect(written(memory)).toEqual([])
  expect(functionName('level.level-1.name')).toBe('level_level_1_name')
})

test(
  "the game's own language is the base language of the compile, whichever of the six it is, so a Korean game's is Korean",
  async () => {
    const toml = withSource(GAME['automata.toml'] ?? '', 'ko')
    const memory = memoryLayer(under('game', { ...GAME, 'automata.toml': toml }))
    await run(memory)
    expect(textOf(memory.files.get(`game/${OUTDIR}/runtime.js`))).toMatch(/baseLocale = "ko"/)
  },
  SLOW,
)

test('a game with no words gets a sentence that says what to add', async () => {
  const memory = memoryLayer(under('game', smallGame()))
  expect(await failure(memory)).toBe(
    'This game has no words to compile. Add a messages file, list it in automata.toml, and write source.',
  )
  expect(written(memory)).toEqual([])
})

test('a game that does not load is a sentence that says why, and nothing is written', async () => {
  const memory = memoryLayer(under('game', { ...GAME, 'content/levels/level-1.json': '{ "nope": ' }))
  expect(await failure(memory)).toContain('The game does not load, so its words cannot be compiled')
  expect(written(memory)).toEqual([])
})

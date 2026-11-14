// `automata words` on files in memory: a game written in Korean, with Spanish and Portuguese words. The list, the marking
// that writes the marks file and nothing else, the marks that were made against another language, and each sentence it
// stops on with nothing written.
import { Effect } from 'effect'
import { expect, test } from 'vitest'
import { describeWords, runWords, type WordsReport } from '#src/features/cli/unread.ts'
import {
  LANGUAGES,
  loadGame,
  markRead,
  READ_MARKS_FILE,
  writeReadMarks,
} from '#src/features/content/content.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'
import { wordsGame } from '../../fixtures/cli/words.ts'
import { readFiles } from '../../fixtures/content/kind.ts'

const MARKS = `game/${READ_MARKS_FILE}`

const korean = (extra: Record<string, string> = {}): Memory =>
  memoryLayer(under('game', { ...wordsGame('ko', ['ko', 'es', 'pt']), ...extra }))

interface Read {
  readonly language: string
  readonly keys: readonly string[]
}

const attempt = (memory: Memory, read?: Read) =>
  runWords({ folder: 'game', ...(read === undefined ? {} : { read }) }).pipe(Effect.provide(memory.layer))

const words = (memory: Memory, read?: Read): Promise<WordsReport> => Effect.runPromise(attempt(memory, read))

/** The sentence a call stops on, and proof that the folder is as it was. */
async function stopped(memory: Memory, read?: Read): Promise<string> {
  const before = new Map(memory.files)
  const result = await Effect.runPromise(Effect.either(attempt(memory, read)))
  expect(new Map(memory.files)).toEqual(before)
  if (result._tag === 'Right') throw new Error('the command did not stop')
  return result.left.message
}

test('every translated word waits, each beside the text of the language the game is written in', async () => {
  const report = await words(korean())
  expect(report.source).toBe('ko')
  expect(report.marked).toBeUndefined()
  expect(report.unread.map((word) => `${word.language} ${word.key}`)).toEqual([
    'es controls.jump',
    'es keeper.bye',
    'es keeper.hello',
    'pt controls.jump',
    'pt keeper.bye',
    'pt keeper.hello',
  ])
  expect(report.unread[2]).toEqual({
    language: 'es',
    key: 'keeper.hello',
    source: '안녕하세요!',
    text: '¡Hola!',
  })
})

test('nothing is written by listing', async () => {
  const memory = korean()
  const before = new Map(memory.files)
  await words(memory)
  expect(new Map(memory.files)).toEqual(before)
})

test('marking a language reads all of it, and writes only the marks file', async () => {
  const memory = korean()
  const before = new Map(memory.files)
  const report = await words(memory, { language: 'pt', keys: [] })
  expect(report.unread.some((word) => word.language === 'pt')).toBe(false)
  expect(report.unread).toHaveLength(3)
  expect(report.marked).toEqual({
    language: 'pt',
    keys: ['controls.jump', 'keeper.bye', 'keeper.hello'],
  })
  const changed = [...memory.files.keys()].filter((key) => memory.files.get(key) !== before.get(key))
  expect(changed).toEqual([MARKS])
  expect(String(memory.files.get(MARKS)).startsWith('format = 2\nsource = "ko"\n\n[read.pt]\n')).toBe(true)
})

test('marking some words leaves the rest of the language waiting', async () => {
  const memory = korean()
  const report = await words(memory, { language: 'es', keys: ['keeper.hello'] })
  expect(report.marked).toEqual({ language: 'es', keys: ['keeper.hello'] })
  expect(report.unread.filter((word) => word.language === 'es').map((word) => word.key)).toEqual([
    'controls.jump',
    'keeper.bye',
  ])
})

test('a second marking keeps the first and a list again shows the same', async () => {
  const memory = korean()
  await words(memory, { language: 'es', keys: ['keeper.hello'] })
  const report = await words(memory, { language: 'pt', keys: [] })
  expect(report.unread.map((word) => `${word.language} ${word.key}`)).toEqual([
    'es controls.jump',
    'es keeper.bye',
  ])
  expect(await words(memory)).toEqual({ source: 'ko', unread: report.unread })
})

test('a marks file in format 1 keeps its reads and is written back as format 2', async () => {
  const english = wordsGame('en', ['en', 'es', 'pt'])
  const loaded = await loadGame(readFiles(english))
  if (!loaded.ok) throw new Error('the words game does not load')
  const marks = writeReadMarks(markRead(loaded.value, undefined, 'es', ['keeper.hello']))
  const old = marks.replace('format = 2\nsource = "en"\n', 'format = 1\n')
  expect(old.startsWith('format = 1\n')).toBe(true)
  const memory = memoryLayer(under('game', { ...english, [READ_MARKS_FILE]: old }))
  const report = await words(memory, { language: 'pt', keys: [] })
  expect(report.unread.filter((word) => word.language === 'es').map((word) => word.key)).toEqual([
    'controls.jump',
    'keeper.bye',
  ])
  const text = String(memory.files.get(MARKS))
  expect(text.startsWith('format = 2\nsource = "en"\n')).toBe(true)
  expect(text).toContain('[read.es]\n"keeper.hello" = ')
  expect(text).toContain('[read.pt]\n')
})

test('marks made against English in a game written in Korean count for nothing, and marking starts again', async () => {
  const english = wordsGame('en', ['en', 'es', 'pt'])
  const loaded = await loadGame(readFiles(english))
  if (!loaded.ok) throw new Error('the words game does not load')
  const old = writeReadMarks(markRead(loaded.value, undefined, 'es'))
  const memory = korean({ [READ_MARKS_FILE]: old })
  const listed = await words(memory)
  expect(listed.unread).toHaveLength(6)
  const report = await words(memory, { language: 'pt', keys: [] })
  expect(report.unread.filter((word) => word.language === 'es')).toHaveLength(3)
  const text = String(memory.files.get(MARKS))
  expect(text.startsWith('format = 2\nsource = "ko"\n\n[read.pt]\n')).toBe(true)
  expect(text).not.toContain('[read.es]')
})

test('a game that does not load is not listed', async () => {
  const memory = korean({ 'content/levels/level-1.json': '{ not json' })
  const message = await stopped(memory)
  expect(message.startsWith('The game does not load, so its words cannot be listed:\n')).toBe(true)
  expect(message).toContain('content/levels/level-1.json')
})

test('a game with no words says what to add', async () => {
  expect(await stopped(memoryLayer(under('game', smallGame())))).toBe(
    'This game has no words yet. Add a messages file like content/messages/es.json, list it in automata.toml, and write source = "es".',
  )
})

test('a marks file that does not read is named', async () => {
  const message = await stopped(korean({ [READ_MARKS_FILE]: 'format = 2' }))
  expect(message).toContain(READ_MARKS_FILE)
})

test('the game’s own language is not marked, and the sentence names what can be', async () => {
  const everything = memoryLayer(under('game', wordsGame('ko', LANGUAGES)))
  expect(await stopped(everything, { language: 'ko', keys: [] })).toBe(
    'This game is written in Korean, so Korean is not read against anything. Mark one of: zh, es, en, pt, ja.',
  )
})

test('a language the game has no words in is not marked', async () => {
  expect(await stopped(korean(), { language: 'fr', keys: [] })).toBe(
    'This game has no words in "fr". Mark one of: es, pt.',
  )
  expect(await stopped(korean(), { language: 'ja', keys: [] })).toBe(
    'This game has no words in "ja". Mark one of: es, pt.',
  )
})

test('a word the language does not have is named, with the file to look in', async () => {
  expect(await stopped(korean(), { language: 'es', keys: ['keeper.hello', 'keeper.helo'] })).toBe(
    'Spanish has no word called "keeper.helo". Check the key in content/messages/es.json.',
  )
})

test('a word only the translation has cannot be read against anything', async () => {
  const es = JSON.parse(wordsGame('ko', ['es'])['content/messages/es.json'] as string) as {
    messages: Record<string, string>
  }
  const extra = `${JSON.stringify({ ...es, messages: { ...es.messages, 'only.es': '¡Solo yo!' } }, null, 2)}\n`
  const memory = korean({ 'content/messages/es.json': extra })
  expect(await stopped(memory, { language: 'es', keys: ['only.es'] })).toBe(
    'Korean has no word called "only.es", so the Spanish one has nothing to be read against.',
  )
})

// What a person reads.
const KOREAN_BLOCK = [
  'Checked against Korean (ko).',
  '',
  'Spanish (es): 3 words wait for a native speaker.',
  '  controls.jump',
  '    Korean:  점프',
  '    Spanish: Saltar',
  '  keeper.bye',
  '    Korean:  안녕히 가세요!',
  '    Spanish: ¡Adiós!',
  '  keeper.hello',
  '    Korean:  안녕하세요!',
  '    Spanish: ¡Hola!',
  '',
  'Portuguese (pt): 3 words wait for a native speaker.',
  '  controls.jump',
  '    Korean:     점프',
  '    Portuguese: Pular',
  '  keeper.bye',
  '    Korean:     안녕히 가세요!',
  '    Portuguese: Tchau!',
  '  keeper.hello',
  '    Korean:     안녕하세요!',
  '    Portuguese: Olá!',
  '',
  'Once a native speaker has read a language, mark it: automata words --read es',
]

test('the words a person reads: a block for each language, the game’s own beside each translation', async () => {
  expect(describeWords(await words(korean()))).toEqual(KOREAN_BLOCK)
})

test('one word waits, in the singular, and a marking says how many it marked', async () => {
  const memory = korean()
  await words(memory, { language: 'pt', keys: [] })
  const report = await words(memory, { language: 'es', keys: ['keeper.bye', 'keeper.hello'] })
  expect(describeWords(report)).toEqual([
    'Marked 2 words in Spanish as read.',
    '',
    'Checked against Korean (ko).',
    '',
    'Spanish (es): 1 word waits for a native speaker.',
    '  controls.jump',
    '    Korean:  점프',
    '    Spanish: Saltar',
    '',
    'Once a native speaker has read a language, mark it: automata words --read es',
  ])
  const one = await words(memory, { language: 'es', keys: ['controls.jump'] })
  expect(describeWords(one)[0]).toBe('Marked 1 word in Spanish as read.')
})

test('with nothing unread the answer is the heading and one sentence', async () => {
  const memory = korean()
  await words(memory, { language: 'es', keys: [] })
  const report = await words(memory, { language: 'pt', keys: [] })
  expect(describeWords(report)).toEqual([
    'Marked 3 words in Portuguese as read.',
    '',
    'Checked against Korean (ko).',
    '',
    'A native speaker has read every translated word.',
  ])
})

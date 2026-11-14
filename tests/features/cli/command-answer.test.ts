import { Effect } from 'effect'
import { expect, test } from 'vitest'
import { commandAnswer } from '#src/features/cli/command-answer.ts'

const answer = (code: number, stdout: string, stderr: string) =>
  Effect.runPromise(Effect.either(commandAnswer(code, stdout, stderr)))

test('JSON on stdout is the answer, with the exit status it came with', async () => {
  expect(await answer(0, '{"ok":true}\n', '')).toMatchObject({
    _tag: 'Right',
    right: { code: 0, json: { ok: true } },
  })
  expect(await answer(1, '[1, 2]', 'a warning')).toMatchObject({
    _tag: 'Right',
    right: { code: 1, json: [1, 2] },
  })
})

test('no JSON is the sentence the command said on stderr, without Node’s own notices', async () => {
  const stderr = [
    '(node:4242) ExperimentalWarning: Type Stripping is an experimental feature.',
    '(Use `node --trace-warnings ...` to show where the warning was created)',
    'x is not a game.',
    '',
  ].join('\n')
  const result = await answer(2, '', stderr)
  expect(result._tag).toBe('Left')
  expect(result._tag === 'Left' && result.left.message).toBe('x is not a game.')
})

test('a command that said nothing at all gets a sentence that says its status', async () => {
  const result = await answer(2, '', '')
  expect(result._tag === 'Left' && result.left.message).toBe('automata ended with status 2 and said nothing.')
})

test('words on stdout that are not JSON are the sentence when stderr has none', async () => {
  const result = await answer(1, 'not json\n', '(node:1) Warning: x\n')
  expect(result._tag === 'Left' && result.left.message).toBe('not json')
})

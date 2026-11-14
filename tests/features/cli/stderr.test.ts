import { expect, test, vi } from 'vitest'
import { printToStderr } from '#src/features/cli/stderr.ts'

test('console.log, info and debug go to stderr until they are put back; warn and error are left alone', () => {
  const before = { log: console.log, info: console.info, debug: console.debug, warn: console.warn }
  const said: string[] = []
  const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    said.push(String(chunk))
    return true
  })
  try {
    const restore = printToStderr()
    console.log('one %d', 1)
    console.info('two')
    console.debug({ three: 3 })
    expect(console.warn).toBe(before.warn)
    restore()
    expect(said).toEqual(['one 1\n', 'two\n', '{ three: 3 }\n'])
    expect({ log: console.log, info: console.info, debug: console.debug }).toEqual({
      log: before.log,
      info: before.info,
      debug: before.debug,
    })
  } finally {
    spy.mockRestore()
  }
})

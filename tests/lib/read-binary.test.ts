import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { readBinary } from '#src/lib/read-binary.ts'

test('in Node it reads the file a `file:` address names', async () => {
  const address = new URL('../../package.json', import.meta.url)
  const bytes = new Uint8Array((await readBinary(address.href)) as ArrayBuffer)
  expect(Buffer.from(bytes).equals(readFileSync(address))).toBe(true)
})

test('in Node a file that is not there rejects', async () => {
  await expect(readBinary(new URL('../nothing-here.wasm', import.meta.url).href)).rejects.toThrow()
})

import { expect, test, vi } from 'vitest'
import { readBinary } from '#src/lib/read-binary.ts'

test('in a browser it fetches the address', async () => {
  const bytes = new Uint8Array((await readBinary('data:application/octet-stream;base64,AQID')) as ArrayBuffer)
  expect([...bytes]).toEqual([1, 2, 3])
})

test('in a browser an address the server answers badly rejects, naming it and the answer', async () => {
  vi.stubGlobal('fetch', async () => new Response('no', { status: 503 }))
  try {
    await expect(readBinary('/rapier.wasm')).rejects.toThrow(/\/rapier\.wasm.*503/)
  } finally {
    vi.unstubAllGlobals()
  }
})

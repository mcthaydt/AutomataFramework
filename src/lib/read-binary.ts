// A binary file's bytes by its address: from disk where the code runs in Node, over the network anywhere else. The one
// place the framework reads a file, so the simulation features, which must have no I/O, ask for it and never do it.

/** The part of Node this file reads, found without importing a Node module a browser bundle would choke on. */
interface NodeLike {
  getBuiltinModule?: (name: 'node:fs/promises') => {
    readFile: (path: URL) => Promise<Uint8Array<ArrayBuffer>>
  }
}

/** `address` is a `file:` URL in Node and a URL or path a page can fetch elsewhere. */
export async function readBinary(address: string): Promise<BufferSource> {
  const node = (globalThis as { process?: NodeLike }).process
  const fs = node?.getBuiltinModule?.('node:fs/promises')
  if (fs !== undefined) return fs.readFile(new URL(address))
  const response = await fetch(address)
  if (!response.ok) throw new Error(`${address} did not load: the server answered ${response.status}.`)
  return response.arrayBuffer()
}

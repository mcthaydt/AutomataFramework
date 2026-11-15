// The library's photos as bytes, for a test that runs in Node and in a browser. Node reads the file; a browser is given
// the file's address by Vite (`?url`) and fetches it. Either way the bytes are the package's own `photos/` files.
import { PHOTO_LIBRARY, type PhotoPixels, type Photos } from '#src/features/content/content.ts'
import { decodePng } from '#src/lib/png-read.ts'

const ADDRESSES = import.meta.glob('../../../photos/*.png', { query: '?url', import: 'default', eager: true })

/** The bytes of `photos/<file>`. */
export async function photoBytes(file: string): Promise<Uint8Array> {
  if (typeof window === 'undefined') {
    const { readFile } = await import('node:fs/promises')
    const { fileURLToPath } = await import('node:url')
    return new Uint8Array(await readFile(fileURLToPath(new URL(`../../../photos/${file}`, import.meta.url))))
  }
  const address = ADDRESSES[`../../../photos/${file}`]
  if (address === undefined) throw new Error(`There is no photo called "${file}" in photos/.`)
  return new Uint8Array(await (await fetch(address)).arrayBuffer())
}

/** The painter's photos for these library ids, read and decoded: `Photos` is sync, so the files are read first. */
export async function libraryPhotos(ids: readonly string[]): Promise<Photos> {
  const loaded = new Map<string, PhotoPixels>()
  for (const id of ids) {
    const record = PHOTO_LIBRARY[id]
    if (record === undefined) throw new Error(`There is no library photo called "${id}".`)
    loaded.set(id, { ...decodePng(await photoBytes(record.file)), size: record.size })
  }
  return (id) => loaded.get(id)
}

import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// Until Release 1 a game gets this package as a git dependency pinned to a commit on `main`, not from npm. `dist/` is
// not committed, so the package manager has to build it on install, and it only does that for a package with a
// `prepare` script. Without the script the install succeeds and both entry points point at files that are not there.
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  scripts: Record<string, string>
  files: string[]
  exports: Record<string, { types?: string; import?: string } | string>
  dependencies: Record<string, string>
}

test('a git install builds the package: prepare runs the build', () => {
  expect(manifest.scripts.prepare).toBe('pnpm build')
})

test('what the build writes is what the package ships and points at', () => {
  expect(manifest.files).toContain('dist')
  expect(manifest.exports['.']).toMatchObject({ import: './dist/index.js' })
  expect(manifest.exports['./headless']).toMatchObject({ import: './dist/headless.js' })
})

// The room server is Node only, so it is a third entry of its own: a game's page never loads it.
test("the room server is the package's own entry", () => {
  expect(manifest.exports['./server']).toEqual({
    types: './dist/server.d.ts',
    import: './dist/server.js',
  })
})

// Online play runs on Colyseus, at the versions the old repo ran. `@colyseus/schema` is named by no file: `@colyseus/core`
// requires it installed beside it, so it is a dependency of ours too, at the version its sibling was built against.
test('the networking packages are dependencies at the exact versions', () => {
  expect(manifest.dependencies['@colyseus/core']).toBe('0.18.18')
  expect(manifest.dependencies['@colyseus/schema']).toBe('5.0.36')
  expect(manifest.dependencies['@colyseus/ws-transport']).toBe('0.18.4')
  expect(manifest.dependencies['@colyseus/sdk']).toBe('0.18.5')
  expect(manifest.dependencies.effect).toBe('3.22.2')
})

// Rapier's code is built into the package's own files, and its licence (Apache-2.0) asks that a copy travels with it.
// The package exports that copy by name so a game can read it and ship it beside its own files.
test("Rapier's licence is exported by name, from the files the package ships", () => {
  expect(manifest.exports['./rapier.LICENSE']).toBe('./dist/rapier.LICENSE')
})

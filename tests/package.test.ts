import { readdirSync, readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// Until Release 1 a game gets this package as a git dependency pinned to a commit on `main`, not from npm. `dist/` is
// not committed, so the package manager has to build it on install, and it only does that for a package with a
// `prepare` script. Without the script the install succeeds and both entry points point at files that are not there.
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  scripts: Record<string, string>
  bin: Record<string, string>
  files: string[]
  exports: Record<string, { types?: string; import?: string } | string>
  dependencies: Record<string, string>
  devDependencies?: Record<string, string>
}

// `node --run`, not `pnpm`: a game installs this package from git with npm, on a machine that may have no pnpm.
test('a git install builds the package: prepare runs the build with Node alone', () => {
  expect(manifest.scripts.prepare).toBe('node --run build')
})

test('the build writes the declarations so they load under NodeNext and an older TypeScript', () => {
  expect(manifest.scripts.build).toMatch(/&& node scripts\/fix-dts\.ts$/)
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

// The `automata` command is a fourth entry of the same package: one bin, built from `src/cli.ts`, and the template and
// the skills it writes and serves ship beside it.
test('the package has one bin, automata, built from src/cli.ts', () => {
  expect(manifest.bin).toEqual({ automata: './dist/cli.js' })
  const build = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
  expect(build).toContain("cli: 'src/cli.ts'")
})

test('the package ships the template and the skills', () => {
  expect(manifest.files).toEqual(expect.arrayContaining(['template', 'skills', 'docs/api/framework.api.md']))
})

// The Owner's answer to Q1 (2026-11-14): `automata mcp` is our own server, and the official MCP SDK is only the client a
// test checks it with, so the package's users never install it.
test('the MCP SDK is a development dependency at one exact version, and the package never imports it', () => {
  expect(manifest.devDependencies?.['@modelcontextprotocol/sdk']).toBe('1.32.2')
  expect(manifest.dependencies['@modelcontextprotocol/sdk']).toBeUndefined()
  const sources = readdirSync(new URL('../src/', import.meta.url), { recursive: true, encoding: 'utf8' })
  for (const file of sources.filter((name) => name.endsWith('.ts'))) {
    expect(readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8'), file).not.toContain(
      '@modelcontextprotocol',
    )
  }
})

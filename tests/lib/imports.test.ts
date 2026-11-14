import { expect, test } from 'vitest'
import { importsOf, resolveImport, withoutComments } from '#src/lib/imports.ts'

test('comments are taken out, and a // inside a string or a URL is not a comment', () => {
  expect(withoutComments('a // b\nc /* d\ne */ f')).toBe('a \nc \n f')
  expect(withoutComments("const u = 'https://x.y'")).toBe("const u = 'https://x.y'")
})

test("a comment that spans lines leaves its line breaks, so a line counted in the rest is the file's line", () => {
  const code = withoutComments('/* one\ntwo\nthree */\nconst a = Math.random()')
  expect(code.slice(0, code.indexOf('const')).split('\n')).toHaveLength(4)
})

test('every import says where it starts in the text', () => {
  const code = "const a = 1\nimport { b } from './b.ts'\nconst c = await import('./c.ts')"
  expect(importsOf(code).map((i) => [i.spec, code.slice(i.index, i.index + 6)])).toEqual([
    ['./b.ts', 'import'],
    ['./c.ts', 'import'],
  ])
})

test('every way to import is found, with the specifier as written', () => {
  const code = [
    "import { a } from './a.ts'",
    "export * from './b.ts'",
    "import './c.ts'",
    "const d = await import('./d.ts')",
    "import x from 'pixi.js'",
  ].join('\n')
  expect(importsOf(code).map((i) => i.spec)).toEqual(['./a.ts', './b.ts', 'pixi.js', './c.ts', './d.ts'])
})

test('an import type or export type is typeOnly, and an import with a type inside it is not', () => {
  const code = [
    "import type { A } from './a.ts'",
    "import { type B } from './b.ts'",
    "export type * from './c.ts'",
  ].join('\n')
  const found = importsOf(code)
  expect(found.map((i) => [i.spec, i.typeOnly])).toEqual([
    ['./a.ts', true],
    ['./b.ts', false],
    ['./c.ts', true],
  ])
})

test('a relative specifier is resolved against the importing file, .. and . included', () => {
  expect(resolveImport('src/features/cli/check.ts', './report.ts')).toBe('src/features/cli/report.ts')
  expect(resolveImport('src/features/cli/check.ts', '../commands/commands.ts')).toBe(
    'src/features/commands/commands.ts',
  )
  expect(resolveImport('src/headless.ts', './lib/zod.ts')).toBe('src/lib/zod.ts')
  expect(resolveImport('a.ts', './b.ts')).toBe('b.ts')
})

import { expect, test } from 'vitest'
import { fixDts } from '../../scripts/fix-dts.ts'

test("from './x.ts' becomes './x.js', in all three forms", () => {
  expect(fixDts("export * from './features/sim/sim.ts'")).toBe("export * from './features/sim/sim.js'")
  expect(fixDts("import type { A } from '../lib/a.ts'")).toBe("import type { A } from '../lib/a.js'")
  expect(fixDts("type T = import('./b.ts').B")).toBe("type T = import('./b.js').B")
  expect(fixDts("import './side.ts'")).toBe("import './side.js'")
  expect(fixDts('import "./quoted.ts"')).toBe('import "./quoted.js"')
})

test("a package name, a '.d.ts' and a '.json' are left alone", () => {
  for (const same of [
    "import { Application } from 'pixi.js'",
    "export * from './raw.d.ts'",
    "import data from './x.json'",
    "import { x } from 'some-package/file.ts'",
    "const note = 'see ./x.ts for more'",
  ])
    expect(fixDts(same)).toBe(same)
})

test('several on one line and several lines are all changed', () => {
  expect(fixDts("import { a } from './a.ts'; import { b } from './b.ts'\nexport * from './c.ts'\n")).toBe(
    "import { a } from './a.js'; import { b } from './b.js'\nexport * from './c.js'\n",
  )
})

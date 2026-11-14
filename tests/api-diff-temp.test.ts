// Temporary: shows what `pnpm api-report` wants, as a test diff, because that command's own failure prints nothing.
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { extractApi } from '../scripts/api-report/extract.ts'
import { renderReport } from '../scripts/api-report/report.ts'

test('the api report', () => {
  const root = `${process.cwd()}/`
  const manifest = JSON.parse(readFileSync(`${root}package.json`, 'utf8')) as { name: string }
  const text = renderReport(
    extractApi({
      name: manifest.name,
      dir: root.replace(/\/$/, ''),
      entries: [
        { entryPoint: '.', file: `${root}src/index.ts` },
        { entryPoint: './headless', file: `${root}src/headless.ts` },
        { entryPoint: './server', file: `${root}src/server.ts` },
      ],
    }),
  )
  expect(text).toBe(readFileSync(`${root}docs/api/framework.api.md`, 'utf8'))
})

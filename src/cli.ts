#!/usr/bin/env node
// The package's `bin`: `automata`. It is Node only, so no page entry reaches it. Everything is in the cli feature.
import { main } from './features/cli/cli.ts'

const code = await main(process.argv.slice(2))
// Let what is already written reach a pipe before the process ends: a long answer must not be cut short.
const flushed = (stream: NodeJS.WriteStream): Promise<void> =>
  new Promise((done) => stream.write('', () => done()))
await Promise.all([flushed(process.stdout), flushed(process.stderr)])
process.exit(code)

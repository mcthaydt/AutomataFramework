// What a game's rules print must never land where an answer is read. `automata mcp` speaks its protocol on standard
// output, and `--json` promises one JSON value there and nothing else, so while either runs, `console.log`, `info` and
// `debug` (which a rule an agent is debugging may well call) are pointed at standard error instead.
import { format } from 'node:util'

/** Points `console.log`, `info` and `debug` at stderr. The function it gives puts them back. */
export function printToStderr(): () => void {
  const names = ['log', 'info', 'debug'] as const
  const saved = names.map((name) => console[name])
  for (const name of names)
    console[name] = (...args: unknown[]) => void process.stderr.write(`${format(...args)}\n`)
  return () => {
    names.forEach((name, i) => {
      console[name] = saved[i] as (typeof console)[typeof name]
    })
  }
}

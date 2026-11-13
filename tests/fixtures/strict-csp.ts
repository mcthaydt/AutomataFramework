// What a page under a strict CSP does to code built from strings. A game on itch, Wavedash or a locked-down host runs
// with script-src 'self' 'wasm-unsafe-eval': `new Function` is refused, and Firefox also reports even the attempt
// (zod's probe, which catches the refusal) as a security-policy violation in the console. This stands in for that CSP
// in a test: while `load` runs, `Function` throws like the CSP does, and every attempt is counted, caught or not.
// A test file uses it for the first load of the code under test, since modules are cached after the first.

/** What `load` built from strings while it ran, as a list of the sources asked for (empty when none). */
export async function attemptsToBuildCode(load: () => Promise<unknown>): Promise<string[]> {
  const RealFunction = globalThis.Function
  const attempts: string[] = []
  const refuse = (args: ArrayLike<unknown>): never => {
    attempts.push(String(args[args.length - 1] ?? ''))
    throw new EvalError("Refused to evaluate a string as JavaScript: 'unsafe-eval' is not an allowed source")
  }
  globalThis.Function = new Proxy(RealFunction, {
    construct: (_target, args) => refuse(args),
    apply: (_target, _this, args) => refuse(args),
  })
  try {
    await load()
  } finally {
    globalThis.Function = RealFunction
  }
  return attempts
}

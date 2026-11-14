// Reading the imports out of a file's text: the architecture rules read this repo's files with it, and `automata
// check`'s rules step reads a game's. It looks at text, not at a syntax tree, so it can be fooled by a string that looks
// like an import; the compiler and the replays catch what matters.

/**
 * Comments say why and may name the very things a rule forbids, so rules read the code without them. A comment that
 * spans lines leaves its line breaks, so a place found in what is left is on the same line of the file.
 */
export function withoutComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ''))
    .replace(/(?<![:'"`\w])\/\/.*$/gm, '')
}

const IMPORT_PATTERNS: readonly RegExp[] = [
  /\b(?:import|export)\s[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
]

/** One thing a file imports. */
export interface Import {
  readonly spec: string
  /** `import type ... from` or `export type ... from`: gone after compiling. */
  readonly typeOnly: boolean
  /** Where the statement starts in `code`. */
  readonly index: number
}

/** Every import and re-export in `code` (text with its comments already taken out), in the order of the patterns. */
export function importsOf(code: string): Import[] {
  const found: Import[] = []
  for (const pattern of IMPORT_PATTERNS) {
    for (const m of code.matchAll(pattern)) {
      found.push({ spec: m[1] ?? '', typeOnly: /^(?:import|export)\s+type\b/.test(m[0]), index: m.index })
    }
  }
  return found
}

/** `from` is a file path; `to` a relative specifier. Gives a normalised path from the same root as `from`. */
export function resolveImport(from: string, to: string): string {
  const parts = from.split('/').slice(0, -1)
  for (const part of to.split('/')) {
    if (part === '.' || part === '') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

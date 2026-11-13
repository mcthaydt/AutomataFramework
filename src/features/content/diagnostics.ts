import type { z } from 'zod'

/** One problem in one file: which file, where in it (`''` for the whole file) and what to do about it. */
export interface Diagnostic {
  readonly file: string
  readonly path: string
  readonly message: string
}

/** `file: path: message`, or `file: message` when the problem is about the whole file. */
export function formatDiagnostic(d: Diagnostic): string {
  return d.path === '' ? `${d.file}: ${d.message}` : `${d.file}: ${d.path}: ${d.message}`
}

/** The words a content type adds to a problem: what to call the file, and what to write for a missing field. */
export interface Voice {
  /** "level" gives "This is not something a level has." */
  readonly noun: string
  /** Advice for a missing field, keyed by its place with the list numbers left out, like `things.id`. */
  readonly missing: Readonly<Record<string, string>>
}

type Place = readonly PropertyKey[]

/** `things[0].x`: names for objects joined with dots, list numbers in brackets. */
function pathText(path: Place): string {
  let text = ''
  for (const part of path) {
    if (typeof part === 'number') text += `[${part}]`
    else text += text === '' ? String(part) : `.${String(part)}`
  }
  return text
}

/** What is at `path` in the data as it was read, or undefined when nothing is there. */
function valueAt(data: unknown, path: Place): unknown {
  let here = data
  for (const part of path) {
    if (typeof here !== 'object' || here === null) return undefined
    here = (here as Record<PropertyKey, unknown>)[part]
  }
  return here
}

const TYPE_WORDS: Readonly<Record<string, string>> = {
  string: 'This must be text.',
  number: 'This must be a number.',
  int: 'This must be a whole number.',
  boolean: 'This must be true or false.',
  array: 'This must be a list: it starts with [ and ends with ].',
}

/** One plain sentence for one Zod issue (unknown keys are split into one problem each by `toDiagnostics`). */
function sentence(issue: z.core.$ZodIssue, data: unknown, voice: Voice): string {
  switch (issue.code) {
    case 'invalid_type': {
      if (valueAt(data, issue.path) === undefined) {
        const key = issue.path.filter((p) => typeof p !== 'number').join('.')
        const hint = voice.missing[key]
        return hint === undefined ? 'This is missing.' : `This is missing. ${hint}`
      }
      if (issue.expected === 'object')
        return issue.path.length === 0
          ? 'This must be an object: the file should start with { and end with }.'
          : 'This must be an object: it should start with { and end with }.'
      return TYPE_WORDS[String(issue.expected)] ?? issue.message
    }
    case 'invalid_value':
      return issue.values.length === 1
        ? `This must be ${String(issue.values[0])}.`
        : `This must be one of: ${issue.values.map(String).join(', ')}.`
    case 'too_small':
      if (issue.origin === 'number' || issue.origin === 'int')
        return issue.inclusive
          ? `This must be ${String(issue.minimum)} or more.`
          : `This must be more than ${String(issue.minimum)}.`
      return `This needs at least ${String(issue.minimum)} ${issue.origin === 'string' ? 'characters' : 'items'}.`
    case 'too_big':
      if (issue.origin === 'number' || issue.origin === 'int')
        return issue.inclusive
          ? `This must be ${String(issue.maximum)} or less.`
          : `This must be less than ${String(issue.maximum)}.`
      return `This has more than ${String(issue.maximum)} ${issue.origin === 'string' ? 'characters' : 'items'}, which is the most allowed.`
    default:
      return issue.message
  }
}

/**
 * Turns what Zod found into plain sentences, one per problem, in the order found. An unknown key becomes one
 * problem per key, each at the key's own place, so the author sees exactly what to delete.
 */
export function toDiagnostics(
  issues: readonly z.core.$ZodIssue[],
  data: unknown,
  file: string,
  voice: Voice,
): Diagnostic[] {
  const found: Diagnostic[] = []
  for (const issue of issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys)
        found.push({
          file,
          path: pathText([...issue.path, key]),
          message: `This is not something a ${voice.noun} has. Remove it or check the spelling.`,
        })
    } else {
      found.push({ file, path: pathText(issue.path), message: sentence(issue, data, voice) })
    }
  }
  return found
}

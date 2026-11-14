// The real template, put into the memory layer where `automata create` looks for it: under the package's own folder.
import { join } from 'node:path'
import { packageRoot } from '#src/features/cli/template.ts'
import { templateTree } from '../../template/tree.ts'

/** Every file of `template/`, keyed by where the command reads it from. */
export function templateInMemory(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(templateTree()).map(([path, text]) => [join(packageRoot(), 'template', path), text]),
  )
}

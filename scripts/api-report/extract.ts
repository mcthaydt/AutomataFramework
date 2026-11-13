// Lifted from AutomataFrameworkFailed@ed8592e8: tooling/api-report/src/extract.ts
// Trimmed to what one package needs: no Svelte kind, no `.d.ts` reader, no workspace `paths`.
// The extractor behind `pnpm api-report`. It reads each entry point from source: this repo builds with
// `isolatedDeclarations`, so TypeScript 6's `transpileDeclaration` turns every source file into its declarations
// alone. Files outside `src/` (zod, pixi.js, koota) load as empty modules, because only declaration text is read,
// never types: nothing external is needed, no build either, and a run takes seconds. The checker then resolves each
// export's aliases across files, and `describeExport` names its kind and declaration text.
// TypeScript 7 has no stable JS API yet, so this one file uses TypeScript 6 (the `typescript-6` dev dependency),
// which the spec's stack table allows "where a tool needs the JS API". `scripts/` is meant for thin wrappers; this and
// `report.ts` are the exception until the `cli` feature exists (M2).
import { readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import ts from 'typescript-6'

export type ApiKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'const'
  | 'let'
  | 'var'
  | 'namespace'
  | 'unresolved'
  | 'other'

export interface ApiExport {
  readonly name: string
  readonly kind: ApiKind
  /** The declaration(s) without `export`/`declare`, named as exported; merged declarations one after another. */
  readonly declaration: string
}

export interface ApiEntry {
  readonly entryPoint: string
  readonly exports: readonly ApiExport[]
}

export interface PackageApi {
  readonly package: string
  readonly entries: readonly ApiEntry[]
}

/** The package to read: where it lives, and which source file each `exports` key points at. */
export interface ApiPackage {
  readonly name: string
  readonly dir: string
  readonly entries: readonly { readonly entryPoint: string; readonly file: string }[]
}

/** Case-insensitive, then by code unit: the same order on every machine, whatever its locale. */
export function byName(a: string, b: string): number {
  const lowerA = a.toLowerCase()
  const lowerB = b.toLowerCase()
  if (lowerA !== lowerB) return lowerA < lowerB ? -1 : 1
  return a < b ? -1 : a > b ? 1 : 0
}

function kindOf(declaration: ts.Declaration): ApiKind {
  if (ts.isFunctionDeclaration(declaration)) return 'function'
  if (ts.isClassDeclaration(declaration)) return 'class'
  if (ts.isInterfaceDeclaration(declaration)) return 'interface'
  if (ts.isTypeAliasDeclaration(declaration)) return 'type'
  if (ts.isEnumDeclaration(declaration)) return 'enum'
  if (ts.isModuleDeclaration(declaration) || ts.isSourceFile(declaration)) return 'namespace'
  if (ts.isVariableDeclaration(declaration)) {
    const flags = ts.getCombinedNodeFlags(declaration)
    if (flags & ts.NodeFlags.Const) return 'const'
    return flags & ts.NodeFlags.Let ? 'let' : 'var'
  }
  return 'other'
}

const LEADING_MODIFIERS = /^(?:(?:export|declare|default)\s+)+/

/** One declaration's text, named `name` even where it was declared under another local name. */
function declarationText(declaration: ts.Declaration, name: string): string {
  if (ts.isSourceFile(declaration)) return `namespace ${name}`
  const start = declaration.getStart()
  let text = declaration.getText()
  const ownName = ts.getNameOfDeclaration(declaration)
  if (ownName !== undefined && ownName.getText() !== name) {
    const from = ownName.getStart() - start
    text = text.slice(0, from) + name + text.slice(from + ownName.getText().length)
  }
  if (ts.isVariableDeclaration(declaration)) return `${kindOf(declaration)} ${text};`
  return text.replace(LEADING_MODIFIERS, '')
}

/** The module an unresolved re-export names, e.g. `./dialog/Dialog.ts`. */
function reexportSource(alias: ts.Symbol): string | undefined {
  for (const declaration of alias.declarations ?? []) {
    const exportDeclaration = ts.isExportSpecifier(declaration) ? declaration.parent.parent : undefined
    const specifier = exportDeclaration?.moduleSpecifier
    if (specifier !== undefined && ts.isStringLiteral(specifier)) return specifier.text
  }
  return undefined
}

function describeExport(exported: ts.Symbol, checker: ts.TypeChecker): ApiExport {
  const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
  const declarations = symbol.declarations ?? []
  const [first] = declarations
  if (first === undefined) {
    // The alias resolves to nothing: a module the program cannot read, so the export is named by where it comes from.
    return {
      name: exported.name,
      kind: 'unresolved',
      declaration: `from '${reexportSource(exported) ?? '?'}'`,
    }
  }
  return {
    name: exported.name,
    kind: kindOf(first),
    declaration: declarations.map((declaration) => declarationText(declaration, exported.name)).join('\n'),
  }
}

/** The API of the package: entry points in `exports` order, exports sorted by `byName`. */
export function extractApi(pkg: ApiPackage): PackageApi {
  const sourceDir = join(pkg.dir, 'src') + sep
  const isSource = (file: string): boolean =>
    !file.endsWith('.d.ts') && /\.[cm]?ts$/.test(file) && file.startsWith(sourceDir)
  const options: ts.CompilerOptions = {
    noLib: true,
    types: [],
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
  }
  const host = ts.createCompilerHost(options, true)
  host.getSourceFile = (fileName, languageVersion) => {
    if (!isSource(fileName)) return ts.createSourceFile(fileName, '', languageVersion, true)
    const declarations = ts.transpileDeclaration(readFileSync(fileName, 'utf8'), {
      fileName,
      compilerOptions: { isolatedDeclarations: true, declaration: true, removeComments: true },
    }).outputText
    return ts.createSourceFile(fileName, declarations, languageVersion, true)
  }
  const program = ts.createProgram(
    pkg.entries.map((entry) => entry.file),
    options,
    host,
  )
  const checker = program.getTypeChecker()
  return {
    package: pkg.name,
    entries: pkg.entries.map((entry) => {
      const source = program.getSourceFile(entry.file)
      const moduleSymbol = source === undefined ? undefined : checker.getSymbolAtLocation(source)
      // An entry that is not a module (no import or export) has no exports.
      const exports = moduleSymbol === undefined ? [] : checker.getExportsOfModule(moduleSymbol)
      return {
        entryPoint: entry.entryPoint,
        exports: exports
          .map((exported) => describeExport(exported, checker))
          .sort((a, b) => byName(a.name, b.name)),
      }
    }),
  }
}

// The types of `fix-dts.mjs`, which is plain JavaScript (see there for why).

/**
 * Turns a relative specifier that ends `.ts` into one that ends `.js`, in `from '...'`, `import('...')` and
 * `import '...'`, and changes nothing else.
 */
export function fixDts(text: string): string

// Vite's `import.meta.glob`, in the one form the tests use: every file that matches, as its text, read when the module
// loads. A file that is not there is not in the answer, so a test can say what to do about a missing one.
interface ImportMeta {
  glob(
    pattern: string,
    options: { readonly query: '?raw'; readonly import: 'default'; readonly eager: true },
  ): Record<string, string>
}

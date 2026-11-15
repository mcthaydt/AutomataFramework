// `svelte-check` reads TypeScript's JavaScript API, which TypeScript 7 does not have yet, so it must run on the 6 this
// repo keeps as `typescript-6` for such tools. `svelte-check` asks for TypeScript as a peer, and neither an override nor
// a package extension reaches a peer (pnpm gives it the repo's own TypeScript 7), so its peer is turned into its own
// dependency here.
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === 'svelte-check') {
        delete pkg.peerDependencies.typescript
        pkg.dependencies = { ...pkg.dependencies, typescript: 'npm:typescript@6.0.3' }
      }
      return pkg
    },
  },
}

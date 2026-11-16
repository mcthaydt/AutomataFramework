This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it.

# AutomataFramework

A framework and set of editors for making games, where agents do the authoring and every piece of authorable content
can be edited on an iPad. This repo is the 2D runtime, `@automataframework/framework`. The first layer's design is
[`docs/superpowers/specs/2026-11-13-2d-first-layer-design.md`](docs/superpowers/specs/2026-11-13-2d-first-layer-design.md);
where this page is short, the spec has the detail.

**The shared rules are in [`docs/rules.md`](docs/rules.md)** (principles, the Owner's decisions, the workflow, the
visual review, sessions, the rules and Fast CI). Read it first. This page holds only what is particular to this repo.

## This repo

- **The shared rules page and the roadmap live here:** [`docs/rules.md`](docs/rules.md) and
  [`docs/roadmap.md`](docs/roadmap.md). Change a shared rule in `docs/rules.md` only, never in another repo's
  `CLAUDE.md`. The specs for every repo are here too, under `docs/superpowers/specs/`.
- **Fast CI here.** A draft runs only the Node and browser tests the change reaches; the `online` job only when the
  networking or its journeys changed, or the pull request has the `screenshots` label (those journeys take the
  pictures); the packing and `create` jobs only when the command, the template, the skills or the install checks
  changed. `.pnpmfile.cjs` also counts as build setup. The docs-only path never covers the README or `docs/api/`
  (tests read them). The browsers' six shards are `browsers (<engine> <n>/2)`, with `engines (<engine>)` checks.

## Structure

```
src/index.ts                  the public surface
src/headless.ts               the entry for Node and editors: everything that needs no page
src/server.ts                 the Node-only entry: the room server (`@automataframework/framework/server`)
src/cli.ts                    the package's `bin`, `automata`: Node only, calls the `cli` feature
src/lib/                      shared helpers, no feature logic; `zod.ts` is the one way into Zod (it turns its eval probe off first)
src/features/<feature>/       <feature>.ts entry, <part>.ts one job per file, library/ JSON data
scripts/                      thin CLI wrappers
template/                     the game `automata create` writes: a real game folder; `template/replays/level-1.json` is a golden
skills/                       the skills an agent reads to work on a game (shipped in the package)
tests/architecture.test.ts    imports go down, no cycles, no tests in src
tests/features/<feature>/     mirrors src/features
tests/lib/                    tests of src/lib
tests/fixtures/               shared test helpers and the example game's files
tests/install/                installs the packed package in a clean folder and uses it; `create-smoke.mjs` runs the README's commands
tests/journeys/               real browsers play one room against a server CI starts (own Vitest project, the `online` job)
tests/create/                 a new game, made from the packed package, played in real browsers (own Vitest project, the `create-play` job)
tests/workflows/, tests/docs/ checks that read a workflow or the README
tests/template/               checks of the template: its files, its words, its recorded play, its page in real browsers
tests/golden/                 recorded hashes and replays
docs/superpowers/             specs/, plans/, audits/, progress.md (open work), history.md
```

The networking is two features: `net` (pure: the wire, the room's rules and the client that predicts, just above
`commands`) and `server` (Node only, above `level`: the Colyseus room and the process; only `src/server.ts` may import it).
The `automata` command is the last feature, `cli` (Node only, on Effect, using only what `src/headless.ts` re-exports; only
`src/cli.ts` may import it).
The default game flow is the feature `flow` (page, the one above `game`: the steps a visit walks as one pure function
(`steps.ts`), the saved games (`places.ts`), the progress a game keeps and who is playing, the screens on top of the menu
and of pause (`overs.ts`), and `startFlow`, which connects them to the page; the screens it draws are in `screens`, below
`game`).
Features import only from features below them. No top-level `components/`, `services/` or `utils/`.

The screens are drawn with Svelte 5, in two features between `web` and `game`: `ui` (the kit: buttons, sliders, a frame)
and `screens` (one screen per `.ts` and `.svelte` pair). Only those two features may hold a `.svelte` file or import
`svelte` (`tests/architecture/rules.ts` fails anything else). `svelte` is a dependency left for the game's bundler, and
`pnpm typecheck` also runs `svelte-check`, which needs TypeScript 6: `.pnpmfile.cjs` gives it the `typescript-6` copy,
since a pnpm override does not reach a peer dependency.

`biome.json` turns off a rule for two groups of files and says why here, since JSON has no comments: `noSvgWithoutTitle` for
the drawings in `src/features/web/library/` and `src/features/ui/library/` (a flag or an icon is drawn inside a button that
has the name; the page marks the drawing hidden from a screen reader, and a title inside it would be read twice), and
`useHtmlLang` for `template/index.html` (no language is the default, so the page sets `lang` itself once the player has
one). It also leaves `.svelte` files out: Biome does not read Svelte's runes, and `svelte-check` is their check.

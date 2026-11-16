This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it.

# AutomataFramework

The 2D runtime, `@automataframework/framework`, of a framework and set of editors for making games, where agents do
the authoring and every piece of authorable content can be edited on an iPad. The shared rules for every repo are
below, imported from `docs/rules.md`; this page holds only what is particular to this repo. The shared rules page,
the Owner's decisions (`docs/decisions.md`), the roadmap (`docs/roadmap.md`), every repo's specs
(`docs/superpowers/specs/`) and the workflow skills and hooks (`.claude/`) live here.

@docs/rules.md

## This repo

- **Fast CI here.** A draft runs Chromium only, and only the Node and browser tests the change reaches (the browser
  tests are the screens, so only the screens it touches); the `online` job only when the networking or its journeys
  changed, or the pull request has the `screenshots` label, and then in Chromium alone (`JOURNEY_ENGINES`, which
  `online` and `create-play` read; the full run plays all three); the packing and `create` jobs only when the command, the
  template, the skills or the install checks changed. `.pnpmfile.cjs` counts as build setup. The docs-only path never
  covers the README or `docs/api/`, which tests read. The full run's shards and `engines (<engine>)` gates are set in
  `ci.yml`.
- **Two kinds of skill.** `skills/` ships in the package, for agents making a game. `.claude/skills/` is for the
  sessions working on these repos, and never ships.

## Structure

```
src/index.ts, src/headless.ts the public surface; headless is everything that needs no page (Node, editors)
src/server.ts, src/cli.ts     Node-only entries: the room server, and the `automata` command (the package's `bin`)
src/lib/                      shared helpers, no feature logic; `zod.ts` is the one way into Zod
src/features/<feature>/       <feature>.ts entry, <part>.ts one job per file, library/ JSON data
template/                     the game `automata create` writes; `template/replays/level-1.json` is a golden;
                              `template/tests/play/` plays its built page in Chromium and WebKit (`npm run play-test`)
tests/                        mirrors src/; journeys/, create/ and install/ use real browsers or the packed package
tests/golden/                 recorded hashes and replays
docs/superpowers/             specs/, plans/, audits/, progress.md (open work), history.md
```

- Features import only from features below them (`tests/architecture/rules.ts` checks it). `net` is pure, just above
  `commands`; `server` is Node only, above `level`, imported only by `src/server.ts`; `cli` is the last feature, on
  Effect, uses only what `src/headless.ts` re-exports, and is imported only by `src/cli.ts`. `flow`, the one above
  `game`, is the default game flow (the visit, losing and trying again, the score and Back); the screens it draws are
  in `screens`, below `game`.
- Svelte 5 is allowed only in `ui` (the kit) and `screens` (one `.ts` and `.svelte` pair per screen). `pnpm typecheck`
  runs `svelte-check`, which needs TypeScript 6: `.pnpmfile.cjs` gives it the `typescript-6` copy, since a pnpm
  override does not reach a peer dependency.
- `biome.json` turns off two rules, and says why here since JSON has no comments: `noSvgWithoutTitle` for the drawings
  in `src/features/web/library/` and `src/features/ui/library/` (each sits inside a button that has the name, hidden
  from screen readers), and `useHtmlLang` for `template/index.html` (the page sets `lang` once the player has one). It
  leaves `.svelte` files to `svelte-check`, since Biome does not read Svelte's runes.

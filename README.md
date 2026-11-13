# AutomataFramework

A 2D game runtime for agents and for editors that work on an iPad. A game is a folder of JSON and TOML files plus a
little code. The simulation is deterministic: the same game, played with the same inputs, ends on the same hash in
Node, Chromium, WebKit and Firefox, so an agent can change a game and prove that what used to work still does.

This package is `@automataframework/framework`. It is the 2D runtime: the simulation, physics (Rapier), commands and
replays, level and character content, rendering (PixiJS), keyboard and touch input, and the web host.

## Install

```sh
npm install @automataframework/framework   # not on npm yet: the first release is Release 1, when 2D is finished
```

It needs a browser (or Node, for the headless entry) with ES2023 and WebAssembly.

## The smallest game

A game is a folder with `automata.toml` at its root, next to the files it lists:

```toml
format = 1
name = "Crate Game"
start = "level-1"   # the level a new game opens
hero = "hero"       # the character each player controls

[[content]]
type = "level"
path = "content/levels/level-1.json"

[[content]]
type = "character"
path = "content/characters/hero.json"
```

Load it, and start it in an element of your page:

```ts
import { formatDiagnostic, loadGame, startGame, webHost } from '@automataframework/framework'

const loaded = await loadGame((path) => fetch(`/game/${path}`).then((r) => r.text()))
if (!loaded.ok) throw new Error(loaded.diagnostics.map(formatDiagnostic).join('\n'))

const game = await startGame({
  content: loaded.value,
  mount: document.getElementById('game') as HTMLElement,
  host: webHost(),
  controls: {
    left: { label: 'Left', keys: ['ArrowLeft', 'KeyA'], side: 'left' },
    right: { label: 'Right', keys: ['ArrowRight', 'KeyD'], side: 'left' },
    jump: { label: 'Jump', keys: ['Space', 'ArrowUp'], side: 'right' },
  },
})
```

`loadGame` never throws: a file that is missing or wrong comes back as a plain message that names the file and the
place. On a phone, the touch buttons show up the first time a finger touches the screen.

What a hero does with the controls (run, jump) is the game's own code, a plugin built with `definePlugin` and
`defineSystem`; pass it to `startGame` as `plugins: [...]`.

## Replays

`game.replay()` returns everything the player did, as JSON. `verifyReplay(sim, replay)` plays it on a fresh game and says
whether it ends where it was recorded, and if not whether the game's content changed or the play diverged.
`playReplay` only plays and returns the hashes, so two machines can compare them with each other.

## Without a page

`@automataframework/framework/headless` has everything that needs no page (the simulation, physics, commands, content
and levels). It is safe in Node and in an editor that only checks and writes files:

```ts
import { createGameSim, loadGame } from '@automataframework/framework/headless'
```

## Schemas

Every kind of content file has a JSON Schema, shipped in the package so an agent can read the format without running
anything:

- `@automataframework/framework/schemas/level.schema.json`
- `@automataframework/framework/schemas/character.schema.json`

`writeContent(type, value)` is the one way to write a content file, so two writers of the same value make the same bytes.

## The public API

`docs/api/framework.api.md` lists every export of both entries. It is generated (`pnpm api-report --update`), and CI
fails if it is out of date.

## Working on this repo

Tests run only in GitHub Actions. Locally, `pnpm lint`, `pnpm typecheck`, `pnpm knip` and `pnpm build` are fine.
See `CLAUDE.md` for how the work is staged.

## License

MIT

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

### Make the touch buttons your own

The touch buttons look the same in every game until a game says otherwise. To change how they look, set these CSS
custom properties on the `mount` element you gave `startGame` (or any element above it). Anything you leave out keeps its
default. The buttons' size, spacing and touch behaviour are not on the list, so a thumb can always find them.

| Property | Default |
|---|---|
| `--automata-touch-background` | `rgba(20,20,30,0.55)` |
| `--automata-touch-color` | `#fff` |
| `--automata-touch-border` | `2px solid rgba(255,255,255,0.85)` |
| `--automata-touch-radius` | `16px` |
| `--automata-touch-font` | `700 18px/1.1 system-ui,sans-serif` |
| `--automata-touch-pressed-background` | `rgba(255,255,255,0.55)` |
| `--automata-touch-pressed-color` | `#111` |

The row of buttons has the class `automata-touch`, each button the class `automata-touch-button`, and each button
`data-action` set to its action's name, so a stylesheet can pick out one:

```css
#game {
  /* the element used as `mount` */
  --automata-touch-background: navy;
  --automata-touch-radius: 2px;
}
#game .automata-touch-button[data-action='jump'] { text-transform: uppercase; }
```

What a hero does with the controls (run, jump) is the game's own code, a plugin built with `definePlugin` and
`defineSystem`; pass it to `startGame` as `plugins: [...]`.

## Gamepads, changing keys and playing together

Each control can name gamepad buttons (`pad:`) and two lists of keys for two people on one keyboard (`shared:`: the
first person's, then the second's). Pad names come from `PAD_BUTTONS` and `PAD_STICKS`, such as `south`, `dpad-left` or
`left-stick-left`. A game that keeps its controls in a tuning file passes the list through `controlsFromList`.

```ts
const controls = {
  left: { label: 'Left', keys: ['ArrowLeft', 'KeyA'], side: 'left', pad: ['dpad-left', 'left-stick-left'], shared: [['KeyA'], ['ArrowLeft']] },
  jump: { label: 'Jump', keys: ['Space', 'ArrowUp'], side: 'right', pad: ['south'], shared: [['KeyW'], ['ArrowUp']] },
}
```

A game with one player needs nothing more: a gamepad plugged in just works. For two to four people on one screen, say
`players = 2` (up to 4) in `automata.toml` and give each level a start point for each player. Then let people in:

```ts
// "Press a button on your gamepad to join": each free gamepad that is pressed becomes the next player.
const stop = game.input.invite((pad) => game.addPlayer(`pad-${pad}` as Claim))
// Or share the keyboard: the second player uses the `shared` keys.
game.addPlayer('keyboard')
game.removePlayer(2)
```

`addPlayer` answers `{ ok: true, player }`, or `{ ok: false, message }` in words a person can read. Joins and leaves are
recorded like any other command, so a replay plays them back the same.

To let a player change a key or button, wait for their next press, then use it:

```ts
const capture = game.input.capture('keys') // or 'pad'
const answer = await capture.done // { ok: true, input: 'KeyK' }, or { ok: false, reason: 'cancelled' }
if (answer.ok) {
  const done = game.input.rebind('jump', 'keys', answer.input)
  if (!done.ok) showMessage(done.message)
}
```

The game does not hear the key or button that answers, and Escape (or Start on a gamepad) gives up. Keep the changes
with `game.input.settings()`, which is plain JSON (`game.input.onBindings` tells you when it changes), and give them back
with `startGame({ settings })`. Changes that no longer fit the game, such as an action that was removed, are dropped and
named by `game.input.dropped()`; the game still starts.

## Replays

`game.replay()` returns everything the player did, as JSON. `verifyReplay(sim, replay)` plays it on a fresh game and says
whether it ends where it was recorded, and if not whether the game's content changed or the play diverged.
`playReplay` only plays and returns the hashes, so two machines can compare them with each other.

### Watch a recorded play

`watchReplay` puts a replay on a page and plays it by itself, with no keyboard, no touch buttons and nobody to press
Play: a game uses it to show what it is like before the player starts. It takes what `startGame` takes, less the
controls, plus the recording (`replay`) and, if you want it to stop, `rounds`.

```ts
const watch = await watchReplay({ content, plugins, mount, host: webHost(), replay: parseReplay(text) })
// later: watch.stop()
```

It plays the recording on the content as it is now, not as it was when the recording was made. If a level was edited
since, the same keys lead somewhere new and that is what you see; `verifyReplay` is the check that says "nothing
changed". A recording made with another seed or tick rate is refused with a `WatchSetupError` that says which. By
default it plays again and again, resting `restTicks` (one second) on the last picture between rounds; `rounds: 1`
holds the last picture for good. It stands still while the page is hidden and does not catch up when it comes back.

## Without a page

`@automataframework/framework/headless` has everything that needs no page (the simulation, physics, commands, content
and levels). It is safe in Node and in an editor that only checks and writes files:

```ts
import { createGameSim, loadGame } from '@automataframework/framework/headless'
```

## Content files

Everything a person can author is a JSON file, one thing per file, and `automata.toml` lists every file the game uses.
Each kind has a JSON Schema, shipped in the package so an agent can read the format without running anything.

| Kind | What it holds | Folder | Schema |
|---|---|---|---|
| `level` | a map of tiles, the things standing on it and where each player starts | `content/levels/` | `schemas/level.schema.json` |
| `character` | a body, its size and colour, and the kind, behaviour and tuning it uses | `content/characters/` | `schemas/character.schema.json` |
| `tileset` | the letters a level's map may use, and which of them are solid | `content/tilesets/` | `schemas/tileset.schema.json` |
| `behaviour` | rules for what a character does: flee, follow, wander, jump | `content/behaviours/` | `schemas/behaviour.schema.json` |
| `tuning` | numbers that decide how something plays, each with its range, and the controls | `content/tunings/` | `schemas/tuning.schema.json` |
| `feel` | a burst of dust, a shake or a freeze for a moment in the game | `content/feels/` | `schemas/feel.schema.json` |
| `sound` | a sound made of tones and noise | `content/sounds/` | `schemas/sound.schema.json` |
| `music` | a track of notes and drums | `content/music/` | `schemas/music.schema.json` |
| `cues` | which sound or music plays when something happens | `content/cues/` | `schemas/cues.schema.json` |
| `conversation` | what a character says, and the choices a player has | `content/conversations/` | `schemas/conversation.schema.json` |
| `cutscene` | a camera move and the lines said during it | `content/cutscenes/` | `schemas/cutscene.schema.json` |
| `messages` | every word a player reads, in one language | `content/messages/` | `schemas/messages.schema.json` |

Each schema is at `@automataframework/framework/schemas/<kind>.schema.json`. Three rules hold for every kind:

- One thing per file, and the file's `id` is its name: `content/sounds/door.json` holds the sound `door`.
- `writeContent(type, value)` is the only writer, so two writers of the same value make the same bytes.
- A game's words live in `messages` files, one per language, and English (`en.json`) comes first.

A file is listed in `automata.toml` with its kind and its path. This lists a sound called `door`:

```toml
[[content]]
type = "sound"
path = "content/sounds/door.json"
```

and this is the whole file `content/sounds/door.json`:

```json
{
  "format": 1,
  "id": "door",
  "volume": 0.8,
  "voices": [
    {
      "kind": "tone",
      "wave": "sine",
      "from": 220,
      "to": 110,
      "at": 0,
      "length": 0.4,
      "volume": 1
    }
  ]
}
```

A mistake is reported with the file, the place in it and what to write, for example `content/cues/cues.json:
cues[3].sound: There is no sound called "dor". This game has: door, jump, land.`

## Joints and touch

A level can hold things with pins and ropes, and a character can say it is touched. Both are part of the replay, and a
game that uses neither plays exactly as it did before.

A `pin` holds a thing at one point and lets it turn about that point, here a seesaw's plank, which may tip 25 degrees
either way. Leave `holder` out and the level holds it; name another thing and that thing does. This goes in the level
file's `joints`:

```json
{
  "id": "seesaw",
  "thing": "plank-1",
  "kind": "pin",
  "x": 17,
  "y": 4,
  "turn": {
    "min": -25,
    "max": 25
  }
}
```

A `rope` lets a thing go no further than the rope reaches. A swing is a platform on two ropes, each tied to one end of
the platform (`from`) and to the level above it (`to`); `slack` makes a rope longer than the gap between its ends:

```json
{
  "id": "swing-left",
  "thing": "platform-1",
  "kind": "rope",
  "from": { "x": 7.5, "y": 6 },
  "to": { "x": 7.6, "y": 2 }
}
```

A character with `touch` lets things pass through it, and the game is told when something touches it. `"touch":
"sense"` only tells (a door); `"touch": "take"` also takes it away when a hero touches it (a spark). It needs a `kind`
and a `fixed` body, and the events are named after the kind: `door.touched`, `door.left` and `spark.taken`.

```json
{
  "format": 1,
  "id": "spark",
  "body": "fixed",
  "size": { "w": 0.6, "h": 0.6 },
  "color": "#f5d547",
  "kind": "spark",
  "touch": "take"
}
```

A system counts them in the tick they happen:

```ts
import { defineSystem, touchEvent } from '@automataframework/framework/headless'

export const count = defineSystem('game.count', (ctx) => {
  const score = ctx.resource(Score)
  score.sparks += ctx.events.of(touchEvent('spark', 'taken')).length
})
```

A pinned thing turns about its pin, a roped thing can go no further than its rope, and every pin, rope and touch
is on the same hash in Node, Chromium, WebKit and Firefox, so a replay of them verifies anywhere.

## The public API

`docs/api/framework.api.md` lists every export of both entries. It is generated (`pnpm api-report --update`), and CI
fails if it is out of date.

## Working on this repo

Tests run only in GitHub Actions. Locally, `pnpm lint`, `pnpm typecheck`, `pnpm knip` and `pnpm build` are fine.
See `CLAUDE.md` for how the work is staged.

## License

MIT

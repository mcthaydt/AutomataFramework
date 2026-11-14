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

`game.replay()` returns everything the player did, as JSON, with the level and the players it started with in `meta`.
`verifyReplay(sim, replay)` plays it on a fresh game and says whether it ends where it was recorded, and if not why:
`content-changed` (the game's content is not the content it was recorded on; `rulesChanged` says whether the rules
changed too), `code-changed` (the rules changed shape: a plugin, a component, a command or an event was added or taken
out, or the framework's own version changed them), `diverged` (the play ends somewhere else, with the first tick that
differs) or `wrong-setup` (another seed or tick rate). The content is checked before the rules, because content can
switch a plugin on. `playReplay` only plays and returns the hashes, so two machines can compare them with each other.

A replay file's `format` is 2: it carries `schemaHash` beside `contentHash`, the hash of the shape of the rules. A
format 1 file (no `schemaHash`) is still read and played, and can never be `code-changed`. Its `checks` are for ticks
the run had, in order, each tick once, and never the last tick (that one is `finalHash`); a file that breaks that is
refused with a sentence that says where. `schemas/replay.schema.json` is its JSON Schema.

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

## Saves

A game keeps progress in save slots and its settings in one record. Both go through the host (see "The host" below), so
the game never reads the browser's storage itself. Everything here also runs in Node, with no page.

```ts
import { createSaves, defineSave, latestSlot, openSettings, z } from '@automataframework/framework/headless'

const progress = defineSave({
  game: 'crate-game', // a short id: 1 to 40 of a-z, 0-9 and "-". Never the display name, which may change.
  version: 2, // raise it whenever `schema` changes shape
  slots: 3,
  schema: z.strictObject({ level: z.string(), doors: z.number().int().min(0) }),
  upgrades: { 1: (old) => ({ ...(old as { level: string }), doors: 0 }) }, // makes version 1 into version 2
})
const saves = createSaves({ def: progress, store: host.store }) // `host` is `webHost()` in a page, `testHost()` in Node

const listed = await saves.list() // { ok: true, value: [{ slot: 0, kind: 'empty' }, ...] }
const continueFrom = listed.ok ? latestSlot(listed.value) : undefined // the slot a "Continue" button opens
await saves.save(0, { level: 'level-2', doors: 1 })
const loaded = await saves.load(0) // { ok: true, data: { level: 'level-2', doors: 1 }, savedAt: 1700000000000 }

// Settings are one record with a section for each part of the game (sound, controls, language).
const settings = await openSettings({ game: 'crate-game', store: host.store })
const sound = settings.section({
  name: 'sound',
  schema: z.strictObject({ music: z.number().min(0).max(1) }),
  initial: { music: 0.8 }, // what a new player starts with
})
await sound.set({ music: 0.5 }) // `sound.get()` says 0.5 at once; the answer says whether the host kept it
```

On the web, saves are kept in this browser, under `automata.<game>.save.<slot>` and `automata.<game>.settings`.
Clearing the browser's data removes them, and a browser can clear its own storage.

A browser can say no to storing anything (a private window, storage turned off, no room left). The game is told, with
one of `unavailable`, `full` or `failed`, and nothing is kept anywhere else. Tell the player: `saves.check()` asks
before they have played for five minutes, and every `save` answers `{ ok: false, problem }` when it was not kept.

Three rules keep a player's progress safe. A save from a newer version of your game is never changed. A save that
cannot be read is kept and listed as damaged, never read as empty; `save` does not write over it, or over a slot a
newer or older version of your game made, unless you pass `replace: true` after the player has said yes. `save` rejects
with a `RangeError`, before it writes anything, for a slot your game does not have, a label that is not 1 to 80
characters, or data your schema refuses or JSON cannot keep; a host's "no" is an answer, never a rejection. Raise `version` and add an upgrade when you change what a save holds,
and a save from an older version is brought up to date when it is loaded. Settings are gentler on purpose: a setting
that cannot be read starts again from its first values.

## The host

A game asks its host about where it runs, never the page: `visible()` and `onVisibility` (is the game on screen),
`store` (where saves and settings are kept), `language()` and `deviceLanguages()` (what the player speaks, if the host
knows), `openLink(url)` (opens a web page outside the game, only `https:` addresses; answers `'opened'`, `'blocked'` or
`'refused'`), and `canQuit` with `quit()` (a web page has nowhere to go back to, so `canQuit` is false there and a
screen shows no Quit button).

`webHost()` is the host for a page and comes from the main entry. `testHost()` is for Node and for tests, and comes from
both entries. You can make it say anything and look at what the game did:

```ts
import { testHost } from '@automataframework/framework/headless'

const host = testHost({ language: 'ko', canQuit: true })
host.hide() // the game hears that the page went to the background
await host.openLink('https://example.com/help') // 'opened'
host.opened // ['https://example.com/help']
```

## Play online

Online play is built and checked in CI. It is not deployed anywhere yet.

A game plays in a room: each player is on their own device, and one server decides what happened. Your own key moves
your hero at once, and the picture is put right if the room saw it differently. The server is a Node file next to your
game. It loads the game as a page does, and hands it to `runRoomServer`:

```ts
import { readFile } from 'node:fs/promises'
import { loadGame } from '@automataframework/framework/headless'
import { runRoomServer } from '@automataframework/framework/server'

const loaded = await loadGame((path) => readFile(path, 'utf8'))
if (!loaded.ok) throw new Error('The game did not load.')
await runRoomServer({ game: { content: loaded.value, plugins: [/* your game's plugins */] } })
```

`runRoomServer` listens on the port you give it, else `PORT`, else any free one. It prints one line,
`{"event":"listening","port":3000}`, and on SIGTERM it closes every room, prints `{"event":"stopped"}` and exits 0. A
test can use `createRoomServer` instead, which resolves with the port and a `close()`.

The page starts the game in a room with `startOnlineGame`, instead of `startGame`:

```ts
import { onlineWords, startOnlineGame, webHost } from '@automataframework/framework'

const online = await startOnlineGame({
  content, plugins, mount, controls, host: webHost(),
  server: 'ws://localhost:3000',
  // room: friendsCode,   // the `online.code` a friend's page shows; leave it out to make a room
  onStatus: (status) => (message.textContent = onlineWords(status)),
})
online.code // to share with a friend
```

`onlineWords(status)` is the plain English for the room (waiting for a friend, someone lost their connection, the room
is full) and an empty string while everyone is playing; a game puts it on its own screen. A refused join rejects with an
`OnlineError` and leaves nothing on the page. A game with `players = 4` in `automata.toml` has no waiting: the room
starts with whoever is first, and the others join and leave while it is played, as many as its level has start points
for. Hiding the page lets go of the keys, so the hero does not run on for everyone else.

## Without a page

`@automataframework/framework/headless` has everything that needs no page (the simulation, physics, commands, content,
levels, saves and the host port with its test host). It is safe in Node and in an editor that only checks and writes files:

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

## Shipping a game: Rapier's licence

The physics engine, Rapier, is Apache-2.0, and its code is built into this package's files (its binary comes out as
`rapier_wasm2d_bg.wasm` beside them, which a bundler such as Vite copies into your game). The licence asks that a copy
of it travels with the game you ship. The package exports that copy by name, so put it where your game keeps its other
notices, for example:

```js
import { copyFile } from 'node:fs/promises'
await copyFile(new URL(import.meta.resolve('@automataframework/framework/rapier.LICENSE')), 'dist/rapier.LICENSE')
```

or paste its text into your game's own licence page. The demo game does the second.

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

A system counts them in the tick they happen. This one keeps a score in a resource and goes in a plugin that needs the
level and the touch plugin (`dependsOn`), which the game's sim has whenever a character is touched:

```ts
import {
  defineResource,
  definePlugin,
  defineSystem,
  touchEvent,
  z,
} from '@automataframework/framework/headless'

const Score = defineResource('game.score', z.object({ sparks: z.number().int() }), () => ({ sparks: 0 }))

const count = defineSystem('game.count', (ctx) => {
  ctx.resource(Score).sparks += ctx.events.of(touchEvent('spark', 'taken')).length
})

export const scorePlugin = definePlugin({
  name: 'game.score',
  dependsOn: ['level', 'touch'],
  resources: [Score],
  systems: [count],
})
```

A system made with `defineSystem(name, run)` runs in `gameplay`, after the touches of this tick are made, so it hears
them. One placed in `postPhysics` must say `after: ['level.touch']`, or it sees none.

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

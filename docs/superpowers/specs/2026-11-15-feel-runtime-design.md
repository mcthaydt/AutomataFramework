# The feel runtime: dust, shake and freeze on screen

An addendum to [`2026-11-14-m2-design.md`](2026-11-14-m2-design.md). M2 gave feel files a format: a file says which
event sets it off (`on`) and what happens (`dust`, `shake`, `freeze`, and since plan H `buzz`). `loadGame` reads and
checks them. Nothing draws them. A hero lands and no dust flies; a crate drops and the picture stays still. The M2
spec's showcase promises "dust on landing, a shake when a crate drops, a freeze on a spark", and the Feel editor (M3)
needs something real to show when a person slides a number.

This spec adds the piece that draws them: **plan F, the feel runtime**. The plan H audit
([`audits/2026-11-14-built-in-hero-plan-audit.md`](../audits/2026-11-14-built-in-hero-plan-audit.md), "The feel
runtime") placed it here, as its own plan, after plan H and before the demo's feel step (plan D, Part 6).

## Principles served

- **1, agent-first.** What a moment feels like stays one documented JSON file per effect. The runtime adds no new
  state: an agent that changes `shake.strength` in a file sees the change the next time the event fires, the same
  as a person sliding it in the Feel editor. The pure part of the runtime is exported from the headless entry, so an
  agent or a test can ask "what would this frame show?" with no page.
- **2, iPad-first editors.** The Feel editor's "Show me" (Editors spec PR 30, item F4) plays an effect with the
  framework's own drawing on an iPad, so what a person tunes on the tablet is what a player gets on a phone.
- **Onboarding comes first** (the Owner, 2026-11-13). Feel is how a first-time player knows they did something: the
  dust says "you landed", the freeze says "you got it". A buzz is never the only sign of a moment (plan H's rule):
  with plan F, every buzz has something drawn beside it.

It breaks none: 2D only, nothing ported ahead of its user (the template's landing dust and the demo use it at once),
**no new dependency** (Pixi draws it), and **no recorded hash moves** (feel is presentation; see "Determinism").

## The Owner's answers (2026-11-15)

1. **Freeze is a real pause when playing alone, and a held picture online (A).** Offline, the whole game holds still
   for the file's ticks: the loop takes no steps, so it is a true hit-stop. Online the room cannot wait for one page,
   so only that page's picture holds, then catches up.
2. **A "Screen shake" switch in the game's settings (A).** On by default; it starts off when the device asks for
   reduced motion. Freeze and dust stay either way. The switch is shown on the settings screen that plan U (the game's
   flow and screens) builds; plan F builds the setting, plan U puts it on screen.

## Approaches considered

1. **A pure runtime in its own feature, drawn by `render`, wired by `game` (chosen).** A new feature `feel` (no page,
   no Pixi) hears each step's events the way `audio.hear` does and gives back plain data for each drawn frame: the
   specks, the shake offset and whether a freeze is on. `render` draws that data; `game` feeds it and holds the loop.
   This is the old repo's shape (`extensions/feel`, `createFeel`: events in, a `FeelFrame` out), ported for this
   layer's three effects only. It can be tested in Node frame by frame, and the Feel editor uses the same code.
2. **Drawing inside `render`, effects decided where they are drawn.** Fewer files, but the editor could not ask what a
   frame shows without a canvas, and Node tests could not check a shake.
3. **A feel system inside the sim.** Effects as entities would be recorded, replayed and checked for free, but they
   would move every golden, and a player's shake setting would change the game's hash. Ruled out by law 2 of the
   old repo and this one's determinism rule: presentation observes, it never decides.

## What gets built

### The `feel` feature (pure)

`src/features/feel/`, above `content` and `sim`, below `render`. Exported from `src/headless.ts`.

- `createFeel({ content, tickHz, settings, seed? })` returns a runtime with:
  - `hear({ tick, events })`: one step's events. A tick already heard is ignored (as `audio.hear`), so a step heard
    twice never fires twice. `begin()` forgets the last tick, for a new sim or an online re-sync.
  - `play(feel, at)`: fires one feel file now, at a place (F4, below). Nothing in the sim is read or written.
  - `frame(seconds, place)`: advances by the frame's time and returns a `FeelFrame` of plain data: the live specks
    (position in tiles, colour, how faded), the shake offset in tiles, and `freeze` (ticks still to hold, or 0).
    `place(sid)` is how the caller says where a thing is (its box in tiles); the runtime never holds the scene.
- Which files answer an event: every feel file whose `on` is the event's name, in id order. Plan F matches names
  exactly; `*` patterns (the old repo had them) wait until a game needs one.
- Time is the frame times it is given and nothing else. Noise is a hash of integers (the seed, the event's tick, the
  thing's `sid`, the speck's number), so the same events and the same frame times give the same frames, in every
  engine and in the editor.

### Dust

- A burst of `count` specks starts at the **bottom middle of the thing the event names** (the payload's `sid`: the
  hero events' `{ player, sid }`, the touch events' `sid`), where it was in the last picture drawn, so a
  thing taken away in that very step (a spark) still has its place. An event that names no thing, or a thing that was
  never drawn, makes no dust; its shake and freeze still happen. *My call.*
- Specks fly out in an upward fan at `speed` tiles a second, slow down, sink a little, and fade out over `life` ticks.
  Each is a small square in the file's `color` (about an eighth of a tile, never under two device pixels).
- Drawn over the level's things and under the touch buttons and the words strip, so a speck never hides a control.
- **At most 256 specks on screen at once**; a new burst past that takes the place of the oldest specks. *My call:*
  enough for four heroes landing at once with room to spare, and cheap on a phone.
- Dust keeps moving during a freeze. *My call:* the burst is the "it happened" sign, and a still cloud reads as a
  stuck game.

### Shake

- The level's picture (the stage: level, things, dust) moves by an offset; the touch buttons, the words strip and the
  page's screens never shake.
- At its start the offset is up to `strength` tiles and it fades to nothing over `ticks`. Rounded to whole device
  pixels, so the picture stays crisp. Two shakes at once take the larger, never the sum (the file's cap of one tile
  holds).
- **The "Screen shake" setting** is a settings section, `feel`, with one switch, `shake` (on). A new player whose
  device asks for reduced motion (`prefers-reduced-motion: reduce`) starts with it off; once the player sets it, the
  saved choice wins whatever the device says. Off, no shake is drawn; dust, freeze and buzz are unchanged. Plan U's
  settings screen shows it with the words "Screen shake" in the game's languages (`messages`), and the drunk-grandma
  test applies to it as to every switch.

### Freeze

- **Offline** (`startGame`, `watchReplay`): the loop holds. For the file's `ticks` it takes no step and draws the same
  picture, then goes on from where it was; the time held is not owed afterwards, so the game never fast-forwards.
  What a player presses during a hold is read on the first step after it (plan H's jump buffer catches a jump). A
  freeze that starts during a hold extends it to the later end; no single hold runs past 30 ticks (half a second, the
  file's own limit), so a chain of sparks can never stall the game. Pausing during a hold keeps the rest for when the
  game comes back. Every player on the same screen holds together.
- **Online** (`startOnlineGame`): the loop does not hold, because the room's ticks cannot wait. The picture holds for
  the ticks while steps go on underneath, then the next draw shows where things are now.
- **Why this keeps the game the same:** a recording is a list of ticks and what was held on each. A hold changes how
  long a tick takes on the wall clock, never which inputs land on which tick. `automata replay` and the Node parity
  runs have no loop and never wait. No golden moves.

### Buzz

Plan H's `game/buzz.ts` stays where it is and keeps its rules (the player last used touch, the host can, vibration is
on). Plan F makes sure it hears the same steps the feel runtime hears, in the same place, and adds the drawn sign
beside it: the template's `land.json` already has dust. A watched replay draws dust and shake and never buzzes.

### F4: "Show me", one effect on demand

For the Feel editor (Editors spec PR 30, F4). A running game (`Game`, from `startGame`) gains
`showFeel(feel: FeelFile, at?: number)`: it plays that one file once, at the thing whose `sid` is `at` (the first hero
when left out), whether the game is playing or paused. The file may be an unsaved draft; it is checked with
`FeelSchema` first and refused, in plain words, if it does not pass. It is presentation only: nothing is sent to the
sim, nothing is recorded, a recording made meanwhile is the same. Its freeze holds the picture only (as online), even
offline, so "Show me" can never change a run. It follows the "Screen shake" setting like any other shake; its buzz
follows plan H's rules. The editor never draws an effect itself.

## Where each event comes from (the showcase)

- **Dust on landing:** `hero.landed` (plan H). The template's `land.json` has it today.
- **A freeze on a spark:** `spark.taken` (plan P's touch events), with the spark's `sid`; its dust, if any, starts
  where the spark was.
- **A shake when a crate drops:** no framework event says a crate landed. The demo's own code sends one
  (`crate.dropped`, with the crate's `sid`) from a small plugin of its own, and its feel file answers it. *My call:*
  a game may name any event, and adding a framework "anything landed" event would touch every sim; it can come later
  if a second game needs it.

## Testing

Every test runs in GitHub-hosted CI, never locally. Plan F's plan has end-to-end tests (the M2 rule).

- **Unit (Node, `tests/features/feel/`):** an event fires each matching file once, a tick heard twice fires once; the
  same events and frame times give the same frames; dust starts at the bottom middle of the named thing, makes
  `count` specks that are gone after `life` ticks, and none for an event naming no thing; the 256 cap; shake starts at
  most `strength` tiles, fades to zero over `ticks`, two shakes take the larger, off in settings means a zero offset;
  freeze reports its ticks, extends on overlap, never past 30; `play` fires one file; a draft that fails the schema is
  refused with words.
- **Loop (Node, fake frames):** a freeze holds exactly its ticks of steps offline and then the tick count catches up
  with no fast-forward; online steps go on; pause during a hold.
- **Settings:** the `feel` section's default; reduced motion on a first visit starts it off; a saved choice wins.
- **Goldens:** every recorded hash in `tests/golden/` and `template/replays/level-1.json` is unchanged with feel
  files present, in all four engines.
- **Browser and journeys (real browsers):** the template game in Chromium, Firefox and WebKit: the hero lands and
  dust is drawn at its feet and gone after its life; a game with a shake file shows the stage offset and then none,
  with the touch buttons unmoved; emulated reduced motion on a first visit draws no shake and still draws dust; a
  freeze holds the tick count for its ticks offline; the online journey with a freeze file keeps the room's ticks
  going and both pages end on the same hash; a watched replay draws dust and never asks the host to buzz;
  `showFeel` while paused draws the burst at the hero and leaves the recording's hash unchanged; at phone size
  upright and sideways the dust never covers the touch buttons.

## Non-goals

- No new kinds of effect (flash, squash, words popping, sounds from a feel file). The old repo had them; they wait
  until a game needs them (principle 7).
- No `*` patterns in `on`.
- No player setting for dust or freeze, and no strength slider for shake: one on/off switch, the Owner's answer.
- The settings screen itself (plan U) and the Feel editor (Editors repo).

## Left to the plan

How `render` takes a `FeelFrame` (a dust layer in the stage and an offset on it is the expected shape), the exact fan
and fade curves within the rules above, how the loop's hold is written, where `showFeel` sits for `watchReplay` if the
editor needs it there, and the touch of `src/headless.ts` and the README. The plan names its golden impact (none) per
task and its handoffs: plan U (the switch on screen), plan D Part 6 (the demo's three feel files and its
`crate.dropped` plugin), and the Feel editor's Part 3 (`showFeel`).

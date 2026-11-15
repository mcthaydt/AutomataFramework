# Level links and the world map: values on things, links, paths, doors between levels, level pictures

Stage 1 (spec) of a framework cycle in AutomataFramework, written 2026-11-15 with the Owner. It comes from World's
big inspiration, LDtk: the report "World: what to take from LDtk" (the project's private files,
`reports/2026-11-15-world-what-to-take-from-ldtk.md`), picks 3, 4, 8 and 10, and the Owner's answers on it. The World
editor's mockups draw what a person sees; this page says what the game's files hold and what the framework does with
them. Nothing a game has today plays differently.

## Principles served

- **1. Agent-first.** A button that opens a door, a critter's walk, a door into the next level and where the levels
  sit on the map all become documented JSON with published schemas, checked by `automata check`, listed by an
  `automata` command and an MCP tool. Today none of it can be written down: a placed thing holds its kind and place
  only, and nothing says how levels join. An agent can also see its own change, as a picture of the level.
- **2. iPad-first editors.** World needs these formats to show links as arrows, paths as lines, reaches as circles
  and the world map as a sheet of pictures, and to keep a slider inside a value's limits.
- **3. Layers in order.** Every value here has no direction in it except a place, and a place is a named set of
  numbers (`x`, `y`), so the 3D layer adds `z` in its own level format and reuses the rest whole. Nothing here is
  2D-only in the shell, and nothing 3D is built.

It breaks none: no new dependency, one feature's files (`content`) for the formats, the sim's new parts are joined
only to a game that uses them, so no golden of a game that does not moves.

## Why

The Owner (2026-11-15), on the LDtk report:

- "Also for world, our big inspo is LDtk, what can we steal from that?" and "don't forget these will also be used
  for 3D too when we get there, no auto-tiling rules on launch".
- **Values and links on things, shown in the level:** "Yes, draw it and spec it." The report's notes, kept here: give
  a place as a named set of numbers so 3D can add a third later; keep the limits with the value so a slider cannot
  pass them.
- **The world map of all levels on one sheet:** "Yes, draw it and spec it." From the grill: record what leads to what
  first, since it has no dimension; where a level sits on the sheet is the editor's own arrangement, not game logic.
- **How a level leads into another** (card, 06:57 UTC): **through a door.** A door names the level it leads to and
  where you come out; the map draws the arrow between the two.
- **A picture of every level, and a public list of format changes** (card, 06:57 UTC): **both.**
- "Expand the demo to support what we add": the demo game (AutomataFrameworkExamples) uses every part of this.

## Goals

1. **Values on a placed thing,** each with a type and limits, declared once by its character: a number (with its
   least, most and step), a yes or no, a choice from a list, words the player reads, a link to another thing, a path
   of places, and a door's way into another level.
2. **Links that do something with no game code:** a button or a plate that opens a door while it is pressed, or for
   good; one button may open several things.
3. **Paths that do something with no game code:** a character's behaviour can walk it along its path.
4. **Doors between levels:** a door says which level it leads to and where you come out; going through it opens that
   level, for every player at once.
5. **The world file:** where each level sits on the map, for the editor and for an agent, never read by the game.
6. **"Only one of these" in a level,** kept by the character file, so the editor moves the old one instead of adding a
   second.
7. **A picture of any level, made by a command,** with a "what it is" view that draws the links, paths, reaches and
   tags, for agents to check their work and for the map.
8. **A public list of format changes,** kept beside the schemas, that a check holds to the schemas.
9. **The demo uses all of it,** on two levels joined by a door.

## Non-goals

- Auto-tiling rules (the Owner: not at launch).
- Levels that touch edge to edge, where walking off one side enters the next (the Owner chose doors). The format leaves
  room for it: a later join kind beside `leads-to`.
- Moving platforms or lifts on a path: they need a moved body kind that is neither `dynamic` nor `fixed`. Later, and the
  path value is ready for them.
- A general rules language ("when this, do that") on values. Built-in parts read values; anything else is the game's
  code, which can read every value (see "Game code").
- 3D. The 3D layer gets its own level format with `z` in a place, and reuses the value kinds.
- The World editor's screens. They are in the mockups, then the editor's own spec and plan in
  AutomataFrameworkEditors.

## Anti-goals

- A value the editor can set but an agent cannot read, write and check by hand.
- A slider, a typed number or a hand edit that passes a value's limits without `automata check` failing.
- A "where it sits" on the map that changes how the game plays.
- A game with no values, links or doors whose sim, hash or replay moves.
- Flat-only words in the formats ("layer", "left and top only") that 3D would inherit.

## Approaches considered

1. **Declared on the character, given on the thing (chosen).** A character file lists the values its things take,
   with type, limits and default (LDtk's "custom fields"); a placed thing gives only the values it changes. One home
   for limits, so the editor's slider, the schema and the check all read the same numbers; an agent sees in one file
   what a button can hold. The cost: a level's values are checked against its characters once the game is read, as a
   thing's character already is.
2. **Free values on each thing, nothing declared.** Simplest to write, but no limits to keep a slider in, no type for
   the editor to choose a control by, and a misspelt name is silently a new value. Fails the anti-goals.
3. **A level-wide list of links, like `joints`.** Consistent with pins and ropes, but a button's number values would
   still need a home on the thing, so a thing's settings would sit in two places. Joints stay as they are: a joint is a
   physical holder with its own places, not a setting of one thing.

For how levels join, the Owner chose doors over levels that touch edge to edge, and over both.

## Values on things

### Declared by the character

A character file gains `values`, a list of up to 16 declarations, in the order the editor shows them:

```json
{
  "format": 1,
  "id": "button",
  "body": "fixed",
  "size": { "w": 1, "h": 0.25 },
  "color": "#e4572e",
  "kind": "button",
  "touch": "sense",
  "values": [
    { "id": "opens", "name": "Opens", "type": "thing", "kinds": ["gate"], "most": 4, "shown": "arrow" },
    { "id": "stays", "name": "Stays open", "type": "switch", "default": false }
  ],
  "switch": { "opens": "opens", "stays": "stays" }
}
```

Every declaration has `id` (used once in the character), `name` (a short label the team reads in the editor, like
"Opens"), an optional `about` (one sentence for the editor's help), `type`, and `shown`, how the level view draws it
(`tag`, `reach`, `arrow`, `path` or `none`; each type has its own default). The types:

| Type | Holds | Limits and default | Shown by default |
|---|---|---|---|
| `number` | a number | `least`, `most` (required), `step` (left out: any; `1`: whole numbers), `default` (required) | `tag` (`reach` draws a circle of that many tiles) |
| `switch` | yes or no | `default` (required) | `tag` when it is not the default |
| `choice` | one of a list | `from`: up to 16 `{ id, name }`, `default` (required, one of them) | `tag` |
| `words` | words the player reads | a message key, like `sign.welcome`; `default` optional | `tag` (the source language's words) |
| `thing` | a link to a thing in the same level | `kinds` (the kinds it may link to; left out: any), `most` (1 to 16; more than 1 holds a list), `needed` (true: the level must give it) | `arrow` |
| `path` | places, in order | `least` and `most` points (2 to 64), `loop` (true: back to the first) | `path` |
| `leads-to` | a way into another level | `needed` | `arrow` on the world map, `tag` in the level |

Only `thing`, `path` and `leads-to` have no default: a thing without one has none, unless `needed` says it must. A
`words` value is a key into the game's messages files, so the player reads it in their own language and
`automata check` names a language that lacks it. A `name` is the team's word, not the player's, so it is not translated
(my call; see "Calls I made").

### Given on the thing

A placed thing gains `values`, keyed by declaration `id`, holding only what differs from the default:

```json
{ "id": "button-1", "character": "button", "x": 6.5, "y": 7.875, "values": { "opens": ["gate-1"] } },
{ "id": "critter-1", "character": "critter", "x": 10, "y": 7.5,
  "values": { "walk": [{ "x": 8, "y": 7.5 }, { "x": 13, "y": 7.5 }] } },
{ "id": "exit", "character": "door", "x": 15, "y": 7, "values": { "to": { "level": "level-2", "thing": "door-in" } } }
```

- A `thing` value is an id, or a list of ids when its `most` is more than 1 (a list always, for that declaration, so the
  shape never depends on how many).
- A `path` value is a list of places. A place is `{ "x": …, "y": … }`, the same named numbers a thing's own place
  uses, in tiles from the level's left and top. The 3D layer's places add `z`; nothing here reads a place by position
  in a list.
- A `leads-to` value is `{ "level": <level id>, "thing": <a thing in that level> }`: the level it opens and the thing
  you come out beside. `thing` left out means that level's own starts.

### What `automata check` says

Checked once the game is read, beside the check that a thing's character exists, each with a sentence that says what
to fix:

- a value whose id the character does not declare ("The character "button" has no value "open". It has: opens, stays.");
- a number outside `least` and `most`, or off its `step`; a choice not in `from`; a message key no language has;
- a link to a thing not in the level, to itself, or of a kind its `kinds` does not allow; more links than `most`;
- a path with too few or too many points, or a point outside the level (inside the scene's size, for a scene level);
- a `leads-to` naming a level the game does not list, or a thing not in that level;
- a `needed` value left out;
- in the character file: a default outside its own limits, `least` above `most`, a declaration id used twice, a
  `shown` its type cannot draw.

The JSON Schema of a level cannot know a character's limits, so the per-character limits are checked by `check`, and
the published `schemas/character.schema.json` describes the declarations. The editor reads the declarations through
`loadGame`, so its controls have the same limits `check` holds.

### Only one in a level

A character may say `"one-per-level": true` (a goal, a level's exit). `check` fails a level with two. The editor
treats a second placing as a move of the first and asks first ("Move the goal here?"); starts are already one per
player. Dimension-free, and the World mockups' pick 5.

## What values do with no game code

Values are content: a game's own code can read any of them (see "Game code"). Three built-in parts read them so the
demo and a new game need none.

### Switches: a button or a plate opens things

A character with `touch: "sense"` may say `"switch": { "opens": <a thing value id>, "stays": <a switch value id> }`
(`stays` optional; without it, a switch never stays). While anything that is not `fixed` touches it (a hero, a crate),
it is **pressed**, and every thing its `opens` value links to is **open**. When nothing touches it, those things close
again, unless `stays` is on for that button, and then they stay open from the first press. A thing linked by two
switches is open while either holds it open.

Being open is a state in the sim (a component), so it is deterministic, recorded, replayed and sent to every player
like the rest of the world.

### Doors and gates: what being open does

A `fixed` character may say `"opens": "walk-through"`: while it is open its body lets everything through (its collider
becomes a sensor), and it plays its `open` clip, or `shut` when it closes (each optional, as clips are). A gate that
closes on a hero standing in it waits until nothing is inside, so nobody is stuck in a wall. Events: `<kind>.opened`
and `<kind>.closed`, with the thing's id, beside today's `<kind>.touched`.

### A walk along a path

A behaviour rule may `do` `{ "act": "walk-path", "path": <a path value id>, "speed": … }`: the character walks toward
the next point of its own path, and on to the one after when it is within a quarter of a tile; at the end it turns
back, or goes on to the first when the declaration says `loop`. A walker on the ground heads along the ground toward
the point; it does not fly to it. The rule names the declaration, the character declares it, and each placed critter
gives its own path, so two critters of one kind walk two routes.

### Doors into other levels

A door is any character with a `leads-to` value and `touch: "sense"`. When a hero touches it, the level ends the way
`done` ends it today, and the flow opens the level the door names instead of the next in `levels`. Every hero comes out
beside the door's `thing` in that level, spread as the starts are (player 1 nearest), or at that level's starts if it
names none. In a game with more than one player, the first hero to go through takes everyone, as `done` does today.

This lives in the flow, not the sim: the sim says which thing was touched (it already does), and the flow reads that
thing's `leads-to` and loads the level. A replay is still one level. The saved game keeps the level and the thing you
came in by, so Continue puts you back beside the right door. A level with no door keeps today's `done` and `levels`.

A level that cannot be reached (not `start`, not in `levels`, and no door leads to it) is a note from `check`, not a
failure: a team may be building it.

### Joined only when used

Each part joins the sim only for a game that uses it, as joints, slopes and falls do today (`usesSwitches`,
`usesPaths`): a game with no switch keeps exactly the sim, schema hash and replays it had. Doors are flow only and move
no hash.

## Game code

The sim gains one read for a game's own systems: a thing's values, as written in its level with the defaults filled
in, by the thing's entity and the declaration id (a typed helper, `valuesOf`, in the headless entry). A game's own rule
(a boss with `hits`) reads its numbers there, with the limits already checked. Values never change while a level plays;
what changes is state (open, pressed), and only the sim changes state.

## The world file

One optional content file per game, `type = "world"`, listed in `automata.toml` like any other:

```json
{
  "format": 1,
  "id": "world",
  "levels": [
    { "level": "level-1", "at": { "x": 0, "y": 0 } },
    { "level": "level-2", "at": { "x": 20, "y": -4 } }
  ]
}
```

- `at` is where the level's top-left corner sits on the map, in tiles, so each level is drawn at its true size beside
  the others. It is the map's arrangement only: nothing in the sim, the flow or the game reads it. Two levels may
  overlap on the sheet; the editor nudges, `check` does not fail it.
- **What leads to what is not in this file.** It is the doors' `leads-to` values, so there is one home for it, and the
  map draws an arrow from each door to where it comes out. The project's `start` and `levels` order are drawn too
  (the start is marked; `levels` is shown as the order the screens list).
- A level the file leaves out is placed by the editor in a row to the right, and written to the file at the first
  arrangement the person makes. Two people's arrangements merge line by line, since each level is one entry.
- `check` fails a level named twice, or one the game does not list.
- The 3D layer's map is also a flat sheet of pictures, as 3D games' maps are, so this file carries over with no `z`.

## Level pictures, for agents

`automata picture [level…]` paints a picture of each level (all of them when none is named) into
`.automata/pictures/<level>.png`, a folder the template's `gitignore` gains a line to leave out, and prints the paths, with
`--json` and the MCP tool `picture`. Pictures are made, never committed: they would only collide in a merge.

- **As it plays:** the scene's ground, sky and backdrop, then each thing in its first pose at its place.
- **`--what-it-is`:** the same, with the ground tinted by kind (solid, ledge, slope), and every value whose `shown` is
  not `none` drawn on top: links as arrows, paths as lines with their points, reaches as circles, tags as small labels
  in the source language, doors' targets as a label ("to level-2"). This is the view an agent reads to check its own
  change, and the editor's "Show what it is".
- **`--world`:** one picture of the world file's sheet, each level's small picture at its `at`, with the doors' arrows
  between them.

The painter is the one Node already uses for figures and scenes (`automata art`), so the same level makes the same
bytes in Node and every browser, and a test holds one picture of the example game to a recorded hash. The editor paints
the same picture live for the world map.

## The public list of format changes

`docs/formats/changes.md`, shipped in the package beside `schemas/`, lists every change to a content format, newest
first: the date, the kind, what changed in plain words, and what an older file needs (usually nothing, because every
change here only adds). Each entry ends with the hash of that kind's published schema after the change. A test reads
the list and every published schema and fails when a schema's hash has no entry, with a sentence that says to add one.
This cycle writes the first entries: the character's `values`, `switch`, `opens` and `one-per-level`, the level
thing's `values`, the `walk-path` act, the new `world` kind. Removing or renaming a field later needs a warning entry a
release ahead (LDtk's "deprecation cycles"); until Release 1 nothing is removed without the Owner.

## The demo game

AutomataFrameworkExamples gains a second level and the parts above, so a first-time player meets each one, in order:

- **Level 1:** today's room, the crate, a **plate** on the floor linked to a **gate**, and an **exit door**. The crate
  is pushed onto the plate, the gate opens while it stays there, and the exit door behind the gate `leads-to` level 2.
  The goal line says what to do ("Push the crate onto the plate"), in all six languages.
- **Level 2:** a **critter** walking a path between two points, a **button** with `stays` on that opens a gate for good,
  and the goal door that ends the game. You come out beside level 2's entry door.
- **The world file** places the two levels on the sheet, so the map has two pictures and one arrow.
- New characters: plate, gate, door, critter, with a `patrol` behaviour using `walk-path`. Until the figure builder
  draws them (the demo's art comes from the builders), they are drawn in the demo's colours as boxes with an icon or
  figure the agent drafts, as the crate was.
- `replays/level-1.json` changes because the level changes, and CI says "the content changed" as it does for any
  content edit; the new recording is shown to the Owner before its merge. `replays/level-2.json` is new.
  `tests/fixtures/pinned-level.ts` is untouched, so the journeys that check gameplay do not move.
- The framework pin moves once the framework's parts are merged (its own pull request), then the demo changes.

The template (`automata create`) gains only the `.automata/` line in its `gitignore`: a new game stays one level, and
the skill shows how to add a second with a door.

## In 3D

| Part | What the 3D layer does |
|---|---|
| Value types | reused whole: none holds a direction but `path`, whose places gain `z` in the 3D level format |
| Links, switches, doors opening | unchanged: a link is an id, open is a state |
| `walk-path` | walks in the ground's plane toward each point |
| `reach` | drawn as a ball |
| `leads-to`, doors between levels | unchanged |
| World file | unchanged: a flat sheet of pictures |
| Level pictures | a picture from the level's own camera |

## Agents

- The `automata-content` skill gains a page, `values-and-doors.md`: the declaration table, a whole button and gate
  pair, a critter with a path, two levels joined by doors, and the world file.
- `automata world` prints the levels, where each sits, and what leads to what (from the doors), with `--json`; the MCP
  tool `world` returns the same.
- `automata check`'s sentences above, each with the fix.
- The README gains a short "Links, paths and doors" section and the two commands in its table.

## Testing

All in GitHub-hosted CI.

- Unit tests for each declaration type and each `check` sentence, a level and a character at each limit and one past it.
- The parity suite (Node and the three browsers) for a switch, an open gate, a gate that waits for a hero to leave,
  and a `walk-path` critter, each with a new golden (`switch.json`, `walk-path.json`); every existing golden unmoved,
  which proves "joined only when used".
- A flow test: a door opens its level with every hero beside the named thing; Continue after it.
- The picture command's bytes in Node, held to a recorded hash, for one level as it plays and with `--what-it-is`.
- The format change list test.
- An end-to-end journey in three browsers on a level made in the test: a hero pushes a crate onto a plate, walks
  through the gate and a door, and comes out in the second level.
- In Examples: its replay check for both levels, and a journey through the real door.

## Constraints

- No new dependency. Formats in `content`; the parts in the sim's `level` feature; doors in `flow`; the commands in
  `cli`. Imports go down as `tests/architecture.test.ts` holds.
- Strict TypeScript, Zod through `src/lib/zod.ts`, every field described in plain words, unknown keys refused.
- `writeContent` writes the new fields as it writes the rest; a value equal to its default is kept if written (the
  editor writes only values a person changed).
- Every word a player reads is a message key in six languages.

## Left to the builder (the plan)

- The component and system names, and how `valuesOf` is typed from a declaration.
- How the gate's "wait until nobody is inside" is sensed in Rapier.
- The walker's steering on slopes and at a wall in the way (it turns back, as `wander` does when blocked).
- How the picture command lays out tags so they do not cover each other.
- How the plan splits into pull requests: likely formats and checks; switches, gates and paths in the sim; doors in
  the flow and the world file; pictures and the change list; then the demo in Examples after the pin moves.

## Calls I made (for the Owner to check)

1. A value's `name` is the team's word in the editor and is not translated; only `words` values are player words.
2. A plate and a button are one part, `switch`, with a `stays` value; the demo uses both forms.
3. What leads to what lives only in the doors; the world file holds only where levels sit.
4. A door takes every player at once, as `done` does today.
5. Level pictures go to `.automata/pictures/` and are never committed.
6. The template stays one level; the demo game shows two.
7. Moving platforms wait for a later cycle; a critter's path is the path this cycle proves.
8. `"one-per-level"` is added for the goal and the exit, beside starts' one per player.

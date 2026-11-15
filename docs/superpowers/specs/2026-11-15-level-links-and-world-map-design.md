# Level links and the world map: values on things, links, paths, doors and edges between levels, level pictures

Stage 1 (spec) of a framework cycle in AutomataFramework, written 2026-11-15 with the Owner. It comes from World's
big inspiration, LDtk: the report "World: what to take from LDtk" (the project's private files,
`reports/2026-11-15-world-what-to-take-from-ldtk.md`), picks 3, 4, 8 and 10, and the Owner's answers on it. The World
editor's mockups draw what a person sees; this page says what the game's files hold and what the framework does with
them. Nothing a game has today plays differently.

**Revised 2026-11-15 (second version).** The first version (closed pull request #149, last commit `c449fca`) joined
levels through doors only. The Owner has since decided that levels can also join **edge to edge**, so a room can be
put together from a seed later, and that **all story is facts and conditions, as storylets**
(`specs/2026-11-15-rooms-and-storylets-amendment.md`). This version takes both in, with LDtk still the inspiration,
no auto-tiling, and nothing locked to 2D. The amendment's part 1 is replaced by this page once the Owner says it is
fine. The Owner answered its five questions the same day ("The Owner's answers"): levels join by where they sit on
the map, a joined place plays as one seamless world, what was done for good is remembered, the test game gets a third
level joined by an edge, and every call is fine.

## Principles served

- **1. Agent-first.** A button that opens a door, a critter's walk, a door into the next level and where the levels
  sit on the map all become documented JSON with published schemas, checked by `automata check`, listed by an
  `automata` command and an MCP tool. Today none of it can be written down: a placed thing holds its kind and place
  only, and nothing says how levels join. An agent can also see its own change, as a picture of the level.
- **2. iPad-first editors.** World needs these formats to show links as arrows, paths as lines, reaches as circles
  and the world map as a sheet of pictures, and to keep a slider inside a value's limits.
- **3. Layers in order.** Every value here has no direction in it except a place, and a place is a named set of
  numbers (`x`, `y`), so the 3D layer adds `z` in its own level format and reuses the rest whole. An edge join names no
  side ("left", "top"): it comes from where two levels sit, so a 3D level's box touching another joins the same way.
  Nothing here is 2D-only in the shell, and nothing 3D is built.

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
- **Levels join edge to edge as well as through doors** (2026-11-15, answering the real-demo gap report): rooms that
  touch along an edge, so that a place can later be put together from a seed and a set of rooms. This replaces the first
  version's "through a door" only; doors stay.
- **All story is facts and conditions, as salience-based storylets** (2026-11-15). This page adds no rules language of
  its own: what a level remembers is kept as facts, so the story can read it, and anything here that may one day wait
  on the story uses the story's one condition shape.
- **The test games stay pure** (2026-11-15): a need of a real game is tried as a spike, never wired into the test game.
  Putting rooms together from a seed is such a need, so this page makes the formats ready for it and builds no part of
  it.

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
9. **Levels that touch edge to edge, as one seamless place:** levels joined by their edges run together, so a hero (or
   a crate) just keeps going from one into the next, with no cut, no slide and no load.
10. **Ready for rooms from a seed:** nothing in the formats stops a later part from laying rooms out from a seed; a
    thing in a laid-out room has an id a save can find again.
11. **The demo uses all of it,** on three levels joined by a door and by an edge (the Owner, 2026-11-15).

## Non-goals

- Auto-tiling rules (the Owner: not at launch).
- The part that puts rooms together from a seed (Spelunky style), and the World editor's "Try a seed" view. Both are a
  later spike and plan; this page only keeps the formats ready.
- Loading and unloading parts of a big place as the hero moves (streaming). This cycle runs the whole place at once,
  which the test game's place of two levels fits; streaming is a later cycle, when a game's place is too big for it,
  most likely in 3D.
- Facts, conditions and storylets themselves. They are the Story slice's; this page uses only what a level must
  remember.
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
- A "where it sits" on the map that changes how the game plays without `automata check` saying so. (Joins come from
  where levels sit, the Owner's choice, so a move on the map can make or break a join; `check` names every join that
  appears, moves or breaks, and the editor says it on the map.)
- An edge that leads into a wall: one side open where the other is solid, with no sentence from `check`.
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

For how levels join, the Owner first chose doors only, then (2026-11-15) doors **and** edges. How an edge join is
written down had three ways, set out under "Edges between levels"; the Owner chose by where the levels sit.

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

A door is any character with a `leads-to` value and `touch: "sense"`. When a hero touches it, the flow opens the level
the door names at once, with no "level done" screen between (the Owner, 2026-11-15), instead of the next in `levels`;
`done` still ends a level, with its screen, as it does today. Every hero comes out
beside the door's `thing` in that level, clear of it, never inside it, spread as the starts are (player 1 nearest), or at
that level's starts if it names none. In a game with more than one player, the first hero to go through takes everyone,
as `done` does today.

This lives in the flow, not the sim: the sim says which thing was touched (it already does), and the flow reads that
thing's `leads-to` and loads the level. A replay is of what was opened: one level, or the place that level is part of
(see "Edges between levels"). The saved game keeps the level and the thing you came in by, so Continue puts you back
beside the right door. A level with no door keeps today's `done` and `levels`.

A level that cannot be reached (not `start`, not in `levels`, and no door leads to it) is a note from `check`, not a
failure: a team may be building it.

## Edges between levels

Levels joined by their edges make one **place**, and a place plays as one seamless world (the Owner, 2026-11-15): a
hero who walks, falls or jumps over the edge is simply in the next level, with nothing in between. Doors and edges work
side by side: a door leads from one place into another, an edge is inside a place. A game may use either, both or
neither, and a level that touches no other is a place of one, which is every game today.

### How a join is written down (the Owner: by where the levels sit, 2026-11-15)

1. **By where the levels sit (chosen; LDtk's way).** The world file's `at` already says where each level sits.
   Two levels whose edges touch on the sheet, along a stretch both are open on, are joined there. There is nothing more
   to write: drag a level against another on the map and they join; pull it away and they part. From my own knowledge
   of LDtk (not read from its docs here): its "GridVania" and "Free" world layouts find a level's neighbours the same
   way, from where levels sit. The cost: the world file becomes part of the game for these joins, so `at` must be in
   whole tiles, levels may no longer overlap, and a move on the map can change play; `check` names every join so that
   is never silent.
2. **A list of joins in the world file.** `"joins": [{ "a": "level-1", "b": "level-2", "along": …, "offset": … }]`,
   kept apart from where levels sit, as the amendment first drew it. The map's arrangement stays only an arrangement,
   but there are two homes that can disagree (the sheet shows level 2 beside level 1, the join says below it), and
   the join has to name a side, which brings flat words into the file.
3. **An edge thing in each level,** a long thin sensor along the edge with a `leads-to`, so an edge is a door you walk
   through sideways. No world file needed, but both sides must be kept in step by hand, and where you come out has to
   be worked out from two things' sizes.

The Owner chose way 1 (2026-11-15); the rest of this section is written for it. Ways 2 and 3 are kept here as the
ones considered.

### Open stretches come from the tiles

A stretch of an edge is open where its edge tiles are empty (no ground, no ledge). Nothing is marked: an agent writes
tiles as today, and the open stretches follow. `automata check` holds the two sides of each join to each other:

- "level-1's right edge is open at rows 5 to 7, but level-2, which touches it, is solid there. Open level-2's left
  edge at those rows, or move it." (the words "right" and "rows" are `check`'s, for a 2D level; the files hold none);
- a level that sits on the map overlapping another;
- `at` not in whole tiles, for a level that touches another.

An open edge that touches no level behaves as it does today.

### One seamless place (the Owner, 2026-11-15)

- **A place is every level its edges reach,** found from the world file. When a place opens (the game's start, a door,
  Continue), the sim builds all its levels into one world: each level's ground, things and joints set at its `at`, in
  one physics world. Nothing marks the edges inside it: the open stretches meet, so a body passes as it would over any
  open floor.
- **Everything crosses, not only heroes.** A crate pushed over the edge goes with you and is in the next level; a
  critter's path stays where its level put it. A thing keeps its id with its level's in front (`level-2.crate-1`), so
  saves, events and links still say which level it was written in. Links between things (a `thing` value) stay inside
  one level, as before.
- **The camera follows the hero across.** Its limits are the outline of the whole place, not one level's box.
- **Which level the hero is in** is known every tick from its place against the levels' boxes. It is what the level
  name on screen, the goal line, a level's own music or look, and the save read. Crossing is an event, `level.entered`,
  with the hero and the level, so game code and later the story can act on it.
- **More than one player:** each hero may be in a different level of the same place, since it is one world. A door
  still takes everyone, as today.
- **A replay is of a place.** A recording starts where the place was opened and plays the whole place, so a crate
  pushed from level 2 into level 3 replays the same in Node and every browser. It is named after the level it starts
  in (`replays/level-2.json` plays the place of levels 2 and 3).
- **The saved game** keeps the place, the level the hero was last in and where it came into that level (by a door's
  thing, or the spot along the edge it crossed), so Continue builds the place again and puts the hero there. Inside a
  place nothing is "left and come back to", since it all keeps running; what was done for good is kept as facts across
  places (below).

### Ready for rooms from a seed

Nothing here is built for it, but nothing stops it:

- Any level can be a room; there is no `room` mark (my call: the open stretches already say how rooms may meet). The
  later part that lays rooms out reads a list of room levels from its own file.
- A laid-out room's things get ids from the room's level id, its place in the layout and the thing's own id
  (`level-3@2.crate-1`), so a save can say "the crate in the third room" and Continue finds it again. Links between
  things (a `thing` value) stay inside one level, so a laid-out room's links never point outside it.
- The seed is the sim's seed, so the same seed lays out the same place in every browser.

## What a level remembers (the Owner: what was done for good, 2026-11-15)

With doors and edges, a player can go back into a level they left. The Owner chose (2026-11-15): **what was done for
good is remembered** (a gate opened by a button with `stays`, later a
thing taken), and everything else (a crate's place, a critter on its walk) starts again as the level is written.

What is remembered is kept as **facts**, the story's own kind of state (the amendment's part 2): named values that only
the sim changes and that the save keeps. This page brings in only the first ones, made for the game and never written by
hand, named `<level>.<thing>.<state>` (`level-1.gate-1.open`), so the story can later read them with its conditions
("Only when the gate in the first room is open"). The facts file, conditions and storylets themselves are the Story
slice's. A game with no `stays` switch keeps no facts and moves no hash.

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
  the others. For a level that touches no other, it is the map's arrangement only. For levels that touch, it is
  also the join (way 1), read by the flow and checked as above; the editor snaps a level to whole tiles and never
  leaves two overlapping.
- **What leads to what through a door is not in this file.** It is the doors' `leads-to` values, so there is one home
  for it, and the map draws an arrow from each door to where it comes out. Edge joins, with way 1, come from `at`
  (above), and the map draws each as a short bar across the shared stretch. The project's `start` and `levels` order are drawn too
  (the start is marked; `levels` is shown as the order the screens list).
- A level the file leaves out is placed by the editor in a row to the right, and written to the file at the first
  arrangement the person makes. Two people's arrangements merge line by line, since each level is one entry.
- `check` fails a level named twice, or one the game does not list.
- The 3D layer's map is also a flat sheet of pictures, as 3D games' maps are; its `at` gains `z` only so levels'
  boxes can touch in depth, and the sheet still shows them flat.

## Level pictures, for agents

`automata picture [level…]` paints a picture of each level (all of them when none is named) into
`.automata/pictures/<level>.png`, a folder the template's `gitignore` gains a line to leave out, and prints the paths, with
`--json` and the MCP tool `picture`. Pictures are made, never committed: they would only collide in a merge.

- **As it plays:** the scene's ground, sky and backdrop, then each thing in its first pose at its place.
- **`--what-it-is`:** the same, with the ground tinted by kind (solid, ledge, slope), and every value whose `shown` is
  not `none` drawn on top: links as arrows, paths as lines with their points, reaches as circles, tags and doors'
  targets as small numbered badges, with a list printed beside the picture that says in the source language what each
  number is (the Owner, 2026-11-15). This is the view an agent reads to check its own change, and the editor's "Show
  what it is".
- **`--world`:** one picture of the world file's sheet, each level's small picture at its `at`, with the doors' arrows
  and the edge joins' bars between them.

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

AutomataFrameworkExamples gains two levels and the parts above, so a first-time player meets each one, in order
(the Owner chose a third level joined by an edge, 2026-11-15):

- **Level 1:** today's room, the crate, a **plate** on the floor linked to a **gate**, and an **exit door**. The crate
  is pushed onto the plate, the gate opens while it stays there, and the exit door behind the gate `leads-to` level 2.
  The goal line says what to do ("Push the crate onto the plate"), in all six languages.
- **Level 2:** a **critter** walking a path between two points and a **button** with `stays` on that opens a gate for
  good. You come out beside level 2's entry door. Its right edge is open and touches level 3.
- **Level 3:** you run in from level 2's edge with no break, in one seamless place, and can push level 2's crate
  across with you; the goal that ends the game.
- **The world file** places the three levels on the sheet, so the map has three pictures, one arrow and one edge bar.
- Putting rooms together from a seed is not in the demo: it is a spike of its own, later.
- New characters: plate, gate, door, critter, with a `patrol` behaviour using `walk-path`. Until the figure builder
  draws them (the demo's art comes from the builders), they are drawn in the demo's colours as boxes with an icon or
  figure the agent drafts, as the crate was.
- `replays/level-1.json` changes because the level changes, and CI says "the content changed" as it does for any
  content edit; the new recording is shown to the Owner before its merge. `replays/level-2.json`, the place of levels 2 and 3, is new.
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
| Edge joins | a level's box touching another's, on any of its six faces, joins them the same way; open stretches come from its cells |
| What a level remembers | unchanged: facts have no direction |
| World file | a flat sheet of pictures; `at` gains `z` for joins |
| Level pictures | a picture from the level's own camera |

## Agents

- The `automata-content` skill gains a page, `values-and-doors.md`: the declaration table, a whole button and gate
  pair, a critter with a path, two levels joined by doors, and the world file.
- `automata world` prints the levels, where each sits, what leads to what (from the doors) and which levels touch,
  along which stretch, with `--json`; the MCP tool `world` returns the same.
- `automata check`'s sentences above, each with the fix.
- The README gains a short "Links, paths and doors" section and the two commands in its table.

## Testing

All in GitHub-hosted CI.

- Unit tests for each declaration type and each `check` sentence, a level and a character at each limit and one past it.
- The parity suite (Node and the three browsers) for a switch, an open gate, a gate that waits for a hero to leave,
  and a `walk-path` critter, each with a new golden (`switch.json`, `walk-path.json`); every existing golden unmoved,
  which proves "joined only when used".
- A flow test: a door opens its level with every hero beside the named thing; Continue after it.
- A parity test for a place (Node and the three browsers), with its own golden: a hero runs from level 2 into level 3
  with no break in speed, and pushes a crate across the edge; `level.entered` fires once per crossing; the camera's
  limits are the place's outline. Continue after it puts the hero back in level 3.
- A test that a game with no edge joins builds exactly the one-level world it does today (every existing golden
  unmoved).
- `check` sentences for an edge open on one side only, overlapping levels, and `at` off whole tiles.
- A save test: a gate opened for good is open again after leaving and coming back; a crate is back at its place.
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
- How the sim builds several levels into one world with their offsets, and how a place's hash is made.
- How large a place may be before `check` warns (a note, not a failure) that it needs streaming.
- How the plan splits into pull requests: likely formats and checks; switches, gates and paths in the sim; doors and
  edges in the flow and the world file, with what a level remembers; pictures and the change list; then the demo in
  Examples after the pin moves.

## Calls I made (the Owner: all fine, 2026-11-15)

1. A value's `name` is the team's word in the editor and is not translated; only `words` values are player words.
2. A plate and a button are one part, `switch`, with a `stays` value; the demo uses both forms.
3. What leads to what through a door lives only in the doors; the world file holds where levels sit, which is also
   where they join edge to edge.
4. A door takes every player at once, as `done` does today.
5. Level pictures go to `.automata/pictures/` and are never committed.
6. The template stays one level; the demo game shows two.
7. Moving platforms wait for a later cycle; a critter's path is the path this cycle proves.
8. `"one-per-level"` is added for the goal and the exit, beside starts' one per player.

New in this version:

9. Open stretches come from the tiles; nothing marks an opening.
10. Everything crosses an edge in a place; a thing keeps its level's id in front of its own. The whole place runs at
    once; streaming comes later.
11. There is no `room` mark; any level can be a room.
12. The files never name a side; only `check`'s sentences say "left" or "top", for a 2D level.

## The Owner's answers

Asked as cards in the spec's thread and answered by the Owner, 2026-11-15.

1. **How do two levels join at an edge?** **Answered (2026-11-15): by where they sit on the map**, LDtk's way (way 1).
2. **Are calls 1 to 12 above fine?** **Answered (2026-11-15): yes, all twelve.**
3. **What does the player see when crossing an edge?** **Answered (2026-11-15): one seamless place**, every joined
   level running together (it fits 3D, where players expect to keep walking).
4. **When you go back into a level, what does it remember?** **Answered (2026-11-15): what was done for good**, kept as
   facts the story can read.
5. **Does the test game get an edge join?** **Answered (2026-11-15): yes, a third level** joined to the second by its
   edge.


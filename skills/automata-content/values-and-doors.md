# Values, switches, doors and joined levels

Read this when a game needs a plate that opens a gate, a button that stays down, a door to another level, a walking
character with a path, or levels that touch along an edge. Everything here is a value or a file the formats already
hold, so none of it needs game code. The skill page has the kinds of file; the rules of each are in
`schemas/character.schema.json`, `schemas/level.schema.json` and `schemas/world.schema.json`, and what changed in each
format, newest first, is in `docs/formats/changes.md`.

Every file below is a whole file, written the way `writeContent` writes it, from one game that loads and plays, so copy it
as it is and run `automata check`.

## A character declares what its things may hold

A character lists its `values`. A thing in a level then says them in its own `values`, by the same ids. A value no
declaration fits, or one out of its range, is a problem with the file and the place in it.

| `type` | What a thing holds | The declaration says |
|---|---|---|
| `number` | a number | `least`, `most`, `default`, and `step` when it moves in jumps |
| `switch` | yes or no | `default` |
| `choice` | one of a few named options | `from` (1 to 16 options, each an `id` and a `name`), `default` |
| `words` | the key of one of the game's own messages | `default` when there is one |
| `thing` | a link to other things in the same level | `kinds` it may link to, `most` it may link to (1 means one id, more means a list), `needed` |
| `path` | a list of places, one after another | `least` and `most` places, `loop` |
| `leads-to` | a way into another level | `needed` |

Each declaration also has an `id` (used once in the character), a `name` an editor shows (never translated), an
optional `about` help line, and an optional `shown`, which says how `automata picture --what-it-is` draws it: a
`tag` (a numbered badge), a `reach` ring, an `arrow` to another thing, a `path`, or `none`.

## A plate and a gate

A character with `"switch": { "opens": "<id of a thing value>" }` is a switch: something with a moving body standing on
it presses it, and it opens the things its value links to. A character with `"opens": "walk-through"` is what a switch
opens: while it is open, things walk through it. A `stays` value (a `switch` value named in `switch.stays`) makes a
button that stays down: it opens its gates for good, raises the event `fact.kept` with the fact
`<level>.<thing>.open`, and a game that keeps what was done for good hands those facts back to the next game it starts.
With the default flow that is done for you.

File `content/characters/plate.json`:

```json
{
  "format": 1,
  "id": "plate",
  "body": "fixed",
  "size": {
    "w": 1,
    "h": 0.25
  },
  "color": "#8a8a8a",
  "upright": false,
  "kind": "plate",
  "touch": "sense",
  "values": [
    {
      "id": "opens",
      "name": "Opens",
      "type": "thing",
      "kinds": [
        "gate"
      ],
      "most": 4
    }
  ],
  "switch": {
    "opens": "opens"
  }
}
```

File `content/characters/gate.json`:

```json
{
  "format": 1,
  "id": "gate",
  "body": "fixed",
  "size": {
    "w": 0.5,
    "h": 8
  },
  "color": "#8a8a8a",
  "upright": false,
  "kind": "gate",
  "opens": "walk-through"
}
```

A level links them. The plate's `opens` value is the id of the gate in the same level:

File `content/levels/room-1.json`:

```json
{
  "format": 1,
  "id": "room-1",
  "tiles": [
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "################"
  ],
  "things": [
    {
      "id": "crate-1",
      "character": "crate",
      "x": 5.5,
      "y": 7.5
    },
    {
      "id": "plate-1",
      "character": "plate",
      "x": 8.5,
      "y": 7.875,
      "values": {
        "opens": [
          "gate-1"
        ]
      }
    },
    {
      "id": "gate-1",
      "character": "gate",
      "x": 11.25,
      "y": 4
    },
    {
      "id": "exit",
      "character": "door",
      "x": 13.5,
      "y": 7,
      "values": {
        "to": {
          "level": "room-2",
          "thing": "door-in"
        }
      }
    }
  ],
  "starts": [
    {
      "player": 1,
      "x": 2.5,
      "y": 7.5
    },
    {
      "player": 2,
      "x": 3.5,
      "y": 7.5
    }
  ]
}
```

## A door to another level

A character with a `leads-to` value is a door when it is a sensor (`"touch": "sense"`). A thing of it says which level to
open and, when it likes, which thing of that level to come out beside. The hero comes out beside that thing, clear of its
box, never inside it, so a door that leads back does not send the hero straight back. The default flow follows a door by
itself. A game with its own page asks `doorTaken(content, level, events)` after each step, and opens the level it names
with `createGameSim({ level, arrive })`.

File `content/characters/door.json`:

```json
{
  "format": 1,
  "id": "door",
  "body": "fixed",
  "size": {
    "w": 1,
    "h": 2
  },
  "color": "#8a8a8a",
  "upright": false,
  "kind": "door",
  "touch": "sense",
  "values": [
    {
      "id": "to",
      "name": "Leads to",
      "type": "leads-to"
    }
  ]
}
```

In `room-2`, `door-in` leads back to `room-1`'s `exit`. The level also has a critter with a path (below) and a
button that stays down (`"stays": true`):

File `content/levels/room-2.json`:

```json
{
  "format": 1,
  "id": "room-2",
  "tiles": [
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#...............",
    "#...............",
    "#...............",
    "################"
  ],
  "things": [
    {
      "id": "door-in",
      "character": "door",
      "x": 2.5,
      "y": 7,
      "values": {
        "to": {
          "level": "room-1",
          "thing": "exit"
        }
      }
    },
    {
      "id": "crate-1",
      "character": "crate",
      "x": 5.5,
      "y": 7.5
    },
    {
      "id": "critter-1",
      "character": "critter",
      "x": 7.5,
      "y": 7.5,
      "values": {
        "walk": [
          {
            "x": 7.5,
            "y": 7.5
          },
          {
            "x": 9.5,
            "y": 7.5
          }
        ]
      }
    },
    {
      "id": "button-1",
      "character": "button",
      "x": 11.5,
      "y": 7.875,
      "values": {
        "opens": [
          "gate-1"
        ],
        "stays": true
      }
    },
    {
      "id": "gate-1",
      "character": "gate",
      "x": 13.25,
      "y": 4
    }
  ],
  "starts": [
    {
      "player": 1,
      "x": 2.5,
      "y": 7.5
    },
    {
      "player": 2,
      "x": 3.5,
      "y": 7.5
    }
  ]
}
```

## A character with a path

A `path` value is a list of places (`x` and `y` in tiles). A rule `walk-path` in a behaviour walks along it. The format
and its checks are there, but the framework does not run `walk-path` yet: the walk comes with the Characters slice, so
a thing with a path stands still for now.

File `content/characters/critter.json`:

```json
{
  "format": 1,
  "id": "critter",
  "body": "dynamic",
  "size": {
    "w": 1,
    "h": 1
  },
  "color": "#8a8a8a",
  "upright": true,
  "kind": "critter",
  "behaviour": "patrol",
  "values": [
    {
      "id": "walk",
      "name": "Walk",
      "type": "path"
    },
    {
      "id": "reach",
      "name": "Reach",
      "shown": "reach",
      "type": "number",
      "least": 1,
      "most": 8,
      "step": 0.5,
      "default": 3
    }
  ]
}
```

## Levels that touch along an edge

A `world` file puts each level on a map, in whole tiles. Two levels whose sides touch, and are open along the same rows,
or columns, join into one place: it plays as one world, everything crossing the edge, and the whole place runs at once.
Keep a place to 8 levels and 16,384 tiles at most. A game has one world file, and it is listed in `automata.toml` like
any other file.

File `content/worlds/world.json`:

```json
{
  "format": 1,
  "id": "world",
  "levels": [
    {
      "level": "room-1",
      "at": {
        "x": 0,
        "y": 0
      }
    },
    {
      "level": "room-2",
      "at": {
        "x": 20,
        "y": 0
      }
    },
    {
      "level": "room-3",
      "at": {
        "x": 36,
        "y": 0
      }
    }
  ]
}
```

## See it without opening an editor

`automata world` says what the game's levels are, where each sits on the map, which door leads where, which levels join
and which are one place, and notes a level nothing leads to. `automata world --json` says the same as data:

```
automata world
```

`automata picture` paints a picture of each level into `.automata/pictures/` (a game's `.gitignore` leaves that folder
out). `automata picture --what-it-is` draws what each thing holds on top of its level, with a numbered badge on each, and
says in words what each badge is, a line a badge: its number, the level and the thing, the value and what it says. This
is the answer for `room-2` of this game:

```
automata picture room-2 --what-it-is
.automata/pictures/room-2.what.png
1  room-2 door-in  to  to room-1, beside exit
2  room-2 critter-1  walk  a path of 2 points: 7.5, 7.5 then 9.5, 7.5
3  room-2 critter-1  reach  3
4  room-2 button-1  opens  gate-1
5  room-2 button-1  stays  yes
```

`automata picture --world` paints the map of every level that has a place on it. Open the `.png` files to look at them,
or read the lines; both say the same.

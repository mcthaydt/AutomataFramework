# Scenes

A **scene file** is the ground of a place: a map of letters, what each letter is made of, and the colours it is painted in.
(It is not the browser entry's `Scene`, which is the drawn picture of a level at one moment. This page is about the file.)
A level names its scene and only places what plays on it: its things and where each player starts. Scene files live in
`content/scenes/`, each listed in `automata.toml` as `type = "scene"`; the rules are in `schemas/scene.schema.json`.

Use this page when you draft a scene for a person to finish in the builder. Write the file, run `npx --no automata check`,
and read what it says: every sentence names the file, the place in it and what to change. `npx --no automata art` paints the
scene's picture beside it (`content/scenes/meadow.json` makes `meadow.png` and `meadow.atlas.json`); commit them with it.

## The smallest scene

Eight tiles wide, four tall, one kind of ground with a lip of grass along its top. `seed` makes the same description paint the
same way every time; change it for another painting. `tile` is how many pixels of the picture make one tile of the game.

```json scene
{
  "format": 1,
  "id": "meadow",
  "seed": 7,
  "tile": 16,
  "size": {
    "w": 8,
    "h": 4
  },
  "paints": [
    {
      "id": "soil",
      "color": "#6b4a33"
    },
    {
      "id": "grass",
      "color": "#5fa04a"
    }
  ],
  "materials": [
    {
      "id": "earth",
      "kind": "flat",
      "paint": "soil",
      "top": {
        "material": "turf",
        "deep": 4
      }
    },
    {
      "id": "turf",
      "kind": "flat",
      "paint": "grass"
    }
  ],
  "ground": {
    "letters": [
      {
        "letter": "G",
        "material": "earth",
        "shape": "solid"
      }
    ],
    "rows": [
      "........",
      "........",
      "........",
      "GGGGGGGG"
    ]
  }
}
```

Every key is below. A file needs `format`, `id`, `seed`, `tile`, `size`, `paints`, `materials` and `ground`; `sky` (a
`#rrggbb`, a light blue when left out) and `backdrop` (a backdrop file's id) are the only others at the top.

## The ground: letters, rows and shapes

`ground.rows` is one string a row, top row first, one letter a tile. `.` is always empty air. `ground.letters` says what each
other letter is: its `material` and its `shape`. A letter is one visible character other than `.`, and each letter is used for
one thing. Every row is exactly `size.w` long, and there are exactly `size.h` rows. `ground.color` is the colour of the
physics boxes when no picture is drawn.

The nine shapes. A tile is one square; `x` goes right and the surface is measured down from the tile's top:

| Shape | What it is | Drawn as three rows |
|---|---|---|
| `solid` | a whole square you stand on | `###` over `###` over `###` |
| `slope-up` | a slope that rises to the right, from the bottom left corner to the top right | `..#` over `.##` over `###` |
| `slope-down` | a slope that falls to the right, from the top left corner to the bottom right | `#..` over `##.` over `###` |
| `half-up-low` | the first half of a gentle rise: from the bottom left to half way up | `...` over `...` over `.##` |
| `half-up-high` | the second half of a gentle rise: from half way up to the top right | `..#` over `###` over `###` |
| `half-down-high` | the first half of a gentle fall: from the top left to half way down | `#..` over `###` over `###` |
| `half-down-low` | the second half of a gentle fall: from half way down to the bottom right | `...` over `...` over `##.` |
| `ledge` | the top quarter of a square: a hero lands on it from above, and jumps up through it from below | `###` over `...` over `...` |
| `back` | seen and never solid: a wall to look at, which a hero walks in front of | `###` over `###` over `###`, with nothing to stop you |

(The three-row pictures show roughly which part of the tile is ground; a slope is a straight line across its square.)

A **slope stands on ground**: every tile under a slope's line must be solid, or the check refuses the file and names the tile to
fill. A gentle rise is `half-up-low` and then `half-up-high` next to it, and a steep one is a run of `slope-up` going up a
row for each column. A lone half slope still plays, and so does a slope that runs off the scene's edge, each tile on its own.

This scene has a hill of two slope tiles, with solid ground under both:

```json scene
{
  "format": 1,
  "id": "hill",
  "seed": 3,
  "tile": 16,
  "size": {
    "w": 8,
    "h": 4
  },
  "sky": "#9fd3f0",
  "paints": [
    {
      "id": "soil",
      "color": "#6b4a33"
    },
    {
      "id": "grass",
      "color": "#5fa04a"
    }
  ],
  "materials": [
    {
      "id": "earth",
      "kind": "flat",
      "paint": "soil",
      "top": {
        "material": "turf",
        "deep": 4
      },
      "edge": "grass"
    },
    {
      "id": "turf",
      "kind": "flat",
      "paint": "grass"
    }
  ],
  "ground": {
    "letters": [
      {
        "letter": "G",
        "material": "earth",
        "shape": "solid"
      },
      {
        "letter": "/",
        "material": "earth",
        "shape": "slope-up"
      }
    ],
    "rows": [
      "........",
      "...../GG",
      "..../GGG",
      "GGGGGGGG"
    ]
  }
}
```

## Materials: what a letter is made of

A material has an `id` and a `kind`. Every letter points at one by id. There are three kinds.

**`flat`** is one of the scene's paints all over (`paint`). It may have a `top`, another material along the surface
(`material`, and `deep` in pixels, at most one tile; the top must be a photo or a flat material, and never the material itself),
and an `edge`, the id of a paint for a one-pixel line where the ground meets air. The first example above is flat.

**`photo`** turns a photo into the scene's paints, so the ground looks like brick or stone in the colours of the scene. Name the
photo, then say how its light becomes paints with one of two keys (never both):

- `ladder`: two to six paints, dark to light. The photo's darkest parts take the first, its lightest the last.
- `match`: a number from 2 to 8. Keep that many of the photo's own colours, each as the nearest paint in the scene.

```json scene
{
  "format": 1,
  "id": "street",
  "seed": 11,
  "tile": 16,
  "size": {
    "w": 8,
    "h": 4
  },
  "paints": [
    {
      "id": "stone-dark",
      "color": "#3d3a36"
    },
    {
      "id": "stone",
      "color": "#6b665e"
    },
    {
      "id": "stone-light",
      "color": "#9a948a"
    },
    {
      "id": "moss",
      "color": "#5f7a3c"
    }
  ],
  "materials": [
    {
      "id": "wall",
      "kind": "photo",
      "photo": "stone",
      "ladder": [
        "stone-dark",
        "stone",
        "stone-light"
      ],
      "wear": 0.4
    },
    {
      "id": "road",
      "kind": "photo",
      "photo": "cobbles",
      "match": 3,
      "scale": 2
    }
  ],
  "ground": {
    "letters": [
      {
        "letter": "W",
        "material": "wall",
        "shape": "solid"
      },
      {
        "letter": "R",
        "material": "road",
        "shape": "solid"
      }
    ],
    "rows": [
      "........",
      "........",
      "WW....WW",
      "RRRRRRRR"
    ]
  }
}
```

The photo is one of the library's (the table below) or one of the game's own, a `photo` file listed in `automata.toml`
(`schemas/photo.schema.json`, and the game's own photo wins when it has the id of a library one). Only the photos a scene
uses are read. Every photo knob is optional:

| Key | Range | Left out | What it does |
|---|---|---|---|
| `accent` | as long as `ladder` | none | a second ladder, used where the photo's colour parts from the rest (with `ladder` only) |
| `scale` | 0.25 to 8 | 1 | how many times bigger the photo is |
| `turn` | true or false | false | true turns the photo a quarter turn |
| `wear` | 0 to 1 | 0.3 | 0 is new, 1 is derelict |
| `seed` | whole number | 0 | moves where the photo wears |
| `flatten` | 0 to 1 | 0.85 | how much slow change of light is taken out of the photo |
| `facet` | 0 to 4 | 1 | how much the photo is smoothed into patches |
| `contrast` | 0.01 to 0.5 | 0.07 | the lightness one step of the ladder spans (with `ladder` only) |
| `hue` | 0 to 0.5 | 0.06 | how far a colour must part from the rest to take the `accent` paints |
| `cluster` | 1 to 64 | 4 | the smallest patch the clean-up keeps, in pixels |
| `top`, `edge` | | none | as for `flat` |

**`tiles`** is one kind of tile of a tileset (`tileset` and `tile`, by id), drawn from the tileset's own picture, joined to its
neighbours by the tileset's rules. A tile is a whole square, so it cannot be a slope. Use it when the person has drawn tiles.

```json scene
{
  "format": 1,
  "id": "village",
  "seed": 0,
  "tile": 16,
  "size": {
    "w": 8,
    "h": 4
  },
  "paints": [
    {
      "id": "ground",
      "color": "#5a4a3a"
    }
  ],
  "materials": [
    {
      "id": "stone",
      "kind": "tiles",
      "tileset": "meadow",
      "tile": "stone"
    }
  ],
  "ground": {
    "letters": [
      {
        "letter": "S",
        "material": "stone",
        "shape": "solid"
      }
    ],
    "rows": [
      "........",
      "........",
      "........",
      "SSSSSSSS"
    ]
  }
}
```

## The photo library

The package ships 38 photos in `photos/`, all CC0, each with its source in `src/features/content/library/photos.json` and
`photos/README.md`. Use an id as a `photo`. The last column is how many tiles the photo spans, wide by tall: a brick looks as
big beside a tile as it should.

| Id | What it is | Tiles |
|---|---|---|
| `aggregate` | gravel set in concrete | 2 by 2 |
| `asphalt` | a tarmac road | 3 by 3 |
| `bark` | brown tree bark | 1 by 1 |
| `beams` | a wall with wooden beams | 1 by 1 |
| `brick` | red brick | 1 by 1 |
| `brickYellow` | yellow brick | 1.9 by 1.9 |
| `carpet` | worn carpet | 0.6 by 0.6 |
| `ceilingPaint` | a painted ceiling | 2 by 2 |
| `ceilingTiles` | ceiling tiles | 2 by 2 |
| `checker` | black and white checked paving | 2 by 2 |
| `cobbles` | cobblestones | 1.5 by 1.5 |
| `concrete` | a concrete wall | 2 by 2 |
| `corrugated` | corrugated iron | 2.7 by 2.7 |
| `dirt` | brown mud and earth | 1.3 by 1.3 |
| `fabric` | woven wool | 0.32 by 0.39 |
| `floorTiles` | floor tiles | 1.5 by 1.5 |
| `kerb` | grey granite | 2 by 2 |
| `laminate` | a wooden kitchen top | 0.6 by 0.6 |
| `lino` | old linoleum | 1.99 by 1.99 |
| `metal` | a metal plate | 2 by 2 |
| `metalSheet` | a blue metal sheet | 2.5 by 2.5 |
| `paintedPlaster` | a painted plaster wall | 2 by 2 |
| `panelling` | dark wood panelling | 1.4 by 1.4 |
| `pavement` | a concrete pavement | 1.8 by 1.8 |
| `paving` | large grey paving slabs | 3 by 3 |
| `planks` | brown wooden planks | 1 by 1 |
| `plaster` | a plastered wall | 2 by 2 |
| `plasterFinish` | grey plaster | 1.5 by 1.5 |
| `roof` | roof slates | 3 by 3 |
| `rug` | rough linen | 0.27 by 0.27 |
| `scallopPlaster` | plaster with a scalloped pattern | 2 by 2 |
| `stone` | an old stone wall | 2.09 by 2.09 |
| `stripedWallpaper` | peeling striped wallpaper | 2.5 by 2.5 |
| `stucco` | white stucco | 2 by 2 |
| `tiles` | wall tiles | 1.9 by 1.9 |
| `wallTiles` | grey concrete tiles | 1.83 by 1.83 |
| `woodGrain` | a wooden table top | 1.5 by 1.5 |
| `woodPanels` | wooden panels | 2.1 by 2.1 |

## A level that plays in a scene

A level with a scene has no `tiles`, `tileset`, `backdrop`, `sky` or `ground` of its own (the scene has them): a level with both `tiles`
and `scene`, or neither, is refused with a sentence that says which to keep. Its size is the scene's.

```json level
{
  "format": 1,
  "id": "level-1",
  "scene": "meadow",
  "things": [
    {
      "id": "crate-1",
      "character": "crate",
      "x": 4.5,
      "y": 2.5
    }
  ],
  "starts": [
    {
      "player": 1,
      "x": 1.5,
      "y": 2.5
    }
  ]
}
```

`automata scene from-level` may write `"oneBoxPerRow": true` in a scene's `ground`. It is a fact about the old level, not a
setting to choose: a level written the old way, with no tileset and a hero the framework does not move, made one box a row,
and keeping that is what keeps its recorded play as it was. A scene you write by hand leaves it out, and its boxes are joined,
which is what a hero the framework moves wants (a hero catches on the seam between two boxes). If a game later gives its
hero `moves`, take `oneBoxPerRow` out of the scenes `from-level` made for it, or the hero will meet those seams.

## How big a scene can be

Up to 256 tiles wide and 256 tall, and a `tile` of 4 to 64 pixels. The ground's picture is cut into pages 2048 pixels wide and
stacked, and it may be 2048 pixels tall at most, which is about four million pixels of ground: 256 by 64 tiles at `tile` 16 is
the biggest. A scene past that is refused with its size and what to make smaller (a smaller `tile`, or a smaller scene). A
scene has at most 64 paints, 32 materials and 93 letters.

## The commands

- `npx --no automata scene from-level level-1` moves an old level's rows onto a scene, `scene-1`, and points the level at it. The
  level plays as it did, tick for tick, but the game's content is now different bytes, so `automata replay` says the
  content changed and does not compare hashes: run `npx --no automata replay --accept` to record each play again.
  `--as meadow` names the scene.
- `npx --no automata check` says what is wrong with a scene file. `--only art` is the picture only.
- `npx --no automata art` paints the pictures; `--check` says which are missing or older than their file.
- `npx --no automata add --type scene --path content/scenes/meadow.json` lists a scene you have written.

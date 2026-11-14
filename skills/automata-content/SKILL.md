---
name: automata-content
description: Use when you create or change a content file, such as a level, a character, a sound or any other JSON file the game lists in automata.toml. One section for each kind, with its smallest whole file.
---

# Content files

Content is JSON, one thing in each file. The file's `id` is its name without the file ending, and `format` is always `1`. Each
file is listed in `automata.toml`:

```toml
[[content]]
type = "level"
path = "content/levels/level-1.json"
```

A file that is not listed is not part of the game, and `automata check` says so. Run `npx --no automata check --fix` after
you edit one: it writes the file in its standard form, which is what the editors and the framework write too. Do not
format content by hand or with a formatter. `npx --no automata check --only files` says what is wrong with a file, with its
place in it.

Each kind has a JSON Schema in the package, `schemas/<kind>.schema.json`, that lists every field and what it means. Read
it for what the file may hold. The smallest whole file of each kind is below, to copy.

## level

A level: the walls, the things in it and where each player starts. Put the files in `content/levels/`; the kind's rules are in `schemas/level.schema.json`.

```json
{
  "format": 1,
  "id": "level-1",
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
      "x": 6.5,
      "y": 7.5
    }
  ],
  "starts": [
    {
      "player": 1,
      "x": 2.5,
      "y": 7.5
    }
  ]
}
```

## character

A kind of thing: how its body behaves, how big it is and what colour it is. The hero is one, and so is a crate. Put the files in `content/characters/`; the kind's rules are in `schemas/character.schema.json`.

```json
{
  "format": 1,
  "id": "crate",
  "body": "dynamic",
  "size": {
    "w": 1,
    "h": 1
  },
  "color": "#c9a227",
  "upright": false
}
```

## tileset

The pictures for a level's tile letters: which letter is solid, and which frame of an image draws it. Put the files in `content/tilesets/`; the kind's rules are in `schemas/tileset.schema.json`.

```json
{
  "format": 1,
  "id": "meadow",
  "image": "art/meadow.png",
  "tileSize": 16,
  "columns": 4,
  "tiles": [
    {
      "id": "grass",
      "letter": "G",
      "solid": true,
      "pictures": [
        {
          "frame": 0,
          "when": {
            "up": "other"
          }
        },
        {
          "frame": 1,
          "when": {
            "left": "other"
          }
        },
        {
          "frame": 2
        }
      ]
    },
    {
      "id": "flowers",
      "letter": "~",
      "solid": false,
      "pictures": [
        {
          "frame": 3
        }
      ]
    }
  ]
}
```

## behaviour

What a character does by itself: rules that say "when this is near, do that". Put the files in `content/behaviours/`; the kind's rules are in `schemas/behaviour.schema.json`.

```json
{
  "format": 1,
  "id": "critter",
  "rules": [
    {
      "id": "run-away",
      "when": [
        {
          "sense": "near",
          "kind": "hero",
          "within": 3
        }
      ],
      "do": {
        "act": "flee",
        "from": "hero",
        "speed": 4
      }
    },
    {
      "id": "wander",
      "when": [],
      "do": {
        "act": "wander",
        "speed": 1,
        "turnEvery": 90
      }
    }
  ]
}
```

## tuning

The numbers a person may change (how fast the hero runs), each with its range, and the keys that play the game. Put the files in `content/tunings/`; the kind's rules are in `schemas/tuning.schema.json`.

```json
{
  "format": 1,
  "id": "hero",
  "numbers": [
    {
      "id": "run-speed",
      "about": "How fast the hero runs, in tiles a second.",
      "value": 6,
      "min": 1,
      "max": 12,
      "step": 0.5
    }
  ]
}
```

## feel

How the game answers an event: a freeze, a shake or a puff of dust. Put the files in `content/feels/`; the kind's rules are in `schemas/feel.schema.json`.

```json
{
  "format": 1,
  "id": "spark-freeze",
  "on": "spark.taken",
  "freeze": {
    "ticks": 4
  }
}
```

## sound

One sound, made from tones. Put the files in `content/sounds/`; the kind's rules are in `schemas/sound.schema.json`.

```json
{
  "format": 1,
  "id": "jump",
  "volume": 0.8,
  "voices": [
    {
      "kind": "tone",
      "wave": "square",
      "from": 220,
      "to": 660,
      "at": 0,
      "length": 0.15,
      "volume": 1
    }
  ]
}
```

## music

A tune that can loop, made of parts. Put the files in `content/music/`; the kind's rules are in `schemas/music.schema.json`.

```json
{
  "format": 1,
  "id": "meadow",
  "tempo": 100,
  "stepsPerBeat": 4,
  "volume": 0.6,
  "loop": true,
  "parts": [
    {
      "id": "lead",
      "kind": "tone",
      "wave": "triangle",
      "volume": 0.5,
      "notes": [
        "C4 - E4 - G4 - E4 - C4 - E4 - G4 - E4 -",
        "D4 - F4 - A4 - F4 - D4 - F4 - A4 - G4 ="
      ]
    },
    {
      "id": "drums",
      "kind": "drums",
      "volume": 0.4,
      "notes": [
        "x - - - x - - - x - - - x - x -",
        "x - - - x - - - x - - - x x x -"
      ]
    }
  ]
}
```

## cues

Which events play which sound or music. Put the files in `content/cues/`; the kind's rules are in `schemas/cues.schema.json`.

```json
{
  "format": 1,
  "id": "cues",
  "cues": [
    {
      "on": "hero.jumped",
      "do": "sound",
      "sound": "jump"
    },
    {
      "on": "hero.landed",
      "do": "sound",
      "sound": "land"
    },
    {
      "on": "level.started",
      "do": "music",
      "music": "meadow"
    }
  ]
}
```

## conversation

A talk: what each person says and the choices a player has. Put the files in `content/conversations/`; the kind's rules are in `schemas/conversation.schema.json`.

```json
{
  "format": 1,
  "id": "keeper",
  "start": "hello",
  "nodes": [
    {
      "id": "hello",
      "speaker": "keeper",
      "lines": [
        "keeper.hello"
      ],
      "choices": [
        {
          "line": "hero.ask",
          "next": "tip"
        },
        {
          "line": "hero.bye",
          "next": "bye"
        }
      ]
    },
    {
      "id": "tip",
      "speaker": "keeper",
      "lines": [
        "keeper.tip"
      ]
    },
    {
      "id": "bye",
      "speaker": "keeper",
      "lines": [
        "keeper.bye"
      ]
    }
  ]
}
```

## cutscene

A scene that plays on its own: where the camera goes, who stands where and what they say. Put the files in `content/cutscenes/`; the kind's rules are in `schemas/cutscene.schema.json`.

```json
{
  "format": 1,
  "id": "level-1-intro",
  "level": "level-1",
  "length": 300,
  "camera": [
    {
      "at": 0,
      "x": 4,
      "y": 4,
      "zoom": 1,
      "ease": "cut"
    },
    {
      "at": 120,
      "x": 8,
      "y": 4,
      "zoom": 1.5,
      "ease": "smooth"
    }
  ],
  "actors": [
    {
      "at": 0,
      "who": "keeper",
      "x": 11.5,
      "y": 7.5
    },
    {
      "at": 60,
      "who": "keeper",
      "x": 11.5,
      "y": 7.5
    }
  ],
  "lines": [
    {
      "at": 60,
      "until": 180,
      "line": "keeper.hello",
      "speaker": "keeper"
    }
  ]
}
```

## messages

All of the game's words in one language, by key. One file for each language. Put the files in `content/messages/`; the kind's rules are in `schemas/messages.schema.json`.

```json
{
  "format": 1,
  "id": "en",
  "messages": {
    "hero.ask": "Any tips?",
    "hero.bye": "See you.",
    "keeper.bye": "Take care.",
    "keeper.hello": "Hello there! 👋",
    "keeper.tip": "Push the crate onto the ledge."
  }
}
```

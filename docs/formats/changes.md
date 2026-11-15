# Changes to the content formats

Every kind of content file has a JSON Schema in `schemas/`. This page lists each change to one of them, newest first, so
a person or an agent who wrote a file earlier can see what changed and what, if anything, the older file needs.

Each entry names the kind, says what changed in plain words, says what an older file needs, and ends with the schema's
hash: the `xxhash64` of the bytes of `schemas/<kind>.schema.json`, 16 hex digits. A test holds the page to the schemas:
when a schema changes, the newest entry of its kind must end with its new hash, so a format cannot change without a
line here saying so.

## 2026-11-15 · character · values, switch, opens and one-per-level

A character can now list the `values` its things may hold: a number, a switch, a choice, words, a link to other things, a path or a way into a level. It can say it is a `switch` that opens the things a value links to, that it `opens` (a gate that things walk through while it is open), and that a level may hold only one thing of it (`one-per-level`). None of these has a default, so a character that says none of them is read, written and hashed as it was.

**An older file needs:** nothing.
**Schema:** `bbd85ad90838e33f`

## 2026-11-15 · level · a thing holds values

A thing in a level can now hold `values`, by the ids its character declares: numbers, switches, choices, message keys, links to other things in the level, a path of places and a way into another level. A thing that writes none is read and written as it was.

**An older file needs:** nothing.
**Schema:** `bbaf90bcb0cbde62`

## 2026-11-15 · behaviour · walk-path

A rule can now do `walk-path`: walk along a path its character holds, naming the path's value and a speed. The format and its checks are here; the framework does not run it yet, because behaviour rules wait for the Characters editor.

**An older file needs:** nothing.
**Schema:** `bd1f3437ec03e694`

## 2026-11-15 · world · a new kind

A new kind of file, `world`, in `content/worlds/`: where each level sits on the map, in whole tiles. Levels that touch along a side, and are open there, join into one place. A game has one world file.

**An older file needs:** nothing: a game with no world file is read and played as it was.
**Schema:** `381ddb55f82370a3`

## 2026-11-15 · level · The format as first listed

The format of a `level` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `bbe9c070cd0bcbfc`

## 2026-11-15 · character · The format as first listed

The format of a `character` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `2f2f9e04a0728081`

## 2026-11-15 · figure · The format as first listed

The format of a `figure` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `c451199e9b9759ec`

## 2026-11-15 · tileset · The format as first listed

The format of a `tileset` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `77de25287d72501c`

## 2026-11-15 · backdrop · The format as first listed

The format of a `backdrop` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `1efbf6473bf03f34`

## 2026-11-15 · behaviour · The format as first listed

The format of a `behaviour` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `4d2c6e7ee5b5f20d`

## 2026-11-15 · tuning · The format as first listed

The format of a `tuning` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `15d415e75df6d253`

## 2026-11-15 · feel · The format as first listed

The format of a `feel` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `137ad02b1c8727e4`

## 2026-11-15 · sound · The format as first listed

The format of a `sound` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `be03b9a669f1f28d`

## 2026-11-15 · music · The format as first listed

The format of a `music` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `ec543a0b63ee9892`

## 2026-11-15 · cues · The format as first listed

The format of a `cues` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `d9828f3eb820c06e`

## 2026-11-15 · conversation · The format as first listed

The format of a `conversation` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `afc2a46a9eff2f9d`

## 2026-11-15 · cutscene · The format as first listed

The format of a `cutscene` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `33a3770d4530e4f9`

## 2026-11-15 · messages · The format as first listed

The format of a `messages` file as it stood when this page began. Nothing here says the format changed.

**An older file needs:** nothing.
**Schema:** `6e162254e55b4443`

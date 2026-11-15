# Sound formats: recordings, loops, chords, motifs, MIDI and content folders

Stage 1 (spec) of a framework cycle in AutomataFramework, written 2026-11-15 with the Owner while specifying the
Sound editor. The editor's spec is in AutomataFrameworkEditors:
[`docs/superpowers/specs/2026-11-15-sound-editor-design.md`](https://github.com/mcthaydt/AutomataFrameworkEditors/blob/main/docs/superpowers/specs/2026-11-15-sound-editor-design.md).
That page says what a person does in Sound; this page says what the game's files hold and what the framework does
with them. M2's audio (plan S: `sound`, `music` and `cues` files, the `audio` feature, the `Speaker` port) stays and is
widened; nothing it plays today plays differently.

## Principles served

- **1. Agent-first.** Recordings, loops, chords, motifs and arranged music become documented JSON files with
  published schemas, so an agent reads and changes a song the way a person does in the editor: by its loops, chords and
  motifs, not by thousands of flat notes. MIDI comes in and goes out through one framework converter and an
  `automata` command, so an agent and the editor make the same bytes.
- **2. iPad-first editors.** These are the formats the Sound editor's touch-first music (loops and chords at a press)
  and recording need; without them it cannot keep what a person made.

It breaks none: audio is outside the sim (nothing here moves a hash), it is one framework feature, and it needs no new
dependency (see "Constraints").

## Why

The Owner's answers for the Sound editor (2026-11-15):

- **Recorded sounds are in** (Q4): a microphone or a sound file, "with a new framework format, files in the game's
  repo and a size limit". Today every sound is tones and hiss; there is no recording format.
- **Music like GarageBand loops** (Q3): "full chords, full drum loops ECT; on a press of a button rather than
  individual notes; also auditory motifs are important, so make it easy to do that". Today a music file is up to eight
  parts of flat single-note steps: it cannot say "this drum loop, four times", a chord, a key, or a motif used in two
  places.
- **New formats in the framework first** (Q5, A), and "It should be midi -> JSON and vice versa".
- **Content folders** (Q6, A): the project file lists a folder once, so a new sound file needs no new line in
  `automata.toml`, and an older game gets a one-time "Set up sounds" in the editor that adds that line.

## Goals

1. **A recording format:** a sound may play a short recorded file kept in the game's repo, under a size limit.
2. **Music as an arrangement:** a key, chords by bar, lanes of loop and motif blocks, so a track says how it was made.
3. **Loops and motifs as their own files,** reused across tracks and, for motifs, as sounds.
4. **A built-in library** of original loops, styles and sound kinds that every game and the editor can use.
5. **MIDI both ways:** `.mid` to the game's JSON and the game's JSON to `.mid`, in the framework, with an `automata`
   command.
6. **Folders in the project file,** for any content kind.
7. **Everything plays through today's `Speaker`,** so the game, the editor and a test hear the same thing, and today's
   files play exactly as before.

## Non-goals

- State-driven music or sounds (rules on game state), ducking, reverb or effects. Later.
- Recorded music, or recordings longer than a sound (10 seconds).
- Any change to the sim, its hash or a replay.
- Keeping a MIDI file in the game. MIDI is how music travels; the JSON is the game's music.
- A full MIDI player: only what the formats below can hold is read (see "MIDI").

## Anti-goals

- A format the editor can write but an agent cannot read and change by hand.
- A file today's framework plays that the new one plays differently.
- A recording that can make a game's download large without a check failing.
- A song whose loops, once placed, are flattened into notes in the file.

## Approaches considered

1. **Widen today's music file** (format 1) with chord rows and repeats. One file per track, but loops and motifs
   could not be shared between tracks or used as sounds, which the Owner's motif answer needs. Rejected.
2. **New kinds: `loop`, `motif`, and music format 2 that arranges them** (chosen). Each reusable thing is a file,
   referenced by id like every other content kind; format 1 music stays valid and plays as it does today.
3. **Store MIDI in the game and play it.** Agents and the editor would have to edit a binary file; a MIDI file has no
   key or chord structure to edit. Rejected; MIDI is converted in and out instead.

## Recordings

- **A new voice kind in the `sound` format:** `{ "kind": "recording", "file": "sounds/door.wav", "from": 0,
  "length": 0.8, "speed": 1, "at": 0, "volume": 1 }`. `file` is a game path ending `.wav`, beside the sound files;
  `from` and `length` choose the part of the file it plays (seconds), `speed` (0.5 to 2) plays it slower and lower or
  faster and higher. A sound may mix recordings with tones and hiss, within today's eight voices and 10 seconds.
- **The file:** WAV, mono, 16-bit, 44 100 samples a second. (My call: WAV because every browser and Node read it and
  the framework can write it with no dependency; mono at 16-bit keeps 10 seconds under 900 KB.)
- **The size limit:** a recording file is at most 10 seconds and 1 MB, and a game's recordings together at most 20 MB.
  `automata check` and the loader refuse a file over either, in plain words ("door.wav is 12 seconds long. A recording
  can be at most 10 seconds."). (My call on the 20 MB total, so a web game's download stays small; the Owner may move
  it.)
- **Writing one:** `writeRecording(samples, sampleRate)` turns decoded audio into the file's bytes, resampled to mono
  44 100 Hz, so the editor and an agent's script make the same bytes from the same sound.
- **Loading:** a page loads a game's recordings with the game, as it loads its art; `webSpeaker` decodes each once and
  plays a recording voice from it. `testSpeaker` logs a recording voice like any other. A missing or broken recording
  file is a load problem in plain words, like a missing picture.

## Loops

A new content kind, `loop`: a few bars of one instrument's part, written in steps of the key, so it fits any key and
any chord.

```json
{
  "format": 1,
  "id": "bouncy-bass",
  "lane": "bass",
  "bars": 2,
  "stepsPerBar": 8,
  "notes": ["1 - 5 - 1 - 5 -", "1 - 5 - 8 - 5 -"]
}
```

- `lane` is what it suits: `drums`, `bass`, `chords` or `melody`.
- **Drums:** `notes` is one row per drum (`kick`, `snare`, `hat`, `clap`, `tom`), `x` for a hit and `-` for a rest, as
  today's drum parts. The drums are made of tone and hiss voices, so they need no recording.
- **Bass and melody:** steps are steps of the bar's chord counted from its root (`1`, `3`, `5`, `8` for the octave
  above, `b7`, and `-` for a rest, `=` to hold), so a bass loop follows the chord row; a step may instead be a fixed
  note (`C4`), which a loop brought in from MIDI uses for notes outside the key.
- **Chords:** a rhythm row (`x - x x - x - -`) on which the bar's chord is played whole, and `voicing` (`close`,
  `open`, `high`).
- Each row is a bar, so `bars` rows (or `bars` rows per drum).

## Motifs

A new content kind, `motif`: a short tune, written in steps of the key and beats, so it can be moved, slowed and
turned sad without being rewritten.

```json
{ "format": 1, "id": "hero-theme", "notes": [ { "step": 1, "beats": 1 }, { "step": 3, "beats": 0.5 },
  { "step": 5, "beats": 0.5 }, { "step": 8, "beats": 2 } ] }
```

- `step` counts the key's notes from its first (1 to 15, two octaves, with `b` and `#` for a note between); at most
  16 notes.
- **A use of a motif** (a music block or a sound voice) carries its changes: `"motif": "hero-theme", "shift": -2,
  "speed": 0.5, "mode": "minor", "backwards": false`. So the door's motif can be the hero's, sadder and lower, and
  changing the hero's motif changes both. The editor's one-press changes (Higher, Lower, Slower, Faster, Sadder,
  Brighter, Backwards) are these fields.
- **As a sound:** a new voice kind `{ "kind": "motif", "motif": "hero-theme", "instrument": "pluck", "key": "C",
  "tempo": 120, ...changes, "at": 0, "volume": 1 }`, within the sound's 10 seconds. A cue plays it like any sound.

## Music format 2

```json
{
  "format": 2,
  "id": "meadow",
  "tempo": 110,
  "key": "C",
  "mode": "major",
  "bars": 8,
  "loop": true,
  "volume": 0.7,
  "chords": ["I", "vi", "IV", "V", "I", "vi", "IV", "V"],
  "lanes": [
    { "id": "drums", "instrument": "drums", "volume": 0.8,
      "blocks": [ { "at": 1, "loop": "easy-drums", "bars": 6 }, { "at": 7, "loop": "drum-fill", "bars": 1 } ] },
    { "id": "melody", "instrument": "pluck", "volume": 0.6,
      "blocks": [ { "at": 2, "motif": "hero-theme" }, { "at": 6, "motif": "hero-theme", "shift": 2 } ] }
  ]
}
```

- `key` and `mode` (`major`, `minor`); `chords` one a bar, as Roman numerals of the key (`I`, `ii`, `iii`, `IV`, `V`,
  `vi`, `vii°`, lower case for minor, with `7` and `sus4` allowed), so changing the key moves the whole song. (My call:
  numerals rather than names, because they move with the key; the editor shows them as names, "C", "Am".)
- Up to eight lanes, each with an `instrument` from the framework's list (made of tone and hiss voices: `drums`,
  `bass`, `keys`, `pluck`, `lead`, `pad`, `bell`, `organ`; the plan may add more) and `blocks`: a loop or a motif,
  from bar `at` for `bars` bars (a loop repeats to fill them; a motif plays once from `at`).
- Blocks in one lane may not overlap; every id must name a loop or motif in the game; the checks say so in plain
  words, as today's.
- **Format 1 stays.** A format 1 track loads and plays exactly as today. `scoreOf` widens to format 2 and gives the same
  `Score` (timed notes), so the music player and `Speaker` do not change.

## The built-in library

The framework ships, under `src/features/audio/library/`, as content files in these formats:

- **Sound kinds:** Jump, Land, Coin, Hit, Explosion, Door, Click, Power up, Laser, Blip: each a recipe that makes a
  sound's voices from a seed (`makeSound(kind, seed)`), so "Try another" is the next seed. The made sound is plain
  voices; the file does not remember its kind. (My call: a pure function with a seed, so the editor and an agent make
  the same sound from the same kind and seed.)
- **Loops:** at least eight drum loops and fills, six bass, six chord rhythms and six melody loops, original, written
  for this library.
- **Styles:** Calm, Bouncy, Spooky and Brave, each a ready four-bar format 2 track using the library's loops.
- **Words:** each library loop and style has its name in the nine editor languages, in the library's own words table.

Using a library loop or style copies its files into the game (`content/music/loops/…`), so a game always holds
everything it plays. Nothing in a game names the library at run time.

## MIDI

- **`midiToMusic(bytes)`** reads a Standard MIDI File (format 0 or 1) into a format 2 track and its loops: the tempo
  (the first), the key (its key signature, else worked out from the notes, else C major), each channel as a lane (channel
  10 as `drums`, each drum note mapped to the nearest of the five drums), notes cut into bars and kept as loops, with
  repeated bars made into one loop repeated. Notes in the key are written as steps; others as fixed notes. Chords are
  worked out per bar where the notes make one, else left as `I`. Velocity becomes a lane's volume; pitch bends,
  controllers, programs beyond the instrument guess, and tempo changes after the first are dropped, and the answer
  lists what was dropped in plain words.
- **`musicToMidi(track, game)`** writes any format 1 or 2 track, loop or motif to a format 1 MIDI file: one track a
  lane, drums on channel 10, the tempo, the key signature and the notes, as the framework would play them.
- **Round trip:** a track written to MIDI and read back gives the same notes as `scoreOf` (the test).
- **`automata music import <file.mid>`** and **`automata music export <id> <file.mid>`** do the same from the command
  line and from the MCP server, so an agent does what the editor does.
- (My call: the converter is written in the framework, with no MIDI library: a Standard MIDI File is a short, fixed
  format, and the stack's rule is no new dependency without the Owner.)

## Content folders

- A `[[content]]` block may name a `folder` instead of a `path`: `{ type = "sound", folder = "content/sounds" }`. Every
  `.json` file directly in that folder is that kind's content, in file-name order. A folder and a path may both appear.
- `automata create`'s template lists folders for `sound`, `music`, `loop`, `motif` and `cues`; the demo game (its own
  cycle in AutomataFrameworkExamples) does the same.
- Recordings are found from the sound files that name them, as pictures are found from the files that name them; they
  are never listed.
- `automata check` says when a file in a content folder is not of that kind, in plain words.
- **A mismatch flagged:** the Feel editor's cycle chose to add one `[[content]]` line per new effect file. The Owner's
  answer here is folders; this framework cycle makes folders work for every kind, so Feel can list its effects the same
  way. The coordinator should settle which rule Feel follows before Feel's plan is built.

## Testing

- Unit: every new schema, its words and its checks (a recording over 10 seconds or 1 MB, a block overlap, a missing
  loop); `scoreOf` on format 2 against hand-worked scores; motif changes; `makeSound` the same for the same seed;
  `writeRecording` bytes; MIDI read and written, the round trip, and what is dropped; folders in the project file.
- Node and browser: a game with a recording, a format 2 track and a motif sound plays through `testSpeaker` and
  `webSpeaker` with the same cue log in Chromium, WebKit and Firefox.
- **No hash moves:** sound, music, loop, motif and cue files are left out of `simContent`; a test adds each to a game and
  checks the recorded hashes are unchanged.
- The installed package: `automata music import` and `export` on a fixture `.mid` from the packed package.
- End to end: the template game, with a folder of sounds and a format 2 track, plays in real browsers (the
  `create-play` job) and its cue log says what played.
- Tests run only in GitHub-hosted CI. The API report and the agent skills are updated for every new export.

## Constraints

- **No new dependency:** WAV and MIDI are read and written by the framework; browsers decode with Web Audio.
- **Audio never touches the sim.** Everything here is out of `simContent`.
- **Every format is JSON with a published JSON Schema**, documented for agents in `skills/`.
- **Order:** this cycle lands, then the Editors pin moves to it, before the Sound editor's recording and music slices.
  The Sound editor's first slice (sounds and cues) needs only today's formats and the folders.

## Left to the builder (the plan)

- The exact voices of each sound kind and each instrument, and the library's loops (by ear, reviewed by the Owner as
  sound, since a cue log cannot judge them).
- How chords are worked out from MIDI notes.
- Whether folders search one level or every level below (this spec: one).
- How a page loads recordings (with the art or on first play).

## Calls I made (for the Owner to check)

- WAV, mono, 16-bit, 44 100 Hz; 10 seconds and 1 MB a recording, 20 MB a game.
- Chords as Roman numerals in the file, shown as names on screen.
- Loops and motifs written in steps of the key, with fixed notes allowed.
- The eight instruments, all made of tones and hiss.
- Library loops copied into the game when used.
- MIDI converter written in the framework, no library.
- Folders search one level.

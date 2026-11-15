# Plan M: Sound Formats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A game's files can hold a recorded sound, a loop, a motif and a song arranged from them (music format 2);
the framework plays all of it through today's `Speaker`, ships a library of sound kinds, loops and styles, turns a MIDI
file into those files and back, and lets `automata.toml` list a folder once for any kind of content.

**Architecture:** `content` learns a `folder` in a `[[content]]` block, two new kinds (`loop`, `motif`), two new sound
voices (`recording`, `motif`), music format 2 beside format 1, and the recording file (WAV, read and written by
`src/lib/wav.ts`). `audio` gains the music theory (keys, chords, steps to pitches), one function that turns any track
into plain notes (`notesOf`), on which both `scoreOf` and the MIDI writer stand, the instruments and drums as library
data, the sound kinds (`makeSound`), the loop and style library, and the MIDI converter over `src/lib/midi.ts`. The
`Speaker` port learns to keep a recording and play it; nothing else about it changes, and no sim is touched. `cli`
gains `automata music` and `automata sound`. The template gets folders, a sound, a song and its audio wired in.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.6.6, smol-toml, Effect (CLI only), Vitest 5.0.3 (browser mode and
journeys on Playwright 1.63.0), Biome 2.5.15, knip 6.39.0, pnpm 10.34.6, Node 24.21.0. **No new dependency:** WAV and
MIDI are read and written by the framework's own code.

**Spec:** [`docs/superpowers/specs/2026-11-15-sound-formats-design.md`](../specs/2026-11-15-sound-formats-design.md).
Read it first; this plan argues from it and does not repeat its reasons. The editor that uses these formats is
specified in AutomataFrameworkEditors, `docs/superpowers/specs/2026-11-15-sound-editor-design.md`. Principles served:
1 (every sound, loop, motif and song is a documented JSON file, and MIDI and sound kinds go through one function an
agent and the editor share) and 2 (these are the files the touch-first Sound editor keeps).

## Global Constraints

- **No hash moves.** Nothing in `tests/golden/` and not `template/replays/level-1.json` changes. `loop` and `motif`
  join the kinds the sim is not given. If any recorded hash differs in CI, stop that task and report it. Never
  re-record.
- **Today's files play exactly as today.** A format 1 track gives the same `Score` (`score.parity.test.ts` and
  `sounding.json` stay green untouched), and a sound of tones and hiss gives the same voices.
- **No new dependency.** If a task seems to need a package, stop and report to the coordinator with options.
- **Limits, word for word from the spec:** a recording is WAV, mono, 16-bit, 44 100 samples a second, at most 10
  seconds and 1 MB (1 048 576 bytes); a game's recordings together at most 20 MB (20 971 520 bytes); a sound has at
  most eight voices and 10 seconds; a track has at most eight lanes; a motif has at most 16 notes.
- **The same number in every engine.** `audio` is a pure feature (`tests/architecture/rules.ts`): no clock, no
  `Math.random`, no I/O. Pitches come from the table in `notes.ts`, by doubling and halving; times are counted in
  whole ticks (480 to a beat) and turned to seconds once, by one multiply and one divide. No `Math.pow`, `Math.log`,
  `Math.sin`.
- **Every problem is plain words** that name the file, the place and what to write, as every content check does.
- **Every new format has a JSON Schema** in `schemas/` and a section in `skills/automata-content/SKILL.md`.
- **No file over 600 lines.** `content/music.ts` is at 165 and `load.ts` at 274: format 2 and the folder listing go in
  new files.
- **Tests run only in GitHub-hosted CI.** Run nothing locally: no `pnpm install`, typecheck, lint or test. Push, then
  read the pull request's CI run. Write each test first and push it red before its code.
- **Generated files.** `schemas/*.json` and `docs/api/framework.api.md` are committed. When the `package` job fails
  on `pnpm schemas --check` or `pnpm api-report`, take the new text from that job's log and commit it.
- **Commits:** author and committer `McThayDT <107786093+mcthaydt@users.noreply.github.com>`; set the config before
  every commit; no AI attribution anywhere; never force-push.
- **An Owner question is never defaulted.** Send it to the coordinator with options and a recommendation, and wait.
- **Tracker:** after each task, update `docs/superpowers/progress.md` (Cycle 8, "sound formats"). Tasks 1 to 18 are 5% each; the last
  10% is the final green run with every check passing.

## Before starting

- **Folders are for every kind** (the Owner, 2026-11-15, through the coordinator: "Feel and Sound both list their
  folder once"). Task 1 and 2 make a folder work for any `type`; nothing in them is about sound. The Feel editor's
  plan uses them as they are.
- **Other plans touch the template and the page** (the game flow plan, plan F's feel runtime, plan H's hero). Task 17
  changes `template/`; before starting it, read `main`'s `template/src/features/page/page.ts` as it is then and fit
  the audio in where that page builds the game. If the template already makes a `Speaker`, use it; do not make two.
- **Tasks 1 and 2 are wanted first by two editors.** If the coordinator asks, they may be merged on their own pull
  request before the rest; they stand alone.

## The builder's calls

The spec leaves these to the plan, or is silent. They are settled here so the executor makes none of them.

1. **A page cannot list a folder,** so the loader takes a second function, `list`, and a page's `list` reads one
   generated file, `automata.folders.json` (never committed; `gitignore` names it). `automata play` serves it fresh on
   every request through a small Vite plugin in the template's `vite.config.ts`; a build writes it beside the page.
   The command line and the editors list the real folder. The file's maker and reader are the framework's
   (`folderManifest`, `listFromManifest`), so every place agrees.
2. **A folder holds every `.json` file directly in it** (one level, the spec's call) **except `*.atlas.json`**, which
   a figure paints beside itself. Files are taken in name order (UTF-16 code units).
3. **The loaded project keeps both lists.** `project.content` is, as today, every file with its path (the paths the
   project lists, then each folder's files), so everything that reads it keeps working. `project.folders` is the
   folder blocks as written, there only when the file has one, so a game with no folder hashes as it did.
4. **A file listed by path and found in a folder of the same kind counts once.** Found in a folder of another kind,
   it is a problem at the path's block.
5. **Four beats to a bar, always.** A file has no time signature. A MIDI file in another one is read as if it were
   four, and the answer says so.
6. **Keys:** `C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B`; modes `major` and `minor` (the natural minor).
7. **A chord** is `I` to `VII` (upper case: a major chord) or `i` to `vii` (lower case: minor), then `°` (lower case
   only: diminished), then `7` or `sus4`. Its root is that step of the song's scale. `7` adds the note ten semitones
   above the root; `sus4` puts the third on the fourth.
8. **A loop's numbered step** counts the notes of the chord's own scale from its root: 1 to 15, with `b` or `#` in
   front for the note between. The scale is major for a major chord, natural minor for a minor one, and for a
   diminished one the minor with its fifth lowered. `3`, `5` and `7` always land on the chord's own notes.
9. **Where a lane sits:** a `bass` loop's `1` is the chord's root in octave 2, a `chords` loop's in octave 3, a
   `melody` loop's and a motif's `1` in octave 4. A root's octave is the octave of its own note name (`C` to `B`).
10. **Voicings:** `close` is root, third, fifth (and seventh) upward from octave 3; `open` lifts the third an octave;
    `high` is `close` an octave up.
11. **A motif's `beats`** is a quarter of a beat to 8 beats, in quarters. Its changes: `shift` (whole steps of the
    key, -14 to 14), `speed` (0.25, 0.5, 1, 2 or 4), `mode` (`major` or `minor`, in place of the song's) and
    `backwards`. Each is left out of the file when it changes nothing, so a use with no change is just the id.
12. **A loop's `stepsPerBar`** is 4, 8, 12 or 16.
13. **A motif block** plays once from the start of bar `at`, and takes as many bars as its notes need (for the
    overlap check). A note that would sound past the end of the track is cut there.
14. **A drum loop goes only in a lane whose instrument is `drums`,** and no other loop or motif does. The check says
    which.
15. **Instruments and drums are data,** in `src/features/audio/library/instruments.json`: each instrument a few
    layers (a wave, a pitch multiple, a share of the loudness) and the longest a note rings; each drum a few voices.
    The first values are in Task 8. They are a start, made without ears: the Owner's review is by listening, and the
    numbers move in that file only.
16. **Sound kinds are data too,** `library/kinds.json`: for each kind, its voices with a range in place of each
    number. `makeSound` draws inside the ranges with a small whole-number generator and rounds to three places, so
    the answer is the same everywhere.
17. **The library's words** are in nine languages (`zh es en pt ja ko fr ru de`) in `library/words.json`, since the
    editors read them. The framework's own six are a part of those.
18. **MIDI is read at 16 steps to a bar.** Notes are moved to the nearest sixteenth and the answer says how many
    moved. A channel that plays several notes at once is spread over up to three lanes, highest first; more are
    dropped and said. At most eight lanes are kept, the busiest first.
19. **The key of a MIDI file with no key signature** is the major key whose seven notes cover the most sounding time;
    a tie goes to the first of `C G F D Bb A Eb E Ab B Db F#`.
20. **The chord of a bar** in a MIDI file is the song's own chord (of its seven) whose three notes cover the most
    sounding time of that bar's notes, drums left out; a tie goes to the lower step; a bar with no notes is `I`.
21. **A note from MIDI is written as a step** when a step of the bar's chord gives exactly that pitch, and as a fixed
    note (`C4`) otherwise, so reading back gives the same pitches.
22. **Commands:** `automata music import <file.mid> [folder]`, `automata music export <id> <file.mid> [folder]`,
    and `automata sound new <kind> [folder]` with `--seed <n>` and `--id <name>`. The spec names the first two; the
    third is the editor spec's "an agent's `automata` command and the editor make the same sounds".
23. **A command that makes a file needs the folder listed.** If the project lists no folder for that kind, the
    command writes nothing and says the three lines to add to `automata.toml`.
24. **Recordings are loaded with the game, before it starts** (the spec leaves "with the art or on first play"): a
    sound must not be late the first time it is asked for.
25. **`recordingProblems` is the one judge** of a recording file (length, size, shape, the game's total, a voice that
    reads past its end). `automata check`'s `files` step and `loadRecordings` both call it.
26. **`project-write.ts` is the framework's one writer of `automata.toml`** (plan audit, I5, with the figure plan
    audit, PR 117). Plan R's Part 0 builds it first, with `listContent(text, entry, about?): Parsed<string>` for a
    path block; this plan **adds `withFolders` beside `listContent` in that file** and does not create its own. If
    this plan's Task 1 runs before Part 0 has landed, it creates the file with `withFolders` only and Part 0 adds
    `listContent` beside it. Both append a block after one blank line and keep every other byte. Once folders
    exist, `listContent` treats a path directly inside a listed folder of the same kind as already listed (and
    gives the text back unchanged). Every editor and command that adds a block calls one of these two, so an
    editor and an agent make the same bytes.

## Review Focus

Each line names its test and the task that owns it.

1. **A folder with a file of another kind in it, a `.atlas.json`, a sub-folder and a non-JSON file:** the wrong kind
   is one sentence naming the file and both kinds; the other three are passed over. Task 2, `folders.test.ts`.
2. **A WAV that is stereo, 8-bit, 48 kHz, cut short, or not a WAV at all (an MP3 renamed):** each is refused in words
   that say what a recording must be; none throws. Task 3, `wav.test.ts` and `recording.test.ts`.
3. **A MIDI file that is cut short, has running status, a tempo change, a pitch bend, a note left on at the end, or
   17 channels of notes:** it reads, or is refused in one sentence; what was dropped is listed; nothing throws.
   Tasks 13 and 15, `midi.test.ts` and `midi-in.test.ts`.
4. **A song whose loop or motif file is missing, or whose loop was erased after it was placed:** `loadGame` names the
   block and the ids the game has; `scoreOf` on content built by hand throws the same plain sentence, never
   `undefined is not an object`. Tasks 7 and 8, `music2.test.ts` and `score2.test.ts`.
5. **A game with a recording played where sound is off, never tapped, or with a recording the speaker was never
   given:** the cue is logged, nothing throws, and nothing plays late. Task 9, `audio.test.ts`.

## File Structure

```
src/lib/wav.ts                              NEW encodeWav, decodeWav: the recording file's bytes
src/lib/midi.ts                             NEW readMidi, writeMidi: a Standard MIDI File's bytes and its events
src/features/content/project.ts             a [[content]] block may name a folder; Project.folders
src/features/content/project-write.ts       + withFolders beside plan R's listContent (call 26)
src/features/content/folders.ts             NEW folder listing: filesIn, FOLDERS_FILE, folderManifest, listFromManifest
src/features/content/load.ts                loadGame(read, list?)
src/features/content/shared.ts              isGamePath takes '.wav'; Key, Mode, Chord, motif changes (shared by kinds)
src/features/content/sound.ts               the recording and motif voices
src/features/content/recording.ts           NEW writeRecording, readRecording, recordingProblems, the limits
src/features/content/loop.ts                NEW the loop kind
src/features/content/motif.ts               NEW the motif kind
src/features/content/music.ts               format 1 as it is; MusicSchema becomes format 1 or 2
src/features/content/music2.ts              NEW format 2 and its checks
src/features/content/content-types.ts       + loop, motif
src/features/level/sim-content.ts           + loop, motif, folders
src/features/audio/theory.ts                NEW keys, scales, chords, steps to pitches
src/features/audio/notes.ts                 + hertzOfPitch
src/features/audio/instruments.ts           NEW instrument and drum voices from library/instruments.json
src/features/audio/plain-notes.ts           NEW notesOf: any track, loop or motif as plain notes
src/features/audio/score.ts                 scoreOf(music, content?)
src/features/audio/sound-voices.ts          NEW soundVoices: a sound's voices as a speaker plays them
src/features/audio/recordings.ts            NEW loadRecordings
src/features/audio/{speaker,test-speaker,cues,audio}.ts   keep, SpeakerVoice, recordings
src/features/audio/kinds.ts                 NEW SOUND_KINDS, makeSound
src/features/audio/library.ts               NEW LIBRARY, libraryName, libraryFiles
src/features/audio/midi-out.ts              NEW musicToMidi
src/features/audio/midi-in.ts               NEW midiToMusic
src/features/audio/library/                 NEW instruments.json, kinds.json, words.json, loops/*.json, styles/*.json
src/features/web/{voices,speaker}.ts        a recording voice
src/features/cli/{args,help,cli}.ts         music, sound
src/features/cli/music.ts, sound.ts         NEW the two commands
src/features/cli/{game-folder,check-files,mcp-tools}.ts   folders, recordings, the tools
template/                                   folders, a sound, a song, cues, the audio, the folder plugin
schemas/                                    loop, motif; sound and music regenerated
skills/, README.md                          the formats, the folders, the commands
tests/                                      mirrors the above; tests/fixtures/audio/full-sound-game.ts NEW
```

---

### Task 1: A folder in the project file

**Golden impact:** none. A project with no folder block parses to the very object it does today.

**Files:**
- Create or widen (call 26: plan R's Part 0 may have made it, with `listContent`): `src/features/content/project-write.ts`,
  `tests/features/content/project-write.test.ts`
- Modify: `src/features/content/project.ts`, `src/features/content/content.ts`, `src/headless.ts`
- Test: `tests/features/content/project.test.ts`

**Interfaces:**
- Produces:

```ts
/** A folder the project lists: every file of this kind directly inside it is part of the game. */
export interface FolderRef { readonly type: ContentType; readonly folder: string }
export interface Project { /* as today, plus */ readonly folders?: readonly FolderRef[] | undefined }
/** `text` with a `[[content]]` folder block added at its end for each ref it does not already list. The same text
 *  back when it lists them all. Comments and everything else are left as they are. */
export function withFolders(text: string, refs: readonly FolderRef[]): string
```

A `[[content]]` block has `type` and exactly one of `path` and `folder`. `parseProject` puts path blocks in `content`
and folder blocks in `folders`, each in file order; `folders` is absent (not `[]`) when there is none. A folder is a
game path with no ending: relative, `/`-joined, no `.` or `..` part, no trailing `/`.

`withFolders` appends, for each new ref, exactly (a blank line first):

```toml

[[content]]
type = "sound"
folder = "content/sounds"
```

- [ ] **Step 1: Write the failing tests.** In `project.test.ts`:

```ts
test('a block with a folder reads into folders, and content keeps only the paths', ...)
test('a project with no folder block has no folders key', ...)       // expect('folders' in value).toBe(false)
test('a block with both a path and a folder is refused', ...)
// 'Write a path or a folder, not both.' at content[i]
test('a block with neither is refused', ...)
// 'Write where the file is, like path = "content/levels/level-1.json", or a folder, like folder = "content/sounds".'
test('a folder that ends in a slash, climbs out, or names a file is refused', ...)
// 'Use a folder inside the game, like content/sounds.' at content[i].folder
test('the same folder listed twice for one kind is refused', ...)    // 'This folder is already listed.'
test('one folder listed for two kinds is refused', ...)
// 'This folder is already listed for sounds. A folder holds one kind of file.'
```

In `project-write.test.ts`:

```ts
test('adds one block per new folder at the end, and parseProject reads them back', ...)
test('a folder already listed is not added again, and the text is the same string', ...)
test('comments, blank lines and a missing last newline are kept', ...)
test('a text that is not valid TOML is given back unchanged', ...)
```

- [ ] **Step 2: Push; red.**
- [ ] **Step 3: Implement.** In `project.ts` the block schema reads `path` and `folder` as optional and a
  `superRefine` holds "exactly one"; the parsed blocks are split by a `transform` into `content` and `folders`
  (`ProjectSchema`'s input type is the blocks as written; its output is `Project`). Add the `missing` words
  `'content.folder': 'Write the folder, like folder = "content/sounds".'`. Export `FolderRef`, `withFolders`.
- [ ] **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(content): automata.toml can list a folder`

### Task 2: The loader reads folders

**Golden impact:** none.

**Files:**
- Create: `src/features/content/folders.ts`, `tests/features/content/folders.test.ts`
- Modify: `src/features/content/load.ts`, `src/features/content/content.ts`, `src/headless.ts`,
  `src/features/level/sim-content.ts`, `src/features/cli/game-folder.ts`, `src/features/cli/check-files.ts`
- Test: `tests/features/content/load.test.ts`, `tests/features/level/sim-content.test.ts` (find the file that tests
  `simContent` today and add there), `tests/features/cli/check-files.test.ts`, `tests/features/cli/game-folder.test.ts`

**Interfaces:**
- Consumes: `FolderRef`, `Project.folders` (Task 1).
- Produces:

```ts
/** Gives the names of the files directly in a folder of the game ("jump.json"), or rejects when it cannot. */
export type ListFolder = (folder: string) => Promise<readonly string[]>
export function loadGame(read: (path: string) => Promise<string>, list?: ListFolder): Promise<Parsed<GameContent>>
/** The generated file a page reads folders from. Never committed. */
export const FOLDERS_FILE = 'automata.folders.json'
/** The text of that file: each listed folder and the names in it, sorted, two-space JSON with a last newline. */
export function folderManifest(folders: Readonly<Record<string, readonly string[]>>): string
/** A `list` that reads `FOLDERS_FILE` through `read`, once. A folder the file does not name has no files. */
export function listFromManifest(read: (path: string) => Promise<string>): ListFolder
/** The content files among a folder's names: ends `.json`, not `.atlas.json`, sorted by code unit. */
export function filesIn(names: readonly string[]): string[]
```

`GameContent.project.content` after a load is every path block, then each folder's files as `{ type, path }`, in
`folders` order (call 3). `project.folders` stays as parsed.

- [ ] **Step 1: Write the failing tests.** In `folders.test.ts`: `filesIn` (keeps `b.json`, `a.json` in order;
  drops `hero.atlas.json`, `notes.txt`, `sub/x.json`); `folderManifest` then `listFromManifest` gives the names back;
  a missing or broken manifest lists nothing and does not throw. In `load.test.ts`:

```ts
test('every json file in a listed folder is loaded as that kind, in name order', ...)
test('a game with a folder and no list function says so', ...)
// 'This game lists folders, so whoever loads it must be able to list them.' at automata.toml, 'content'
test('a folder that cannot be listed counts as empty', ...)             // a rejected list is not a problem
test('a file in a folder that reads as another kind says so in one sentence', ...)
// 'This file is in the folder for sounds, but it reads as a music track. Move it to that kind\'s folder.'
test('a file in a folder that reads as nothing gets its own reading problems', ...)
test('a file both listed by path and in a folder of its kind is loaded once', ...)
test('a file listed by path as one kind and in another kind\'s folder is a problem at its block', ...)
// 'This file is listed as a level, but it is in the folder for sounds.'
test('an atlas beside a figure in a figures folder is passed over', ...)
test('a start level and a hero found only in folders are accepted', ...)
```

In the `simContent` test: `folders` blocks of left-out kinds leave with their files; a project left with no folder
has no `folders` key; a game whose only folders are of left-out kinds gives the hash of the same game with none.
In `check-files.test.ts`: a file in a listed folder is not "not listed"; one in a folder that is not listed still
is; a folder file not in the standard form is named, and `--fix` rewrites it.

- [ ] **Step 2: Push; red.**
- [ ] **Step 3: Implement.** In `load.ts`, after the project parses, list each folder (all at once), build the full
  list of refs, and carry on as today from "read every file". Keep the listing code in `folders.ts` so `load.ts`
  stays under 600 lines. `simContent` filters `folders` as it filters `content`, and counts a folder of a left-out
  kind as "listed". Its early "the very same object" return must also check `project.folders` (and, from Tasks 5 and
  6, `content.loops` and `content.motifs`): a game whose only new thing is a folder of sounds must not hand the sim a
  project with `folders` in it (plan audit, M1).
- [ ] **Step 4: The command line.** `readGame` hands `loadGame` a `list` over `files.list(join(folder, dir))`,
  keeping only names with no `/`. `filesStep` reads the loaded project's `content` (so folder files are checked and
  fixed) in place of parsing the file again for paths; when the game did not load it falls back to the parsed path
  blocks as today.
- [ ] **Step 5: Push; green. Commit** `feat(content): a listed folder's files are part of the game`

### Task 3: The recording file and its voice

**Golden impact:** none.

**Files:**
- Create: `src/lib/wav.ts`, `src/features/content/recording.ts`, `tests/lib/wav.test.ts`,
  `tests/features/content/recording.test.ts`
- Modify: `src/features/content/sound.ts`, `src/features/content/shared.ts` (`isGamePath` takes `'.wav'`),
  `src/features/content/content.ts`, `src/headless.ts`, `src/features/cli/check-files.ts`,
  `src/features/cli/game-folder.ts` (`recordingProblems` joins `ContentApi`), `schemas/sound.schema.json`
- Test: `tests/features/content/sound.test.ts`, `tests/features/cli/check-files.test.ts`

**Interfaces:**
- Produces:

```ts
// src/lib/wav.ts
export interface Wav { readonly sampleRate: number; readonly channels: number; readonly bits: number
  /** The first channel, each sample -1 to 1. */ readonly samples: Float32Array }
/** A mono 16-bit WAV: the 44-byte header, then the samples, each held to -1..1 and written as round(sample * 32767). */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array<ArrayBuffer>
/** Reads PCM WAV of 8, 16, 24 or 32 bits. `undefined` for anything else; never throws. */
export function decodeWav(bytes: Uint8Array): Wav | undefined

// src/features/content/recording.ts
export const RECORDING_RATE = 44100
export const RECORDING_MAX_SECONDS = 10
export const RECORDING_MAX_BYTES = 1048576
export const RECORDINGS_MAX_BYTES = 20971520
/** A recording file once read. */
export interface Recording { readonly seconds: number; readonly samples: Float32Array }
/** Decoded audio as a recording file's bytes: the channels mixed to one (their mean), resampled to 44 100 by
 *  straight-line steps between samples. The resampled length is rounded down, so ten seconds of input is at most
 *  441 000 samples and never over the limit. Throws a RangeError in plain words when it is over 10 seconds or empty. */
export function writeRecording(channels: readonly Float32Array[], sampleRate: number): Uint8Array<ArrayBuffer>
/** A recording file's bytes, read, or the one sentence that says what is wrong with them. `name` is for the words. */
export function readRecording(bytes: Uint8Array, name: string):
  { readonly ok: true; readonly value: Recording } | { readonly ok: false; readonly message: string }
/** Every recording file a sound names, each once, in the order the sounds are listed. */
export function recordingPaths(content: GameContent): string[]
/** One problem for each recording that is missing or refused, each voice that plays past its file's end, and one
 *  when the game's recordings together are over 20 MB. `read` gives a file's bytes, or rejects or gives undefined. */
export function recordingProblems(content: GameContent,
  read: (path: string) => Promise<Uint8Array | undefined>): Promise<Diagnostic[]>

// src/features/content/sound.ts
export interface RecordingVoice { readonly kind: 'recording'; readonly file: string
  /** Seconds into the file it starts from. */ readonly from: number
  readonly length: number; /** 0.5 to 2 */ readonly speed: number; readonly at: number; readonly volume: number }
```

The voice's `length` is how long it sounds (so `at + length` is held to 10 seconds like every voice); it reads
`length * speed` seconds of the file from `from`.

The sentences, exactly (`door.wav` is the file's own name):

- `door.wav is 12 seconds long. A recording can be at most 10 seconds.`
- `door.wav is 1.4 MB. A recording can be at most 1 MB.`
- `door.wav is not a recording this game can play. Save it as WAV: one channel, 16-bit, 44100 samples a second.`
- `There is no recording at "content/sounds/door.wav". Put one there, or take this voice out.` (at `voices[i].file`)
- `This voice plays to 1.2 seconds of door.wav, which is 0.8 seconds long. Lower "from", "length" or "speed".`
- `This game's recordings are 23 MB together. A game can have at most 20 MB.` (at `automata.toml`)

Seconds are shown to one decimal place when not whole; megabytes to one decimal place.

- [ ] **Step 1: Write the failing tests.** `wav.test.ts`: `encodeWav` of four known samples is these 52 bytes (typed
  out); `decodeWav(encodeWav(x))` gives `x` to within 1/32767; stereo, 8-bit and 24-bit files decode; a file cut
  inside its header, cut inside its data, with a wrong `RIFF`, with compressed format tag 85, and an empty array each
  give `undefined`. `recording.test.ts`: `writeRecording` of one second of stereo 48 kHz is 44 + 88 200 bytes and
  mono; the same input gives the same bytes; 10.5 seconds throws `'A recording can be at most 10 seconds. This one is
  10.5.'`; `readRecording` gives each sentence above for a long, a big, a stereo, a 48 kHz and a broken file;
  `recordingProblems` on a small game in memory gives the missing, past-the-end and total sentences, and nothing for
  a sound game. `sound.test.ts`: a recording voice reads; `speed` 3, a `file` ending `.mp3`, a `file` of
  `../x.wav` are refused (`'Use a path inside the game that ends in .wav, like content/sounds/door.wav.'`); a sound
  may mix a recording with a tone.
- [ ] **Step 2: Push; red.**
- [ ] **Step 3: Write `wav.ts`, `recording.ts`, the voice.** Add the voice's `missing` words (`voices.file`,
  `voices.speed`, and `'voices.kind': 'Write "tone", "noise", "recording" or "motif".'`, the last word used from
  Task 6). `voices.from` now serves two voices: `'Write where it starts: a pitch in hertz for a tone, like 440, or
  seconds into the file for a recording, like 0.'`.
- [ ] **Step 4: `automata check`.** The `files` step adds `recordingProblems` over the files port when the game
  loaded and the game's framework has the function (as `translationStep` asks first).
- [ ] **Step 5: Push; green; commit the schema from the `package` job's log. Commit**
  `feat(content): a sound can play a recording`

### Task 4: Keys, chords and steps

**Golden impact:** none.

**Files:**
- Create: `src/features/audio/theory.ts`, `tests/features/audio/theory.parity.test.ts`
- Modify: `src/features/content/shared.ts`, `src/features/audio/notes.ts`, `src/features/audio/audio.ts`
- Test: `tests/features/content/shared.test.ts`, `tests/features/audio/notes.parity.test.ts`

**Interfaces:**
- Produces, in `content/shared.ts` (the words every sound kind's schema uses):

```ts
export const KEYS = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'] as const
export type Key = (typeof KEYS)[number]
export type Mode = 'major' | 'minor'
export const Key: z.ZodType<Key>          // 'Write the key, like "C" or "F#".'
export const Mode: z.ZodType<Mode>        // 'Write "major" or "minor".'
/** A chord as a Roman numeral of the key. */
export const CHORD: RegExp                // /^(?:[IV]+|[iv]+°?)(?:7|sus4)?$/ held to I..VII and i..vii
export const Chord: z.ZodString           // 'Write a chord of the key, like "I", "vi" or "V7".'
/** A step of a scale: 1 to 15, with b or # in front for the note between. A number or a string in a file. */
export const STEP: RegExp                 // /^[b#]?(?:[1-9]|1[0-5])$/
/** The changes a use of a motif carries. Every field may be left out. */
export interface MotifChanges { readonly shift?: number; readonly speed?: 0.25 | 0.5 | 1 | 2 | 4
  readonly mode?: Mode; readonly backwards?: boolean }
export const motifChanges: { shift: z.ZodOptional<z.ZodInt>; speed: ...; mode: ...; backwards: ... }  // spread into a strictObject
```

- Produces, in `audio/theory.ts` (pitches are MIDI numbers: C4 is 60):

```ts
/** Semitones above C of a key's first note: keyRoot('Eb') is 3. */
export function keyRoot(key: Key): number
/** The seven semitone offsets of a mode. */
export function scaleOf(mode: Mode): readonly number[]      // major [0,2,4,5,7,9,11], minor [0,2,3,5,7,8,10]
/** A step of a scale as semitones above its first note: stepOffset(scaleOf('major'), '8') is 12, 'b7' is 10. */
export function stepOffset(scale: readonly number[], step: number | string): number
export interface ChordNotes { /** Semitones above C, 0 to 11. */ readonly root: number
  /** The chord's own scale, seven offsets from its root (call 8). */ readonly scale: readonly number[]
  /** Its notes as offsets from its root: [0,4,7], [0,3,7,10], [0,5,7]. */ readonly tones: readonly number[] }
export function chordOf(numeral: string, key: Key, mode: Mode): ChordNotes
/** The name a person reads: chordName('vi', 'C', 'major') is 'Am'; 'V7' is 'G7'; 'vii°' is 'Bdim'; 'IVsus4' 'Fsus4'.
 *  A flat key names its notes with flats, every other with sharps. */
export function chordName(numeral: string, key: Key, mode: Mode): string
/** The pitch of a note name: pitchOf('C4') is 60. undefined for anything that is not a note. */
export function pitchOf(note: string): number | undefined
/** The note name of a pitch, with sharps: noteName(61) is 'C#4'. */
export function noteName(pitch: number): string
```

- In `notes.ts`: `export function hertzOfPitch(pitch: number): number` (0 to 127), from the same table, by doubling
  and halving; `hertzOf(note)` is unchanged and now equals `hertzOfPitch(pitchOf(note))`.

- [ ] **Step 1: Write the failing tests.** `theory.parity.test.ts` (runs in Node and the three browsers, as
  `notes.parity.test.ts` does): every key's root; `chordOf` for `I ii iii IV V vi vii°` in C major gives roots
  `0 2 4 5 7 9 11` and tones `[0,4,7] [0,3,7] [0,3,7] [0,4,7] [0,4,7] [0,3,7] [0,3,6]`; in A minor `i III VII` give
  roots `9 0 7`; `V7` tones `[0,4,7,10]`; `Isus4` tones `[0,5,7]`; `stepOffset` for `1 3 5 8 b7 #4 15`; the chord's
  scale puts `3` on its third for a major, a minor, a diminished and a sus4 chord; `chordName` for the five cases
  above and `chordName('IV', 'Db', 'major')` is `'Gb'`; `pitchOf('A4')` is 69, `noteName(pitchOf(n))` round trips
  every sharp name from C0 to B8. `notes.parity.test.ts`: `hertzOfPitch(69)` is 440 and `hertzOfPitch(pitchOf(n))`
  is `hertzOf(n)` for every note name. `shared.test.ts`: `CHORD` takes `I vi vii° V7 IVsus4 i III`, refuses
  `VIII`, `I°`, `iv7sus4`, `C`, `''`; `STEP` takes `1 15 b7 #4`, refuses `0 16 bb3 x`.
- [ ] **Step 2: Push; red. Step 3: Implement. Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(audio): keys, chords and steps as pitches`

### Task 5: The loop kind

**Golden impact:** none (`loop` joins `LEFT_OUT`; the test of Task 2 covers a left-out kind).

**Files:**
- Create: `src/features/content/loop.ts`, `tests/features/content/loop.test.ts`, `schemas/loop.schema.json`
- Modify: `src/features/content/content-types.ts`, `load.ts` (`GameContent.loops`), `content.ts`, `src/headless.ts`,
  `src/features/level/sim-content.ts`, `scripts/write-schemas.ts` if it lists kinds by hand
- Test: `tests/features/content/content-types.test.ts`, `json-schema.test.ts`

**Interfaces:**
- Produces:

```ts
export const DRUMS = ['kick', 'snare', 'hat', 'clap', 'tom'] as const
export type Drum = (typeof DRUMS)[number]
export type LoopLane = 'drums' | 'bass' | 'chords' | 'melody'
export type Voicing = 'close' | 'open' | 'high'
interface LoopBase { readonly format: 1; readonly id: string; readonly bars: number        // 1 to 8
  readonly stepsPerBar: 4 | 8 | 12 | 16 }
/** One row a bar for each drum that plays; a drum left out is silent. `x` a hit, `-` a rest. */
export interface DrumLoop extends LoopBase { readonly lane: 'drums'
  readonly notes: Readonly<Partial<Record<Drum, readonly string[]>>> }
/** One row a bar: a step of the bar's chord (1, 3, b7), a fixed note (C4), `-` a rest, `=` to hold. */
export interface NoteLoop extends LoopBase { readonly lane: 'bass' | 'melody'; readonly notes: readonly string[] }
/** One row a bar: `x` plays the bar's chord whole, `-` a rest, `=` holds it. */
export interface ChordLoop extends LoopBase { readonly lane: 'chords'; readonly voicing: Voicing
  readonly notes: readonly string[] }
export type LoopFile = DrumLoop | NoteLoop | ChordLoop
export const LoopSchema: z.ZodType<LoopFile, LoopFile>      // variants('lane', …)
export const loopInfo: ContentTypeInfo<LoopFile, LoopFile>  // title 'Loop', plural 'loops', editor 'sound', part 'music', noun 'loop'
```

The spec's drum example is "one row per drum"; this plan writes it as an object keyed by drum, so a row cannot be
given to the wrong drum.

- [ ] **Step 1: Write the failing tests** in `loop.test.ts`: the spec's `bouncy-bass` reads; a drum loop with `kick`
  and `hat` rows reads; a chord loop needs `voicing`; then each refusal with its words:

```ts
// 'This loop has 2 bars but 3 rows. Write one row for each bar.' at notes (and at notes.kick for a drum)
// 'This bar has 7 steps but "stepsPerBar" is 8. Write 8, separated by one space.' at notes[r]
// '"9x" is not a step. Write a step of the chord like 1, 3 or b7, a note like C4, - for a rest, or = to hold.'
// '"o" is not a drum step. Write x for a hit or - for a rest.'
// '"x1" is not a chord step. Write x to play the chord, - for a rest, or = to hold it.'
// 'A drum loop needs at least one drum: kick, snare, hat, clap or tom.' at notes
// 'Write 4, 8, 12 or 16.' at stepsPerBar
```

  and `writeContent('loop', …)` writes the keys in the schema's order with one row a line.
- [ ] **Step 2: Push; red. Step 3: Implement,** with a `missing` entry for every field. Add `'loop'` and `'motif'`
  (the second in Task 6) to `LEFT_OUT` and their maps to what `simContent` takes out.
- [ ] **Step 4: Push; green; commit `schemas/loop.schema.json` from the log.**
- [ ] **Step 5: Commit** `feat(content): the loop kind`

### Task 6: The motif kind, and a motif as a sound

**Golden impact:** none.

**Files:**
- Create: `src/features/content/motif.ts`, `tests/features/content/motif.test.ts`, `schemas/motif.schema.json`
- Modify: `content-types.ts`, `load.ts` (`GameContent.motifs`), `content.ts`, `src/headless.ts`, `sim-content.ts`,
  `src/features/content/sound.ts`, `schemas/sound.schema.json`
- Test: `tests/features/content/sound.test.ts`

**Interfaces:**
- Consumes: `STEP`, `Key`, `Mode`, `motifChanges`, `MotifChanges` (Task 4).
- Produces:

```ts
export interface MotifNote { /** 1 to 15, or 'b3', '#4'. */ readonly step: number | string
  /** 0.25 to 8, in quarters. */ readonly beats: number }
export interface MotifFile { readonly format: 1; readonly id: string; readonly notes: readonly MotifNote[] }  // 1 to 16
export const MotifSchema: z.ZodType<MotifFile, MotifFile>
export const motifInfo: ContentTypeInfo<MotifFile, MotifFile>   // plural 'motifs', editor 'sound', part 'music', noun 'motif'
/** How many beats a use of a motif lasts: its notes' beats together, divided by the use's speed (1 when left out). */
export function motifBeats(motif: MotifFile, changes: MotifChanges): number
export const INSTRUMENTS = ['drums','bass','keys','pluck','lead','pad','bell','organ'] as const
export type Instrument = (typeof INSTRUMENTS)[number]
// sound.ts
export interface MotifVoice extends MotifChanges { readonly kind: 'motif'; readonly motif: string
  readonly instrument: Exclude<Instrument, 'drums'>; readonly key: Key; readonly tempo: number   // 30 to 300
  readonly at: number; readonly volume: number }
export type SoundVoice = ToneVoice | NoiseVoice | RecordingVoice | MotifVoice
```

A motif voice has no `length`: it lasts `motifBeats * 60 / tempo` seconds, and `SoundSchema`'s own end check (today
`v.at + v.length`) skips it by its `kind` rather than by a missing field. A motif voice with no `mode` plays in
`major`: a sound has no song to take a mode from (plan audit, M4). `soundInfo` gains a `check`:
the motif must be in the game (`noSuch('motif', …)` at `voices[i].motif`), and `at` plus its seconds must be at most
10 (`'This motif ends after 10 seconds, which is the longest a sound can be. Raise "tempo" or "speed".'`).

- [ ] **Step 1: Write the failing tests.** `motif.test.ts`: the spec's `hero-theme` reads; `step` 0, 16, `'bb3'`,
  `beats` 0.3 and 9, 17 notes and none are each refused in words (`'Write a step of the key from 1 to 15, like 5, or
  with b or # in front, like "b3".'`, `'Write how many beats it lasts, from 0.25 to 8, in quarters, like 0.5.'`);
  `motifBeats` of the spec's motif is 4, and 8 at speed 0.5. `sound.test.ts`: a motif voice reads with no changes
  and with all four; `speed` 3 is refused (`'Write 0.25, 0.5, 1, 2 or 4.'`); `instrument` `drums` is refused; the
  two cross-file checks through `loadGame` on a small game in memory.
- [ ] **Step 2: Push; red. Step 3: Implement. Step 4: Push; green; commit the two schemas from the log.**
- [ ] **Step 5: Commit** `feat(content): the motif kind, and a motif as a sound's voice`

### Task 7: Music format 2

**Golden impact:** none.

**Files:**
- Create: `src/features/content/music2.ts`, `tests/features/content/music2.test.ts`
- Modify: `src/features/content/music.ts`, `content.ts`, `src/headless.ts`, `schemas/music.schema.json`,
  `src/features/audio/score.ts` and `music-player.ts` only as far as the types ask (format 2 is played in Task 8)
- Test: `tests/features/content/music.test.ts` (unchanged and green: the proof format 1 reads as it did)

**Interfaces:**
- Consumes: `Key`, `Mode`, `Chord`, `motifChanges`, `Instrument`, `LoopFile`, `MotifFile`, `motifBeats`.
- Produces:

```ts
/** Today's music file, renamed: rows of flat steps. */
export interface StepMusic { /* exactly today's MusicFile */ readonly format: 1; … }
export interface LoopBlock { /** The bar it starts at, from 1. */ readonly at: number; readonly loop: string
  /** How many bars it fills; the loop repeats to fill them. */ readonly bars: number }
export interface MotifBlock extends MotifChanges { readonly at: number; readonly motif: string }
export type MusicBlock = LoopBlock | MotifBlock
export interface MusicLane { readonly id: string; readonly instrument: Instrument; readonly volume: number
  readonly blocks: readonly MusicBlock[] }
export interface ArrangedMusic { readonly format: 2; readonly id: string; readonly tempo: number   // 30 to 300
  readonly key: Key; readonly mode: Mode; readonly bars: number                                     // 1 to 128
  readonly loop: boolean; readonly volume: number; readonly chords: readonly string[]
  readonly lanes: readonly MusicLane[] }                                                            // 0 to 8
export type MusicFile = StepMusic | ArrangedMusic
export const MusicSchema: z.ZodType<MusicFile, MusicFile>   // variants('format', [format 1 as today, format 2])
/** The bars a block takes: a loop block's `bars`; a motif block's beats, rounded up to whole bars. `motif` is the
 *  motif's file, or undefined when it is not known (then 1). */
export function blockBars(block: MusicBlock, motif: MotifFile | undefined): number
```

A block is told a loop from a motif by which of `loop` and `motif` it has (exactly one). Format 1's schema object,
its checks and its words do not change by a character; `musicInfo.missing` gains format 2's fields, and
`'format': 'Write "format": 1 for rows of steps, or 2 for loops, chords and motifs.'`.

`musicInfo.check` (new; format 2 only), each at `lanes[i].blocks[j]…`:

- a loop or motif that is not in the game: `noSuch('loop', …)` / `noSuch('motif', …)`;
- `'"easy-drums" is a drum loop, so it goes in a lane whose instrument is "drums".'` and
  `'This lane plays drums, so it takes drum loops only. "bouncy-bass" is a bass loop.'`, and the same for a motif;
- `'This block starts at bar 9, but the track has 8 bars.'`;
- `'This block runs to bar 10, but the track has 8 bars. Lower "bars" to 2.'` (loop blocks only; a motif is cut);
- `'This block overlaps the one before it in this lane. Move it to bar 5 or later.'` (blocks are checked in `at`
  order whatever order the file has them).

Shape checks in the schema: `'Write one chord for each bar: this track has 8 bars and 6 chords.'` at `chords`; lane
ids unique (`unique`); `'Write a loop or a motif, not both.'`; `'Say what this block plays: add "loop" or "motif".'`.

- [ ] **Step 1: Write the failing tests** in `music2.test.ts`: the spec's `meadow` (with its two loops and motif in
  a small game in memory) loads; a track with no lanes reads; each sentence above; `blockBars`; and
  `writeContent('music', meadow)` gives keys in the schema's order.
- [ ] **Step 2: Push; red. Step 3: Implement.** Where `score.ts` and `music-player.ts` take a `MusicFile`, narrow to
  `StepMusic` for now with `if (music.format === 2) throw new Error('…')` only inside `scoreOf` (Task 8 replaces it).
- [ ] **Step 4: Push; green; commit `schemas/music.schema.json` from the log** (it is now "one of two").
- [ ] **Step 5: Commit** `feat(content): music format 2, a song arranged from loops, chords and motifs`

### Task 8: Instruments, plain notes and the score of a song

**Golden impact:** none. `sounding.json`'s cue log and `score.parity.test.ts` are the proof format 1 is untouched.

**Files:**
- Create: `src/features/audio/library/instruments.json`, `src/features/audio/instruments.ts`,
  `src/features/audio/plain-notes.ts`, `tests/features/audio/instruments.test.ts`,
  `tests/features/audio/plain-notes.parity.test.ts`, `tests/features/audio/score2.parity.test.ts`,
  `tests/fixtures/audio/song.ts` (the spec's `meadow`, its loops and motif, as content in memory)
- Modify: `src/features/audio/score.ts`, `music-player.ts`, `cues.ts`, `audio.ts`

**Interfaces:**
- Consumes: `theory.ts`, `hertzOfPitch`, the content types of Tasks 5 to 7.
- Produces:

```ts
// plain-notes.ts
/** Ticks to a beat: every time in a plain note is a whole number of these. */
export const TICKS_PER_BEAT = 480
/** The loops and motifs a song is made from. A `GameContent` fits. */
export type SongParts = Pick<GameContent, 'loops' | 'motifs'>
/** One note of a track before any instrument: what MIDI and the speaker both start from. */
export interface PlainNote { readonly lane: string; readonly instrument: Instrument
  /** A MIDI pitch for a note; for a drum hit, which drum. */ readonly pitch: number | Drum
  /** Ticks from the track's start, and how many it lasts (a drum hit: 0). */ readonly at: number; readonly ticks: number
  /** The lane's volume times the track's. */ readonly volume: number }
/** A format 2 track as plain notes, in the order they start; together, in lane order, then low pitch first.
 *  Throws an Error in plain words for a loop or motif the parts do not have. */
export function notesOf(music: ArrangedMusic, parts: SongParts): PlainNote[]
/** A loop on its own, over the chords given (default ['I']), in a key (default C major), as one lane. */
export function loopNotes(loop: LoopFile, options?: { chords?: readonly string[]; key?: Key; mode?: Mode
  instrument?: Instrument; volume?: number; bars?: number }): PlainNote[]
/** One use of a motif as plain notes from tick 0. */
export function motifNotes(motif: MotifFile, use: MotifChanges & { key: Key; mode: Mode
  instrument: Instrument; volume: number; lane?: string }): PlainNote[]
// instruments.ts
/** What a speaker plays for one plain note at a tempo: a few voices, `at` 0. */
export function instrumentVoices(note: PlainNote, tempo: number): (ToneVoice | NoiseVoice)[]
// score.ts
export function scoreOf(music: MusicFile, parts?: SongParts): Score
```

`createMusicPlayer` and `MusicPlayer` are exported from `audio.ts` (the Sound editor plays a song with the game's
own player), and `want` gains a second argument: `want(music: MusicFile, from?: number)`, seconds into the track to
begin at (default 0, held inside the track; `createAudio` never passes it).

`scoreOf` on format 2 without the loops and motifs it names throws `'The track "meadow" uses a loop called
"easy-drums", which this game does not have.'` (and the same for a motif). `createMusicPlayer(speaker, parts)` and
`cueTable` hand the content through; `createAudio` passes `options.content`.

The rules `notesOf` follows (the tests pin each):

- A loop block plays its loop from its first bar, again and again, for `bars` bars; bar `n` of the block is the
  loop's row `(n - 1) % loop.bars`.
- In a `bass` or `melody` loop, a numbered step is that step of the chord of the bar it sounds in (calls 8 and 9); a
  hold carries a note over a bar line at its own pitch, and never past the end of the block.
- In a `chords` loop, `x` gives one note for each of the chord's tones in the loop's voicing (call 10), all at once.
- A motif note's pitch is step `step + shift` of the song's key and mode (or the use's `mode`), octave 4, `b` and `#`
  kept; a step that `shift` takes below 1 or above 15 carries on down or up the scale. `backwards` plays the notes
  in the other order. A note lasts `beats / speed`.
- A note at or after the track's last tick is dropped; one that runs past it is cut to end there.

`instruments.json`, the first values (call 15). `times` multiplies the pitch; `share` the loudness; `ring` is the
longest a note sounds, in seconds (a longer note is cut to it; left out: as long as written):

| instrument | layers (`wave`, `times`, `share`) | `ring` |
|---|---|---|
| `bass` | triangle 1 1.0; square 1 0.2 | |
| `keys` | triangle 1 0.8; sine 2 0.3 | 1.2 |
| `pluck` | square 1 0.5; triangle 2 0.3 | 0.3 |
| `lead` | sawtooth 1 0.45; square 1 0.25 | |
| `pad` | sine 1 0.7; triangle 2 0.2 | |
| `bell` | sine 1 0.8; sine 3 0.3; sine 4 0.15 | 1.5 |
| `organ` | sine 1 0.6; sine 2 0.35; sine 4 0.2 | |

| drum | voices |
|---|---|
| `kick` | tone sine 150 to 50, 0.12 s, 1.0 |
| `snare` | noise 1800, 0.12 s, 0.8; tone triangle 180 to 120, 0.08 s, 0.5 |
| `hat` | noise 8000, 0.04 s, 0.5 |
| `clap` | noise 1200, 0.03 s, 0.7; noise 1200 at 0.015 s, 0.08 s, 0.7 |
| `tom` | tone sine 200 to 90, 0.18 s, 0.9 |

Seconds from ticks, once, for every engine alike: `seconds = (ticks * 60) / (tempo * 480)`.

- [ ] **Step 1: Write the failing tests.** `plain-notes.parity.test.ts` (Node and three browsers), on the fixture
  song and small hand-made ones, each with the notes typed out: the spec's `bouncy-bass` over `I vi IV V` in C gives, a bar
  each, C2 and G2, A2 and E3, F2 and C3, G2 and D3 (pitches 36 43, 45 52, 41 48, 43 50; the second row's `8` is the
  root an octave up); the same song in `Eb` is every
  pitch three higher; in minor the thirds fall; a chord loop in each voicing; `V7` and `IVsus4`; a hold across a bar
  line; a loop of 2 bars in a block of 5; a fixed note ignores the key; a drum loop gives hits at the right ticks
  for 4, 8, 12 and 16 steps; a motif at `shift` 2, `-2` (below step 1), `speed` 0.5, `mode` minor, `backwards`; a
  motif cut at the track's end; a missing loop throws the sentence. `instruments.test.ts`: every instrument and
  drum in the file is in `INSTRUMENTS` and `DRUMS` and the other way round; a `pluck` note of two seconds rings 0.3;
  shares times the note's volume are the voices' volumes; a drum hit's voices are the table's. `score2.parity.test.ts`:
  the fixture song's `Score` (seconds `8 * 4 * 60 / 110`, loop true, every note's `at` and voice) equals a recorded
  text in `tests/golden/song.json` (new; committed with `"score": ""`, recorded from CI as `sounding.json`'s cue log
  was, the same text in all four engines); a format 1 track through the new `scoreOf` is what it was.
- [ ] **Step 2: Push; red. Step 3: Implement. Step 4: Push; take the recorded score from the node job's log into
  `tests/golden/song.json`; push; green in four engines.**
- [ ] **Step 5: Commit** `feat(audio): a song of loops, chords and motifs plays (new golden: song.json)`

### Task 9: A sound's motif and recording reach the speaker

**Golden impact:** none.

**Files:**
- Create: `src/features/audio/sound-voices.ts`, `src/features/audio/recordings.ts`,
  `tests/features/audio/sound-voices.test.ts`, `tests/features/audio/recordings.test.ts`
- Modify: `src/features/audio/speaker.ts`, `test-speaker.ts`, `cues.ts`, `audio.ts`
- Test: `tests/features/audio/audio.test.ts`, `cues.test.ts`, `test-speaker.test.ts`

**Interfaces:**
- Consumes: `motifNotes`, `instrumentVoices`, `Recording`, `recordingPaths`, `recordingProblems`, `readRecording`.
- Produces:

```ts
// speaker.ts
/** What a speaker is handed: never a motif, which is turned into tones first. */
export type SpeakerVoice = ToneVoice | NoiseVoice | RecordingVoice
export interface Speaker { /* as today, with */
  play(bus: Bus, voice: SpeakerVoice, when: number): void
  /** Gives the speaker a recording to play later, by the path a voice names it with. Kept while waiting. */
  keep(file: string, recording: Recording): void }
// test-speaker.ts: TestSpeaker gains  readonly kept: readonly string[]   (the paths, in order)
// sound-voices.ts
/** A sound's voices as a speaker plays them: each motif voice becomes its notes' voices, each volume is times the
 *  sound's. Throws in plain words for a motif the parts do not have. */
export function soundVoices(sound: SoundFile, parts: SongParts): SpeakerVoice[]
/** Seconds until the sound's last voice ends. */
export function soundSeconds(sound: SoundFile, parts: SongParts): number
// recordings.ts
export type Recordings = ReadonlyMap<string, Recording>
export class RecordingError extends Error { readonly diagnostics: readonly Diagnostic[] }
/** Every recording the game's sounds name, read and judged by `recordingProblems`. Rejects with a RecordingError
 *  that carries every problem. A game with no recording resolves to an empty map and never calls `read`. */
export function loadRecordings(content: GameContent,
  read: (path: string) => Promise<Uint8Array | undefined>): Promise<Recordings>
// audio.ts
export function createAudio(options: { content; speaker; tickHz?; readonly recordings?: Recordings }): GameAudio
```

```ts
// sound-voices.ts
/** Plays a sound once, now, on a bus: every voice of `soundVoices`, handed to the speaker. What `createAudio` does
 *  for a cue, and what an editor does for a Play button. Does nothing unless the speaker is on. */
export function playSound(speaker: Speaker, bus: Bus, sound: SoundFile, parts: SongParts): void
```

`createAudio` gives every recording to `speaker.keep` at once, and throws `'This game has recorded sounds, so
createAudio needs "recordings". Load them with loadRecordings.'` when a sound names a file `recordings` does not
have. `cueTable` works out a sound's ticks from `soundSeconds`, and `run` plays `soundVoices`.

- [ ] **Step 1: Write the failing tests.** `sound-voices.test.ts`: a motif voice of the spec's motif on `pluck` in C
  at 120 gives four groups of voices at 0, 0.5, 0.75 and 1 second, each `at` moved by the voice's `at`; the sound's
  volume multiplies; a recording voice passes through; `soundSeconds`. `recordings.test.ts`: a game with two sounds
  naming one file reads it once; a long file rejects with the sentence of Task 3; no recordings never reads.
  `audio.test.ts`: a cue for a sound with a recording plays one recording voice on the test speaker, and `kept` has
  its path; the missing-`recordings` sentence; a recording cue while the speaker waits is logged and not played
  (Review Focus 5); a sound whose motif is ten notes counts its real length against `MAX_SAME` in ticks;
  `playSound` hands over the same voices a cue does, and nothing while the speaker waits. In `music-player.test.ts`
  (Task 8's change, tested here with it): `want(track, 2)` hands over only notes from two seconds in, each two
  seconds sooner.
- [ ] **Step 2: Push; red. Step 3: Implement. Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(audio): motif voices and recordings play through the speaker`

### Task 10: The page's speaker plays a recording

**Golden impact:** none.

**Files:**
- Modify: `src/features/web/voices.ts`, `src/features/web/speaker.ts`
- Test: `tests/features/web/voices.browser.test.ts`, `tests/features/web/speaker.browser.test.ts`

**Interfaces:**
- Produces: `playVoice(context, out, voice: SpeakerVoice, when, recordings?: ReadonlyMap<string, AudioBuffer>)`;
  `webSpeaker().keep(file, recording)` holds the samples and makes each `AudioBuffer` (one channel, 44 100) when the
  context exists: at once if it does, else on the first tap.

A recording voice is a buffer source started at `when + at`, from `from` seconds into the buffer, for `length *
speed` seconds of it, with `playbackRate` `speed`, through the same falling gain every voice has, but level until
the last 20 ms (a recording must not fade from its first sample). A voice whose file was never kept plays nothing.

- [ ] **Step 1: Write the failing tests** (the three browsers, with `OfflineAudioContext` as today's voice tests):
  a one-second recording of a 440 Hz sine rendered through `playVoice` has its energy at 440; at `speed` 2 it is at
  880 and lasts half as long; `from` 0.5 starts from the second half; a file never kept renders silence and throws
  nothing; `webSpeaker` kept before the first tap plays after it.
- [ ] **Step 2: Push; red. Step 3: Implement. Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(web): the page's speaker plays a recording`

### Task 11: Sound kinds

**Golden impact:** none.

**Files:**
- Create: `src/features/audio/library/kinds.json`, `src/features/audio/kinds.ts`,
  `tests/features/audio/kinds.parity.test.ts`
- Modify: `src/features/audio/audio.ts`

**Interfaces:**
- Produces:

```ts
export const SOUND_KINDS = ['jump','land','coin','hit','explosion','door','click','power-up','laser','blip'] as const
export type SoundKind = (typeof SOUND_KINDS)[number]
/** A new sound of a kind. The same kind and seed give the same sound everywhere; the next seed is another take.
 *  `seed` is a whole number from 0; `id` defaults to the kind. The answer passes `SoundSchema`. */
export function makeSound(kind: SoundKind, seed: number, id?: string): SoundFile
```

`kinds.json` holds, for each kind, `volume` and `voices`; each voice is a tone or a noise whose every number is
either a number or `[low, high]`, and whose `wave` is a wave or a list to pick from. The generator is Park-Miller
(`state = (state * 16807) % 2147483647`, started at `seed + 1` and stepped once for each kind's place in
`SOUND_KINDS` so two kinds differ at one seed); a draw in `[low, high]` is `low + (high - low) * (state / 2147483647)`
rounded to three places (`Math.round(x * 1000) / 1000`); numbers are drawn in the file's order.

The first recipes (call 16; pitches in hertz, lengths in seconds):

| kind | voices |
|---|---|
| `jump` | tone square or triangle, from 260–420 to 520–900, 0.12–0.22 s, 0.6–0.8 |
| `land` | noise 180–400, 0.06–0.12 s, 0.6–0.9; tone sine 140–200 to 60–90, 0.08–0.14 s, 0.5–0.8 |
| `coin` | tone square or sine 880–1320 held, 0.05–0.08 s, 0.5–0.7; a second, 1.33 to 1.5 times as high, at the first's end, 0.15–0.3 s, 0.5–0.7 |
| `hit` | noise 600–1600, 0.05–0.12 s, 0.8–1; tone sawtooth 300–500 to 80–140, 0.08–0.15 s, 0.5–0.7 |
| `explosion` | noise 200–600, 0.5–1.1 s, 0.9–1; noise 60–140, 0.6–1.3 s, 0.7–0.9; tone sine 120–180 to 30–50, 0.4–0.8 s, 0.6–0.8 |
| `door` | tone triangle 180–260 to 120–180, 0.15–0.3 s, 0.6–0.8; noise 300–700 at 0.1–0.2 s, 0.08–0.15 s, 0.4–0.6 |
| `click` | tone square 900–1600 held, 0.02–0.04 s, 0.5–0.7 |
| `power-up` | three tones, square or triangle, each 0.08–0.12 s, 0.5–0.7, one after another, each 1.2 to 1.35 times the one before, the first at 330–520 |

Every voice above carries its loudness as its last range; the sound's own `volume` is 0.8 for every kind (plan
audit, M2: the first table left four out).
| `laser` | tone sawtooth or square 1200–2200 to 200–500, 0.15–0.35 s, 0.5–0.7 |
| `blip` | tone sine or square 500–1000 held, 0.04–0.09 s, 0.5–0.7 |

A voice that depends on another ("at the first's end", "1.33 times as high") is written in the file as
`{ "after": 0 }` and `{ "times": [1.33, 1.5], "of": 0 }` in place of `at` and of `from`/`to`; those two forms are
the whole of the recipe language.

- [ ] **Step 1: Write the failing tests** (Node and three browsers): every kind at seeds 0 to 19 passes
  `SoundSchema` and ends inside 10 seconds; the same kind and seed is deep-equal; seed 0 and seed 1 differ, for
  every kind; `makeSound('jump', 3)`'s JSON is a recorded text (`tests/golden/kinds.json`, new, recorded from CI:
  every kind at seeds 0 and 1, one text in all four engines); a negative or fractional seed throws a `RangeError`
  in plain words; `makeSound('coin', 0, 'coin-2').id` is `coin-2`.
- [ ] **Step 2: Push; red. Step 3: Implement. Step 4: Record `kinds.json` from the log; push; green.**
- [ ] **Step 5: Commit** `feat(audio): sound kinds, a new sound from a kind and a seed (new golden: kinds.json)`

### Task 12: The loop and style library

**Golden impact:** none.

**Files:**
- Create: `src/features/audio/library/loops/*.json` (26 files), `library/styles/{calm,bouncy,spooky,brave}.json`,
  `library/words.json`, `src/features/audio/library.ts`, `tests/features/audio/library.test.ts`
- Modify: `src/features/audio/audio.ts`; the build config if JSON under `library/` needs naming to be bundled (see
  how `locale/library/*.json` is brought in, and do the same)

**Interfaces:**
- Produces:

```ts
export const LIBRARY_LANGUAGES = ['zh','es','en','pt','ja','ko','fr','ru','de'] as const
export type LibraryLanguage = (typeof LIBRARY_LANGUAGES)[number]
export interface Library { readonly loops: readonly LoopFile[]
  /** Each a four-bar format 2 track made only of the library's loops. */ readonly styles: readonly ArrangedMusic[] }
export const LIBRARY: Library
/** The name of a library loop, style, sound kind, instrument or drum in a language: libraryName('easy-drums', 'es'). */
export function libraryName(id: string, language: LibraryLanguage): string
/** The files using a loop or a style puts in a game: the thing itself and, for a style, each loop it plays, as
 *  values `writeContent` takes. `as` renames a style's track. Throws in plain words for an id the library lacks. */
export function libraryFiles(id: string, as?: string):
  { readonly type: 'loop' | 'music'; readonly value: LoopFile | ArrangedMusic }[]
```

The loops, by id (original, written for this library; the executor writes each as a few bars in the Task 5 format):

- **Drums (8):** `easy-drums`, `busy-drums`, `half-time-drums`, `march-drums`, `shuffle-drums`, `four-on-floor`,
  `drum-fill`, `tom-fill`.
- **Bass (6):** `bouncy-bass`, `walking-bass`, `steady-bass`, `octave-bass`, `slow-bass`, `skip-bass`.
- **Chords (6):** `soft-chords`, `stab-chords`, `pulse-chords`, `long-chords`, `off-beat-chords`, `waltz-chords`.
- **Melody (6):** `rising-tune`, `falling-tune`, `skipping-tune`, `echo-tune`, `calm-tune`, `brave-tune`.

Styles, each four bars with a drums, a bass, a chords and a melody lane: `calm` (C major, 84, `I vi IV V`, pad and
keys), `bouncy` (G major, 128, `I IV V IV`, pluck), `spooky` (D minor, 96, `i VI iv V`, organ and bell), `brave`
(D major, 116, `I V vi IV`, lead). A style uses only loops of 4, 8 or 16 steps a bar, so it lies on MIDI's
sixteenths and comes back from Task 15's round trip unmoved (plan audit, I3); a 12-step loop (`shuffle-drums` may be
one) is in the library but in no style.

`words.json` is `{ "<id>": { "zh": …, "es": …, … } }` for every loop, style, sound kind (Task 11), instrument and
drum: short plain names ("Easy drums", "Batería fácil").

- [ ] **Step 1: Write the failing tests:** at least 8 drum, 6 bass, 6 chord and 6 melody loops; every loop passes
  `LoopSchema` and its id is its file's name; every style passes `MusicSchema`, is four bars, names only library
  loops, and `scoreOf(style, { loops })` has notes in every lane; every id above, every `SOUND_KINDS`, `INSTRUMENTS`
  and `DRUMS` entry has a name in all nine languages, none empty, none equal to the id; no two loops have the same
  notes; `libraryFiles('calm')` is the track and its loops, each once, and loading a game in memory made of them
  gives no problem; `libraryFiles('calm', 'meadow')[0].value.id` is `meadow`; an unknown id throws
  `'The library has nothing called "x". It has: …'`.
- [ ] **Step 2: Push; red. Step 3: Write the files and `library.ts`. Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(audio): the built-in loops and styles, named in nine languages`

### Task 13: A MIDI file's bytes

**Golden impact:** none.

**Files:**
- Create: `src/lib/midi.ts`, `tests/lib/midi.test.ts`, `tests/fixtures/audio/midi-files.ts` (small files typed as
  byte arrays, each with a comment saying what it holds)

**Interfaces:**
- Produces:

```ts
export type MidiEvent =
  | { readonly kind: 'note'; readonly tick: number; readonly ticks: number; readonly channel: number   // 0 to 15
      readonly pitch: number; readonly velocity: number }
  | { readonly kind: 'tempo'; readonly tick: number; /** Beats a minute. */ readonly bpm: number }
  | { readonly kind: 'key'; readonly tick: number; /** -7 to 7 */ readonly sharps: number; readonly minor: boolean }
  | { readonly kind: 'time'; readonly tick: number; readonly beats: number; readonly unit: number }
  | { readonly kind: 'name'; readonly tick: number; readonly text: string }
export interface MidiFile { /** Ticks to a quarter note. */ readonly division: number
  readonly tracks: readonly (readonly MidiEvent[])[]
  /** What the file had that these events cannot hold, counted by sort: { 'pitch bends': 12, 'controllers': 40 }. */
  readonly skipped: Readonly<Record<string, number>> }
/** Reads a Standard MIDI File, format 0 or 1. A note-on with no note-off ends at the track's end. `undefined` when
 *  the bytes are not such a file (format 2, SMPTE time, a cut chunk, no MThd). Never throws. */
export function readMidi(bytes: Uint8Array): MidiFile | undefined
/** Writes a format 1 file: each track's events in tick order, note-offs before note-ons at one tick, running status
 *  not used, an end-of-track after the last event. The same input gives the same bytes. */
export function writeMidi(file: Pick<MidiFile, 'division' | 'tracks'>): Uint8Array<ArrayBuffer>
```

- [ ] **Step 1: Write the failing tests:** `writeMidi` of one track with a tempo of 120 and one note C4 for a beat at
  division 480 is these bytes (typed out, 40-odd); `readMidi(writeMidi(x))` gives `x` for three tracks with tempo,
  key, a name and overlapping notes; a format 0 fixture reads as one track; a fixture with running status reads; a
  note-on with velocity 0 is a note-off; pitch bends, controllers, programs, aftertouch and system-exclusive are
  counted in `skipped` and reading goes on past them; a stuck note ends at the track's end; a file cut inside a
  chunk, format 2, SMPTE division, and `'RIFF'` bytes each give `undefined`; a variable-length number of four bytes
  reads and writes.
- [ ] **Step 2: Push; red. Step 3: Implement. Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(lib): read and write a Standard MIDI File`

### Task 14: A track, a loop or a motif as MIDI

**Golden impact:** none.

**Files:**
- Create: `src/features/audio/midi-out.ts`, `tests/features/audio/midi-out.test.ts`
- Modify: `src/features/audio/audio.ts`, `src/features/audio/plain-notes.ts` (format 1 as plain notes)

**Interfaces:**
- Consumes: `notesOf`, `loopNotes`, `motifNotes`, `writeMidi`, `TICKS_PER_BEAT`.
- Produces:

```ts
/** Format 1 music as plain notes: each part a lane (a tone part plays `lead`, a drum part's hit is a `snare`). */
export function stepNotes(music: StepMusic): PlainNote[]
/** What can be taken out as MIDI. */
export type MidiSource =
  | { readonly type: 'music'; readonly value: MusicFile }
  | { readonly type: 'loop'; readonly value: LoopFile }
  | { readonly type: 'motif'; readonly value: MotifFile }
/** A format 1 MIDI file at 480 ticks to a beat: a first track with the name, the tempo and the key signature, then
 *  one track a lane, drums on channel 10. A loop is written over `I` in C major at 110; a motif in C major at 120. */
export function musicToMidi(source: MidiSource, parts?: SongParts): Uint8Array<ArrayBuffer>
```

Channels: the drums lane is channel 10 (index 9); the others take 1 to 9 and 11 to 16 in lane order. Each lane's
velocity is `round(volume * 127)`, at least 1. Drums are written as General MIDI's notes: kick 36, snare 38, hat 42,
clap 39, tom 45, each a sixteenth long. Each track starts with its lane's id as its name.

- [ ] **Step 1: Write the failing tests:** the fixture song read back with `readMidi` has five tracks, tempo 110, a
  key of no sharps, major; the notes of each lane track are `notesOf`'s for that lane (pitch, tick, ticks); drums
  are on channel index 9 with the five note numbers; a song in `Eb` minor writes six flats, minor, and one
  in `A` major three sharps; a format 1 track writes its parts; a loop and a motif each write
  one lane; the same input gives the same bytes.
- [ ] **Step 2: Push; red. Step 3: Implement. Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(audio): any track, loop or motif as a MIDI file`

### Task 15: A MIDI file as a song

**Golden impact:** none.

**Files:**
- Create: `src/features/audio/midi-in.ts`, `tests/features/audio/midi-in.test.ts`,
  `tests/features/audio/midi-round-trip.parity.test.ts`
- Modify: `src/features/audio/audio.ts`

**Interfaces:**
- Consumes: `readMidi`, `theory.ts`, the content schemas, `notesOf`.
- Produces:

```ts
export interface MidiImport { readonly music: ArrangedMusic; readonly loops: readonly LoopFile[]
  /** What the file had that the game's music cannot hold, each a whole sentence. Empty when nothing was lost. */
  readonly dropped: readonly MidiDropped[]
  /** For the panel that says what came in. */ readonly lanes: number; readonly bars: number; readonly tempo: number }
/** One thing a file had that the game's music cannot hold: what, how many where it counts, and the sentence the
 *  command line prints. The editors word `what` in their own nine languages and never show `sentence`. */
export interface MidiDropped {
  readonly what: 'moved' | 'tempo' | 'bends' | 'controllers' | 'time' | 'lanes' | 'bars' | 'together' | 'cut'
  readonly count?: number; readonly tempo?: number; readonly beats?: number; readonly sentence: string }
/** A MIDI file as a format 2 track and its loops. `id` names the track (and starts each loop's id). */
export function midiToMusic(bytes: Uint8Array, id: string):
  | { readonly ok: true; readonly value: MidiImport }
  | { readonly ok: false; readonly why: 'not-midi' | 'no-notes'; readonly message: string }
```

How it reads (calls 5 and 18 to 21, and the spec's "MIDI"):

- Tempo: the first tempo event, rounded to a whole number and held to 30–300; none: 120.
- Key: the first key signature; else call 19.
- Lanes: one a channel that has notes (a format 0 file's channels are split), channel 10 as `drums`; a channel that
  plays several notes at once is spread by call 18. The instrument is `bass` when the lane's middle pitch is under
  C3 (48), else `keys`; the loop's `lane` is `bass` or `melody` the same way. Lane ids are `drums`, `bass`,
  `lane-3`, … unique. A lane's volume is its notes' mean velocity over 127, to two places.
- Drums: each note number goes to the nearest of 36 (kick), 38 (snare), 42 (hat), 39 (clap), 45 (tom); a tie goes to
  the first in that order.
- Bars: 16 steps each; the track's `bars` is up to the last note, at most 128 (more are dropped and said).
- Loops (plan audit, I2 and I7): a lane is first cut into pieces at every bar line that no note sounds across, so a
  note held over a bar line stays whole (a loop's `=` carries it inside one loop; `notesOf` never carries one across
  two blocks). A piece longer than 8 bars (a loop's most) is cut at bar 8 and the note there is cut too (`cut`).
  Pieces with the same steps are one loop, and the same piece again and again in a row is one block with `bars`
  counted. Then each run of pieces used once, side by side, is joined into one loop of up to 8 bars, so a long song
  that never repeats gives about one loop for each eight bars of each lane, not one for each bar. A silent bar is no
  block. Loop ids are `<id>-<lane>-1`, `-2`, ….
- Chords: call 20. Steps: call 21.
- `dropped`, in this order, each only when it happened: `'12 notes were moved to the nearest sixteenth.'`, `'The
  tempo changes after the start were dropped; the song keeps 110 beats a minute.'`, `'Pitch bends were dropped.'`,
  `'Controllers (like the sustain pedal) were dropped.'`, `'The file is in 3/4; it was read as four beats to a
  bar.'`, `'2 instruments were dropped: a song has at most eight lanes.'`, `'Notes after bar 128 were dropped.'`,
  `'Some notes played together in one instrument were dropped.'`, `'3 long notes were cut at the end of a loop.'`.
  Each is a `MidiDropped` with that `sentence` and its `what` (`moved`, `tempo`, `bends`, `controllers`, `time`,
  `lanes`, `bars`, `together`, `cut`), so a screen can say it in its own words without the word "MIDI" (the Sound
  editor's spec bans it on screen).
- Refusals: `why: 'not-midi'`, `'This is not a MIDI file this game can read. Save it as a Standard MIDI File (type 0
  or 1).'`, and `why: 'no-notes'`, `'This MIDI file has no notes.'`.

Every value it gives passes `MusicSchema` and `LoopSchema`, and loading a game made of them gives no problem.

- [ ] **Step 1: Write the failing tests.** `midi-in.test.ts`, on the fixtures of Task 13 and new ones: tempo, key
  from the signature and from the notes (a C major scale with no signature is C major; the same a fourth up is F);
  a channel 10 file becomes a drum lane with the right drums; four equal bars become one loop in one block of four;
  a bar of C, E and G under a melody gives `I`, of A, C and E gives `vi`; an out-of-key note is written as a fixed
  note and an in-key one as a step; a three-note chord on one channel becomes three lanes; nine channels keep the
  eight busiest; every `dropped` entry, its `what` and its sentence; both refusals and their `why`; a note held across
  a bar line comes back as one note of its own length; a 64-bar lane that never repeats gives at most 8 loops; a file whose notes all sit off the grid by 10 ticks counts
  them. `midi-round-trip.parity.test.ts` (Node and three browsers): for the fixture song and each of the four
  library styles, `midiToMusic(musicToMidi(track))` read with `notesOf` gives the same pitch, tick and length for
  every note that is not a drum, and the same drum at the same tick for every hit, and `dropped` is empty (the
  spec's round trip).
- [ ] **Step 2: Push; red. Step 3: Implement. Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(audio): a MIDI file read into a song and its loops`

### Task 16: `automata music` and `automata sound`

**Golden impact:** none.

**Files:**
- Create: `src/features/cli/music.ts`, `src/features/cli/sound.ts`, `tests/features/cli/music.test.ts`,
  `tests/features/cli/sound.test.ts`
- Modify: `src/features/cli/args.ts`, `help.ts`, `cli.ts`, `mcp-tools.ts`, `game-folder.ts` (the game's own copy of
  `midiToMusic`, `musicToMidi`, `makeSound`, `withFolders` joins `ContentApi` the way `artFiles` did), `README.md`
- Test: `tests/features/cli/args.test.ts`, `cli.test.ts`, `mcp-tools.test.ts`, `tests/docs/` (the test that holds
  the README to the help)

**Interfaces:**
- Consumes: `midiToMusic`, `musicToMidi`, `makeSound`, `SOUND_KINDS`, `writeContent`, `readGame`, the files port.
- Produces: `CommandName` gains `'music'` and `'sound'`; `CommandInput` gains nothing: for these two the first word
  after the command is the verb and is read from `folder`, and the rest from `rest` (the game's folder is the last
  word, when there is one more than the verb needs).

```
automata music import <file.mid> [folder]   --id <name>   --json
automata music export <id> <file.mid> [folder]            --json
automata sound new <kind> [folder]          --seed <n>  --id <name>  --json
```

- `music import` reads the file, names the track `--id` or the file's name made into an id (`My Song.mid` is
  `my-song`), writes the track into the first folder the project lists for `music` and each loop into the first for
  `loop`, with `writeContent`, and prints `Made content/music/my-song.json and 6 loops.` then each `dropped` entry's
  sentence. It writes nothing when: the id is taken (`'There is already a music track called "my-song". Pick
  another name with --id.'`), a folder is not listed (call 23: `'This game lists no folder for music. Add these
  lines to automata.toml, then try again:'` and the block), or the file is refused.
- `music export` finds a track, then a loop, then a motif of that id (`'There is no track, loop or motif called
  "x". This game has: …'`), and writes the MIDI file where asked: `Wrote meadow.mid.`
- `sound new` makes `makeSound(kind, seed ?? 0, id ?? kind)`, writes it into the first `sound` folder, prints `Made
  content/sounds/jump.json (jump, seed 0). Try another with --seed 1.` An unknown kind lists the ten.
- MCP tools `music_import`, `music_export` and `sound_new`, each one sentence, each running the command through the
  runner as the other tools do.
- `--json` prints `{ made: string[], dropped: string[] }`, `{ wrote: string }`, `{ made: string, kind, seed }`.

Help text (new, and one line each in `ROOT_HELP`: `automata music   Bring a MIDI file in as a song, or take a song
out as MIDI.` and `automata sound   Make a new sound from a kind, like jump or coin.`).

- [ ] **Step 1: Write the failing tests,** on files in memory (`tests/fixtures/cli/memory.ts`): each command's happy
  path and each refusal above, the exact lines printed, exit codes (0, 2 for a refusal), that an import followed by
  `automata check --only files` passes, that export then import of the same id under a new name gives a track with
  the same `notesOf`; `args.test.ts` for the three shapes and a missing word (`'automata music import needs a MIDI
  file, like automata music import song.mid.'`); the MCP tools list.
- [ ] **Step 2: Push; red. Step 3: Implement. Step 4: Push; green. Add the commands to the README's table.**
- [ ] **Step 5: Commit** `feat(cli): automata music import and export, automata sound new`

### Task 17: The new game has folders, a sound and a song

**Golden impact:** `template/replays/level-1.json` must **not** move; `tests/template/replay.parity.test.ts` is the
proof. If it moves, stop and report.

**Files:**
- Create: `template/content/sounds/jump.json` (`makeSound('jump', 0)`, written by `writeContent`),
  `template/content/music/meadow.json` and `template/content/loops/*.json` (`libraryFiles('calm', 'meadow')`),
  `template/content/cues/cues.json`
- Modify: `template/automata.toml`, `template/vite.config.ts`, `template/gitignore`,
  `template/src/features/page/page.ts`, `template/README.md`, `template/AGENTS.md`
- Test: `tests/template/files.test.ts`, `tests/template/page.browser.test.ts`, `tests/features/cli/create.test.ts`,
  `tests/create/create.journey.test.ts`, `tests/install/create-smoke.mjs`

**Interfaces:**
- Consumes: Tasks 1, 2, 8, 9, 11, 12.

- `automata.toml` gains, each with its one-line comment in the file's own voice, folder blocks for `sound`
  (`content/sounds`), `music` (`content/music`), `loop` (`content/loops`), `motif` (`content/motifs`) and `cues`
  (`content/cues`). A feel file's block is not touched here (plan audit, I6): `feel` is in the sim on `main`
  (`sim-content.ts` does not leave it out), so a feel folder block would put `folders` into the hashed project and
  move `template/replays/level-1.json`; the cycle that decides whether feel stays in the sim (plan F, or the Feel
  editor's Part 3) moves it. The comment above the first: `# A folder block lists every
  file in a folder at once: put a new sound in content/sounds and it is part of the game.`
- `cues.json`: `hero.jumped` plays `jump`; `level.started` starts `meadow`. (Use the event names the template's
  hero raises on `main` then.)
- `vite.config.ts` gains a plugin, written in the file (a game owns its build): on the dev server it answers
  `/automata.folders.json` with `folderManifest` of the folders `automata.toml` lists, read from disk on every
  request; on `vite build` it emits the same file. It imports `parseProject`, `folderManifest` and `FOLDERS_FILE`
  from `@automataframework/framework/headless`.
- `page.ts`: `loadGame(read, listFromManifest(read))`; then `loadRecordings(content, readBytes)`; a `webSpeaker`
  and `createAudio({ content, speaker, recordings })` handed to `startGame` as `audio`; a `RecordingError` is shown
  the way an `ArtError` is. `window.automataGame` already shows the game; add `window.automataAudio` (the
  `GameAudio`) the same way, for an agent or a test to read the cue log.

- [ ] **Step 1: Write the failing tests.** `files.test.ts`: the template loads with a `list` over its real folders;
  it has the five folder blocks; `jump.json` is `makeSound('jump', 0)` byte for byte and `meadow.json` and its loops
  are `libraryFiles('calm', 'meadow')` byte for byte; every file is in the standard form. `page.browser.test.ts`:
  the page started with a `read` over the template's files and a manifest plays, and after one jump the audio's log
  is `level.started` music `meadow`, then `hero.jumped` sound `jump`. `create.test.ts`: a made game has the files
  and the `gitignore` line. `create.journey.test.ts` (the end-to-end proof, three browsers, five sizes): after the
  first tap and one jump, `window.automataAudio.log()` has the music and the jump, and
  `window.automataAudio.state()` is `'on'`; a sound file dropped into `content/sounds` and a cue for it while
  `automata play` runs is heard after a reload (the folder is read fresh). `create-smoke.mjs`: `npx --no automata
  check` passes on the new game, then `automata sound new coin`, `automata music export meadow out.mid`, `automata
  music import out.mid --id meadow-2` and `automata check` again, all exit 0 (the spec's "installed package").
- [ ] **Step 2: Push; red. Step 3: Implement. Step 4: Push; green in `create`, `create-play` and the engines.**
- [ ] **Step 5: Commit** `feat(template): a new game lists folders and has a sound and a song`

### Task 18: One game with everything, in every engine; the docs

**Golden impact:** none; one new golden, `tests/golden/full-sound.json` (hashes and cue log), recorded from CI.

**Files:**
- Create: `tests/fixtures/audio/full-sound-game.ts` (the sounding game plus a recorded sound made in the test with
  `writeRecording`, a format 2 track, a motif, and a sound that plays the motif, all in folders),
  `tests/features/audio/full-sound.parity.test.ts`, `tests/features/web/full-sound.browser.test.ts`,
  `tests/features/level/sound-moves-no-hash.test.ts`
- Modify: `skills/automata-content/SKILL.md`, `skills/automata/SKILL.md`, `README.md`, `docs/api/framework.api.md`,
  `CLAUDE.md` (the Structure block: the two `lib` files, the audio library), `tests/docs/` as the README checks ask

- [ ] **Step 1: Write the failing tests.** `full-sound.parity.test.ts` (Node and three browsers): the run's hashes
  equal `sounding.json`'s own (the same sim, the same script: adding the files moved nothing) and its cue log is one
  recorded text everywhere. `full-sound.browser.test.ts` (three browsers): the same run through `webSpeaker` with a
  real `AudioContext` gives the same cue log as `testSpeaker` did, and an `OfflineAudioContext` render of the first
  two seconds is not silent. `sound-moves-no-hash.test.ts`: for each of `sound`, `music` (both formats), `loop`,
  `motif` and `cues`, by path and by folder, adding a file to each golden game leaves `simContent`'s hash and the
  final recorded hash as they were (the spec's "No hash moves").
- [ ] **Step 2: Push; red. Step 3: Make them green** (no source change is expected; if one is needed, it is a defect
  in an earlier task: fix it there and say so in the tracker).
- [ ] **Step 4: The docs.** `automata-content`: a section each for folders, recordings, loops, motifs, music format
  2 and the library, each with the whole of a small file and the checks' words; `automata`: the three commands. The
  README: "A game ships no audio files" becomes true again ("…unless you record one"), the content table gains
  `loop` and `motif`, a "Folders" paragraph, a "Music from loops" section with the spec's `meadow`, "MIDI in and
  out", "Sound kinds". Commit the API report from the `package` job's log.
- [ ] **Step 5: Push; every job green. Commit** `test: one game with every sound format in every engine; docs`

---

## Handoffs

- **AutomataFrameworkEditors:** after this merges, the Editors' pin moves to it in its own pull request. The Sound
  editor's plan (`docs/superpowers/plans/2026-11-15-sound-editor.md` there) names every export it uses: `withFolders`,
  `loadGame`'s `list`, `makeSound`, `SOUND_KINDS`, `LIBRARY`, `libraryName`, `libraryFiles`, `writeRecording`,
  `readRecording`, the limits, `soundVoices`, `playSound`, `createMusicPlayer`, `scoreOf`, `notesOf`, `loopNotes`,
  `motifNotes`, `chordName`, `chordOf`, `midiToMusic` (with `MidiDropped` and `why`),
  `musicToMidi`, `webSpeaker`'s `keep`. Changing one of those names after this plan is audited means changing that
  plan too.
- **The Feel editor's plan** lists its effects' folder with `withFolders` (Tasks 1 and 2), not one block a file.
- **A game that lists a folder cannot be opened by anything built before this plan** (plan audit, I1): the project
  file's schema refuses an unknown key, and `loadGame` without a `list` refuses a game with a folder. So the order is:
  this plan merges; the Editors' pin moves to it and their open and save list folders (the Sound plan's Tasks 1 to 3);
  the Site's own reader of `automata.toml` (`src/features/facts/project.ts`, which throws on a `[[content]]` table
  with no `path`) reads folder blocks and the files in them; only then does the demo move a block to a folder. Until
  all three are on `main`, the demo lists by path.
- **AutomataFrameworkExamples:** the demo's own cycle moves its sound, music and cue blocks to folders and gives
  `scripts/copy-game.ts` the folder manifest (`folderManifest`) and the recordings (`recordingPaths`). Moving a kind
  the sim keeps (`level`, `character`, `feel`, `tuning`) into a folder changes the hashed project and so moves
  `replays/level-1.json` and `replays/test-game.json`; only `sound`, `music`, `loop`, `motif` and `cues` move
  without one. The editors' saves into the demo now include `.wav` files and, once, `automata.toml` folder lines, so
  that repo's `CLAUDE.md` line "the change is content files only" is widened in the same cycle.
- **AutomataFrameworkSite:** a cycle that teaches `facts` to read folder blocks (see the order above), before the
  demo moves.
- **For the Owner's ears:** the instruments, the drums, the ten sound kinds, the 26 loops and the four styles are
  first values written without hearing them. The Owner's review of this cycle is by listening (the template plays
  three of them); what sounds wrong is changed in `library/` and nowhere else.

## Self-review

- **Spec coverage:** recordings (Tasks 3, 9, 10); loops (5, 8); motifs and their uses (4, 6, 8, 9); music format 2
  (7, 8); the library: kinds (11), loops, styles, words, copying (12); MIDI both ways, the round trip, the commands
  and the MCP tools (13 to 16); content folders, the template, `check`'s words (1, 2, 17); "everything through
  today's `Speaker`" (8, 9, 10, 18); testing: unit in every task, Node and browser parity (4, 8, 11, 15, 18), no
  hash moves (2, 18), the installed package (17), end to end (17); the API report, schemas and skills (each task
  and 18).
- **Left to the builder by the spec, settled here:** the voices of each kind and instrument and the loops (calls 15
  and 16, Tasks 8, 11, 12); how chords are worked out from MIDI (call 20); one level of folders (call 2); when a page
  loads recordings (call 24).
- **Not in the spec, added because it could not work without it:** how a page lists a folder (call 1);
  `withFolders`, so the editors' "Set up sounds" and an agent write the same lines; `automata sound new`.

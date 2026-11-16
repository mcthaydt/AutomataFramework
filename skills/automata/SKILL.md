---
name: automata
description: Use first, whenever you work on a game made with automata create. It says where things live, which rules a game keeps, where a change goes and how to check your work.
---

# Working on an Automata game

A game made with `automata create` is a folder you can read in a minute. A person plays it in a browser; you change its
files. Read this page, then the skill for the kind of change you are making.

## Where things live

| What | Where |
|---|---|
| The project: name, first level, which files are content | `automata.toml` |
| Levels, characters and the rest of the content (JSON, one thing in each file) | `content/` |
| The list of the game's rules | `src/headless.ts` |
| One feature's rules: a plugin and its systems | `src/features/<name>/` |
| Every word a player reads, one file for each language | `content/messages/` |
| The page: loading, controls, and how it looks | `src/features/page/` |
| The screens around the game (warnings, menu, pause, settings, saved games, add a player, "Well done!") | the framework's `startFlow`; a game sets four `automata.toml` lines, CSS properties and words |
| Tests of the rules | `tests/features/<name>/` |
| A recorded play, replayed on every check | `replays/` |
| How to run, change and check the game, for a person | `README.md` |

## The laws a game keeps

1. **Only the rules change the game.** What is on the screen only reads the game's state; it never decides anything.
2. **The rules have no clock, no dice of their own and no files.** Count ticks with `ctx.tick`, use `ctx.rng` for chance,
   and put anything else a rule needs in a content file.
3. **The same keys give the same game on every machine.** A recorded play proves it: it is replayed on each check, and a
   different ending means something broke the law.
4. **Content is JSON, and only `automata check --fix` writes it.** Its standard form is exactly what the framework writes,
   so a person, an editor and you all make the same change.
5. **A file the game uses is listed in `automata.toml`.** One that is not listed is not part of the game.

## Where a change goes

- A number, a level, a character's size or colour: content. Edit the JSON, then run `automata check --fix`.
- A figure or a backdrop (how something is drawn): content. Edit the JSON, then run `npx --no automata art` to paint its
  pictures, and commit them with it. `check` fails for a picture that is missing or older than its file.
- A new thing a character can do: a rule, in `src/features/<name>/`. Skill `automata-rules`.
- A word a player reads: content, in `content/messages/`, one file for each language, in the fixed order `zh, es, en, pt, ja, ko`. The game's own
  language is `source` in `automata.toml`; write the word there first, then in every other file, under the same key; `check` names any language that is missing it. `npx --no automata words` lists the
  translations no native speaker has read, beside the game's own text. Mark a language read (`--read <language>`) only
  once a native speaker has read it.
- A plate that opens a gate, a button that stays down, a door to another level, a path, or levels that touch along an edge: content, values on the things and a world file. Skill `automata-content`, page `skills/automata-content/values-and-doors.md`. To see how the levels fit together, run `automata world`, and to look at a level, or at what its things hold, run `automata picture`.
- How the game looks on the page: `src/features/page/` and `src/style.css`.
- A level to play after another, a warning before play, the splash or the event that ends a level: `levels`, `warnings`, `splash` and `done` in `automata.toml` (skill `automata-content`). The screens are never edited: their colours and font are the `--automata-ui-*` properties, and a word on one is a message key of the game's own, which wins over the framework's.
- Where a visit to a running page is: the element the game fills carries `data-state` (`loading`, `warnings`, `picking`, `splash`, `menu`, `playing`, `paused`, `done`, `watching` or `problem`) and `data-over` (`settings`, `saves` or `players`) while a screen is on top.
- A new kind of file: see `automata-content` for the kinds there are. A kind that is not there is not built yet.

## Verify in this order

```
npx --no automata check --only files
npx --no automata check
npx --no automata replay
```

1. After any content change, `check --only files` says what is wrong with a file, in plain words, with its place.
2. Before you say you are done, `check` runs every step: the files, the pictures, the rules, lint, types, the replays and the tests. A
   step that fails does not stop the next, so one run says everything that is wrong.
3. If you meant to change how the game plays, `replay` will say the recording no longer ends where it did. Run
   `npx --no automata replay --accept` to record the new play, and say in your message why it moved.

## Before you ship

Run `npx --no automata check --ship`. It runs every step, and also fails on what a stranger would meet: words that are not
finished (a message that is empty, says `TODO`, or is only its own key), a picture over 512 KB, words under 14 pixels
tall, and a saved game whose shape changed while its version did not. Fix what it names. Then work through the list it
prints with the person, since only the game's makers can judge it:

- In five seconds, is it clear what to do?
- Can someone who has never seen it work out how to play, with nobody explaining?
- Is there enough to do: a few minutes of play, or a reason to play again?
- Does it get harder bit by bit?
- Did you make the art, the music and the characters, or are you allowed to use them?
- Are there any stand-in pictures, half-made menus, or spots that do something when tapped that nobody would guess?
- Do the pictures and words look cared for, the same style on every screen?
- Is color ever the only clue? Is sound ever the only clue?
- Can luck make a level impossible? Does anything appear right on top of the player?
- Play it for ten minutes on a real phone.
- Play it with one hand, on bad Wi-Fi, after locking and unlocking the phone, and after many restarts.
- Hand it to someone and say nothing. Is it still fun after 30 seconds?

Exit codes, for every command: 0 everything is fine, 1 the game has something to fix, 2 the command could not do its
work (a folder that is not a game, a tool that is not installed). Add `--json` to read the answer as JSON.

If your program speaks the Model Context Protocol, `automata mcp` offers the same commands as tools (`create`, `check`, `replay` and
`art`), and five more that run the game a few ticks at a time and say where everything is (`play_start`, `play_step`,
`play_state`, `play_save` and `play_stop`). The game's `.mcp.json` starts it.

Always write `npx --no automata`, with `--no`. Without it, the command can fetch an unrelated package of that name from npm.

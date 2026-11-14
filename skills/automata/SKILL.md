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
| The page: loading, controls, words on the screen | `src/features/page/` |
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
- A new thing a character can do: a rule, in `src/features/<name>/`. Skill `automata-rules`.
- How the game looks on the page, or the words on it: `src/features/page/` and `src/style.css`.
- A new kind of file: see `automata-content` for the kinds there are. A kind that is not there is not built yet.

## Verify in this order

```
npx --no automata check --only files
npx --no automata check
npx --no automata replay
```

1. After any content change, `check --only files` says what is wrong with a file, in plain words, with its place.
2. Before you say you are done, `check` runs every step: the files, the rules, lint, types, the replays and the tests. A
   step that fails does not stop the next, so one run says everything that is wrong.
3. If you meant to change how the game plays, `replay` will say the recording no longer ends where it did. Run
   `npx --no automata replay --accept` to record the new play, and say in your message why it moved.

Exit codes, for every command: 0 everything is fine, 1 the game has something to fix, 2 the command could not do its
work (a folder that is not a game, a tool that is not installed). Add `--json` to read the answer as JSON.

Always write `npx --no automata`, with `--no`. Without it, the command can fetch an unrelated package of that name from npm.

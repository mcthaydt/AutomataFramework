# My Game: notes for an agent

This game is made with Automata Framework. A person plays it in a browser; you change its files. Read this page, then
the skills below.

## Where things are

| What | Where |
|---|---|
| The project: name, first level, which files are content | `automata.toml` |
| Levels and characters (JSON, one thing per file) | `content/levels/`, `content/characters/` |
| The list of the game's rules | `src/headless.ts` |
| One feature's rules (a plugin and its systems) | `src/features/<name>/` |
| The page: loading, controls, words on screen | `src/features/page/` |
| Tests of the rules | `tests/features/<name>/` |
| A recorded play, replayed on every check | `replays/` |

## The four commands

Run them as `npx --no automata <command>`, which never fetches anything. A person types the `npm run` form.

- `npx --no automata check` says whether the game is sound, step by step, with what to fix. `--only <step>` runs one
  step, `--fix` puts content files in their standard form, `--json` prints the report as JSON.
- `npx --no automata replay` plays the recordings in `replays/` and says whether each ends where it did. `--accept`
  records them again.
- `npx --no automata play` serves the game for a browser.
- `npx --no automata create <name>` makes a new game.

Exit codes: 0 fine, 1 the game needs fixing, 2 the command could not do its work.

## Rules you keep

1. Only the rules change the game. The page only shows it.
2. The rules (`src/headless.ts` and every file it reaches) have no clock, no dice of their own and no files. Count
   ticks with `ctx.tick` and use `ctx.rng` for chance.
3. The same keys give the same game on every machine. A recorded play proves it.
4. Content is JSON, and only `automata check --fix` writes it in its standard form. Do not hand-format it.
5. A file the game uses is listed in `automata.toml`. One that is not listed is not part of the game.

## Verify in this order

1. `npx --no automata check --only files` after any content change.
2. `npx --no automata check` before you say you are done.
3. If the play was meant to change, `npx --no automata replay --accept`, and say why the recording moved.

## Skills

The framework ships four skills, in `node_modules/@automataframework/framework/skills/`:
`automata` (read first), `automata-content`, `automata-rules` and `automata-api`.

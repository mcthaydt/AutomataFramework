# The plan for native-speaker reads

Written 2026-11-20 (from `date`). A plan only: it changes no word and no code.

## Why

Every translation in the framework and the editors was written by a machine. Nobody who grew up with any of the
languages has read one. Plan Q's one open item (`docs/superpowers/progress.md`) is "a native speaker's read of the new
words in ES, KO, JA, ZH and PT (nothing read yet)". A session cannot do that read: a person must. This is the plan the
Owner can hand to five readers, and what happens to their notes.

## 1. What is read

The words the World slice and Plan Q added or changed in Spanish, Korean, Japanese, Chinese and Portuguese, in two
repos. A "row" is one word, button name or sentence.

| Repo | Where the words are | Measured at | Compared with | Rows per language |
|---|---|---|---|---|
| AutomataFramework | `src/features/locale/library/<language>.json` | `64d7f11` (main) | `735330a`, the commit before Plan Q's first merge (#143) | 24 new, 0 changed |
| AutomataFramework | `template/content/messages/<language>.json` | `64d7f11` (main) | `735330a` | 1 new, 0 changed (3 taken out) |
| AutomataFrameworkEditors | `src/features/words/` (15 areas) | `44d6b48` (main) | `ee19290`, the commit before the slice's first merge (#78), which had English only | 453 new |

So each of the five readers has **478 rows**: 25 from the framework and 453 from the editors. The numbers are the same
in all five languages, because every language has every row. In English that is about 2,500 words (87 and 4 in the
framework, 2,432 in the editors, counted by splitting on spaces). An estimate, not a measurement: two to three hours
for one reader.

The framework's 24 new library rows are How to play (12), Settings (4), Paused (2), You lost (2), While playing (2),
Main menu (1) and Loading (1). The template's one is the goal of level 1. On the reader's sheet some editors rows
are shown more than once (for one thing and for several, or with no name), which adds 25 lines: the editors' sheet has
478 lines and the framework's 25, so 503 lines to read.

**The count will grow.** World pull requests 15 to 19 and the glass and icons work are not merged, and each adds rows.
The sheets are made from `main` at the commit the Owner picks (open decision 5), with the commands below, which count
again.

### Not in this read

- **English.** It is the language the words are written in, and the Owner's own.
- **French, Russian and German.** The editors speak them (453 rows each, also unread); the games do not, and Plan Q's
  item names only the five. Open decision 4.
- **The framework's older rows.** 128 library rows and 4 template rows per language were there before Plan Q. They are
  as unread as the new ones (`src/features/locale/library/automata.translations.toml` holds no mark), and the README
  says every one waits for a read before Release 1. Open decision 4.
- **The editors' 99 older rows** (`WORDS` in `src/features/words/words.ts`). They are English only: there is no
  translation to read.
- **The test game's own words** (AutomataFrameworkExamples). Another repo, not part of Plan Q's item.

## 2. The reading sheet

One spreadsheet file per language and repo, which opens in Numbers, Excel or Google Sheets. One line per row:

| Where it shows | English | Translation | Fine | Wrong (write what it should say) | Odd (reads like a machine wrote it) | Code (leave as it is) |
|---|---|---|---|---|---|---|
| Putting changes in | Put 3 changes in the game | 변경 3개를 게임에 넣기 | | | | changes.putTitle |

What the reader is told, at the top of the message that carries the sheet:

> These are the words of a game maker for children and families. A computer wrote them in your language. Please read
> each line as if it were on a button or a screen.
>
> - If it is right and sounds like a person, put an **x** under **Fine**.
> - If it is wrong, write what it should say under **Wrong**.
> - If it is right but stiff or strange, write how you would say it under **Odd**.
>
> Keep it short: most of these sit on small buttons. Where you see **3** or **1**, the screen puts in a number or a
> name. Keep anything in curly brackets, like {count}, just as it is. Do not change the last column.

"Where it shows" is the name of the screen. Pictures of every editor screen are on the editors' `ci-screens` branch
(`main/`), in English only: the reader can be sent the picture of a screen when a line is unclear. A reader who wants
to see the words in place can open the editor's demo, which needs no sign-in, and pick their language on the first
card.

### How the sheets are made

Two commands, one per repo, run in that repo's folder on the commit to be read. They use only Node and git, add no
file to either repo and install nothing. Both ran here on Node 22.23.5 against the commits in the table and gave the
line counts above. No new tool is built: if the reads become a habit, that is the time to ask for one.

In AutomataFramework (five files, `reads-framework-<language>.csv`, 25 lines each; `735330a` is the commit the words
are compared with):

```sh
for lang in es ko ja zh pt; do
  node -e '
    const { execFileSync } = require("node:child_process"), fs = require("node:fs")
    const [lang, base] = process.argv.slice(1)
    const now = (p) => JSON.parse(fs.readFileSync(p, "utf8")).messages
    const was = (p) => { try { return JSON.parse(execFileSync("git", ["show", base + ":" + p], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).messages } catch { return {} } }
    const SCREEN = { how: "How to play", hud: "While playing", loading: "Loading", lost: "You lost", menu: "Main menu", pad: "How to play", pause: "Paused", settings: "Settings", level: "The start of a level" }
    const cell = (s) => "\"" + String(s).replaceAll("\"", "\"\"") + "\""
    const rows = [["Where it shows", "English", "Translation", "Fine", "Wrong (write what it should say)", "Odd (reads like a machine wrote it)", "Code (leave as it is)"]]
    for (const dir of ["src/features/locale/library", "template/content/messages"]) {
      const en = now(dir + "/en.json"), to = now(dir + "/" + lang + ".json"), old = was(dir + "/" + lang + ".json")
      for (const key of Object.keys(to).sort()) if (old[key] !== to[key]) rows.push([SCREEN[key.split(".").at(key.startsWith("automata.") ? 1 : 0)] ?? "", en[key] ?? "", to[key], "", "", "", dir.split("/")[0] + ":" + key])
    }
    console.log(rows.map((r) => r.map(cell).join(",")).join("\n"))
  ' "$lang" 735330a > "reads-framework-$lang.csv"
done
```

In AutomataFrameworkEditors (five files, `reads-editors-<language>.csv`, 478 lines each):

```sh
for lang in es ko ja zh pt; do
  node --input-type=module -e '
    const w = await import(process.cwd() + "/src/features/words/words.ts")
    const lang = process.argv[1]
    const SCREEN = { first: "First visit", shell: "Every screen", bar: "Top bar", menus: "Menus", panels: "Tools, list and settings panel", levels: "A level", ground: "Painting the ground", thing: "A thing in a level", map: "The map", arrange: "Arranging the map", play: "Playing a level", changes: "Putting changes in", kept: "Keeping a copy, and problems", settings: "Settings", help: "Help" }
    const cell = (s) => "\"" + String(s).replaceAll("\"", "\"\"") + "\""
    const rows = [["Where it shows", "English", "Translation", "Fine", "Wrong (write what it should say)", "Odd (reads like a machine wrote it)", "Code (leave as it is)"]]
    for (const [area, screen] of Object.entries(SCREEN)) for (const key of Object.keys(w[area].en)) {
      const en = w[area].en[key], to = w[area][lang][key], say = (row, fill) => (typeof row === "function" ? row(...fill) : row)
      if (typeof en === "string") { rows.push([screen, en, to, "", "", "", area + "." + key]); continue }
      // A row that takes a number or a name is shown with 3 in each gap, with 1 where that changes the words, and with
      // nothing where the row has words of its own for no name.
      const fills = [["3", "3", "3"], ["1", "1", "1"], ["", "", ""]]
      const seen = new Set()
      for (const [i, fill] of fills.entries()) {
        const said = en(...fill)
        if (i === 1 && said === en("3", "3", "3").replaceAll("3", "1")) continue
        if (i === 2 && !String(en).includes("=== \x27\x27")) continue
        if (seen.has(said)) continue
        seen.add(said)
        rows.push([screen, said, say(to, fill), "", "", "", area + "." + key + (i === 0 ? "" : i === 1 ? " (one)" : " (no name)")])
      }
    }
    console.log(rows.map((r) => r.map(cell).join(",")).join("\n"))
  ' "$lang" > "reads-editors-$lang.csv"
done
```

`automata words <folder>` already lists a game's unread words beside the game's own text. It is not used for the
sheets because it reads a game's folder, not the framework's own library or the editors' files. It was not run here
(the packages are not installed in this session).

## 3. How notes come back and become changes

1. **The reader** sends the filled file back to the Owner. The Owner gives the files to the coordinator. A reader's
   name, address or message is never committed: both repos are public, and the record says only "read by a native
   speaker" with the date.
2. **One session per repo applies them** (execution against a spec, since the sheets are the spec: Sonnet 5.5,
   medium). It changes a row only to the reader's own words, copied from the sheet. It writes no translation of its
   own: that would be a machine's words again. A line marked Odd or Wrong with nothing written goes back to the reader
   as a question.
3. **Lanes.** Editors: `src/features/words/` is lane 2, so a fresh session reviews the diff against the sheets, row for
   row. Framework: the library files are a copy change, lane 1; a changed row in `template/` is lane 2. Neither touches
   a golden: a word moves no hash and no replay. The editors and the test game see the framework's new words only when
   their pin moves, which is its own pull request, as always.
4. **What the existing tests already hold.** A changed row keeps its `{values}` and its parts
   (`translationProblems`; `tests/features/words/languages.test.ts`), says none of the banned words in its language
   (`tests/fixtures/banned.ts`), and in a game a touch button is at most 12 characters and a level's name at most 40.
   When a reader's words fail one of these, the reader is asked for another way to say it. The test is never loosened.
5. **The read is recorded where the code already keeps it.** Editors: `READ_BY_A_SPEAKER` in
   `src/features/words/languages.ts` lists the rows read, per language. Framework: the marks in
   `automata.translations.toml` (the library's and the template's), written by `markRead` and `writeReadMarks`, or
   for the template by `automata words template --read <language>`. Two tests say today that nothing is read
   (`languages.test.ts`, "expect(READ_BY_A_SPEAKER[lang]).toEqual([])"; `library.test.ts`, the marks file is exactly
   two lines). Both change with the first read, and the pull request body names them.
6. **The changed rows go back to the same reader** as a short second sheet (the same command, kept to the changed
   codes), so nobody's fix is itself unread.

### The check that a changed word still fits

Finding: **today no check measures a translated screen at every size.**

- Evidence, editors (`44d6b48`): `tests/journeys/screens.journey.test.ts` pictures and measures every scene at the five
  sizes in `SIZES` (nothing runs off the side, nothing is cut with an ellipsis, every button is big enough), and
  reaches every scene in English (`const w = (lang: Lang = 'en')`, line 75). Only the level's toolbar is measured in
  all nine languages, on a phone (`tests/journeys/settings-and-join.journey.test.ts`, line 283).
- Evidence, framework (`64d7f11`): `tests/features/flow/journey-sizes.browser.test.ts` opens every screen of the flow
  at the five sizes in `SCREENS`, in Spanish only (`deviceLanguages: ['es-MX']`).
- Expected: a changed row is measured on its screen, in its language, at every size, in the three browsers.
- Bounded fix, built by the session that applies the first notes, test first, not now: the editors' screens journey
  reaches its scenes in a named language (setting `af.me.language`, as the toolbar test does) and runs for each
  language that has a changed row; the framework's sizes test takes the device language the same way. It reuses the
  measuring both tests already do. Its CI time is measured on that pull request before it is kept for every run.

This is a test change in a lane 2 pull request, named in its body. It is new work, so it waits for the notes: it is
not part of finishing World unless the Owner says the slice closes only once the reads are done (open decision 3).

## 4. The Owner's alone: open decisions

None of these is decided here. Each has a recommendation.

1. **Who the five readers are.** One person per language who grew up speaking it and is not a programmer. Finding and
   asking them is the Owner's. Recommendation: people the Owner already knows, one per language; a second reader per
   language is not needed for 478 short rows.
2. **Whether anyone is paid, and how much.** Money is lane 3 and needs the Owner's yes by name, with the amount.
   Recommendation: ask as a favour first; where that fails, the Owner sets one cap per language before anyone is
   asked. The size to quote is about 2,500 English words, or two to three hours (an estimate).
3. **Whether the World slice closes with the reads planned, or only once they are done.** Recommendation: close with
   them planned. The reads wait on five people outside the project, the project is halted, and nothing hides the gap:
   `READ_BY_A_SPEAKER` stays empty, `automata check` notes the unread words, and the README already holds every
   translation to a read before Release 1.
4. **How much each reader is given.** (a) The framework's older 132 rows per language. Recommendation: yes, in the
   same sitting, since they are short, must be read before Release 1 anyway, and the reader is already there. That
   makes 610 rows. (b) French, Russian and German for the editors. Recommendation: a later round; it needs three more
   readers and Plan Q does not ask for it.
5. **Which commit is read.** Recommendation: `main` after the slice's last pull request that adds words (plan pull
   request 19), so each reader is asked once. Reading today's `main` means a second, smaller sheet later.

## 5. When the reads are done

For each of the five languages, all of these hold:

1. A filled sheet came back for every row in scope: no line has all three of Fine, Wrong and Odd empty.
2. Every line marked Wrong or Odd is changed to the reader's own words, or answered by the reader. None is open.
3. Every changed row was read again by the same reader and marked Fine.
4. The marks say so: `READ_BY_A_SPEAKER[<language>]` lists every editors row in scope, and `unreadWords` lists none of
   the framework rows in scope for that language.
5. The fit check above is green for every language with a changed row, at every size, in Chromium, WebKit and
   Firefox, on the full run.
6. The changes are merged to `main` in both repos and `main` is green there.
7. `progress.md` no longer lists the read as open, and `history.md` records the date, the commits read, the rows read
   and the rows changed per language, with no reader's name.

A note, not a criterion: the framework's marks are of the exact words read, so a later change makes a row unread
again by itself. The editors' list is by row name, so it does not: until a test holds it, whoever changes a read row
takes it off the list, and the reviewer checks that.

// The template's art: a hero and a crate, each a figure, painted by `automata art` (and by `create`) and never kept in this
// repository. The game's files say which picture is which; the pictures are judged the way a new game's check judges them.
import { expect, test } from 'vitest'
import { artFiles, artProblems } from '#src/features/content/content.ts'
import { loadTemplateGame } from './game.ts'
import { templateTree } from './tree.ts'

const tree = templateTree()

test('the hero and the crate each wear a figure, and each figure is painted into a picture and its atlas', async () => {
  const content = await loadTemplateGame()
  expect(content.characters.hero?.figure).toBe('hero')
  expect(content.characters.crate?.figure).toBe('crate')
  expect(artFiles(content).map((file) => file.path)).toEqual([
    'content/figures/hero.png',
    'content/figures/hero.atlas.json',
    'content/figures/crate.png',
    'content/figures/crate.atlas.json',
  ])
})

test('painted, the pictures pass the check; before they are, it says to run automata art', async () => {
  const content = await loadTemplateGame()
  const painted = new Map(artFiles(content).map((file) => [file.path, file.bytes]))
  expect(await artProblems(content, async (path) => painted.get(path))).toEqual([])
  const none = await artProblems(content, async () => undefined)
  expect(none.map((problem) => problem.message)).toContain(
    'This picture has not been painted. Run "automata art".',
  )
})

test('no picture is kept in the template, and the new game does not ignore its own', () => {
  expect(Object.keys(tree).filter((path) => /\.(png|atlas\.json)$/.test(path))).toEqual([])
  // Pictures are committed with the file that made them, so a game's `.gitignore` does not list them.
  expect(tree.gitignore).not.toMatch(/png|atlas/)
})

test('the agent notes say to run automata art after a figure, and to commit the pictures', () => {
  expect(tree['AGENTS.md']).toMatch(/automata art.*after you change a figure, and commit the\s+pictures/s)
  expect(JSON.parse(tree['package.template.json'] ?? '{}').scripts.art).toBe('automata art')
})

test('the agent notes say the words are in content/messages/, and not on the page', () => {
  const agents = tree['AGENTS.md'] ?? ''
  expect(agents).toMatch(/word[^\n]*\| `content\/messages\/` \|/)
  expect(agents).not.toMatch(/words on screen \| `src\/features\/page\/`/)
})

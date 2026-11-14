// What a character with a figure shows, in the sim: the clip its motion asks for, the pose of that clip, which way it faces.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand, Player } from '#src/features/commands/commands.ts'
import {
  createGameSim,
  joinCommand,
  Sprite,
  setClip,
  setFacing,
  usesSprites,
} from '#src/features/level/level.ts'
import { definePlugin, defineSystem, type Sim } from '#src/features/sim/sim.ts'
import { coopFiles } from '../../fixtures/game/co-op.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'
import { loadSpriteGame, spriteGameFiles } from '../../fixtures/game/sprite-game.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

async function make(
  content: Awaited<ReturnType<typeof loadSpriteGame>>,
  plugins = [heroPlugin],
  players = [1],
): Promise<Sim> {
  const sim = await createGameSim({ content, plugins, players })
  made.push(sim)
  return sim
}

const hero = (sim: Sim) => sim.query(Player).find((e) => e.get(Player).number === 1)
const sprite = (sim: Sim) => hero(sim)?.get(Sprite)
const idleFor = (sim: Sim, ticks: number): void => {
  for (let i = 0; i < ticks; i++) sim.step([])
}

/** A hero who has landed and settled, ready for the test to act. */
async function settled(plugins = [heroPlugin]): Promise<Sim> {
  const sim = await make(await loadSpriteGame(), plugins)
  idleFor(sim, 90)
  return sim
}

test('the M1 game has no sprite, and neither has a game whose only new thing is a tileset', async () => {
  const m1 = await loadFixtureGame()
  expect(usesSprites(m1)).toBe(false)
  const sim = await make(m1)
  sim.step([])
  // The component is not even in this sim, so its schema hash is the one it always was.
  expect(() => sim.query(Sprite)).toThrow()
})

test('a game with a figure, or a level with a view, uses sprites', async () => {
  expect(usesSprites(await loadSpriteGame())).toBe(true)
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] ?? '') as Record<string, unknown>
  const withView = await loadFixtureGame({
    'content/levels/level-1.json': JSON.stringify({ ...level, view: { w: 8, h: 9 } }),
  })
  expect(usesSprites(withView)).toBe(true)
})

test('every thing and hero of a game with figures has a sprite', async () => {
  const sim = await make(await loadSpriteGame())
  sim.step([])
  const sprites = sim.query(Sprite).map((e) => e.get(Sprite))
  expect(sprites).toHaveLength(2)
  const crate = sprites.find((s) => s.character === 'crate')
  expect(crate).toMatchObject({ player: 0, clip: '', pose: '', face: 1 })
  expect(sprites.find((s) => s.character === 'hero')).toMatchObject({
    player: 1,
    clip: 'idle',
    pose: 'idle',
    face: 1,
  })
})

test('running right is run, then left turns the hero round', async () => {
  const sim = await settled()
  sim.step([controlsCommand(sim.tick, 1, 0, ['right'])])
  idleFor(sim, 20)
  expect(sprite(sim)).toMatchObject({ clip: 'run', face: 1 })
  sim.step([controlsCommand(sim.tick, 1, 1, ['left'])])
  idleFor(sim, 20)
  expect(sprite(sim)).toMatchObject({ clip: 'run', face: -1 })
  sim.step([controlsCommand(sim.tick, 1, 2, [])])
  idleFor(sim, 40)
  expect(sprite(sim)).toMatchObject({ clip: 'idle', face: -1 })
})

test('a jump is jump, then fall, then land, then idle', async () => {
  const sim = await settled()
  const seen: string[] = []
  const watch = (): void => {
    const clip = sprite(sim)?.clip as string
    if (seen[seen.length - 1] !== clip) seen.push(clip)
  }
  sim.step([controlsCommand(sim.tick, 1, 0, ['jump'])])
  watch()
  sim.step([controlsCommand(sim.tick, 1, 1, [])])
  watch()
  for (let i = 0; i < 120; i++) {
    sim.step([])
    watch()
  }
  // The top of the jump is never taken for the ground: idle appears only once, at the end.
  expect(seen).toEqual(['idle', 'jump', 'fall', 'land', 'idle'])
})

test('a character with a figure and no clips keeps an empty pose and does not throw', async () => {
  const sim = await make(
    await loadSpriteGame({
      'content/characters/hero.json': JSON.stringify({
        ...(JSON.parse(spriteGameFiles()['content/characters/hero.json'] ?? '') as object),
        clips: undefined,
      }),
    }),
  )
  idleFor(sim, 30)
  expect(sprite(sim)).toMatchObject({ clip: '', pose: '' })
})

/** A plugin whose system asks for a clip, and for a facing, whenever the test says. */
function asking(): {
  plugin: ReturnType<typeof definePlugin>
  ask: { clip: string | undefined; face: 'left' | 'right' | undefined }
} {
  const ask: { clip: string | undefined; face: 'left' | 'right' | undefined } = {
    clip: undefined,
    face: undefined,
  }
  const system = defineSystem({
    name: 'test.asking',
    phase: 'gameplay',
    run(ctx) {
      for (const e of ctx.query(Player, Sprite)) {
        setClip(e, ask.clip)
        if (ask.face !== undefined) setFacing(e, ask.face)
      }
    },
  })
  return {
    plugin: definePlugin({ name: 'asking', dependsOn: ['level', 'sprites'], systems: [system] }),
    ask,
  }
}

test('setClip holds a clip until it is let go', async () => {
  const { plugin, ask } = asking()
  const sim = await settled([heroPlugin, plugin])
  ask.clip = 'push'
  idleFor(sim, 30)
  expect(sprite(sim)).toMatchObject({ clip: 'push', pose: 'push', by: 'push' })
  ask.clip = undefined
  idleFor(sim, 5)
  expect(sprite(sim)).toMatchObject({ clip: 'idle', by: '' })
})

test('setClip for a clip the character lacks plays the nearest it has', async () => {
  const { plugin, ask } = asking()
  const sim = await settled([heroPlugin, plugin])
  ask.clip = 'wave'
  idleFor(sim, 5)
  expect(sprite(sim)).toMatchObject({ clip: 'idle' })
})

test('setFacing turns a thing that is standing still', async () => {
  const { plugin, ask } = asking()
  const sim = await settled([heroPlugin, plugin])
  ask.face = 'left'
  idleFor(sim, 5)
  expect(sprite(sim)?.face).toBe(-1)
  ask.face = 'right'
  idleFor(sim, 5)
  expect(sprite(sim)?.face).toBe(1)
})

test('a hero who joins gets a sprite with their number', async () => {
  const files = spriteGameFiles()
  const content = await loadSpriteGame({
    'automata.toml': (files['automata.toml'] ?? '').replace(
      'hero = "hero"\n',
      'hero = "hero"\nplayers = 4\n',
    ),
    'content/levels/level-1.json': coopFiles['content/levels/level-1.json'],
  })
  const sim = await make(content)
  sim.step([joinCommand(0, 2, 0)])
  sim.step([])
  const joined = sim.query(Player).find((e) => e.get(Player).number === 2)
  expect(joined?.get(Sprite)).toMatchObject({ character: 'hero', player: 2 })
})

test('a snapshot restored mid-clip carries on from the same pose', async () => {
  const script = (tick: number) =>
    tick === 10
      ? [controlsCommand(tick, 1, 0, ['right'])]
      : tick === 40
        ? [controlsCommand(tick, 1, 1, ['jump', 'right'])]
        : []
  const whole = await make(await loadSpriteGame())
  for (let i = 0; i < 43; i++) whole.step(script(whole.tick))
  const first = await make(await loadSpriteGame())
  for (let i = 0; i < 33; i++) first.step(script(first.tick))
  const bytes = first.snapshot()
  const second = await make(await loadSpriteGame())
  second.restore(bytes)
  for (let i = 0; i < 10; i++) second.step(script(second.tick))
  expect(second.hash()).toBe(whole.hash())
  expect(sprite(second)).toEqual(sprite(whole))
})

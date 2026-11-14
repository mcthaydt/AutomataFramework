// What a character with a figure shows: which of its clips plays and which pose of that clip is on screen, worked
// out in the sim from how the character moves, so every player, every replay and every browser sees the same pose
// and a snapshot restored half way through a clip carries on from the same picture.
import type { GameContent } from '../content/content.ts'
import { Body } from '../physics/physics.ts'
import {
  type ComponentDef,
  defineComponent,
  definePlugin,
  defineSystem,
  type EntityRef,
  type PluginDef,
  type SystemDef,
} from '../sim/sim.ts'
import { motionClip, pickClip, poseAt, SIDEWAYS, STILL_TICKS, VERTICAL } from './clip.ts'

const spriteFields = {
  character: 'string',
  player: 'u32',
  clip: 'string',
  since: 'u32',
  pose: 'string',
  face: 'i32',
  by: 'string',
  still: 'u32',
} as const

/**
 * What the renderer needs to draw a character's figure: which character (so which figure), whose hero it is (0 for a
 * thing that is nobody's), the clip that is playing, the tick it began, the pose to show, which way it faces (1 right,
 * -1 left), the clip the game asked for in place of its motion (`''` for none) and how many ticks in a row it has
 * hardly moved up or down (it stops counting at 4). Drawn.
 */
export const Sprite: ComponentDef<typeof spriteFields> = defineComponent('sprite', spriteFields)

const spritesSystem: SystemDef = defineSystem({
  name: 'level.sprites',
  phase: 'cleanup',
  before: ['entities.flush'],
  run(ctx) {
    const content = ctx.content as GameContent
    for (const entity of ctx.query(Sprite, Body)) {
      const sprite = entity.get(Sprite)
      const { vx, vy } = entity.get(Body)
      const change: Partial<{ face: number; still: number; clip: string; since: number; pose: string }> = {}
      const face = vx > SIDEWAYS ? 1 : vx < -SIDEWAYS ? -1 : sprite.face
      if (face !== sprite.face) change.face = face
      const still = Math.abs(vy) <= VERTICAL ? Math.min(STILL_TICKS, sprite.still + 1) : 0
      if (still !== sprite.still) change.still = still
      const clips = content.characters[sprite.character]?.clips ?? []
      if (clips.length > 0) {
        const playing = clips.find((clip) => clip.id === sprite.clip)
        const landing = playing !== undefined && !poseAt(playing, ctx.tick - sprite.since).done
        const wanted = sprite.by !== '' ? sprite.by : motionClip(vx, vy, sprite.clip, still, landing)
        const picked = pickClip(clips, wanted)
        if (picked !== undefined) {
          const since = picked.id === sprite.clip ? sprite.since : ctx.tick
          if (picked.id !== sprite.clip) {
            change.clip = picked.id
            change.since = ctx.tick
          }
          const { pose } = poseAt(picked, ctx.tick - since)
          if (pose !== sprite.pose) change.pose = pose
        }
      }
      if (Object.keys(change).length > 0) entity.set(Sprite, change)
    }
  },
})

/** The plugin a game with figures gets: the system that picks each sprite's clip and pose. */
export const spritesPlugin: PluginDef = definePlugin({
  name: 'sprites',
  dependsOn: ['level'],
  components: [Sprite],
  systems: [spritesSystem],
})

/**
 * Plays `clip` on a character until it is let go with `undefined`, whatever its motion asks for. A game does this in
 * its own system, for a clip the motion can never ask for ("push", "talk"). A character without that clip plays the
 * nearest it has.
 */
export function setClip(entity: EntityRef, clip: string | undefined): void {
  entity.set(Sprite, { by: clip ?? '' })
}

/** Turns a character to face `face`. It turns by itself when it moves sideways, so this is for one standing still. */
export function setFacing(entity: EntityRef, face: 'left' | 'right'): void {
  entity.set(Sprite, { face: face === 'right' ? 1 : -1 })
}

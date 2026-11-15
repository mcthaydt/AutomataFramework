// The schema's limits, applied to a feel file that never went through `loadGame` (an editor's game in memory, a draft):
// it plays inside them instead of flooding a phone. A number that is not a real positive one leaves that effect out.
import type { Dust, FeelFile, Freeze, Shake } from '../content/content.ts'

/** No hold of the picture or the game runs past this many ticks (half a second at 60 Hz): the file's own limit. */
export const MAX_FREEZE_TICKS = 30
const MAX_DUST_COUNT = 64
const MAX_DUST_SPEED = 32
const MAX_DUST_LIFE = 120
const MAX_SHAKE_STRENGTH = 1
const MAX_SHAKE_TICKS = 60

/** True for a number a speck, a shake or a hold can use: finite and above zero. */
const usable = (n: number): boolean => Number.isFinite(n) && n > 0

function limitDust(dust: Dust | undefined): Dust | undefined {
  if (dust === undefined) return undefined
  const count = Math.floor(dust.count)
  if (!(usable(count) && usable(dust.speed) && usable(dust.life))) return undefined
  const limited = {
    count: Math.min(count, MAX_DUST_COUNT),
    speed: Math.min(dust.speed, MAX_DUST_SPEED),
    life: Math.min(dust.life, MAX_DUST_LIFE),
  }
  if (limited.count === dust.count && limited.speed === dust.speed && limited.life === dust.life) return dust
  return { ...dust, ...limited }
}

function limitShake(shake: Shake | undefined): Shake | undefined {
  if (shake === undefined) return undefined
  if (!(usable(shake.strength) && usable(shake.ticks))) return undefined
  const strength = Math.min(shake.strength, MAX_SHAKE_STRENGTH)
  const ticks = Math.min(shake.ticks, MAX_SHAKE_TICKS)
  return strength === shake.strength && ticks === shake.ticks ? shake : { strength, ticks }
}

function limitFreeze(freeze: Freeze | undefined): Freeze | undefined {
  if (freeze === undefined) return undefined
  if (!usable(freeze.ticks)) return undefined
  return freeze.ticks <= MAX_FREEZE_TICKS ? freeze : { ticks: MAX_FREEZE_TICKS }
}

/**
 * The file with every number inside the schema's limits: `count` at most 64, `speed` at most 32, `life` at most 120
 * ticks, `strength` at most 1, a shake at most 60 ticks and a freeze at most 30. An effect with a number that is not
 * finite (or not above zero) is left out and the others stay. A file already inside the limits comes back as it was.
 */
export function withinLimits(feel: FeelFile): FeelFile {
  const dust = limitDust(feel.dust)
  const shake = limitShake(feel.shake)
  const freeze = limitFreeze(feel.freeze)
  if (dust === feel.dust && shake === feel.shake && freeze === feel.freeze) return feel
  // The rest of the file (its buzz) is not feel's to change here.
  return { ...feel, dust, shake, freeze }
}

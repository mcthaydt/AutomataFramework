// Who holds which device. A seat is one player and the devices whose presses are theirs. Pure: the page's side
// (`input.ts`) feeds in who is playing, what each joiner brought and which pads are plugged in, and gets the seats.
/** One input device. `keyboard` is the whole keyboard; sharing splits it into `keyboard-1` and `keyboard-2`. */
export type Device =
  | 'keyboard'
  | 'keyboard-1'
  | 'keyboard-2'
  | 'touch'
  | 'pad-0'
  | 'pad-1'
  | 'pad-2'
  | 'pad-3'

/** What a joining player brings: the second half of the keyboard, or a gamepad. */
export type Claim = 'keyboard' | 'pad-0' | 'pad-1' | 'pad-2' | 'pad-3'

/** One player and what they hold. `connected` is false only when their gamepad has been unplugged. */
export interface Seat {
  readonly player: number
  readonly devices: readonly Device[]
  readonly connected: boolean
}

const padOf = (claim: Claim): number | undefined =>
  claim === 'keyboard' ? undefined : Number(claim.slice(4))

/**
 * One seat per player, lowest number first. `players`: who is in the game. `claims`: what each joining player
 * brought. `pads`: the indexes of the usable pads now. The lowest-numbered player is the first player: they hold
 * everything nobody else brought (touch, free pads, the keyboard), and their own claim, if any, is ignored. Anyone
 * else holds only their claim; with no claim, or with an unplugged pad, they hold nothing.
 */
export function seatsFor(
  players: readonly number[],
  claims: ReadonlyMap<number, Claim>,
  pads: readonly number[],
): Seat[] {
  const numbers = [...new Set(players)].sort((a, b) => a - b)
  const first = numbers[0]
  if (first === undefined) return []
  const others = numbers.slice(1)
  const claimOf = (player: number): Claim | undefined => claims.get(player)
  const sharing = others.some((player) => claimOf(player) === 'keyboard')
  const taken = new Set(others.map((player) => claimOf(player)))
  const free = [...pads].sort((a, b) => a - b).filter((index) => !taken.has(`pad-${index}` as Claim))
  return numbers.map((player): Seat => {
    if (player === first)
      return {
        player,
        devices: [
          sharing ? 'keyboard-1' : 'keyboard',
          'touch',
          ...free.map((index) => `pad-${index}` as Device),
        ],
        connected: true,
      }
    const claim = claimOf(player)
    if (claim === undefined) return { player, devices: [], connected: true }
    if (claim === 'keyboard') return { player, devices: ['keyboard-2'], connected: true }
    const plugged = pads.includes(padOf(claim) as number)
    return { player, devices: plugged ? [claim] : [], connected: plugged }
  })
}

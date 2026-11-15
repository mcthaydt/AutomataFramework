// The checks that look across a level's fields. They are here, and take the level's width and height, because a level
// that has its own tiles knows its size when its file is read, while a level that names a scene is only as big as the
// scene it names, which is found once the whole game is listed: the same sentences are said at either time.
import type { Level, LevelView } from './level.ts'
import { noSuch, repeats } from './shared.ts'

/** Says one problem at a place in the level, like `['things', 0, 'x']`. */
export type Add = (path: readonly PropertyKey[], message: string) => void

/** The view and the most the camera pulls back to must fit in the level, and `most` must not be less than the view. */
function checkView(view: LevelView, width: number, height: number, add: Add): void {
  const sides = [
    { key: 'w', size: width, word: 'wide' },
    { key: 'h', size: height, word: 'tall' },
  ] as const
  for (const { key, size, word } of sides) {
    const tooBig = `The level is ${size} tiles ${word}, so the view cannot be`
    const leave = `Make "${key}" ${size} or less, or leave "view" out to show the whole level.`
    if (size > 0 && view[key] > size) add(['view', key], `${tooBig} ${view[key]}. ${leave}`)
    const most = view.most?.[key]
    if (most === undefined) continue
    if (size > 0 && most > size) add(['view', 'most', key], `${tooBig} ${most}. ${leave}`)
    else if (most < view[key])
      add(
        ['view', 'most', key],
        `The camera cannot pull back to less than it shows. Make "${key}" ${view[key]} or more.`,
      )
  }
}

/** Which of a level's problems to say: all of them, the ones that need no size, or only the ones that need it. */
export type Part = 'all' | 'names' | 'places'

/**
 * Ids and player numbers used once, joints that join what they can, and everything inside a map `width` tiles wide and
 * `height` tall. Written to cope with a half-read file, since it may run beside other problems. `part` leaves out half
 * of the problems, for a level whose size is not known when its own file is read.
 */
export function checkLevelBody(
  level: Partial<Level>,
  width: number,
  height: number,
  add: Add,
  part: Part = 'all',
): void {
  const none: Add = () => undefined
  const name = part === 'places' ? none : add
  const place = part === 'names' ? none : add
  const outside = (path: readonly (string | number)[], at: { x: number; y: number }): void => {
    if (at.x < 0 || at.x > width)
      place([...path, 'x'], `${at.x} is outside the level, which is ${width} tiles wide.`)
    if (at.y < 0 || at.y > height)
      place([...path, 'y'], `${at.y} is outside the level, which is ${height} tiles tall.`)
  }

  if (level.view !== undefined && part !== 'names') checkView(level.view, width, height, add)

  const thingIds = new Set<string>()
  ;(level.things ?? []).forEach((t, i) => {
    if (thingIds.has(t.id)) name(['things', i, 'id'], `"${t.id}" is used twice. Each thing needs its own id.`)
    const hero = /^player-([1-4])$/.exec(t.id)
    if (hero)
      name(['things', i, 'id'], `"${t.id}" is the name of player ${hero[1]}'s hero. Give this thing another id.`)
    thingIds.add(t.id)
    outside(['things', i], t)
  })

  const players = new Set<number>()
  ;(level.starts ?? []).forEach((s, i) => {
    if (players.has(s.player))
      name(
        ['starts', i, 'player'],
        `Player ${s.player} already has a start point. Each player needs only one.`,
      )
    players.add(s.player)
    outside(['starts', i], s)
  })

  const joints = level.joints ?? []
  for (const repeat of repeats(joints, 'id', 'joint', ['joints'])) name(repeat.path, repeat.message)
  joints.forEach((joint, i) => {
    const at = (field: string, message: string): void => name(['joints', i, ...field.split('.')], message)
    for (const end of ['thing', 'holder'] as const) {
      const named = joint[end]
      if (named === undefined) continue
      if (/^player-[1-4]$/.test(named))
        at(end, 'A hero cannot be joined to anything. Join a thing from this level\'s "things".')
      else if (!thingIds.has(named)) at(end, noSuch('thing', named, [...thingIds], 'This level'))
    }
    if (joint.holder !== undefined && joint.holder === joint.thing)
      at('holder', 'A thing cannot be joined to itself. Leave "holder" out to join it to the level.')
    if (joint.kind === 'pin') {
      outside(['joints', i], joint)
      const turn = joint.turn
      if (turn !== undefined) {
        if (turn.min >= turn.max) at('turn.min', '"min" must be less than "max".')
        else if (turn.min > 0 || turn.max < 0)
          at('turn', 'The thing starts level, so "min" must be 0 or less and "max" 0 or more.')
      }
    } else {
      outside(['joints', i, 'from'], joint.from)
      outside(['joints', i, 'to'], joint.to)
      const gap = Math.hypot(joint.to.x - joint.from.x, joint.to.y - joint.from.y)
      if (gap < 0.01 && !(joint.slack !== undefined && joint.slack > 0))
        at('to', 'A rope needs some length. Move its two ends apart, or give it "slack".')
    }
  })
}

/** A path written the way a report takes it: `things[0].x`. */
export function pathText(path: readonly PropertyKey[]): string {
  return path
    .map((part, i) => (typeof part === 'number' ? `[${part}]` : `${i === 0 ? '' : '.'}${String(part)}`))
    .join('')
}

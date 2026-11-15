// A level's things held to their characters (plan W, task 2): every value a thing writes must be one its character
// declares, of the right kind and within the limits; every link must reach something real; a value that is `needed`
// must be there; and a character that a level may hold only once is held once. The sentences say what to fix.
import type { Character } from './character.ts'
import type { Level, LevelThing } from './level.ts'
import { outsideOf } from './outside.ts'
import { list, noSuch, WORDS_PATTERN } from './shared.ts'
import type { Listed, Report } from './type-info.ts'
import { onStep, type ValueDeclaration } from './values.ts'

type Declaration<T extends ValueDeclaration['type']> = Extract<ValueDeclaration, { type: T }>

/** Reports one problem at the value being checked, or at a part of it (`[0].x`). */
type Say = (message: string, part?: string) => void

/** Everything one value's check needs to know about the level and the thing it sits in. */
interface Where {
  readonly level: Level
  readonly game: Listed
  readonly thing: LevelThing
  readonly character: Character
  readonly width: number
  readonly height: number
}

/** `a crate`, `an exit`: the noun with its article. */
const article = (word: string): string => `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`

/** `1`, `0.5`: a number as a person writes it. */
const show = (n: number): string => String(n)

const isPlace = (value: unknown): value is { x: number; y: number } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { x?: unknown }).x === 'number' &&
  typeof (value as { y?: unknown }).y === 'number'

function checkNumber(declaration: Declaration<'number'>, given: unknown, say: Say): void {
  const { id, least, most, step } = declaration
  if (typeof given !== 'number' || !Number.isFinite(given))
    say(`"${id}" is a number, like ${show(declaration.default)}.`)
  else if (given < least || given > most)
    say(`"${id}" must be from ${show(least)} to ${show(most)}. Got ${show(given)}.`)
  else if (step !== undefined && !onStep(given, least, step))
    say(`"${id}" must be ${show(least)} plus a whole number of steps of ${show(step)}. Got ${show(given)}.`)
}

function checkChoice(declaration: Declaration<'choice'>, given: unknown, say: Say): void {
  const ids = declaration.from.map((option) => option.id)
  if (typeof given !== 'string') say(`"${declaration.id}" is one of: ${list(ids)}.`)
  else if (!ids.includes(given)) say(`"${declaration.id}" must be one of: ${list(ids)}. Got "${given}".`)
}

function checkWords(declaration: Declaration<'words'>, given: unknown, at: Where, say: Say): void {
  if (typeof given !== 'string' || given.length > 96 || !WORDS_PATTERN.test(given)) {
    say(`"${declaration.id}" is a message key, like "sign.welcome".`)
    return
  }
  const { source } = at.game
  if (source === undefined) {
    say(
      `This game lists no words, so "${declaration.id}" has nothing to name. List a messages file, or take this value out.`,
    )
    return
  }
  const words = at.game.get('messages', source)
  if (words !== undefined && !Object.hasOwn(words.messages, given))
    say(`The game's words have no "${given}". Add it to content/messages/${source}.json.`)
}

function checkThings(declaration: Declaration<'thing'>, given: unknown, at: Where, say: Say): void {
  const { id } = declaration
  const most = declaration.most ?? 1
  let linked: string[]
  if (most === 1) {
    if (typeof given !== 'string') {
      say(`"${id}" holds one thing, like "gate-1".`)
      return
    }
    linked = [given]
  } else {
    if (!Array.isArray(given) || !given.every((one) => typeof one === 'string')) {
      say(`"${id}" holds a list of things, like ["gate-1"].`)
      return
    }
    linked = given as string[]
    if (linked.length > most) say(`"${id}" holds at most ${most} things. This has ${linked.length}.`)
    else if (linked.length === 0 && declaration.needed === true)
      say(`"${id}" needs at least one thing, like ["gate-1"].`)
  }
  const ids = at.level.things.map((one) => one.id)
  const opensOthers = at.character.switch?.opens === id
  for (const target of linked) {
    const there = at.level.things.find((one) => one.id === target)
    if (there === undefined) {
      say(noSuch('thing', target, ids, 'This level'))
      continue
    }
    if (there.id === at.thing.id) {
      say('A thing cannot link to itself.')
      continue
    }
    const other = at.game.get('character', there.character)
    if (other === undefined) continue
    const { kinds } = declaration
    if (kinds !== undefined && (other.kind === undefined || !kinds.includes(other.kind))) {
      say(
        `"${target}" is ${article(other.kind ?? there.character)}, and "${id}" links only to: ${list(kinds)}.`,
      )
      continue
    }
    // A switch opens things: whatever it links to must be something a character says can be opened.
    if (opensOthers && other.opens === undefined)
      say(
        `"${target}" is ${article(other.kind ?? there.character)}, which cannot be opened. Give its character "opens": "walk-through", or link something else.`,
      )
  }
}

function checkPath(declaration: Declaration<'path'>, given: unknown, at: Where, say: Say): void {
  const { id } = declaration
  if (!Array.isArray(given) || !given.every(isPlace)) {
    say(`"${id}" is a list of places, like [{ "x": 4, "y": 7.5 }, { "x": 7, "y": 7.5 }].`)
    return
  }
  const least = declaration.least ?? 2
  const most = declaration.most ?? 64
  if (given.length < least || given.length > most)
    say(`"${id}" needs from ${least} to ${most} places. This has ${given.length}.`)
  given.forEach((place: { x: number; y: number }, j) => {
    for (const { axis, message } of outsideOf(place, at.width, at.height)) say(message, `[${j}].${axis}`)
  })
}

function checkWay(given: unknown, id: string, at: Where, say: Say): void {
  const way = given as { level?: unknown; thing?: unknown } | null
  if (
    typeof given !== 'object' ||
    given === null ||
    Array.isArray(given) ||
    typeof way?.level !== 'string' ||
    (way.thing !== undefined && typeof way.thing !== 'string')
  ) {
    say(`"${id}" is a way into a level, like { "level": "level-2", "thing": "door-in" }.`)
    return
  }
  if (!at.game.has('level', way.level)) {
    say(noSuch('level', way.level, at.game.ids('level')))
    return
  }
  const target = at.game.get('level', way.level)
  if (way.thing === undefined || target === undefined) return
  const things = target.things.map((one) => one.id)
  if (!things.includes(way.thing)) say(noSuch('thing', way.thing, things, `The level "${way.level}"`))
}

/** Holds one value a thing wrote to what its character declared for it. */
function checkValue(declaration: ValueDeclaration, given: unknown, at: Where, say: Say): void {
  switch (declaration.type) {
    case 'number':
      checkNumber(declaration, given, say)
      break
    case 'switch':
      if (typeof given !== 'boolean') say(`"${declaration.id}" is a yes or no: write true or false.`)
      break
    case 'choice':
      checkChoice(declaration, given, say)
      break
    case 'words':
      checkWords(declaration, given, at, say)
      break
    case 'thing':
      checkThings(declaration, given, at, say)
      break
    case 'path':
      checkPath(declaration, given, at, say)
      break
    case 'leads-to':
      checkWay(given, declaration.id, at, say)
      break
  }
}

/**
 * Holds every thing's `values` in a level to its character: no value the character does not declare, each of the
 * right kind and within its limits, every link to something real, every `needed` value written, and no second thing of
 * a character that a level may hold only once. A thing whose character did not read is skipped, as the loader's other
 * checks skip what they cannot see.
 */
export function checkThingValues(level: Level, game: Listed, report: Report): void {
  const width = level.tiles[0]?.length ?? 0
  const height = level.tiles.length
  const once = new Set<string>()
  level.things.forEach((thing, i) => {
    const character = game.get('character', thing.character)
    if (character === undefined) return
    if (character['one-per-level'] === true) {
      if (once.has(character.id))
        report(
          `things[${i}].character`,
          `This level already has ${/^[aeiou]/i.test(character.id) ? 'an' : 'a'} "${character.id}", and there can be only one. Move that one, or take this one out.`,
        )
      once.add(character.id)
    }
    const declared = character.values ?? []
    const at: Where = { level, game, thing, character, width, height }
    for (const [id, given] of Object.entries(thing.values ?? {})) {
      const declaration = declared.find((value) => value.id === id)
      const place = `things[${i}].values.${id}`
      if (declaration === undefined)
        report(
          place,
          `The character "${character.id}" has no value "${id}". It has: ${list(declared.map((value) => value.id))}.`,
        )
      else checkValue(declaration, given, at, (message, part = '') => report(`${place}${part}`, message))
    }
    for (const declaration of declared) {
      if (
        (declaration.type === 'thing' || declaration.type === 'leads-to') &&
        declaration.needed === true &&
        thing.values?.[declaration.id] === undefined
      )
        report(
          `things[${i}].values`,
          `Every "${character.id}" needs "${declaration.id}". Add it to this thing's "values".`,
        )
    }
  })
}

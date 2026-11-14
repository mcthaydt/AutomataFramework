// The locale feature's entry: which language a player gets, and the words in it. It sits right above `host` and runs
// in Node: only `web` touches the page.
export { LANGUAGE_NAMES, LANGUAGE_TAGS } from './names.ts'
export { matchLanguage, pickLanguage } from './pick.ts'

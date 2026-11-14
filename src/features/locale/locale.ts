// The locale feature's entry: which language a player gets, and the words in it. It sits right above `host` and runs
// in Node: only `web` touches the page.
export type { Message, Value, Values, Words } from '../../lib/message.ts'
export { createLocale, type Locale } from './create.ts'
export { fill } from './fill.ts'
export { fitLabel, levelName } from './labels.ts'
export { LANGUAGE_NAMES, LANGUAGE_TAGS } from './names.ts'
export { matchLanguage, pickLanguage } from './pick.ts'
export { LANGUAGE_SETTINGS_DEFAULT, type LanguageSettings, LanguageSettingsSchema } from './settings.ts'
export { frameworkWords, languagesOf, typed, wordsOf } from './words.ts'

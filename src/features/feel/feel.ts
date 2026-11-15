// The feel feature's entry: what a game feels like, as plain data for each drawn frame. It hears a step's events and
// never the sim, so it has nothing to change, and it reads no clock: its only time is the frame times it is handed.
export { type FeelSettings, FeelSettingsSchema, feelSettingsFirst, feelSettingsOf } from './settings.ts'

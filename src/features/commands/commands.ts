// The commands feature's entry: numbered players, the one command a player sends (what they are holding down), and
// replays. Everything a game or another feature may use of them is exported from here.
export {
  PAD_BUTTONS,
  PAD_STICKS,
  type PadInput,
  RESERVED_KEYS,
  RESERVED_PAD,
} from './pad-names.ts'
export { type Played, playReplay, type Verdict, verifyReplay } from './play.ts'
export {
  ACTION_NAME,
  ControlsCommand,
  commandsPlugin,
  controlsCommand,
  isHeld,
  MAX_ACTIONS,
  MAX_PLAYERS,
  Player,
  wasPressed,
} from './players.ts'
export { createRecorder, type Recorder } from './recorder.ts'
export {
  parseReplay,
  type Replay,
  type ReplayCheck,
  ReplayFormatError,
  ReplaySchema,
  writeReplay,
} from './replay.ts'

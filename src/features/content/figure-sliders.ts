// The sliders and face choices of a rigged person (plan R, Task 2), each with its range, its normal and one plain
// sentence. They are tables, not schema, so the schema, the editors' sliders and the painter's defaults read one list:
// a slider is added here and shows up everywhere. A slider left out of a file is at its normal.

/** One number a rigged figure's file may set. */
export interface Slider {
  readonly id: string
  readonly min: number
  readonly max: number
  /** The value when the file leaves it out. */
  readonly normal: number
  /** One plain sentence: what it changes, and what each end looks like. */
  readonly about: string
  /** How the editors fold the sliders: `body`, `shape`, `head`, `ends`, `stance`, `age`, `style` or `face`. */
  readonly group: string
}

/** A little past either end, for figures meant to look wrong. */
const PAST_ENDS = { min: -0.2, max: 1.2 } as const

const slider = (id: string, group: string, normal: number, about: string): Slider => ({
  id,
  group,
  normal,
  about,
  ...PAST_ENDS,
})

/** The sliders of a person, in the order a file writes them. Every one but `height` and `headTilt` runs -0.2 to 1.2. */
export const PERSON_SLIDERS: readonly Slider[] = [
  {
    id: 'height',
    group: 'body',
    min: 8,
    max: 120,
    normal: 24,
    about: 'How tall it stands, in pixels, from the ground to the top of its head.',
  },
  slider('build', 'body', 0.5, 'How big its frame is, from slight to broad.'),
  slider('legs', 'body', 0.5, 'How long the legs are, from short to long.'),
  slider('arms', 'shape', 0.5, 'How long the arms are, from short to long.'),
  slider('shoulders', 'shape', 0.5, 'How wide the shoulders are, from narrow to wide.'),
  slider('hips', 'shape', 0.5, 'How wide the hips are, from narrow to wide.'),
  slider('fat', 'shape', 0.4, 'How soft and round it is, from lean to round.'),
  slider('muscle', 'shape', 0.5, 'How thick its arms and legs are, from thin to strong.'),
  slider('head', 'head', 0.6, 'How big the head is, from small to big.'),
  slider('neck', 'head', 0.5, 'How thick the neck is, from thin to thick.'),
  slider('neckLength', 'head', 0.4, 'How long the neck is, from none to long.'),
  slider('hands', 'ends', 0.5, 'How big the hands are, from small to big.'),
  slider('feet', 'ends', 0.5, 'How big the feet are, from small to big.'),
  slider('posture', 'stance', 0.5, 'How it carries itself, from slouched to proud.'),
  slider('hunch', 'stance', 0, 'How far the shoulders round forward, from square to hunched.'),
  {
    id: 'headTilt',
    group: 'stance',
    min: -30,
    max: 30,
    normal: 0,
    about: 'How far the head leans to one side, in degrees.',
  },
  slider(
    'age',
    'age',
    0.3,
    'How old it looks, from young to old: an older figure stoops and steps shorter.',
  ),
  slider('chunk', 'style', 1, 'How blocky it is, from life-like to chunky pixel art.'),
]

const face = (id: string, normal: number, about: string): Slider => ({
  id,
  group: 'face',
  min: 0,
  max: 1,
  normal,
  about,
})

/** The face's numbers, 0 to 1, in the order a file writes them. */
export const FACE_SLIDERS: readonly Slider[] = [
  face('eyeSize', 0.5, 'How big the eyes are, from small to big.'),
  face('eyeSpacing', 0.5, 'How far apart the eyes are, from close to wide.'),
  face('eyeTilt', 0.5, 'How the eyes slant, from drooping at the outer corners to rising.'),
  face('browWeight', 0.5, 'How thick the brows are, from thin to heavy.'),
  face('nose', 0.3, 'How big the nose is, from none to big.'),
  face('cheeks', 0.3, 'How full the cheeks are, from hollow to round.'),
  face('jaw', 0.5, 'How wide the jaw is, from narrow to square.'),
]

/**
 * The face's styles. They are a list in code, not content files: a face is a handful of pixels, and a style is only how
 * the painter places them. The first of each list is not special; `FACE_NORMAL` says which one a file that leaves it
 * out gets.
 */
export const FACE_STYLES: {
  readonly eyes: readonly string[]
  readonly brows: readonly string[]
  readonly mouth: readonly string[]
} = {
  eyes: ['dots', 'ovals', 'wide', 'sleepy', 'closed'],
  brows: ['none', 'soft', 'straight', 'heavy', 'arched'],
  mouth: ['none', 'line', 'smile', 'frown', 'open'],
}

/** The style each one is when a file leaves it out. */
export const FACE_NORMAL: { readonly eyes: string; readonly brows: string; readonly mouth: string } = {
  eyes: 'dots',
  brows: 'soft',
  mouth: 'line',
}

/** One plain sentence for each choice of style. */
export const FACE_ABOUT: { readonly eyes: string; readonly brows: string; readonly mouth: string } = {
  eyes: 'How the eyes are drawn: dots, ovals, wide, sleepy or closed. Left out means dots.',
  brows: 'How the brows are drawn: none, soft, straight, heavy or arched. Left out means soft.',
  mouth: 'How the mouth is drawn: none, line, smile, frown or open. Left out means line.',
}

/** The keys of a file's `face`, in the order it writes them: each style beside the numbers it goes with. */
export const FACE_KEYS: readonly string[] = [
  'eyes',
  'eyeSize',
  'eyeSpacing',
  'eyeTilt',
  'brows',
  'browWeight',
  'mouth',
  'nose',
  'cheeks',
  'jaw',
]

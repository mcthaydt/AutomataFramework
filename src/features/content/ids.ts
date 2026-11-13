import { z } from 'zod'

/** The shape of every id in a content file: lower-case words joined by dashes, starting with a letter. */
const ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

/**
 * The id of a level, a character or a thing. It is also a file name and a key, so it stays short and plain. The
 * message is written for the person who gets it wrong, not for the regex.
 */
export const Id: z.ZodString = z
  .string()
  .max(64)
  .regex(ID_PATTERN, 'Use lower-case words joined by dashes, like "level-1".')

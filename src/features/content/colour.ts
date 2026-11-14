import { z } from 'zod'

/**
 * A colour in a content file: `#` and six digits. `what` says what the colour is for, and `example` is shown in the
 * message a person reads when they get it wrong, so the example can be a colour that makes sense there. `otherwise`
 * says what a field that may be left out means when it is.
 */
export const colour = (what: string, example: string, otherwise = ''): z.ZodString =>
  z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, `Write a colour as # and six digits, like ${example}.`)
    .describe(`${what}, as # and six digits, like ${example}.${otherwise === '' ? '' : ` ${otherwise}`}`)

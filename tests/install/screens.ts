// The screens' kit, typechecked against the packed package's declarations like `consumer.ts`: a game's own screen is
// a Svelte part that takes the same props, so the props must read the same from the tarball alone. It is never run.
// (`startFlow` joins the list when the flow lands.)
import { Button, type ButtonProps, UI_PROPERTIES } from '@automataframework/framework'
import type { Component } from 'svelte'

// A part is a Svelte component typed by its props, and the props are the plain interface the package exports.
export const press: Component<ButtonProps> = Button
export const props: readonly string[] = UI_PROPERTIES

// A prop the button does not have, and a label that is not words, are both refused.
// @ts-expect-error `colour` is not a prop of a button.
export const wrong: ButtonProps = { label: 'Play', onpress: () => {}, colour: 'red' }
// @ts-expect-error `label` is not optional.
export const unnamed: ButtonProps = { onpress: () => {} }

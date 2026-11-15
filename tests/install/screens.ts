// The screens' kit, typechecked against the packed package's declarations like `consumer.ts`: a game's own screen is
// a Svelte part that takes the same props, so the props must read the same from the tarball alone. It is never run. The
// flow's options are the same: a game's own screen is a function that gives back something that can be taken off.
import {
  Button,
  type ButtonProps,
  type FlowOptions,
  type Screen,
  startFlow,
  UI_PROPERTIES,
} from '@automataframework/framework'
import type { Component } from 'svelte'

// A part is a Svelte component typed by its props, and the props are the plain interface the package exports.
export const press: Component<ButtonProps> = Button
export const props: readonly string[] = UI_PROPERTIES

// A prop the button does not have, and a label that is not words, are both refused.
// @ts-expect-error `colour` is not a prop of a button.
export const wrong: ButtonProps = { label: 'Play', onpress: () => {}, colour: 'red' }
// @ts-expect-error `label` is not optional.
export const unnamed: ButtonProps = { onpress: () => {} }

// A game starts the whole visit with its files and its rules, and may replace a screen with one of its own.
export const start: typeof startFlow = startFlow
const own: Screen = { destroy: () => {} }
export const options: Pick<FlowOptions, 'screens'> = { screens: { menu: () => own } }
// @ts-expect-error a screen that cannot be taken off would stay on the page.
export const stuck: Pick<FlowOptions, 'screens'> = { screens: { menu: () => ({}) } }

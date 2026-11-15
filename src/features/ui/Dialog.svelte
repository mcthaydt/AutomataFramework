<script lang="ts">
  // A question over the screen that has to be answered. It holds the focus while it is open, `no` has it when saying
  // yes loses something, and Escape and the gamepad's right button both say no.
  import { onMount } from 'svelte'
  import Button from './Button.svelte'
  import type { DialogProps } from './props.ts'

  let { title, text, yes, no, danger = false, onyes, onno }: DialogProps = $props()

  const id = $props.id()
  let dialog: HTMLDivElement | undefined = $state()

  const buttons = (): HTMLButtonElement[] => [...(dialog?.querySelectorAll('button') ?? [])]

  onMount(() => {
    // The buttons are `yes` then `no`: the one to land on is the safe one when yes loses something.
    buttons()[danger ? 1 : 0]?.focus()
  })

  function keydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      onno()
      return
    }
    if (event.key !== 'Tab') return
    const items = buttons()
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    const edge = event.shiftKey ? at <= 0 : at === items.length - 1 || at === -1
    if (!edge) return
    // Past either end of the two buttons the focus wraps; it never reaches what is under the dialog.
    event.preventDefault()
    items[event.shiftKey ? items.length - 1 : 0]?.focus()
  }
</script>

<svelte:window onkeydown={keydown} />

<div class="scrim">
  <div
    bind:this={dialog}
    class="dialog"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="{id}-title"
    aria-describedby={text === undefined ? undefined : `${id}-text`}
  >
    <h2 id="{id}-title">{title}</h2>
    {#if text !== undefined}<p id="{id}-text">{text}</p>{/if}
    <div class="buttons">
      <Button label={yes} kind={danger ? 'danger' : 'primary'} onpress={onyes} />
      <Button label={no} onpress={onno} />
    </div>
  </div>
</div>

<style>
  .scrim {
    /* Over the screen it is in (a frame is the positioned box), not over the page. */
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
      max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
    box-sizing: border-box;
    background: var(--automata-ui-scrim, rgba(0, 0, 0, 0.6));
  }
  .dialog {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: min(100%, 420px);
    max-height: 100%;
    padding: 20px;
    box-sizing: border-box;
    overflow: hidden;
    border: var(--automata-ui-border, 2px solid currentColor);
    border-radius: var(--automata-ui-radius, 12px);
    background: var(--automata-ui-background, canvas);
    color: var(--automata-ui-color, canvastext);
    font: var(--automata-ui-font, 600 18px/1.3 system-ui, sans-serif);
  }
  h2,
  p {
    margin: 0;
  }
  h2 {
    font-size: 24px;
  }
  .buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  @media (min-width: 600px) {
    .buttons {
      flex-direction: row;
      justify-content: flex-end;
    }
  }
</style>

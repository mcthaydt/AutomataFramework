<script lang="ts">
  // One line of the controls screen: what a key does, the key it has now, and a button to change it. While it waits for
  // the new key, the line says so and the button turns into the way out.
  import Button from './Button.svelte'
  import type { KeyRowProps } from './props.ts'

  let { action, input, change, waiting, cancel, onchange, oncancel }: KeyRowProps = $props()

  const asking = $derived(waiting !== undefined)
</script>

<div class="row" data-waiting={asking ? '' : undefined}>
  <span class="action">{action}</span>
  <span class="input" aria-live="polite">{waiting ?? input}</span>
  {#if asking}
    <Button label={cancel ?? change} onpress={() => (oncancel ?? onchange)()} />
  {:else}
    <Button label={change} onpress={() => onchange()} />
  {/if}
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    font: var(--automata-ui-font, 600 18px/1.2 system-ui, sans-serif);
  }
  .action {
    flex: 1;
    min-width: 0;
  }
  .input {
    flex: none;
    padding: 4px 12px;
    border: var(--automata-ui-border, 2px solid currentColor);
    border-radius: var(--automata-ui-radius, 12px);
  }
  .row[data-waiting] .input {
    border-style: dashed;
  }
</style>

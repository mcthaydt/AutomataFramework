<script lang="ts">
  // "Well done!", the sentence that says what was finished, and the buttons at the bottom where a thumb is. A sentence
  // about progress that was not kept is shown beside them and never in their way.
  import { Button, ScreenFrame } from '../ui/ui.ts'
  import type { DoneProps } from './done.ts'

  let { title, line, notKept, buttons }: DoneProps = $props()
</script>

<ScreenFrame {title}>
  <p class="line">{line}</p>
  {#if notKept !== undefined}<p class="note" role="status">{notKept}</p>{/if}
  {#snippet actions()}
    {#each buttons as button (button.label)}
      <Button label={button.label} kind={button.kind} onpress={button.onpress} />
    {/each}
  {/snippet}
</ScreenFrame>

<style>
  p {
    margin: 0;
    font-size: 20px;
    line-height: 1.4;
  }
  .note {
    font-size: 18px;
    opacity: 0.85;
  }
</style>

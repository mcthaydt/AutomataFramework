<script lang="ts">
  // "You lost.", the score when there is one, and the buttons at the bottom where a thumb is: Try again first, and focused.
  // A sentence about the best score not being kept is shown beside them and never in their way.
  import { Button, ScreenFrame } from '../ui/ui.ts'
  import type { LostProps } from './lost.ts'

  let { title, lines, notKept, buttons }: LostProps = $props()
</script>

<ScreenFrame {title}>
  {#each lines as line (line)}<p class="line">{line}</p>{/each}
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

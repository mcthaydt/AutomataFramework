<script lang="ts">
  // A game that stopped. The player's two sentences first, then the developer's lines as they were written, in the one
  // region that may scroll; the button is at the bottom, and is only the reload picture when there is no language.
  import { Button, List, ScreenFrame } from '../ui/ui.ts'
  import type { ProblemProps } from './problem.ts'

  let { title, text, lines, fix, reload, pictureOnly, onreload }: ProblemProps = $props()
</script>

<ScreenFrame {...title === undefined ? {} : { title }}>
  <List label={title ?? reload}>
    <div role="alert">
      {#if text !== undefined}<p class="text">{text}</p>{/if}
      {#each lines as line, at (at)}
        <p class="developer">{line}</p>
      {/each}
      {#if fix !== undefined}<p class="developer fix">{fix}</p>{/if}
    </div>
  </List>
  {#snippet actions()}
    {#if pictureOnly}
      <Button label={reload} kind="primary" icon="reload" iconOnly onpress={onreload} />
    {:else}
      <Button label={reload} kind="primary" onpress={onreload} />
    {/if}
  {/snippet}
</ScreenFrame>

<style>
  div {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  p {
    margin: 0;
    font-size: 20px;
    line-height: 1.4;
  }
  .developer {
    font: 14px/1.4 ui-monospace, monospace;
    overflow-wrap: anywhere;
  }
  .fix {
    font-weight: 700;
  }
</style>

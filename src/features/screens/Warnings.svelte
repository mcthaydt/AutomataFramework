<script lang="ts">
  // What a player reads before they play: a title, the sentences in the one region that scrolls, and OK at the bottom,
  // where a thumb is, with the focus already on it.
  import { Button, List, ScreenFrame } from '../ui/ui.ts'
  import type { WarningsProps } from './warnings.ts'

  let { title, lines, ok, onok }: WarningsProps = $props()
</script>

<ScreenFrame {title}>
  <List label={title}>
    {#each lines as line, at (at)}
      <p>{line}</p>
    {/each}
  </List>
  {#snippet actions()}
    <Button label={ok} kind="primary" onpress={onok} />
  {/snippet}
</ScreenFrame>

<style>
  p {
    margin: 0;
    font-size: 20px;
    line-height: 1.4;
  }
</style>

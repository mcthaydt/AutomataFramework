<script lang="ts">
  // "Add a player": who is in, the one or two sentences that say how to join, and Done. A sentence is never cut off: the
  // list is the one place that may scroll.
  import { Button, List, ScreenFrame } from '../ui/ui.ts'
  import type { PlayersProps } from './players.ts'

  let { title, lines, hints, refused, done, ondone }: PlayersProps = $props()
</script>

<ScreenFrame {title}>
  <List label={title}>
    {#each lines as line, at (at)}
      <p class="in">{line}</p>
    {/each}
    {#each hints as hint, at (at)}
      <p>{hint}</p>
    {/each}
    {#if refused !== undefined}<p class="refused" role="alert">{refused}</p>{/if}
  </List>
  {#snippet actions()}
    <Button label={done} kind="primary" onpress={ondone} />
  {/snippet}
</ScreenFrame>

<style>
  p {
    margin: 0;
    font-size: 20px;
    line-height: 1.4;
  }
  .in {
    font-weight: 700;
  }
  .refused {
    padding-top: 4px;
  }
</style>

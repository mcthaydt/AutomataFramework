<script lang="ts">
  // "How to play": the goal, then the rows in the one list that may scroll, and Back, the one thing to press.
  import { Button, List, ScreenFrame } from '../ui/ui.ts'
  import type { HowProps } from './how.ts'

  let { title, goal, rows, back, onback }: HowProps = $props()
</script>

<ScreenFrame {title}>
  <List label={title}>
    {#if goal !== undefined}<p class="goal">{goal}</p>{/if}
    <dl>
      {#each rows as row, at (at)}
        <div class="row">
          <dt>{row.move}</dt>
          <dd>{row.how}</dd>
        </div>
      {/each}
    </dl>
  </List>
  {#snippet actions()}
    <Button label={back} kind="primary" onpress={onback} />
  {/snippet}
</ScreenFrame>

<style>
  .goal {
    margin: 0 0 12px;
    font-size: 20px;
    line-height: 1.4;
  }
  dl {
    margin: 0;
  }
  .row {
    display: grid;
    gap: 2px;
    padding: 8px 0;
  }
  dt {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.3;
  }
  dd {
    margin: 0;
    font-size: 20px;
    line-height: 1.3;
  }
</style>

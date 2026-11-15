<script lang="ts">
  // The saved games: each place with what it holds and its buttons, in the one list that may scroll. A place that cannot
  // be opened says why in its own words and has only Delete. The question before a loss is the kit's dialog.
  import { Button, Dialog, List, ScreenFrame } from '../ui/ui.ts'
  import type { SavesProps } from './saves.ts'

  let { title, back, refused, places, asking }: SavesProps = $props()
</script>

<ScreenFrame {title} {back}>
  <List label={title}>
    {#if refused !== undefined}<p class="refused" role="alert">{refused}</p>{/if}
    {#each places as place (place.slot)}
      <section aria-label={place.name}>
        <div class="says">
          <h2>{place.name}</h2>
          <p>{place.says}</p>
        </div>
        <div class="buttons">
          {#each place.buttons as button (button.id)}
            <Button label={button.label} kind={button.kind} onpress={button.onpress} />
          {/each}
        </div>
      </section>
    {/each}
  </List>
</ScreenFrame>
{#if asking !== undefined}
  <Dialog title={asking.title} yes={asking.yes} no={asking.no} danger onyes={asking.onyes} onno={asking.onno} />
{/if}

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: var(--automata-ui-border, 2px solid currentColor);
    border-radius: var(--automata-ui-radius, 12px);
  }
  .says {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  h2 {
    margin: 0;
    font-size: 20px;
    line-height: 1.2;
  }
  p {
    margin: 0;
    font-size: 18px;
    line-height: 1.3;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .refused {
    padding: 4px 0;
  }
</style>

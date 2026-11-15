<script lang="ts">
  // The pause screen: "Paused" over the game as it stood, and the buttons in the one list that may scroll, "Keep playing"
  // first and focused. The question before leaving is the kit's dialog over all of it.
  import { Button, Dialog, List, ScreenFrame, Toggle } from '../ui/ui.ts'
  import type { PauseProps } from './pause.ts'

  let { title, goal, buttons, sound, asking }: PauseProps = $props()

  /** Where the switch starts; only read once, here. */
  function start(): boolean {
    return sound?.on ?? true
  }
  /** Where the switch stands while it is touched: drawing the screen again would let go of the finger. */
  let on = $state(start())
</script>

<ScreenFrame {title} scrim>
  {#if goal !== undefined}<p class="goal">{goal}</p>{/if}
  <List label={title}>
    {#each buttons as button, at (button.id)}
      <Button
        label={button.label}
        kind={at === 0 ? 'primary' : 'plain'}
        {...button.icon === undefined ? {} : { icon: button.icon }}
        onpress={button.onpress}
      />
    {/each}
    {#if sound !== undefined}
      <Toggle
        label={sound.label}
        {on}
        onchange={(now) => {
          on = now
          sound.onchange(now)
        }}
      />
    {/if}
  </List>
</ScreenFrame>
{#if asking !== undefined}
  <Dialog title={asking.title} yes={asking.yes} no={asking.no} danger onyes={asking.onyes} onno={asking.onno} />
{/if}

<style>
  .goal {
    margin: 0 0 12px;
    font-size: 20px;
    line-height: 1.4;
  }
</style>

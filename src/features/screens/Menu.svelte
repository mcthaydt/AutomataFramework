<script lang="ts">
  // The main menu. On a screen that is narrow or tall the name is at the top and the buttons are one column at the
  // bottom, where a thumb is (never more than the lower two thirds); on a wide short one, a phone on its side, the name
  // is on the left and the buttons are a column on the right. Nothing scrolls: six buttons fit even there.
  import { onMount } from 'svelte'
  import { Button } from '../ui/ui.ts'
  import type { MenuProps } from './menu.ts'

  let { name, src, buttons, players, onpick }: MenuProps = $props()
  let menu: HTMLDivElement | undefined = $state()

  // The focus starts on the first button, the one to press, unless the screen already put it somewhere.
  onMount(() => {
    if (menu === undefined || menu.contains(document.activeElement)) return
    menu.querySelector<HTMLElement>('button:enabled')?.focus({ preventScroll: true })
  })
</script>

<div bind:this={menu} class="menu">
  <div class="inner">
    <div class="title">
      {#if src !== undefined}
        <img {src} alt={name} />
      {:else}
        <h1>{name}</h1>
      {/if}
      {#each players as line, at (at)}
        <p>{line}</p>
      {/each}
    </div>
    <div class="buttons">
      {#each buttons as button, at (button.item)}
        <Button
          label={button.label}
          kind={at === 0 ? 'primary' : 'plain'}
          {...button.icon === undefined ? {} : { icon: button.icon }}
          onpress={() => onpick(button.item)}
        />
      {/each}
    </div>
  </div>
</div>

<style>
  .menu {
    /* The box the layout is measured against: this screen, not the window. */
    container-type: size;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    background: var(--automata-ui-background, canvas);
    color: var(--automata-ui-color, canvastext);
    font: var(--automata-ui-font, 600 18px/1.3 system-ui, sans-serif);
  }
  .inner {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
      max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  }
  .title {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
  }
  h1 {
    margin: 0;
    max-width: 100%;
    font-size: clamp(32px, 14cqmin, 96px);
    line-height: 1.1;
    overflow-wrap: anywhere;
  }
  img {
    max-width: 60cqmin;
    max-height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }
  p {
    margin: 0;
  }
  .buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: min(100%, 360px);
    align-self: center;
    /* Never taller than the lower two thirds; the title takes the rest. */
    max-height: 66cqh;
  }
  /* A wide short screen, a phone on its side: the name on the left, the buttons on the right. */
  @container (min-width: 600px) and (max-height: 479px) {
    .inner {
      flex-direction: row;
      align-items: center;
      gap: 32px;
    }
    .title {
      align-self: stretch;
    }
    .buttons {
      flex: 0 0 min(45%, 320px);
      width: auto;
      gap: 8px;
      max-height: 100%;
    }
  }
</style>

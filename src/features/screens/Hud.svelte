<script lang="ts">
  // The pause button in the top corner away from the jumping thumb, 48 px, inside the notch; a number over each hero when
  // more than one plays; and, while the game plays itself, one line at the bottom with a tap anywhere taking over. The
  // screen around these lets every touch through, so a touch on the game is the game's.
  import type { HeroBox } from '../render/render.ts'
  import { Button } from '../ui/ui.ts'
  import type { HudProps } from './hud.ts'

  let { pause, side, onpause, watching, register }: HudProps = $props()

  let boxes: readonly HeroBox[] = $state([])
  // The screen's owner says where the heroes are, now and after each frame; asked for once, here.
  function listen(): void {
    register((next) => {
      boxes = next
    })
  }
  listen()

  let taken = false
  function take(): void {
    if (taken) return
    taken = true
    watching?.ontake()
  }
</script>

{#if watching === undefined}
  <div class="pause" data-side={side}>
    <Button label={pause} icon="pause" iconOnly kind="primary" onpress={onpause} />
  </div>
  {#each boxes as box (box.player)}
    <span class="number" aria-hidden="true" style:left="{box.x + box.w / 2}px" style:top="{box.y}px">{box.player}</span>
  {/each}
{:else}
  <button type="button" class="take" onclick={take} onpointerdown={take}><span>{watching.line}</span></button>
{/if}

<style>
  .pause {
    position: absolute;
    top: calc(12px + env(safe-area-inset-top));
    pointer-events: auto;
  }
  .pause[data-side='left'] {
    left: calc(12px + env(safe-area-inset-left));
  }
  .pause[data-side='right'] {
    right: calc(12px + env(safe-area-inset-right));
  }
  .number {
    position: absolute;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    transform: translate(-50%, -100%);
    border-radius: 50%;
    background: var(--automata-ui-accent, currentColor);
    color: var(--automata-ui-accent-color, canvas);
    font: var(--automata-ui-font, 600 16px/1 system-ui, sans-serif);
    font-size: 16px;
    pointer-events: none;
  }
  /* While the game plays itself the whole screen is one button, so a tap anywhere takes over. */
  .take {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    box-sizing: border-box;
    padding: 0 16px max(16px, env(safe-area-inset-bottom));
    border: 0;
    background: transparent;
    color: var(--automata-ui-color, inherit);
    font: var(--automata-ui-font, 600 18px/1.3 system-ui, sans-serif);
    text-align: center;
    pointer-events: auto;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .take span {
    padding: 12px 16px;
    border-radius: var(--automata-ui-radius, 12px);
    background: var(--automata-ui-background, canvas);
  }
  .take:focus-visible {
    outline: 3px solid var(--automata-ui-accent, currentColor);
    outline-offset: -3px;
  }
</style>

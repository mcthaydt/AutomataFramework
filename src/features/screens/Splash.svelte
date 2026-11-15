<script lang="ts">
  // The game's picture, or else its name in big letters, in the middle of the screen. The picture is drawn with crisp
  // pixels and is never larger than 60% of the screen's shorter side; the name wraps rather than runs off the screen.
  import type { SplashProps } from './splash.ts'

  let { name, src }: SplashProps = $props()
</script>

<div class="splash">
  {#if src !== undefined}
    <img {src} alt={name} />
  {:else}
    <h1>{name}</h1>
  {/if}
</div>

<style>
  .splash {
    /* The box the picture and the name are measured against: this screen, not the window. */
    container-type: size;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
      max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
    background: var(--automata-ui-background, canvas);
    color: var(--automata-ui-color, canvastext);
    font: var(--automata-ui-font, 600 18px/1.2 system-ui, sans-serif);
  }
  img {
    width: 60cqmin;
    height: 60cqmin;
    object-fit: contain;
    image-rendering: pixelated;
  }
  h1 {
    margin: 0;
    max-width: 100%;
    font-size: clamp(32px, 14cqmin, 120px);
    line-height: 1.1;
    text-align: center;
    overflow-wrap: anywhere;
  }
</style>

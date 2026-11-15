<script lang="ts">
  // The shape every screen has: a title, a body and the buttons, kept inside the notch and the home bar, filling the box
  // it is in. It measures itself (never the window, since a game may sit in a frame on a page) and lays the buttons out
  // by what it finds: a column on a narrow screen, a row at the bottom of a wide short one. Nothing in it scrolls but a
  // `List`.
  import { onMount } from 'svelte'
  import Button from './Button.svelte'
  import type { FrameProps } from './props.ts'
  import { sizeOf } from './size.ts'

  let { title, scrim = false, back, children, actions }: FrameProps = $props()

  let frame: HTMLDivElement | undefined = $state()
  let size = $state(sizeOf(0, 0))

  onMount(() => {
    if (frame === undefined) return
    const measure = (): void => {
      if (frame !== undefined) size = sizeOf(frame.clientWidth, frame.clientHeight)
    }
    measure()
    const watcher = new ResizeObserver(measure)
    watcher.observe(frame)
    // The box changes with the window when it fills it (a phone turned), and a window that has changed says so at once.
    window.addEventListener('resize', measure)
    // The focus starts on the one thing to press, or else the first control, unless the screen already put it somewhere.
    if (!frame.contains(document.activeElement)) {
      const first =
        frame.querySelector<HTMLElement>('button[data-kind="primary"]:enabled') ??
        frame.querySelector<HTMLElement>('button:enabled, [role="slider"]')
      first?.focus({ preventScroll: true })
    }
    return () => {
      watcher.disconnect()
      window.removeEventListener('resize', measure)
    }
  })
</script>

<div
  bind:this={frame}
  class="frame"
  data-scrim={scrim ? '' : undefined}
  data-width={size.width}
  data-height={size.height}
>
  {#if back !== undefined}
    <div class="top"><Button label={back.label} icon="back" onpress={back.onpress} /></div>
  {/if}
  {#if title !== undefined}<h1>{title}</h1>{/if}
  <div class="body">{@render children()}</div>
  {#if actions !== undefined}<div class="actions">{@render actions()}</div>{/if}
</div>

<style>
  .frame {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
    padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
      max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
    background: var(--automata-ui-background, canvas);
    color: var(--automata-ui-color, canvastext);
    font: var(--automata-ui-font, 600 18px/1.3 system-ui, sans-serif);
  }
  .frame[data-scrim] {
    background: var(--automata-ui-scrim, rgb(0 0 0 / 0.65));
  }
  .top {
    display: flex;
    justify-content: flex-start;
  }
  .top :global(button) {
    min-height: 48px;
  }
  h1 {
    margin: 0;
    font-size: 28px;
    line-height: 1.2;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    min-height: 0;
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .frame[data-width='wide'][data-height='tall'] .actions {
    align-self: center;
    width: min(100%, 360px);
  }
  .frame[data-height='short'][data-width='wide'] .actions {
    flex-direction: row;
    justify-content: flex-end;
  }
</style>

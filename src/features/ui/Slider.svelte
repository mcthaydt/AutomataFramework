<script lang="ts">
  // A slider from 0 to 1. Dragged anywhere on its track by a finger or a pointer; left and right (keys, the D-pad, the
  // stick) move it one `step`, Home and End go to the ends. It is told its value and says what it would become, so the
  // screen keeps the number. Up and down are not the slider's: they walk the screen.
  import { onDestroy } from 'svelte'
  import type { SliderProps } from './props.ts'

  let { label, value, step = 0.05, onchange, onrelease }: SliderProps = $props()

  /** The thumb is as wide as a finger. */
  const THUMB = 44

  let track: HTMLDivElement | undefined = $state()
  // The value as last said, so a release tells what was said and not what the screen has caught up to. It starts as the
  // value the slider was given, read in a function so that it is plain that it is read once.
  let latest = valueNow()
  function valueNow(): number {
    return value
  }

  const shown = $derived(Math.min(1, Math.max(0, value)))
  const percent = $derived(Math.round(shown * 100))

  /** The nearest step to `wanted`, between 0 and 1, free of the noise of floating point. */
  function snap(wanted: number): number {
    const clamped = Math.min(1, Math.max(0, wanted))
    return Math.round(Math.round(clamped / step) * step * 1e6) / 1e6
  }

  function move(wanted: number): void {
    const next = snap(wanted)
    if (next === latest) return
    latest = next
    onchange(next)
  }

  /** Where along the track a pointer is, as 0 to 1. */
  function along(clientX: number): number {
    const box = track?.getBoundingClientRect()
    if (box === undefined || box.width <= THUMB) return latest
    return (clientX - box.left - THUMB / 2) / (box.width - THUMB)
  }

  // A drag is followed on the window, so it goes on when the finger leaves the track and ends wherever it is let go.
  function drag(event: PointerEvent): void {
    move(along(event.clientX))
  }

  function up(): void {
    window.removeEventListener('pointermove', drag)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    onrelease?.(latest)
  }

  function down(event: PointerEvent): void {
    ;(event.currentTarget as HTMLElement).focus()
    latest = value
    move(along(event.clientX))
    window.addEventListener('pointermove', drag)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  onDestroy(() => {
    window.removeEventListener('pointermove', drag)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
  })

  const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageDown', 'PageUp'])

  function keydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || !KEYS.has(event.key)) return
    event.preventDefault()
    latest = value
    if (event.key === 'ArrowLeft') move(latest - step)
    else if (event.key === 'ArrowRight') move(latest + step)
    else if (event.key === 'PageDown') move(latest - step * 10)
    else if (event.key === 'PageUp') move(latest + step * 10)
    else move(event.key === 'Home' ? 0 : 1)
  }

  function keyup(event: KeyboardEvent): void {
    if (KEYS.has(event.key)) onrelease?.(latest)
  }
</script>

<div class="slider">
  <span class="label">{label}</span>
  <div
    bind:this={track}
    class="track"
    role="slider"
    tabindex="0"
    aria-label={label}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={percent}
    aria-valuetext="{percent}%"
    onpointerdown={down}
    onkeydown={keydown}
    onkeyup={keyup}
  >
    <div class="rail"></div>
    <div class="fill" style:width="calc({shown} * (100% - {THUMB}px) + {THUMB / 2}px)"></div>
    <div class="thumb" style:left="calc({shown} * (100% - {THUMB}px))"></div>
  </div>
</div>

<style>
  .slider {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }
  .label {
    font: var(--automata-ui-font, 600 18px/1.2 system-ui, sans-serif);
  }
  .track {
    position: relative;
    min-width: 200px;
    height: 44px;
    /* A drag along the track is the slider's, never the page's. */
    touch-action: none;
    cursor: pointer;
    border-radius: var(--automata-ui-radius, 12px);
  }
  .track:focus-visible {
    outline: 3px solid var(--automata-ui-accent, currentColor);
    outline-offset: 3px;
  }
  .rail,
  .fill {
    position: absolute;
    top: 50%;
    left: 0;
    height: 8px;
    margin-top: -4px;
    border-radius: 4px;
  }
  .rail {
    right: 0;
    background: currentColor;
    opacity: 0.25;
  }
  .fill {
    background: var(--automata-ui-accent, currentColor);
  }
  .thumb {
    position: absolute;
    top: 0;
    width: 44px;
    height: 44px;
    box-sizing: border-box;
    border: var(--automata-ui-border, 2px solid currentColor);
    border-radius: 50%;
    background: var(--automata-ui-accent, currentColor);
  }
</style>

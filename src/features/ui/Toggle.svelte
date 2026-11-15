<script lang="ts">
  // An on-off switch. The whole row is the target, so a thumb never has to find the little knob.
  import type { ToggleProps } from './props.ts'

  let { label, on, onchange }: ToggleProps = $props()
</script>

<button type="button" class="toggle" role="switch" aria-checked={on} onclick={() => onchange(!on)}>
  <span class="text">{label}</span>
  <span class="knob" aria-hidden="true"><span class="dot"></span></span>
</button>

<style>
  .toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    min-height: 48px;
    padding: 0 4px;
    box-sizing: border-box;
    border: 0;
    background: transparent;
    color: var(--automata-ui-color, inherit);
    font: var(--automata-ui-font, 600 18px/1.2 system-ui, sans-serif);
    text-align: start;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .toggle:focus-visible {
    outline: 3px solid var(--automata-ui-accent, currentColor);
    outline-offset: 3px;
    border-radius: var(--automata-ui-radius, 12px);
  }
  .knob {
    display: inline-flex;
    flex: none;
    align-items: center;
    width: 56px;
    height: 32px;
    padding: 3px;
    box-sizing: border-box;
    border: var(--automata-ui-border, 2px solid currentColor);
    border-radius: 16px;
    transition: background-color 120ms ease;
  }
  .dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: currentColor;
    transition: transform 120ms ease;
  }
  .toggle[aria-checked='true'] .knob {
    background: var(--automata-ui-accent, currentColor);
    border-color: var(--automata-ui-accent, currentColor);
  }
  .toggle[aria-checked='true'] .dot {
    transform: translateX(24px);
    background: var(--automata-ui-accent-color, canvas);
  }
  @media (prefers-reduced-motion: reduce) {
    .knob,
    .dot {
      transition: none;
    }
  }
</style>

<script lang="ts">
  // A button. The browser turns a tap, Enter and Space into one click each, and a disabled button gets none. The look is
  // the game's own: every colour is a custom property with a plain fallback.
  import Icon from './Icon.svelte'
  import type { ButtonProps } from './props.ts'

  let { label, kind = 'plain', icon, iconOnly = false, disabled = false, onpress }: ButtonProps = $props()
</script>

<button
  type="button"
  class="button"
  data-kind={kind}
  data-icon-only={iconOnly ? '' : undefined}
  aria-label={iconOnly ? label : undefined}
  {disabled}
  onclick={() => onpress()}
>
  {#if icon !== undefined}<Icon name={icon} />{/if}
  {#if !iconOnly}<span>{label}</span>{/if}
</button>

<style>
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 44px;
    min-height: 44px;
    padding: 0 16px;
    box-sizing: border-box;
    border: var(--automata-ui-border, 2px solid currentColor);
    border-radius: var(--automata-ui-radius, 12px);
    background: transparent;
    color: var(--automata-ui-color, inherit);
    font: var(--automata-ui-font, 600 18px/1.2 system-ui, sans-serif);
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background-color 120ms ease;
  }
  .button[data-kind='primary'] {
    min-width: 48px;
    min-height: 48px;
    border-color: var(--automata-ui-accent, currentColor);
    background: var(--automata-ui-accent, currentColor);
    color: var(--automata-ui-accent-color, canvas);
  }
  .button[data-kind='danger'] {
    border-style: dashed;
  }
  .button[data-icon-only] {
    padding: 0;
  }
  .button:focus-visible {
    outline: 3px solid var(--automata-ui-accent, currentColor);
    outline-offset: 3px;
  }
  .button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  @media (prefers-reduced-motion: reduce) {
    .button {
      transition: none;
    }
  }
</style>

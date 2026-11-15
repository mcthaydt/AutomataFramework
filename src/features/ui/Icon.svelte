<script lang="ts">
  // One of the kit's seven drawings, in the colour of the text around it. The drawing is hidden from a screen reader: the
  // control it sits in has the name.
  import back from './library/back.svg?raw'
  import check from './library/check.svg?raw'
  import gear from './library/gear.svg?raw'
  import pause from './library/pause.svg?raw'
  import play from './library/play.svg?raw'
  import plus from './library/plus.svg?raw'
  import reload from './library/reload.svg?raw'
  import type { IconName } from './props.ts'

  const drawings: Record<IconName, string> = { pause, play, back, gear, plus, check, reload }

  let { name }: { readonly name: IconName } = $props()
</script>

<span class="icon" aria-hidden="true">{@html drawings[name]}</span>

<style>
  .icon {
    display: inline-flex;
    width: 24px;
    height: 24px;
    flex: none;
  }
  .icon :global(svg) {
    width: 100%;
    height: 100%;
  }
</style>

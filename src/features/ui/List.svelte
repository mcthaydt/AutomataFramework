<script lang="ts">
  // The one region of a screen that may scroll: everything else stays where it is. It takes the room the rest leaves.
  import type { ListProps } from './props.ts'

  let { label, children }: ListProps = $props()
</script>

<div class="list" role="region" aria-label={label}>
  {@render children()}
</div>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
</style>

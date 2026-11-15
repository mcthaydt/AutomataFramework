<script lang="ts">
  // A screen made of every part of the kit, for the browser tests: a slider and a switch that keep their own value, a
  // list long enough to scroll, a key row, a back button and two buttons, and a dialog that opens from one of them.
  // Everything that happens is told to `log`, in the words "what:value".
  import { Button, Dialog, KeyRow, List, ScreenFrame, Slider, Toggle } from '#src/features/ui/ui.ts'

  let { log, long = true }: { log: (what: string) => void; long?: boolean } = $props()

  let volume = $state(0.5)
  let shake = $state(false)
  let asking = $state(false)
  let waiting = $state(false)
</script>

<ScreenFrame title="Settings" back={{ label: 'Back', onpress: () => log('back') }}>
  <Slider
    label="Volume"
    value={volume}
    onchange={(next) => {
      volume = next
      log(`change:${next}`)
    }}
    onrelease={(next) => log(`release:${next}`)}
  />
  <Toggle
    label="Shake"
    on={shake}
    onchange={(next) => {
      shake = next
      log(`shake:${next}`)
    }}
  />
  <List label="Keys">
    <KeyRow
      action="Jump"
      input="Space"
      change="Change"
      {...waiting ? { waiting: 'Press a key' } : {}}
      cancel="Cancel"
      onchange={() => {
        waiting = true
        log('key')
      }}
      oncancel={() => {
        waiting = false
        log('cancel')
      }}
    />
    {#if long}
      {#each Array.from({ length: 24 }, (_, i) => i) as n (n)}
        <KeyRow action="Action {n}" input="Key {n}" change="Change" onchange={() => log(`row:${n}`)} />
      {/each}
    {/if}
  </List>
  {#snippet actions()}
    <Button label="Play" kind="primary" onpress={() => log('play')} />
    <Button label="Erase" kind="danger" onpress={() => (asking = true)} />
  {/snippet}
  {#if asking}
    <Dialog
      title="Erase it?"
      text="It cannot come back."
      yes="Erase"
      no="Keep"
      danger
      onyes={() => {
        asking = false
        log('yes')
      }}
      onno={() => {
        asking = false
        log('no')
      }}
    />
  {/if}
</ScreenFrame>

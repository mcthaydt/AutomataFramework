<script lang="ts">
  // The settings: one list, in the order that suits the device (touch first on a phone, the keyboard first at a desk),
  // with Back at the top. Sliders and switches keep their own number while they are touched: drawing the whole screen
  // again in the middle of a drag would let go of the finger.
  import type { Language } from '../content/content.ts'
  import { Button, Dialog, KeyRow, List, ScreenFrame, Slider, Toggle } from '../ui/ui.ts'
  import { languageFlag } from '../web/web.ts'
  import type { RowView, SettingsProps } from './settings.ts'

  let { title, back, notices, order, language, sound, touch, controls, erase, asking }: SettingsProps = $props()

  /** Where the sliders and switches start; only read once, here. */
  function start(): { on: boolean; music: number; effects: number; swap: boolean; vibration: boolean } {
    return {
      on: sound?.toggle.on ?? true,
      music: sound?.music.value ?? 0,
      effects: sound?.effects.value ?? 0,
      swap: touch.swap.on,
      vibration: touch.vibration?.on ?? false,
    }
  }
  let now = $state(start())

  /** Puts a language's flag in its button. The drawing is the framework's own and says nothing: the button has the name. */
  function flag(node: HTMLElement, one: Language): { destroy(): void } {
    node.append(languageFlag(one))
    return { destroy: () => node.replaceChildren() }
  }
</script>

{#snippet keyRow(row: RowView)}
  <div class="key">
    <KeyRow
      action={row.action}
      input={row.input}
      change={row.change}
      cancel={row.cancel}
      {...row.waiting === undefined ? {} : { waiting: row.waiting }}
      onchange={row.onchange}
      oncancel={row.oncancel}
    />
    {#if row.error !== undefined}<p class="error" role="alert">{row.error}</p>{/if}
  </div>
{/snippet}

<ScreenFrame {title} {back}>
  <List label={title}>
    {#each notices as notice, at (at)}
      <p class="notice" role="status">{notice}</p>
    {/each}
    {#each order as part (part)}
      {#if part === 'language'}
        <section>
          <h2>{language.title}</h2>
          <div class="flags" role="group" aria-label={language.title}>
            {#each language.choices as choice (choice.language)}
              <button
                type="button"
                class="flag"
                lang={choice.tag}
                aria-label={choice.name}
                aria-pressed={choice.chosen}
                onclick={() => language.onchoose(choice.language)}
                use:flag={choice.language}
              ></button>
            {/each}
          </div>
        </section>
      {:else if part === 'sound' && sound !== undefined}
        <section>
          <h2>{sound.title}</h2>
          <Toggle
            label={sound.toggle.label}
            on={now.on}
            onchange={(on) => {
              now.on = on
              sound.toggle.onchange(on)
            }}
          />
          <Slider
            label={sound.music.label}
            value={now.music}
            onchange={(value) => {
              now.music = value
              sound.music.onchange(value)
            }}
            onrelease={sound.music.onrelease}
          />
          <Slider
            label={sound.effects.label}
            value={now.effects}
            onchange={(value) => {
              now.effects = value
              sound.effects.onchange(value)
            }}
            onrelease={sound.effects.onrelease}
          />
          {#if sound.note !== undefined}<p class="note">{sound.note}</p>{/if}
        </section>
      {:else if part === 'touch'}
        <section>
          <h2>{touch.title}</h2>
          <Toggle
            label={touch.swap.label}
            on={now.swap}
            onchange={(on) => {
              now.swap = on
              touch.swap.onchange(on)
            }}
          />
          {#if touch.vibration !== undefined}
            <Toggle
              label={touch.vibration.label}
              on={now.vibration}
              onchange={(on) => {
                now.vibration = on
                touch.vibration?.onchange(on)
              }}
            />
          {/if}
        </section>
      {:else if part === 'controls'}
        <section>
          <h2>{controls.title}</h2>
          {#if controls.gamepad.length > 0}
            <h3>{controls.gamepadTitle}</h3>
            {#each controls.gamepad as row (row.id)}
              {@render keyRow(row)}
            {/each}
          {/if}
          <h3>{controls.keyboardTitle}</h3>
          {#each controls.keyboard as row (row.id)}
            {@render keyRow(row)}
          {/each}
          <Button label={controls.reset.label} onpress={controls.reset.onpress} />
        </section>
      {/if}
    {/each}
    {#if erase !== undefined}
      <section>
        <Button label={erase.label} onpress={erase.onpress} />
      </section>
    {/if}
  </List>
</ScreenFrame>
{#if asking !== undefined}
  <Dialog title={asking.title} yes={asking.yes} no={asking.no} danger onyes={asking.onyes} onno={asking.onno} />
{/if}

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 12px;
  }
  h2 {
    margin: 0;
    font-size: 22px;
    line-height: 1.2;
  }
  h3 {
    margin: 4px 0 0;
    font-size: 18px;
    line-height: 1.2;
    opacity: 0.8;
  }
  .flags {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .flag {
    width: 72px;
    height: 56px;
    padding: 0;
    margin: 0;
    border: 0;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--automata-ui-radius, 12px);
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .flag[aria-pressed='true'] {
    outline: 4px solid var(--automata-ui-accent, currentColor);
    outline-offset: 2px;
  }
  .flag:focus-visible {
    outline: 3px solid var(--automata-ui-accent, currentColor);
    outline-offset: 3px;
  }
  .key {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  p {
    margin: 0;
    font-size: 18px;
    line-height: 1.4;
  }
  .error {
    font-size: 16px;
  }
  .note,
  .notice {
    opacity: 0.85;
  }
</style>

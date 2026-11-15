// Svelte 5 for the kit and the screens. Runes are on for every part, and a part's styles travel inside its script, so
// the one package carries no stylesheet for a game to import. No preprocessor: Svelte reads the type syntax of
// `<script lang="ts">` itself, and these scripts use no TypeScript-only feature that emits code (such as `enum`).
export default {
  compilerOptions: { runes: true, css: 'injected' },
}

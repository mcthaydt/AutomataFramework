// The default game flow: the steps a visit walks (warnings if needed, the language picker, the splash, the main menu,
// the game with its pause, and back to the menu), the progress it keeps and who is playing. `startFlow` puts them on a
// page. It owns no rule: `advance` decides what comes next, the screens draw, and this file only connects them.
import { pageFrames } from '../../lib/frames.ts'
import { createAudio, type GameAudio, type Speaker } from '../audio/audio.ts'
import { formatDiagnostic, type GameContent, loadGame, nextLevel, paintedPath } from '../content/content.ts'
import { type Game, startGame, type Watch } from '../game/game.ts'
import { createLocale, type Locale, levelName, type Words } from '../locale/locale.ts'
import { createSaves, type Saves, type StoreResult } from '../saves/saves.ts'
import {
  defaultScreens,
  hud,
  type MenuItem,
  menuItems,
  type PauseItem,
  type Screen,
  type ScreenBase,
  type ScreenMakers,
  warningsFor,
} from '../screens/screens.ts'
import { followLanguage, languagePicker, webHost, webSpeaker } from '../web/web.ts'
import { endsLevel, putLoadingMark, startWatching, waitForTake } from './loading.ts'
import { createOvers } from './overs.ts'
import { createParty, type Party } from './party.ts'
import { createPlaces, type Places } from './places.ts'
import { defaultSave, type FlowSave, newest, type Progress } from './progress.ts'
import { openSections, type Sections, wireSound } from './sections.ts'
import { advance, FLOW_START, type FlowEvent, type FlowFacts, type FlowState } from './steps.ts'
import type { Flow, FlowOptions } from './types.ts'

export * from './events.ts'
export * from './party.ts'
export * from './progress.ts'
export * from './steps.ts'
export type { Flow, FlowOptions } from './types.ts'

/** What a developer is told to do about a game's files: English, since there are no words to say it in yet. */
const FIX = 'Fix the file named above, then load this page again.'

/**
 * Loads the game and walks the flow in `mount`. Never rejects: whatever goes wrong is a screen of words. It answers at
 * once, with the page showing "loading"; `state()` and `onState` say where the visit is.
 */
export async function startFlow<S extends Progress = Progress>(options: FlowOptions<S>): Promise<Flow<S>> {
  const { mount, read } = options
  const host = options.host ?? webHost()
  const frames = options.frames ?? pageFrames
  const makers: ScreenMakers = { ...defaultScreens, ...options.screens }
  const save = (options.save ?? defaultSave(options.game)) as unknown as FlowSave<S>
  const reload = options.reload ?? ((): void => location.reload())

  let state: FlowState = FLOW_START
  let stopped = false
  // Changes with each step shown, so an answer that comes late for a step already left is dropped.
  let epoch = 0
  const listeners = new Set<(state: FlowState) => void>()

  // What loading gave.
  let content: GameContent | undefined
  let locale: Locale | undefined
  let sections: Sections | undefined
  let audio: GameAudio | undefined
  let madeSpeaker: Speaker | undefined
  let saves: Saves<S> | undefined
  let party: Party | undefined
  let saving: StoreResult<void> = { ok: true, value: undefined }
  let splashPicture: Blob | undefined
  // The level the main menu's first action opens: the newest saved game's, or `undefined` when there is none.
  let firstLevel: string | undefined
  let problem: { readonly lines: readonly string[]; readonly fix?: string } = { lines: [] }
  let stopFollowing = (): void => {}
  let stopSound = (): void => {}

  // What is on the page.
  let loadingMark: HTMLElement | undefined
  let shown: Screen | undefined
  let overlay: ReturnType<typeof hud> | undefined
  let overlayFrame: number | undefined
  let game: Game | undefined
  let watcher: Watch | undefined
  let letGoOfGame = (): void => {}
  let letGoOfWatch = (): void => {}
  const mountPosition = getComputedStyle(mount).position === 'static' ? '' : undefined

  const words: Words = (key, values) => (locale === undefined ? key : locale.words(key, values))
  // The saved games, and the one being played.
  const places = createPlaces<S>({
    saves: () => saves,
    save,
    project: () => (content as GameContent).project,
    words,
  })

  const base = (): ScreenBase => ({
    mount,
    // A screen is only made once the game's files have loaded and there is a locale.
    locale: locale as Locale,
    frames,
    ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
    onSound: (event) => audio?.raise(event),
  })

  const facts = (): FlowFacts => {
    const project = content?.project
    if (project === undefined || locale === undefined)
      return { warnings: false, readable: false, asked: false, first: '', next: undefined }
    const noSaving = !saving.ok && saving.refusal === 'unavailable'
    return {
      warnings: (project.warnings?.length ?? 0) > 0 || noSaving,
      readable: locale.language() !== undefined || locale.suggested() !== undefined,
      asked: locale.asked(),
      first: firstLevel ?? project.start,
      next: state.level === undefined ? undefined : nextLevel(project, state.level),
    }
  }

  // The screens on top of the menu and of pause.
  const overs = createOvers({
    makers,
    base,
    host,
    frames,
    controls: options.controls,
    gamepads: options.gamepads,
    locale: () => locale as Locale,
    sections: () => sections as Sections,
    content: () => content as GameContent,
    audio: () => audio,
    game: () => game,
    party: () => party as Party,
    places: places as unknown as Places<Progress>,
    play: (level) => dispatch({ type: 'play', level }),
    fail: (error) => fail(error),
    back: () => dispatch({ type: 'back' }),
  })

  const dropOverlay = (): void => {
    if (overlayFrame !== undefined) frames.cancel(overlayFrame)
    overlayFrame = undefined
    overlay?.destroy()
    overlay = undefined
  }
  const dropScreen = (): void => {
    shown?.destroy()
    shown = undefined
  }
  const stopGame = (): void => {
    letGoOfGame()
    letGoOfGame = (): void => {}
    dropOverlay()
    game?.stop()
    game = undefined
  }
  const stopWatching = (): void => {
    letGoOfWatch()
    letGoOfWatch = (): void => {}
    dropOverlay()
    watcher?.stop()
    watcher = undefined
  }
  const dropLoading = (): void => {
    loadingMark?.remove()
    loadingMark = undefined
  }

  const fail = (error: unknown, lines?: readonly string[]): void => {
    if (stopped) return
    problem = { lines: lines ?? [error instanceof Error ? error.message : String(error)] }
    dispatch({ type: 'broke' })
  }

  function dispatch(event: FlowEvent): void {
    if (stopped) return
    const before = state
    const next = advance(before, event, facts())
    if (next === before) return
    state = next
    mount.dataset.state = next.step
    if (next.over === undefined) mount.removeAttribute('data-over')
    else mount.dataset.over = next.over
    epoch++
    present(before, next, epoch).catch(fail)
    for (const listener of [...listeners]) listener(next)
  }

  /** The hero's pause button and numbers, drawn again after each frame. */
  function putOverlay(): void {
    if (game === undefined || locale === undefined) return
    const running = game
    overlay = hud({
      ...base(),
      jumpSide: () => (running.input.swapSides() ? 'left' : 'right'),
      onPause: () => dispatch({ type: 'pause' }),
      heroes: () => running.heroes(),
    })
    const draw = (): void => {
      overlay?.draw()
      overlayFrame = frames.request(draw)
    }
    overlayFrame = frames.request(draw)
  }

  /** What the player pressed on the main menu. */
  async function pick(item: MenuItem, mine: number): Promise<void> {
    if (item === 'quit') {
      await host.quit()
      return
    }
    if (item === 'settings' || item === 'saves' || item === 'add-player') {
      dispatch({ type: 'open', over: item === 'add-player' ? 'players' : item })
      return
    }
    if (item !== 'play' && item !== 'new' && item !== 'continue') return
    // With every place taken, the player says which one a new game is written over.
    if (item !== 'continue' && places.full()) {
      dispatch({ type: 'open', over: 'saves' })
      return
    }
    const project = (content as GameContent).project
    let level = project.start
    if (item === 'continue') level = await places.openNewest()
    else await places.begin()
    if (!stopped && epoch === mine) dispatch({ type: 'play', level })
  }

  /** Puts the step `next` on the page, taking what the step `before` had off it. */
  async function present(before: FlowState, next: FlowState, mine: number): Promise<void> {
    const current = (): boolean => !stopped && epoch === mine
    const project = content?.project
    dropLoading()
    overs.close()
    if (next.step === 'problem') {
      dropScreen()
      stopWatching()
      stopGame()
      audio?.stop()
      const spoken = locale?.language() === undefined ? undefined : locale
      shown = makers.problem({
        mount,
        frames,
        ...(spoken === undefined ? {} : { locale: spoken }),
        ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
        lines: problem.lines,
        ...(problem.fix === undefined ? {} : { fix: problem.fix }),
        onReload: reload,
      })
      return
    }
    if (project === undefined || locale === undefined) return
    // A screen on top of the menu or of pause takes its place; the one under it is drawn again when it closes.
    if (next.over !== undefined) {
      dropScreen()
      overs.open(next.over)
      return
    }

    switch (next.step) {
      case 'watching': {
        // The recording is already playing; the page tells the player how to take over.
        const take = (): void => takeOver()
        letGoOfWatch = waitForTake({
          frames,
          take,
          ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
        })
        overlay = hud({
          ...base(),
          jumpSide: () => 'right',
          onPause: () => {},
          watching: { onTake: take },
        })
        return
      }
      case 'warnings': {
        dropScreen()
        // Before the player has chosen, the warnings are in the language of the device, when the game has it.
        const language = locale.language() ?? locale.suggested()
        const said =
          locale.language() === undefined && language !== undefined ? locale.wordsIn(language) : words
        shown = makers.warnings({
          ...base(),
          words: said,
          ...(language === undefined ? {} : { language }),
          lines: warningsFor({ project, saving, words: said }),
          onOk: () => dispatch({ type: 'warned' }),
        })
        return
      }
      case 'picking': {
        dropScreen()
        const picker = languagePicker({
          mount,
          locale,
          frames,
          ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
        })
        shown = { destroy: () => picker.destroy() }
        picker.done.then(
          () => dispatch({ type: 'picked' }),
          (error: unknown) => fail(error),
        )
        return
      }
      case 'splash': {
        dropScreen()
        shown = makers.splash({
          ...base(),
          name: project.name,
          ...(splashPicture === undefined ? {} : { picture: splashPicture }),
          onDone: () => dispatch({ type: 'splash-over' }),
        })
        return
      }
      case 'menu': {
        stopGame()
        dropScreen()
        places.forget()
        await places.refresh()
        if (!current()) return
        audio?.raise('screen.menu')
        const members = party?.members() ?? []
        const items = menuItems({
          saved: newest(places.slots()) !== undefined,
          room: members.length < (party?.room ?? 1),
          canQuit: host.canQuit,
        })
        shown = makers.menu({
          ...base(),
          name: project.name,
          ...(splashPicture === undefined ? {} : { picture: splashPicture }),
          items,
          players: members.map((member) => member.player),
          onPick: (item) => {
            pick(item, mine).catch(fail)
          },
        })
        return
      }
      case 'playing': {
        if (before.step === 'paused' && game !== undefined) {
          dropScreen()
          game.resume()
          putOverlay()
          return
        }
        await startLevel(next.level ?? project.start, mine)
        return
      }
      case 'paused': {
        game?.pause()
        dropOverlay()
        dropScreen()
        if (before.over === undefined) audio?.raise('screen.pause')
        showPause()
        return
      }
      case 'done': {
        game?.pause()
        dropOverlay()
        dropScreen()
        const finished = next.level ?? project.start
        const after = nextLevel(project, finished)
        let notKept: string | undefined
        if (after !== undefined) notKept = await places.reach(after, words('automata.done.not-kept'))
        if (!current()) return
        audio?.raise('screen.done')
        shown = makers.done({
          ...base(),
          level: levelName(words, finished),
          next: after !== undefined,
          ...(notKept === undefined ? {} : { notKept }),
          onNext: () => dispatch({ type: 'next' }),
          onMenu: () => dispatch({ type: 'leave' }),
        })
        return
      }
      default:
        return
    }
  }

  /** The pause screen, with who can be added or taken out; drawn again when someone is. */
  function showPause(): void {
    const members = party?.members() ?? []
    const items: PauseItem[] = ['resume']
    if (members.length < (party?.room ?? 1)) items.push('add-player')
    items.push('settings', 'leave')
    dropScreen()
    shown = makers.pause({
      ...base(),
      items,
      removable: members.filter((member) => member.player !== 1).map((member) => member.player),
      onPick: (item) => {
        if (item === 'resume') dispatch({ type: 'resume' })
        else if (item === 'add-player') dispatch({ type: 'open', over: 'players' })
        else if (item === 'settings') dispatch({ type: 'open', over: 'settings' })
        else if (item === 'leave') dispatch({ type: 'leave' })
      },
      onRemove: (player) => {
        game?.removePlayer(player)
        party?.leave(player)
        showPause()
      },
    })
  }

  /** Starts `level` and puts the game on the page. */
  async function startLevel(level: string, mine: number): Promise<void> {
    const loaded = content as GameContent
    const heard = locale as Locale
    stopGame()
    dropScreen()
    if (places.progress() === undefined) {
      // A visitor who took over a watching game plays what the menu's first action would have opened: the newest saved
      // game, or a new one when there is none.
      await places.refresh()
      await places.openNewest()
    }
    try {
      const started = await startGame({
        content: loaded,
        mount,
        host,
        locale: heard,
        frames,
        level,
        players: (party?.members() ?? [{ player: 1 }]).map((member) => member.player),
        ...(options.plugins === undefined ? {} : { plugins: options.plugins }),
        ...(options.controls === undefined ? {} : { controls: options.controls }),
        ...(options.readPicture === undefined ? {} : { readPicture: options.readPicture }),
        ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
        ...(audio === undefined ? {} : { audio }),
        ...(sections === undefined
          ? {}
          : { settings: sections.controls.get(), touchSettings: sections.touch.get() }),
        soundNotice: false,
      })
      if (stopped || epoch !== mine) {
        started.stop()
        return
      }
      game = started
      // Each player who brought a device keeps it from level to level.
      for (const { player, claim } of party?.members() ?? []) {
        if (claim !== undefined) started.input.claim(player, claim)
      }
      const done = loaded.project.done
      const off: (() => void)[] = [
        started.input.onBindings((changed) => void sections?.controls.set(changed)),
        started.onStep((step) => {
          if (endsLevel(done, step.events)) dispatch({ type: 'level-done' })
        }),
        // The player is told in words, not in the rule's own message; the loop has thrown that one to the console.
        started.onBroken((error) => fail(error, [])),
        started.input.onMenu((press) => {
          if (press === 'pause') dispatch({ type: 'pause' })
        }),
        // A page that is hidden pauses the game and it stays paused when the page comes back: a thumb that was on the
        // screen may not be there now, so the player says when to go on.
        host.onVisibility((visible) => {
          if (!visible) dispatch({ type: 'pause' })
        }),
      ]
      // Escape pauses, heard on the window as the game's own keys are: a tap on the canvas leaves the focus outside
      // the mount, so a key listener on the mount would never hear it. It is heard first (capturing, and before the
      // screens made later), so on the pause screen the same Escape that keeps playing does not pause again.
      const onEscape = (event: KeyboardEvent): void => {
        if (event.key === 'Escape' && !event.repeat) dispatch({ type: 'pause' })
      }
      window.addEventListener('keydown', onEscape, { capture: true })
      letGoOfGame = () => {
        window.removeEventListener('keydown', onEscape, { capture: true })
        for (const stop of off) stop()
      }
      putOverlay()
    } catch (error) {
      fail(error)
    }
  }

  const takeOver = (): void => {
    if (state.step !== 'watching' || content === undefined) return
    stopWatching()
    // The watching locale was never asked: a player who takes over is asked, with a locale of their own.
    stopFollowing()
    locale = createLocale({ content, host, settings: (sections as Sections).settings })
    stopFollowing = followLanguage(locale)
    dispatch({ type: 'take-over' })
  }

  const flow: Flow<S> = {
    state: () => state,
    onState(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    game: () => game,
    locale: () => locale,
    progress: () => places.progress(),
    keep: (data) => places.keep(data),
    takeOver,
    finishLevel: () => dispatch({ type: 'level-done' }),
    stop() {
      if (stopped) return
      stopped = true
      epoch++
      dropScreen()
      stopWatching()
      stopGame()
      dropLoading()
      overs.close()
      stopSound()
      stopFollowing()
      audio?.close()
      madeSpeaker?.close()
      mount.replaceChildren()
      mount.removeAttribute('data-state')
      mount.removeAttribute('data-over')
      if (mountPosition !== undefined) mount.style.position = mountPosition
    },
  }

  mount.dataset.state = 'loading'
  if (mountPosition !== undefined) mount.style.position = 'relative'
  mount.replaceChildren()
  loadingMark = putLoadingMark(mount)

  const boot = async (): Promise<void> => {
    const loaded = await loadGame(read)
    if (stopped) return
    if (!loaded.ok) {
      problem = { lines: loaded.diagnostics.map(formatDiagnostic), fix: FIX }
      dispatch({ type: 'broke' })
      return
    }
    content = loaded.value
    const project = content.project
    sections = await openSections({ game: options.game, host })
    if (stopped) return
    saves = createSaves({ def: save.def, store: host.store })
    saving = await saves.check()
    await places.refresh()
    firstLevel = await places.newestLevel()
    party = createParty(project.players ?? 1)
    if (options.speaker === undefined) madeSpeaker = webSpeaker({ host })
    const speaker = options.speaker ?? (madeSpeaker as Speaker)
    audio = createAudio({ content, speaker })
    stopSound = wireSound(audio, sections.sound)

    // The splash's picture, when the game names one and it can be read: a picture that cannot is the game's name.
    const splash = project.splash === undefined ? undefined : paintedPath(content, 'figure', project.splash)
    if (splash !== undefined && options.readPicture !== undefined) {
      try {
        splashPicture = await options.readPicture(splash)
      } catch {
        splashPicture = undefined
      }
    }

    // Watch mode: the recording plays, with nobody asked anything, until a tap. One that cannot be read or played is
    // skipped, and the visit goes on as an ordinary one.
    watcher =
      options.watch === undefined
        ? undefined
        : await startWatching({
            content,
            mount,
            host,
            frames,
            watch: options.watch,
            ...(options.plugins === undefined ? {} : { plugins: options.plugins }),
            ...(options.readPicture === undefined ? {} : { readPicture: options.readPicture }),
          })
    const watching = watcher !== undefined
    if (stopped) {
      watcher?.stop()
      return
    }
    locale = createLocale({ content, host, settings: sections.settings, ...(watching ? { watching } : {}) })
    stopFollowing = followLanguage(locale as Locale)
    dispatch({ type: 'loaded', watch: watching })
  }
  boot().catch((error: unknown) => {
    if (stopped) return
    // Whatever failed, the player gets the words they have, or the developer's line when there are none.
    fail(error)
  })
  return flow
}

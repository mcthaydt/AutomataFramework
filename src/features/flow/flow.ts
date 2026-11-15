// The default game flow: the steps a visit walks (warnings if needed, the language picker, the splash, the main menu,
// the game with its pause, and back to the menu), the progress it keeps and who is playing. `startFlow` puts them on a
// page. It owns no rule: `advance` decides what comes next, the screens draw, and this file only connects them.
import { pageFrames } from '../../lib/frames.ts'
import { createAudio, type GameAudio, type Speaker } from '../audio/audio.ts'
import {
  formatDiagnostic,
  type GameContent,
  levelOrder,
  loadGame,
  nextLevel,
  paintedPath,
} from '../content/content.ts'
import { type Game, startGame, type Watch, watchReplay } from '../game/game.ts'
import { padMenu } from '../input/input.ts'
import { createLocale, type Locale, levelName, type Words } from '../locale/locale.ts'
import { createSaves, type Saves, type SlotState, type StoreResult } from '../saves/saves.ts'
import {
  defaultScreens,
  hud,
  type MenuItem,
  menuItems,
  type Screen,
  type ScreenBase,
  type ScreenMakers,
  warningsFor,
} from '../screens/screens.ts'
import { followLanguage, languagePicker, webHost, webSpeaker } from '../web/web.ts'
import { endsLevel, putLoadingMark, startWatching } from './loading.ts'
import { createParty, type Party } from './party.ts'
import {
  defaultSave,
  type FlowSave,
  firstEmpty,
  newest,
  type Progress,
  progressLabel,
  reached,
} from './progress.ts'
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
 * Buttons whose screens come with later tasks of plan U (settings, saved games, add a player): they are not offered
 * until their screen exists, so no button on the menu does nothing.
 */
const NOT_YET: ReadonlySet<MenuItem> = new Set(['saves', 'settings', 'add-player'])

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
  let slots: readonly SlotState[] = []
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
  // The saved game being played.
  let progress: S | undefined
  let slot: number | undefined
  const mountPosition = getComputedStyle(mount).position === 'static' ? '' : undefined

  const words: Words = (key, values) => (locale === undefined ? key : locale.words(key, values))

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
      first: project.start,
      next: state.level === undefined ? undefined : nextLevel(project, state.level),
    }
  }

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

  /** Reads the places a game is saved in, for the menu's buttons. */
  async function readSlots(): Promise<void> {
    const listed = await saves?.list()
    slots = listed?.ok ? listed.value : []
  }

  /** Makes a new game: the first empty place, with the first level in it. */
  async function begin(): Promise<void> {
    const project = (content as GameContent).project
    progress = save.fresh(project.start)
    slot = firstEmpty(slots)
    if (slot !== undefined && saves !== undefined)
      await saves.save(slot, progress, { label: progressLabel(words, project.start) })
  }

  /** Opens the saved game that was saved last, and answers the level it reached. */
  async function continueGame(): Promise<string> {
    const project = (content as GameContent).project
    const at = newest(slots)
    const loaded = at === undefined ? undefined : await saves?.load(at)
    if (at === undefined || loaded === undefined || !loaded.ok || loaded.data === null) {
      await begin()
      return project.start
    }
    progress = loaded.data
    slot = at
    // A level the game no longer has opens the first.
    return levelOrder(project).includes(loaded.data.level) ? loaded.data.level : project.start
  }

  /** What the player pressed on the main menu. */
  async function pick(item: MenuItem, mine: number): Promise<void> {
    if (item === 'quit') {
      await host.quit()
      return
    }
    if (item !== 'play' && item !== 'new' && item !== 'continue') return
    const project = (content as GameContent).project
    let level = project.start
    if (item === 'continue') level = await continueGame()
    else await begin()
    if (!stopped && epoch === mine) dispatch({ type: 'play', level })
  }

  /** Puts the step `next` on the page, taking what the step `before` had off it. */
  async function present(before: FlowState, next: FlowState, mine: number): Promise<void> {
    const current = (): boolean => !stopped && epoch === mine
    const project = content?.project
    dropLoading()
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
    // A screen on top of the menu or pause (settings, saved games, players) comes with its own task.
    if (next.over !== undefined) return

    switch (next.step) {
      case 'watching': {
        // The recording is already playing; the page tells the player how to take over.
        const take = (): void => takeOver()
        const key = (event: KeyboardEvent): void => {
          if (!event.repeat) take()
        }
        const pads = padMenu({
          frames,
          ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
        })
        const stopPads = pads.on(take)
        window.addEventListener('keydown', key)
        letGoOfWatch = () => {
          window.removeEventListener('keydown', key)
          stopPads()
          pads.destroy()
        }
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
        const said = locale.language() === undefined && language !== undefined ? locale.wordsIn(language) : words
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
        progress = undefined
        slot = undefined
        await readSlots()
        if (!current()) return
        audio?.raise('screen.menu')
        const members = party?.members() ?? []
        const items = menuItems({
          saved: newest(slots) !== undefined,
          room: members.length < (party?.room ?? 1),
          canQuit: host.canQuit,
        }).filter((item) => !NOT_YET.has(item))
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
        audio?.raise('screen.pause')
        shown = makers.pause({
          ...base(),
          items: ['resume', 'leave'],
          removable: [],
          onPick: (item) => {
            if (item === 'resume') dispatch({ type: 'resume' })
            else if (item === 'leave') dispatch({ type: 'leave' })
          },
          onRemove: () => {},
        })
        return
      }
      case 'done': {
        game?.pause()
        dropOverlay()
        dropScreen()
        const finished = next.level ?? project.start
        const after = nextLevel(project, finished)
        let notKept: string | undefined
        if (after !== undefined) notKept = await keepReached(after)
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

  /** Writes that the player has reached `level`; the sentence for a player when it could not be kept. */
  async function keepReached(level: string): Promise<string | undefined> {
    const project = (content as GameContent).project
    if (progress === undefined) return undefined
    progress = reached(progress, level, levelOrder(project))
    const notKept = words('automata.done.not-kept')
    if (slot === undefined || saves === undefined) return notKept
    const written = await saves.save(slot, progress, { label: progressLabel(words, level) })
    return written.ok ? undefined : notKept
  }

  /** Starts `level` and puts the game on the page. */
  async function startLevel(level: string, mine: number): Promise<void> {
    const loaded = content as GameContent
    const heard = locale as Locale
    stopGame()
    dropScreen()
    if (progress === undefined) {
      // A visitor who took over a watching game plays from the start without having chosen Play.
      await readSlots()
      await begin()
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
      const done = loaded.project.done
      const off: (() => void)[] = [
        started.input.onBindings((changed) => void sections?.controls.set(changed)),
        started.onStep((step) => {
          if (endsLevel(done, step.events)) dispatch({ type: 'level-done' })
        }),
        started.onBroken((error) => fail(error)),
        started.input.onMenu((press) => {
          if (press === 'pause') dispatch({ type: 'pause' })
        }),
      ]
      // Escape pauses, heard on the window as the game's own keys are: a tap on the canvas leaves the focus outside
      // the mount, so a key listener on the mount would never hear it.
      const escape = (event: KeyboardEvent): void => {
        if (event.key === 'Escape' && !event.repeat) dispatch({ type: 'pause' })
      }
      window.addEventListener('keydown', escape)
      letGoOfGame = () => {
        window.removeEventListener('keydown', escape)
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
    progress: () => progress,
    async keep(data) {
      progress = data
      if (slot === undefined || saves === undefined)
        return {
          ok: false,
          problem: { kind: 'refused', refusal: 'unavailable', detail: 'There is no place to keep it.' },
        }
      return saves.save(slot, data)
    },
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
    party = createParty(project.players ?? 1)
    const speaker = options.speaker ?? (madeSpeaker = webSpeaker({ host }))
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

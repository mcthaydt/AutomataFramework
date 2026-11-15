// The default game flow: the steps a visit walks (warnings if needed, the language picker, the splash, the main menu,
// the game with its pause, and back to the menu), the progress it keeps and who is playing. `startFlow` puts them on a
// page. It owns no rule: `advance` decides what comes next, the screens draw, and this file only connects them.
import { pageFrames } from '../../lib/frames.ts'
import { createAudio, type GameAudio, type Speaker } from '../audio/audio.ts'
import {
  formatDiagnostic,
  type GameContent,
  loadGame,
  nextLevel,
  PROJECT_FILE,
  paintedPath,
  parseProject,
} from '../content/content.ts'
import type { Watch } from '../game/game.ts'
import { createLocale, type Locale, levelName, type Words } from '../locale/locale.ts'
import { createSaves, type Saves, type StoreResult } from '../saves/saves.ts'
import {
  defaultScreens,
  type MenuItem,
  menuItems,
  type Screen,
  type ScreenBase,
  type ScreenMakers,
  warningsFor,
} from '../screens/screens.ts'
import { followLanguage, languagePicker, webHost, webSpeaker } from '../web/web.ts'
import { backDefault, wireBack } from './back.ts'
import {
  type LoadingBar,
  putLoadingBar,
  RETRY_MS,
  retrying,
  SLOW_MS,
  slowLineFor,
  startWatching,
  waitForTake,
  waitOn,
} from './loading.ts'
import { createOvers } from './overs.ts'
import { guardPage } from './page-guard.ts'
import { createParty, type Party } from './party.ts'
import { createPlaces, type Places } from './places.ts'
import { createPlay } from './play.ts'
import { defaultSave, type FlowSave, newest, type Progress } from './progress.ts'
import { RECORDS_DEFAULT, withScore } from './records.ts'
import { openSections, type Sections, wireSound } from './sections.ts'
import { advance, FLOW_START, type FlowEvent, type FlowFacts, type FlowState } from './steps.ts'
import type { Flow, FlowOptions } from './types.ts'

export * from './events.ts'
export * from './party.ts'
export * from './progress.ts'
export * from './records.ts'
export * from './steps.ts'
export type { Flow, FlowOptions } from './types.ts'

/** What a developer is told to do about a game's files: English, since there are no words to say it in yet. */
const FIX = 'Fix the file named above, then load this page again.'

/**
 * Loads the game and walks the flow in `mount`. Never rejects: whatever goes wrong is a screen of words. It answers at
 * once, with the page showing "loading"; `state()` and `onState` say where the visit is.
 */
export async function startFlow<S extends Progress = Progress>(given: FlowOptions<S>): Promise<Flow<S>> {
  const { mount } = given
  const host = given.host ?? webHost()
  const frames = given.frames ?? pageFrames
  // A file that fails to arrive is asked for once more, a second later: a phone on a train drops a request now and then.
  const wait = (): Promise<void> => waitOn(frames, RETRY_MS)
  const options: FlowOptions<S> = {
    ...given,
    ...(given.readPicture === undefined ? {} : { readPicture: retrying(given.readPicture, { wait }) }),
  }
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
  let loadingBar: LoadingBar | undefined
  let slowFrame: number | undefined
  let shown: Screen | undefined
  let watcher: Watch | undefined
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

  // A level on the page.
  const play = createPlay({
    options,
    mount,
    host,
    frames,
    makers,
    places: places as unknown as Places<Progress>,
    content: () => content as GameContent,
    locale: () => locale as Locale,
    sections: () => sections,
    audio: () => audio,
    party: () => party,
    base,
    stopped: () => stopped,
    epoch: () => epoch,
    dispatch: (event) => dispatch(event),
    fail: (error, lines) => fail(error, lines),
    dropScreen: () => dropScreen(),
    setScreen: (screen) => {
      shown = screen
    },
  })

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
    game: () => play.game(),
    // The level being played, or the first one when the menu is what is on show.
    level: () => state.level ?? (content as GameContent).project.start,
    party: () => party as Party,
    places: places as unknown as Places<Progress>,
    play: (level) => dispatch({ type: 'play', level }),
    fail: (error) => fail(error),
    eraseSaves: eraseEverything,
    back: () => dispatch({ type: 'back' }),
  })

  const dropScreen = (): void => {
    shown?.destroy()
    shown = undefined
  }
  const stopWatching = (): void => {
    letGoOfWatch()
    letGoOfWatch = (): void => {}
    play.dropOverlay()
    watcher?.stop()
    watcher = undefined
  }
  const dropLoading = (): void => {
    if (slowFrame !== undefined) frames.cancel(slowFrame)
    slowFrame = undefined
    loadingBar?.remove()
    loadingBar = undefined
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
    mount.dataset.attempt = String(next.attempt)
    if (next.over === undefined) mount.removeAttribute('data-over')
    else mount.dataset.over = next.over
    epoch++
    present(before, next, epoch).catch(fail)
    for (const listener of [...listeners]) listener(next)
  }

  /**
   * "Delete all my saves": every saved game and the best score. What cannot be erased is told by the answer, and the
   * rest is still erased. The language, the keys and the volumes are not saves, and stay.
   */
  async function eraseEverything(): Promise<{ readonly ok: boolean }> {
    const failed = await places.eraseAll()
    const records = sections === undefined ? { ok: true } : await sections.records.set(RECORDS_DEFAULT)
    return { ok: failed === 0 && records.ok }
  }

  /** What the player pressed on the main menu. */
  async function pick(item: MenuItem, mine: number): Promise<void> {
    if (item === 'quit') {
      await host.quit()
      return
    }
    if (item === 'settings' || item === 'saves' || item === 'add-player' || item === 'how') {
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

  /**
   * The level just ended, won or lost: its score, the best now, and the sentence for a best the store would not keep. The
   * best is shown from the second end on, when there was one before this; the first end keeps it and says nothing of it.
   */
  async function recordScore(): Promise<{ score?: number; best?: number; notKept?: string }> {
    const score = play.game()?.score()
    if (score === undefined || sections === undefined) return {}
    const before = sections.records.get()
    const after = withScore(before, score)
    let notKept: string | undefined
    if (after !== before) {
      const written = await sections.records.set(after)
      if (!written.ok) notKept = (locale as Locale).words('automata.done.not-kept')
    }
    return {
      score,
      ...(before.best === undefined || after.best === undefined ? {} : { best: after.best }),
      ...(notKept === undefined ? {} : { notKept }),
    }
  }

  /**
   * Puts the step `next` on the page. The loading bar stays until the step has put something of its own there, so the
   * mount is never without a child from the first frame to the menu.
   */
  async function present(before: FlowState, next: FlowState, mine: number): Promise<void> {
    try {
      await show(before, next, mine)
    } finally {
      dropLoading()
    }
  }

  /** Puts the step `next` on the page, taking what the step `before` had off it. */
  async function show(before: FlowState, next: FlowState, mine: number): Promise<void> {
    const current = (): boolean => !stopped && epoch === mine
    const project = content?.project
    overs.close()
    if (next.step === 'problem') {
      dropScreen()
      stopWatching()
      play.stop()
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
        play.watchOverlay(take)
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
        play.stop()
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
        // Keep playing goes on; Start again counts one more attempt and makes the level afresh.
        if (before.step === 'paused' && play.game() !== undefined && next.attempt === before.attempt) {
          dropScreen()
          play.resume()
          return
        }
        await play.start(next.level ?? project.start, mine)
        return
      }
      case 'paused': {
        play.hold()
        dropScreen()
        if (before.over === undefined) audio?.raise('screen.pause')
        play.showPause()
        return
      }
      case 'done': {
        play.hold()
        dropScreen()
        const finish = await recordScore()
        const finished = next.level ?? project.start
        const after = nextLevel(project, finished)
        let notKept: string | undefined
        if (after !== undefined) notKept = await places.reach(after, words('automata.done.not-kept'))
        // The same sentence says it whichever of the two writes was refused.
        notKept ??= finish.notKept
        if (!current()) return
        audio?.raise('screen.done')
        shown = makers.done({
          ...base(),
          level: levelName(words, finished),
          next: after !== undefined,
          ...(finish.score === undefined ? {} : { score: finish.score }),
          ...(finish.best === undefined ? {} : { best: finish.best }),
          ...(notKept === undefined ? {} : { notKept }),
          onNext: () => dispatch({ type: 'next' }),
          onMenu: () => dispatch({ type: 'leave' }),
        })
        return
      }
      case 'lost': {
        play.hold()
        dropScreen()
        const finish = await recordScore()
        if (!current()) return
        audio?.raise('screen.lost')
        shown = makers.lost({
          ...base(),
          ...(finish.score === undefined ? {} : { score: finish.score }),
          ...(finish.best === undefined ? {} : { best: finish.best }),
          ...(finish.notKept === undefined ? {} : { notKept: finish.notKept }),
          onAgain: () => dispatch({ type: 'again' }),
          onMenu: () => dispatch({ type: 'leave' }),
        })
        return
      }
      default:
        return
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
    game: () => play.game(),
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
      play.stop()
      dropLoading()
      overs.close()
      stopSound()
      stopFollowing()
      audio?.close()
      madeSpeaker?.close()
      mount.replaceChildren()
      mount.removeAttribute('data-state')
      mount.removeAttribute('data-attempt')
      mount.removeAttribute('data-over')
      if (mountPosition !== undefined) mount.style.position = mountPosition
      stopBack()
      unguard()
    },
  }

  // The page holds still under the game, and Back is the game's where the page is the game's own.
  const unguard = guardPage(mount)
  const stopBack =
    (options.back ?? backDefault({ top: window.top, self: window }))
      ? wireBack({ state: () => state, dispatch, onState: flow.onState })
      : (): void => {}
  mount.dataset.state = 'loading'
  if (mountPosition !== undefined) mount.style.position = 'relative'
  mount.replaceChildren()
  loadingBar = putLoadingBar(mount)
  const slowLine = slowLineFor(host.deviceLanguages())
  // The bar counts the project file, then each file it lists. The slow line shows when no file has come for ten seconds
  // of the page's frames, and goes when one does.
  let arrivals = 0
  let expected = 1
  let quietSince: number | undefined
  let slowShown = false
  const watchQuiet = (ms: number): void => {
    quietSince ??= ms
    if (!slowShown && slowLine !== undefined && ms - quietSince >= SLOW_MS) {
      slowShown = true
      loadingBar?.slow(slowLine)
    }
    slowFrame = frames.request(watchQuiet)
  }
  slowFrame = frames.request(watchQuiet)
  const read = retrying(
    async (path: string): Promise<string> => {
      const text = await given.read(path)
      if (path === PROJECT_FILE) {
        const parsed = parseProject(text)
        if (parsed.ok) expected = 1 + parsed.value.content.length
      }
      return text
    },
    {
      wait,
      arrived: () => {
        arrivals += 1
        // The clock starts again at the next frame.
        quietSince = undefined
        if (slowShown) loadingBar?.slow(undefined)
        slowShown = false
        loadingBar?.progress(arrivals, expected)
      },
    },
  )

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

// The page the online journey opens in each browser: the fixture online game on a real page, joined to a real room
// server. It shows what the journey reads and nothing else: `#status` holds the words a person would read, and `#game`
// carries the numbers (`data-*`). The address says where: `?server=ws://…`, `?room=<code>`, `?seats=<n>`, and
// `?game=co-op` for the game made for four players, whose heroes come and go while it is played.
import { attemptsToBuildCode } from '../../strict-csp.ts'

const params = new URLSearchParams(location.search)
const status = document.querySelector<HTMLElement>('#status') as HTMLElement
const game = document.querySelector<HTMLElement>('#game') as HTMLElement
const mount = document.querySelector<HTMLElement>('#mount') as HTMLElement

interface Dropper {
  drop?: () => void
}
let line: Dropper | undefined
Object.assign(window, { dropConnection: () => line?.drop?.() })

type Framework = typeof import('#src/index.ts')
type Online = Awaited<ReturnType<Framework['startOnlineGame']>>
let framework: Framework | undefined
let online: Online | undefined

// The first load of the framework and the SDK, and the whole join, happen inside this with `new Function` refused as a
// strict CSP does: whatever tried to build code from a string is listed in `data-built-code`.
const stacks: string[] = []
const where = (): string => (new Error().stack ?? '').split('\n').slice(2, 9).join(' | ')
const built = await attemptsToBuildCode(async () => {
  // Where each attempt came from, for the journey to print if there is one: a stack's first lines say which package asked.
  const refusing = globalThis.Function
  globalThis.Function = new Proxy(refusing, {
    construct: (target, args, newTarget) => {
      stacks.push(where())
      return Reflect.construct(target, args, newTarget)
    },
    apply: (target, self, args) => {
      stacks.push(where())
      return Reflect.apply(target, self, args)
    },
  })
  framework = await import('#src/index.ts')
  const { onlineWords, startOnlineGame, webHost } = framework
  const { fixtureControls } = await import('../../game/controls.ts')
  const { heroPlugin } = await import('../../game/hero.ts')
  const { loadCoopGame, loadOnlineGame } = await import('../game.ts')
  const show = (text: string, state: string): void => {
    status.textContent = text
    game.dataset.state = state
  }
  try {
    online = await startOnlineGame({
      content: await (params.get('game') === 'co-op' ? loadCoopGame() : loadOnlineGame()),
      plugins: [heroPlugin],
      mount,
      controls: fixtureControls,
      host: webHost(),
      server: params.get('server') ?? '',
      ...(params.get('room') === null ? {} : { room: params.get('room') as string }),
      seats: Number(params.get('seats') ?? 2),
      wrapLink: (link) => {
        line = link
        return link
      },
      onCheck: (tick, hash, ok) => {
        if (ok) game.setAttribute(`data-check-${tick}`, hash)
      },
      onStatus: (next) => show(onlineWords(next), next.state),
    })
  } catch (error) {
    const problem = (error as { problem?: string }).problem
    if (problem === undefined) show(String(error), 'failed')
    else show(onlineWords({ state: 'ended', problem: problem as 'lost' }), 'ended')
  }
})
game.dataset.builtCode = JSON.stringify(built)
game.dataset.builtStack = JSON.stringify(stacks)

if (framework !== undefined && online !== undefined) {
  const { Player, playersIn, Transform } = framework
  const playing = online
  game.dataset.seat = String(playing.seat)
  game.dataset.code = playing.code
  const x = (n: number): string => {
    const hero = playing.sim.query(Player, Transform).find((e) => e.get(Player).number === n)
    return hero === undefined ? '' : String(hero.get(Transform).x)
  }
  const tick = (): void => {
    game.dataset.rollbacks = String(playing.stats().rollbacks)
    game.dataset.p1X = x(1)
    game.dataset.p2X = x(2)
    game.dataset.players = String(playersIn(playing.sim).length)
    requestAnimationFrame(tick)
  }
  tick()
}

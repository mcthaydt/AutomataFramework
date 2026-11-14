// The page's build. `base: './'` makes every address in the built page relative, so the folder works from any path.
// `appType: 'mpa'` answers a file that is not there with "not found", never with the page: a missing game file must
// be seen, not hidden.
import { defineConfig, type UserConfig } from 'vite'

const config: UserConfig = defineConfig({ base: './', appType: 'mpa' })

export default config

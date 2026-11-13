// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/version.ts
/**
 * The framework's version, written into replay headers for information only. A constant rather than a build-time
 * define, so workspace tests and un-built replays carry the real version; the release step updates it with
 * package.json, and version.test.ts keeps the two equal.
 */
export const FRAMEWORK_VERSION: string = '0.1.0'

// Vite's `?raw` suffix imports a file as its text. Tests and fixtures use it so one fixture loads in Node and in
// a browser; this tells TypeScript what such an import is.
declare module '*?raw' {
  const text: string
  export default text
}

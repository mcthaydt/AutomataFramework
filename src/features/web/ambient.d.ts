// What the picture files import that the package and Vite do not describe: a drawing read as its own text.
declare module '*.svg?raw' {
  const text: string
  export default text
}

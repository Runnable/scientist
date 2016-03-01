declare class ExtendableError extends Error {}

declare module 'es6-error' {
  declare var exports: typeof ExtendableError
}

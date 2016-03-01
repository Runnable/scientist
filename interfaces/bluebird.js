declare module 'bluebird' {
  // declare function resolve <T> (object?: Promise<T> | T): Promise<T>;
  // declare var exports: {
  //   resolve <T> (object?: Promise<T> | T): Promise<T>;
  // }
  declare var exports: typeof Promise;
}

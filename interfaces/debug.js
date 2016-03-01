declare module 'debug' {
  declare var exports: {
    (name: string): (message: string, ...data: Array<any>) => void;
  }
}

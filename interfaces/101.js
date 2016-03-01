declare module '101/assign' {
  declare var exports: {
    <T>(target: T, ...sources: Array<Object>): T
  }
}

declare module '101/find' {
  declare var exports: {
    <T>(source: Array<T>, search: (curr: T) => boolean): ?T;
  }
}

declare module '101/has-properties' {
  declare var exports: {
    (source: Object): (curr: any) => boolean;
  }
}

declare module '101/is-function' {
  declare var exports: {
    (value: any): boolean;
  }
}

declare module '101/is-string' {
  declare var exports: {
    (value: any): boolean;
  }
}

declare module '101/is-object' {
  declare var exports: {
    (value: any): boolean;
  }
}

// most here borrowed from https://gist.github.com/cpojer/2dd5e3f4ce41b91a6bd8
declare module 'immutable' {
  declare class Map<K, V> extends KeyedCollection<K, V> {
    static <K, V>(): Map<K, V>;
    size: number;
    get(key: K): V;
    has(key: K): boolean;
    set(key: K, value: V): Map<K, V>;
  }

  declare class List<T> extends IndexedCollection<T> {
    static <T>(): List<T>;
  }

  declare class Iterable<K, V> {
    toArray(): Array<V>;
  }

  declare class Collection<K, V> extends Iterable<K, V> {
    size: number;
    keySeq(): IndexedSeq<K>;
    some(
      predicate: (value: V, key: K, iter: Iterable<K, V>) => boolean,
      context?: any
    ): boolean;
  }

  declare class KeyedCollection<K, V> extends Collection<K, V> {}

  declare class IndexedCollection<T> extends Collection<number, T> {
    push(...values: T[]): List<T>;
  }

  declare class Seq<K, V> extends Iterable<K, V> {}

  declare class IndexedSeq<T> extends Seq<number, T> {}
}

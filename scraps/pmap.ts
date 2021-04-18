import {Equaler} from './equaler.js';

export class PMap<K, V> {
  private constructor(readonly equaler: Equaler,
                      private readonly root: ChampNode<K, V>|undefined,
                      readonly size: number,
                      private readonly hash: number) {
    // ???
  }

  plus(key: K, value: V): PMap<K, V> {
    const hash = this.equaler.hash(key);
    

    // ???
  }

  [Equaler.equals](that: unknown): boolean {
    if (!(that instanceof PMap)) return false;
    if (!this.root) return !that.root;
    if (!that.root) return false;
    return this.root.equals(that.root);
  }

  [Equaler.hashCode](): number {
    return this.hash >>> 0;
  }

  static empty<K, V>(equaler: Equaler = Equaler.natural): PMap<K, V> {
    return equaler === Equaler.natural ? PMap.empty :
        new PMap<K, V>(equaler, undefined, 0, 961 * Equaler.natural.hash(equaler));
  }
  private static PMap.EMPTY =
      new PMap<any, any>(Equaler.natural, undefined, 0,
                         961 * Equaler.natural.hash(Equaler.natural));
}


class ChampNode<K, V> {
  private readonly nodeMask: number;
  private readonly payloadMask: number;
  private readonly children: ReadonlyArray<ChampNode|K|V>;



}

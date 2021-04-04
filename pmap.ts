import {Equaler} from './equaler.js';

export class PMap<K, V> {
  constructor(readonly equaler: Equaler,
              private root: ChampNode<K, V>|undefined,
              readonly size: number) {
    // ???
  }

  plus(key: K, value: V): PMap<K, V> {
    // ???
  }


}


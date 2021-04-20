// Defines a persistent array data type.  This is essentially
// just an array with a clever undo stack.
// See http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.79.8494

// TODO - would be nice if we could "modulize" this such that it exports
// a module with static factory and manipulation functions.  The main
// problem is that there's not a great way to type the thing that comes out?/
// Ideally, we'd like some sort of associated type...?

// export interface PArray<F extends PArrayFactory, T> {
//   [priv]: F;
  
// }
// export abstract class PArrayFactory {
//   abstract create<T>(size: number): PArray<this, T>;
//   abstract get<T>(arr: PArray<this, T>, index: number): T;
//   abstract set<T>(arr: PArray<this, T>, index: number, value: T): PArray<this, T>;
// }

// export namespace backtrackingPArray {
//   // ...
// }

export class PArray<T> {
  private constructor(private data: T[]|Diff<T>) {}

  static create<T>(length: number, f: (index: number) => T): PArray<T> {
    return new PArray(Array.from({length}, (_, i) => f(i)));
  }

  get length(): number {
    return Array.isArray(this.data) ?
        this.data.length : this.data.parent.length;
  }

  // Ensures `this.data` is an array.
  private reroot(): void {
    const data = this.data as Diff<T>;
    if (!data.parent) return;
    data.parent.reroot();
    this.data = data.parent.data as T[];
    data.parent.data = {
      parent: this,
      index: data.index,
      value: this.data[data.index],
    };
    this.data[data.index] = data.value;
  }

  get(index: number): T {
    this.reroot();
    return (this.data as T[])[index];
  }

  set(index: number, value: T): PArray<T> {
    this.reroot();
    const data = this.data as T[]; // TODO - was _before_ reroot...?
    const previous = data[index];
    data[index] = value;
    const next = new PArray<T>(data);
    this.data = {
      parent: next,
      index,
      value: previous,
    };
    return next;
  }

  [Symbol.iterator]() {
    this.reroot();
    const len = (this.data as T[]).length;
    let i = 0;
    return {
      [Symbol.iterator]() { return this; },
      next: () => i < len ?
          {value: this.get(i++), done: false} :
          {value: undefined, done: true},
    };
  }
}

interface Diff<T> {
  parent: PArray<T>;
  index: number;
  value: T;
}

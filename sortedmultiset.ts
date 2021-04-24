export class SortedMultiset<T> {
  private readonly data = new Map<T, number>();
  add(elem: T) {
    this.data.set(elem, (this.data.get(elem) || 0) + 1);
  }
  [Symbol.iterator]() {
    return [...this.data].sort(([, a], [, b]) => b - a)[Symbol.iterator]();
  }
}

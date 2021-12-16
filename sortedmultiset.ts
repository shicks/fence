export class SortedMultiset<T> {
  private readonly data = new Map<T, number>();
  add(elem: T, count = 1) {
    const newCount = (this.data.get(elem) || 0) + count;
    if (newCount) {
      this.data.set(elem, newCount);
    } else {
      this.data.delete(elem);
    }
  }
  count(elem: T): number {
    return this.data.get(elem) || 0;
  }
  [Symbol.iterator]() {
    return [...this.data].sort(([, a], [, b]) => b - a)[Symbol.iterator]();
  }
}

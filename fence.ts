// Basic structures....?

// Basically a unionfind-like algorithm
class ColorMap {
  private readonly data: ReadonlyMap<number, number>;
  constructor(data: ReadonlyMap<number, number> = new Map()) {
    this.data = data;
  }

  // persistent/readonly
  set(orginal: number, target: number): ColorMap {
    // TODO - ... simplify?
    return new ColorMap(new Map([...this], [original, target]));
  }

}


class Grid {
  constructor(readonly h: number, readonly w: number) {}
}


class Cell {
  constructor(readonly g: Grid, readonly y: number, readonly x: number) {}

  // neighbors, etc
}

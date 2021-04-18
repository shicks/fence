// All elements have a unique uint32 ID composed of two Y bytes and
// two X bytes.  Each of these uses the high 12 bits for the grid
// coordinate, and the low 4 bits to distinguish between cell, vertex,
// or the two halfedges.  See below (omitting the high 8 bits of X and Y):
//
//    V0000  <--0004 H 000C-->  V0010  <--0014 H 001C-->  V0020 ...
//     0400                      0410                      0420
//      H          C0808          H          C0818          H   ...
//     0C00                      0C10                      0C20
//    V1000  <--1004 H 100C-->  V1010  <--1014 H 101C-->  V1020 ...
//     1400                      1410                      1420
//      ...
//
// These IDs are obviously not dense: the low 2 bits of X and Y are
// completely unused, and only a small subset of the other combinations
// are valid: retaining only the type nibbles,
//  * 00 is a vertex
//  * 88 is a cell
//  * 40/0C/C0/04 are up/right/down/left-pointing halfedges
// Halfedges go counter-clockwise around a cell: the halfedges incident
// on C0808 are H0410, H0004, H0C00, and H100C, in that order.

// (0, 0) is top-left vertex
export interface Vertex {
  readonly type: 'vertex';
  readonly id: number;
  readonly index: number;
  readonly y: number;
  readonly x: number;
  readonly incoming: readonly Halfedge[];
}

export interface Halfedge {
  // Assigned at initial instantiation
  readonly type: 'halfedge';
  readonly id: number;
  readonly index: number;
  readonly edge: Edge; // Shared by both twins
  // Assigned in first pass
  readonly twin: Halfedge;
  readonly next: Halfedge;
  readonly prev: Halfedge;
  // Assigned in second pass
  readonly vert: Vertex;
  readonly cell: Cell;
  readonly cw: Halfedge;
  readonly ccw: Halfedge;
}

export interface Edge {
  readonly type: 'edge';
  readonly id: number;
  readonly index: number;
  readonly halfedges: Halfedge[];
  readonly direction: 'vertical'|'horizontal';
}

// (0, 0) is top-left cell
export interface Cell {
  readonly type: 'cell';
  readonly incident: readonly Halfedge[];
  readonly outside: boolean;
  readonly id: number;
  readonly index: number;
  readonly y: number;
  readonly x: number;
}

export class Grid {
  readonly vertices: readonly Vertex[];
  readonly halfedges: readonly Halfedge[];
  readonly edges: readonly Edge[];
  readonly cells: readonly Cell[];
  // TODO - map from numeric cell ids?

  constructor(readonly height: number, readonly width: number) {
    type V = DeepMutable<Vertex>;
    type H = DeepMutable<Halfedge>;
    type E = DeepMutable<Edge>;
    type C = DeepMutable<Cell>;
    const vs = new Map<number, V>();
    const hs = new Map<number, H>();
    const es = new Map<number, E>();
    const cs = new Map<number, C>();
    function makeVertex(y: number, x: number) {
      const id = y << 20 | x << 4;
      const index = vs.size;
      vs.set(id, {type: 'vertex', id, index, y, x, incoming: []});
    }
    function makeCell(y: number, x: number) {
      const id = y << 20 | x << 4 | 0x80008;
      const index = cs.size;
      cs.set(id, {type: 'cell', id, index, y, x, outside: false, incident: []});
    }
    function makeHalfedge(y: number, x: number, z: number) {
      const id = y << 20 | x << 4 | (z & 0xf0) << 12 | z & 0xf;
      const index = hs.size;
      const edgeId = id & ~0x80008;
      let edge = es.get(edgeId);
      if (!edge) {
        edge = {type: 'edge', id: edgeId, index: es.size,
                halfedges: [], direction: z & 0xf ? 'horizontal' : 'vertical'};
        es.set(edgeId, edge);
      }
      const h = {type: 'halfedge',
                 id, index, edge, twin: null!, next: null!, prev: null!,
                 vert: null!, cell: null!, cw: null!, ccw: null!};
      hs.set(id, h);
      edge.halfedges.push(h);
    }
    function get<T>(map: Map<number, T>, y: number, x: number, z: number): T {
      const id = y << 20 | x << 4 | (z & 0xf0) << 12 | z & 0xf;
      const value = map.get(id);
      if (!value) throw new Error(`missing key ${id.toString(16)}`);
      return value;
    }
    function seq(...edges: H[]) {
      for (let i = 1; i < edges.length; i++) {
        edges[i - 1].next = edges[i];
        edges[i].prev = edges[i - 1];
      }
    }

    // Initial instantiation
    const outside: C = {type: 'cell', id: -1, index: 0, y: -1, x: -1,
                        outside: true, incident: []};
    cs.set(-1, outside);
    for (let y = 0; y <= height; y++) {
      for (let x = 0; x <= width; x++) {
        makeVertex(y, x);
        if (x < width) {
          makeHalfedge(y, x, 0x0c);
          makeHalfedge(y, x, 0x04);
        }
      }
      if (y < height) {
        for (let x = 0; x <= width; x++) {
          makeHalfedge(y, x, 0x40);
          makeHalfedge(y, x, 0xc0);
          if (x < width) makeCell(y, x);
        }
      }
    }

    // Now make all the connections now that they all exist
    // Start with twins
    for (const [id, h] of hs) {
      const twinId = id ^ ((id & 0x40004) << 1);
      const twin = hs.get(twinId);
      if (!twin) throw new Error(`Missing twin: ${twinId.toString(16)}`);
      h.twin = twin;
    }
    // Link up all the internals
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < height; x++) {
        const l = get(hs, y, x, 0xc0);
        const b = get(hs, y + 1, x, 0x0c);
        const r = get(hs, y, x + 1, 0x40);
        const t = get(hs, y, x, 0x04);
        seq(l, b, r, t, l);
      }
    }
    // Handle outside "cell"
    for (let y = 1; y < height; y++) {
      seq(get(hs, y, 0, 0x40), get(hs, y - 1, 0, 0x40));
      seq(get(hs, y - 1, width, 0xc0), get(hs, y, width, 0xc0));
    }
    for (let x = 1; x < width; x++) {
      seq(get(hs, 0, x - 1, 0x0c), get(hs, x, 0, 0x0c));
      seq(get(hs, height, x, 0x04), get(hs, height, x - 1, 0x04));
    }

    // Second pass: connect cells and vertices.
    for (const c of cs.values()) {
      const h0 = c.outside ? get(hs, 0, 0, 0xc) : get(hs, c.y, c.x + 1, 0x40);
      let h = h0;
      do {
        h.cell = c;
        c.incident.push(h);
        h = h.next;
      } while (h !== h0);
    }
    for (const v of vs.values()) {
      let {y, x} = v;
      let z = 0x4;
      if (x === width) {
        x--;
        z ^= 0x8;
      }
      // All vertices have either a left or right incoming edge, most have both.
      const h0 = get(hs, y, x, z);
      let h = h0;
      do {
        h.vert = v;
        v.incoming.push(h);
        h.ccw = h.twin.prev;
        h = h.cw = h.next.twin;
      } while (h !== h0);
    }
  
    this.cells = [...cs.values()];
    this.vertices = [...vs.values()];
    this.halfedges = [...hs.values()];
    this.edges = [...es.values()];
  }
}

// ID is a uint16 numeric position that could be a cell, edge, or vertex.
// It does not support halfedges.  Format is YYYYYYYy XXXXXXXx where the
// lowest bit in each byte indicates the type.  The top-left vertex is
// 0000, 0101 is the top-left cell.  The top left edges are 0001 for the
// top edge and 0100 for the left edge of the first cell.

type DeepMutable<T> =
    T extends ReadonlyArray<infer U> ? Array<DeepMutable<U>> :
    T extends object ? {-readonly [K in keyof T]: DeepMutable<T[K]>} :
    T;

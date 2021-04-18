// A doubly-connected edge list data structure.
// DCEL allows navigating polyhedra.

declare const MODULE_LOCAL_CTOR: unique symbol;

// Use symbols to keep properties module-local.
const TWIN = Symbol('twin');
const NEXT = Symbol('next');
const PREV = Symbol('prev');
const EDGE = Symbol('edge');
const FACET = Symbol('facet');
const VERTEX = Symbol('vertex');
const INCOMING = Symbol('incoming');
const INCIDENT = Symbol('incident');
const HALFEDGES = Symbol('halfedges');
const PARENT = Symbol('parent');

interface Constructible<A extends any[]> {
  [MODULE_LOCAL_CTOR]: (...args: A) => unknown;
  constructor: unknown;
}
type CtorType<C> = C extends Constructible<any> ? C['constructor'] : never;
type CtorArgs<C> = C extends Constructible<infer A> ? A : never;

}
function make<C extends Constructible<any>>(ctor: CtorType<C>,
                                            ...args: CtorArgs<C>): C {
  return new (ctor as unknown as {new(...args: CtorArgs<C>): C})(...args);
}

export namespace Polyhedron {
  // NOTE: types only
  export interface Data {
    readonly halfedge?: unknown;
    readonly edge?: unknown;
    readonly vertex?: unknown;
    readonly facet?: unknown;
  }
}

type Data = Polyhedron.Data;

type H<T extends Data> = T['halfedge'];
type E<T extends Data> = T['edge'];
type V<T extends Data> = T['vertex'];
type F<T extends Data> = T['facet'];

export class Polyhedron<T extends Data> {
  [HALFEDGES] = new Set<Halfedge<T>>();

  constructor() {
    // how to initialize?
    // do we consider holes and "outside"?
    // most trivial non-empty polyhedron has one vertex, one edge, two facets.
    const v1 = make<Vertex<T>>(Vertex, undefined!);
    const h1 = make<Halfedge<T>>(Halfedge, this, undefined!);
    const h2 = make<Halfedge<T>>(Halfedge, this, undefined!);
    const f1 = make<Facet<T>>(Facet, this, undefined!);
    const f2 = make<Facet<T>>(Facet, this, undefined!);
    h1[VERTEX]= h2[VERTEX] = v1;
    v1[INCOMING] = h1;
    h1[TWIN] = h1[NEXT] = h1[PREV] = h2;
    h2[TWIN] = h2[NEXT] = h2[PREV] = h1;
    h1[FACET] = f1;
    h2[FACET] = f2;
    f1[INCIDENT] = h1;
    f2[INCIDENT] = h2;
  }

  get halfedges(): Iterable<Halfedge<T>> {
    return this[HALFEDGES];
  }
}

export class Halfedge<T extends Data> {
  [TWIN]!: Halfedge<T>;
  [NEXT]!: Halfedge<T>;
  [PREV]!: Halfedge<T>;
  [EDGE]!: Edge<T>;
  [FACET]!: Facet<T>;
  [VERTEX]!: Vertex<T>;

  [MODULE_LOCAL_CTOR]!: (parent: Polyhedron<T>, data: H<T>) => Halfedge<T>;
  private constructor(parent: Polyhedron<T>, public data: H<T>) {
    this[PARENT] = parent;
  }

  get twin(): Halfedge<T> {
    return this[TWIN];
  }
  get left(): Facet<T> {
    return this[FACET];
  }
  get leftCcw(): Halfedge<T> {
    return this[NEXT];
  }
  get leftCw(): Halfedge<T> {
    return this[PREV];
  }
  get right(): Facet<T> {
    return this[TWIN][FACET];
  }
  get rightCcw(): Halfedge<T> {
    return this[TWIN][NEXT][TWIN];
  }
  get rightCw(): Halfedge<T> {
    return this[TWIN][PREV][TWIN];
  }
  get dest(): Vertex<T> {
    return this[VERTEX];
  }
  get destCcw(): Halfedge<T> {
    return this[TWIN][PREV];
  }
  get destCw(): Halfedge<T> {
    return this[NEXT][TWIN];
  }
  get orig(): Vertex<T> {
    return this[TWIN][VERTEX];
  }
  get origCcw(): Halfedge<T> {
    return this[PREV][TWIN];
  }
  get origCw(): Halfedge<T> {
    return this[TWIN][NEXT];
  }
  get edge(): Edge<T> {
    return this[EDGE];
  }

  // Given a halfedge h1 pointing to v1
  //   v0 ---h1/h0---> v1
  // Inserts a new vertex v2 in the middle of the edge:
  //   v0 ---h1/h0---> v2 ---h3/h2---> v1
  // Returns the new vertex.  A new edge is also created.
  // New nodes have data copied as follows:
  //   h3 <- h1, h2 <- h0, v2 <- v1, e2 <- e0
  insertVertex(): Vertex<T> {
    const h1 = this;
    const h0 = h1[TWIN];
    const v1 = h1[VERTEX];
    const parent = h1[PARENT];
    const v2 = make<Vertex<T>>(Vertex, v1.data);
    const h2 = new Halfedge(parent, h1.data);
    const h3 = new Halfedge(parent, h0.data);
    const e2 = make<Edge<T>>(Edge, h1[EDGE].data);
    // Now stitch everything together...?
    h2[EDGE] = h3[EDGE] = e2;
    e2[PARENT] = h2;
    h1[VERTEX] = h2[VERTEX] = v2;
    h3[VERTEX] = v1;
    h2[FACET] = h0[FACET];
    h3[FACET] = h1[FACET];
    h2[TWIN] = h3;
    h3[TWIN] = h2;
    h3[NEXT] = h1[NEXT]
    h1[NEXT] = h3;
    h3[NEXT][PREV] = h3;
    h3[PREV] = h1;
    h0[PREV][NEXT] = h2;
    h2[NEXT] = h0;
    h2[PREV] = h0[PREV];
    h0[PREV] = h2;
    v2[INCOMING] = h1;
    v1[INCOMING] = h3;
    parent[HALFEDGES].add(h2);
    parent[HALFEDGES].add(h3);
    return v2;
  }

  // Given a halfedge h1 from v0 to v1 with f1 incident and f0 opposite,
  //           f1
  //   v0 ---h1/h0---> v1
  //           f0
  // Inserts a new facet f2 bounded by a new pair of halfedges h2/h3:
  //            f1
  //      ,---h1/h2---.
  //   v0       f2     -> v1
  //      `---h3/h0---'
  //            f0
  // Returns the new facet.  A new edge is also created.
  // New nodes have data copied as follows:
  //   h3 <- h1, h2 <- h0, v2 <- f1, e3 <- e1
  insertFacet(): Facet<T> {
    const h1 = this;
    const h0 = this[TWIN];
    const f1 = this[FACET];
    const parent = this[PARENT];
    const f2 = make<Facet<T>>(Facet, f1.data);
    const h2 = new Halfedge(parent, this.data);
    const h3 = new Halfedge(parent, h0.data);
    const e3 = make<Edge<T>>(Edge, this[EDGE].data);
    // Now stitch everything together...?
    h2[EDGE] = h1[EDGE];
    h3[EDGE] = h0[EDGE] = e3;
    e3[PARENT] = h3;
    h2[VERTEX] = h0[VERTEX];
    h3[VERTEX] = h1[VERTEX];
    h3[FACET] = h2[FACET] = f2;
    f2[INCIDENT] = h3;
    h2[TWIN] = h1;
    h1[TWIN] = h2;
    h3[TWIN] = h0;
    h0[TWIN] = h3;
    h3[NEXT] = h3[PREV] = h2;
    h2[NEXT] = h2[PREV] = h3;
    parent[HALFEDGES].add(h2);
    parent[HALFEDGES].add(h3);
    return f2;
  }

  // Given a pair of halfedges along the same facet f1, splits
  // the facet by creating a new facet f2.  All halfedges from
  // `this` (exclusive) to `that` (inclusive) will be incident
  // on the new facet.  Creates and returns a new halfedge
  // between the two facets.  The returned halfedge is incident
  // to the same facet f1.
  //    --- o <---h0--- o
  //                    ^
  //                    |
  //      f1            |
  //                    |
  //   ---> o ---h1---> o
  // Then h0.splitFacet(h1) would result in
  //    --- o <---h0--- o
  //          \         ^
  //           ---h3    |
  //      f1    h2\  f2 |
  //               ---  |
  //   ---> o ---h1---> o
  // Returns h2, which points from h1's vertex to h0's vertex.
  splitFacet(that: Halfedge<T>): Halfedge<T> {
    const h1 = this;
    const h0 = that;
    const f1 = h1[FACET];
    if (h0 === h1) throw new Error(`Illegal argument: same halfedge`);
    if (h0[FACET] === f1) throw new Error(`Illegal argument: facet mismatch`);
    const parent = this[PARENT];
    const f2 = make<Facet<T>>(Facet, f1.data);
    const h2 = new Halfedge(parent, this.data);
    const h3 = new Halfedge(parent, h1.data);
    const e3 = make<Edge<T>>(Edge, this[EDGE].data);
    // Now stitch everything together...?
    h3[EDGE] = h2[EDGE] = e3;
    e3[PARENT] = h3;
    let h = h1[NEXT];
    f1[INCIDENT] = h1;
    f2[INCIDENT] = h0;
    do {
      (h = h[NEXT])[FACET] = f2;
    } while (h !== h0 && h !== h1);
    h3[VERTEX] = h1[VERTEX];
    h2[VERTEX] = h0[VERTEX];
    h0[NEXT][PREV] = h2;
    h1[NEXT][PREV] = h3;
    h2[PREV] = h1;
    h3[PREV] = h0;
    h2[NEXT] = h0[NEXT];
    h0[NEXT] = h3;
    h3[NEXT] = h1[NEXT];
    h1[NEXT] = h2;
    h2[TWIN] = h3
    h3[TWIN] = h2;
    parent[HALFEDGES].add(h2);
    parent[HALFEDGES].add(h3);
    return h2;
  }
}

export class Edge<T extends Data> {
  public data: E<T>;
  [PARENT]: Halfedge<T>;
}

export class Vertex<T extends Data> {
  public data: V<T>;
  [INCOMING]: Halfedge<T>;
}

export class Facet<T extends Data> {
  public data: F<T>;
  [INCIDENT]: Halfedge<T>;
}

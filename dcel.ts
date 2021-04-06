// A doubly-connected edge list data structure.
// DCEL allows navigating polyhedra.

declare const MODULE_LOCAL_CTOR: unique symbol;

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
  private _halfedges = new Set<Halfedge<T>>();

  get halfedges(): Iterable<Halfedge<T>> {
    return this._halfedges;
  }
}

export class Halfedge<T extends Data> {
  private _twin!: Halfedge<T>;
  private _next!: Halfedge<T>;
  private _prev!: Halfedge<T>;
  private _edge!: Edge<T>;
  private _facet!: Facet<T>;
  private _vertex!: Vertex<T>;

  [MODULE_LOCAL_CTOR]!: (parent: Polyhedron<T>, data: H<T>) => Halfedge<T>;
  private constructor(private _parent: Polyhedron<T>, public data: H<T>) {}

  get twin(): Halfedge<T> {
    return this._twin;
  }
  get left(): Facet<T> {
    return this._facet;
  }
  get leftCcw(): Halfedge<T> {
    return this._next;
  }
  get leftCw(): Halfedge<T> {
    return this._prev;
  }
  get right(): Facet<T> {
    return this._twin._facet;
  }
  get rightCcw(): Halfedge<T> {
    return this._twin._next._twin;
  }
  get rightCw(): Halfedge<T> {
    return this._twin._prev._twin;
  }
  get dest(): Vertex<T> {
    return this._vertex;
  }
  get destCcw(): Halfedge<T> {
    return this._twin._prev;
  }
  get destCw(): Halfedge<T> {
    return this._next._twin;
  }
  get orig(): Vertex<T> {
    return this._twin._vertex;
  }
  get origCcw(): Halfedge<T> {
    return this._prev._twin;
  }
  get origCw(): Halfedge<T> {
    return this._twin._next;
  }
  get edge(): Edge<T> {
    return this._edge;
  }

  // Given a halfedge h1 pointing to v1
  //   v0 ---h1/h0---> v1
  // Inserts a new vertex v2 in the middle of the edge:
  //   v0 ---h1/h0---> v2 ---h3/h2---> v1
  // Returns the new vertex.  A new edge is also created.
  // New nodes have data copied as follows:
  //   h3 <- h1, h2 <- h0, v2 <- v1, e2 <- e0
  insertVertex(): Vertex<T> {
    const v2 = make<Vertex<T>>(Vertex, this._vertex.data);
    const h2 = new Halfedge(this._parent, this.data);
    const h3 = new Halfedge(this._parent, this._twin.data);
    const e2 = new Edge(this._edge.data);
    // Now stitch everything together...?
  }


  // TODO - operations to mutate/build

}

export class Edge<T extends Data> {
  public data: E<T>;
}

export class Vertex<T extends Data> {
  public data: V<T>;
  private _incoming: Halfedge<T>;
}

export class Facet<T extends Data> {
  public data: F<T>;
  private _incident: Halfedge<T>;
}

import {Grid} from '../grid';

describe('Grid', () => {
  it('should create a simple 2x2 grid', () => {
    const grid = new Grid(2, 2);
    expect(grid.cells.length).toEqual(5);
    expect(grid.vertices.length).toEqual(9);
    expect(grid.edges.length).toEqual(12);
    expect(grid.halfedges.length).toEqual(24);
  });

  it('should create a simple 3x3 grid', () => {
    const grid = new Grid(3, 3);
    expect(grid.cells.length).toEqual(10);
    expect(grid.vertices.length).toEqual(16);
    expect(grid.edges.length).toEqual(24);
    expect(grid.halfedges.length).toEqual(48);
  });

  // TODO - test more?
});

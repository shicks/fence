import { Fence } from './fence.js';
import { show } from './node.js';

let s1 = Fence.create(10, 10, {
  slitherlink: [[3, 4, 2],
                [5, 4, 0],
                [4, 5, 2],
                [4, 1, 3],
                [6, 3, 2],
                [9, 9, 3],
                [9, 0, 1],
                [1, 7, 3],
                [3, 7, 1],
                [6, 6, 3],
                [6, 7, 3],
                [7, 8, 3],
                [2, 5, 3],
                [2, 6, 0],
                [2, 2, 3],
                [3, 2, 0]]});

let s2 = Fence.create(7, 7, {
  slitherlink: [[0, 0, 2],
                [0, 1, 2],
                [0, 2, 2],
                [0, 3, 3],
                [0, 4, 3],
                [0, 5, 1],
                [1, 2, 0],
                [1, 3, 2],
                [1, 5, 3],
                [3, 0, 3],
                [3, 1, 3],
                [3, 4, 3],
                [3, 5, 3],
                [4, 2, 2],
                [4, 4, 2],
                [5, 0, 3],
                [5, 2, 2],
                [5, 4, 2],
                [5, 5, 2],
                [6, 0, 3],
                [6, 2, 2],
                [6, 5, 3]]});

let s3 = Fence.create(7, 7, {
  masyu: [[1, 1],
          [1, 3],
          [2, 2],
          [2, 3],
          [2, 6],
          [2, 7],
          [3, 1],
          [3, 3],
          [3, 6],
          [4, 0, true],
          [5, 7],
          [6, 1],
          [6, 2],
          [6, 3],
          [6, 4],
          [6, 5]]});

function masyu(height: number, str: string): Fence {
  const width = str.length / height;
  const enumerated: [string, number, number][] = [...str].map((c, i) => [c, Math.floor(i / width), i % width]);
  return Fence.create(height - 1, width - 1, {masyu: enumerated.flatMap(([c, y, x]) => c === '_' ? [] : [[y, x, c === '@']])});
}

let s3a = Fence.create(14, 12, {
  masyu: [[0, 1],
          [0, 3],
          [0, 6],
          [0, 11],
          [1, 2],
          [1, 6],
          [1, 11],
          [2, 1],
          [2, 6],
          [2, 8],
          [2, 11],
          [3, 1],
          [3, 4],
          [3, 6],
          [3, 8],
          [4, 1],
          [4, 2],
          [4, 7],
          [4, 11],
          [5, 8],
          [5, 11],
          [6, 1],
          [6, 3],
          [6, 6],
          [6, 11],
          [7, 2],
          [7, 5],
          [7, 7],
          [7, 10],
          [8, 1],
          [8, 2],
          [8, 7],
          [8, 10],
          [9, 1],
          [9, 4],
          [9, 6],
          [9, 7],
          [9, 10],
          [10, 1],
          [10, 2],
          [10, 4],
          [10, 9],
          [11, 1, true],
          [11, 6],
          [11, 7],
          [11, 8],
          [11, 9],
          [12, 11],
          [13, 0],
          [13, 6],
          [13, 8, true],
          [13, 12],
          [14, 2, true],
          [14, 4, true],
          [14, 10, true]]});

s3a = masyu(15, '_O___@___O_O____OO_____O__O______OO______OO___O_O__________OO___@_____@_O_____@_O________O_@_O__O_O_O_O___O__O_O_O_________@_O___@_O___OO_O_____O_OO___O___O_O__@___OO____O_O______________O_O___@_');

let [] = [s1, s2, s3, s3a];
let s = s3a;

let s0!: Fence;
let i = 0;
s = s.handleInitialCases();
while (s !== s0) {
  s0 = s;
  s = s.iterateToFixedPoint();
  console.log(show(s), '\n');
  s = s.slowCheck();
  console.log(show(s), '\n');
  if (i++ > 100) break;
}
//(PersistentBinaryUnionFind as any).EXPECT_FROZEN = true;
//(s as any).EXPECT_FROZEN = true;
//s.rangeCheck();
//s.vertexCheck();

// , c => {const r=s.range(c.y,c.x);return r.join(',');}
// console.log(show(s));

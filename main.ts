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

function slitherlink(height: number, str: string): Fence {
  const width = str.length / height;
  const enumerated: [string, number, number][] = [...str].map((c, i) => [c, Math.floor(i / width), i % width]);
  return Fence.create(height, width, {slitherlink: enumerated.flatMap(([c, y, x]) => c === '.' ? [] : [[y, x, Number(c)]])});
}

function corral(height: number, str: string): Fence {
  const width = str.length / height;
  const enumerated: [string, number, number][] = [...str].map((c, i) => [c, Math.floor(i / width), i % width]);
  return Fence.create(height, width, {corral: enumerated.flatMap(([c, y, x]) => c === '.' ? [] : [[y, x, c === '$' ? true : c === '&' ? false : c.charCodeAt(0) - 64]])});
}

function area51(height: number, str: string): Fence {
  // string is concatenated: hw + (h+1)(w+1) = 2hw + h + w + 1
  // thus given h and L = 2hw + h + w + 1, compute w = (L - h - 1) / (2h + 1)
  const width = (str.length - height - 1) / (2 * height + 1);
  if (!Number.isSafeInteger(width)) {
    throw new Error(`Bad length for height: ${width}`);
  }
  const cs: [string, number, number][] = [...str.substring(0, height * width)]
      .map((c, i) => [c, Math.floor(i / width), i % width]);
  const vs: [string, number, number][] = [...str.substring(height * width)]
      .map((c, i) => [c, Math.floor(i / (width + 1)), i % (width + 1)]);
  return Fence.create(height, width, {
    slitherlink: cs.flatMap(([c, y, x]) => c === '.' ? [] : [[y, x, Number(c)]]),
    masyu: vs.flatMap(([c, y, x]) => c === '_' ? [] : [[y, x, c === '@']]),
    corral: cs.flatMap(([c, y, x]) => c === '.' ? [] : [[y, x, c === '$' ? true : c === '&' ? false : c.charCodeAt(0) - 64]]),
  });  
}

let s3a!: Fence;
s3a = masyu(15, '_O___@___O_O____OO_____O__O______OO______OO___O_O__________OO___@_____@_O_____@_O________O_@_O__O_O_O_O___O__O_O_O_________@_O___@_O___OO_O_____O_OO___O___O_O__@___OO____O_O______________O_O___@_');
s3a = masyu(15, '___@__O_____@O___O_O_OOO___O_______O____@_@__OO_____O_________O_O____OO___O_______@___O___O_@______OO_____@___OO______O____O_OOO_O____O____________O__O___O_O_O__O_O___O________O_@_____@_@@____O__');

s3a = slitherlink(20, '2....2.2.1.2.22.33....2.3...3.32....1.1212..223..2...22.32..1.2..2..22.......22.2..1...33....213.1..1..22...13....31.3...32.....2..32..10..33.3..21..3...3.23.2.2..2.2.1..1....2.1....2..22331..33..2...213..2...2.....3..32....3...11.2..0.1..3..3.232..32...2.2.2..3.2.2.232.3.....2.3.3...12..2.....123..2.2..21....33.2.3.02..3...3.2.2..2.2..2..1.....2..0.21.2......1.3121..232.3..2..3.21....22...22..32.');

s3a = corral(22, '$$&.$&$..G.$....G$.$..F...&$.$...$&.&$...&$....F...$&.&...........X.U.......$...&...&.&.&.&.$....E..N&$$.....G&..B....&........&.$..$B&....&....I.&..P.......K..&D..$.F...$$.$&..&......&...&&.E..$.&......&....$$$....&..........&&..&$&...B..$G..&..$H&....&......$&..&&...&.&..$..D.....$$.&$&J.&.&$...&...&...&..$.O..&.H...R...&.$....CG.&E&...&.H.E..&$......G...&$.&....&....$&.&.....&...&.P...$.$..S..&.$&.&$....$&D.$..B');

s3a = corral(12, '...J....&$.&...&.$..E.&...G&.$.......$$.&.$&$&.&.$..I...M.&.$$.$...I.......E&$......J...J.....&.&..$....G....&&&$&.....$');

s3a = area51(8, '3.3.3....3..$3.3.H......2.....2....3.30...3&..2..1.......2.3..2.____________O_____O_____________O____________O_____________O______________O_____@');

let [] = [s1, s2, s3, s3a];
let s = s3a;

let s0!: Fence;
let i = 0;
s = s.handleInitialCases();
while (s !== s0) {
  s0 = s;
  s = s.iterateToFixedPoint();
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

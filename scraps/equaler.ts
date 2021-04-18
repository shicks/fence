export interface Equaler {
  equal: (left: unknown, right: unknown) => boolean;
  hash: (arg: unknown) => number;
  toString?: () => string;
}

const EQUALS: unique symbol = Symbol('Equaler.equals');
const HASH_CODE: unique symbol = Symbol('Equaler.hashCode');
const INTS_BUFFER = new Uint32Array(2);
const DBLS_BUFFER = new Float64Array(INTS_BUFFER.buffer);

type uint32 = number;

function numberHash(arg: number): uint32 {
  if (arg === (arg | 0)) return arg >>> 0;
  DBLS_BUFFER[0] = arg;
  return (INTS_BUFFER[0] ^ INTS_BUFFER[1]) >>> 0;
}

function stringHash(arg: string): uint32 {
  let hash = 0;
  for (let i = arg.length - 1; i >= 0; i--) {
    hash = (hash * 31 + arg.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// These are just the complements of their string forms' hashes.
const undefinedHash = (arg: undefined): uint32 => 0xa586d46f;
const booleanHash = (arg: boolean): uint32 => arg ? 0xffd0510d : 0xfa3ad1dc;
const nullHash = (arg: null): uint32 => 0xffcd43e6;

const toBigint: (arg: number) => bigint =
    typeof BigInt === 'function' ? BigInt : () => null!;

const WORD = toBigint(32);
const MASK = toBigint(0xffffffff);

function bigintHash(arg: bigint): uint32 {
  let hash = 0;
  if (arg < 0) {
    hash = 0xffffffff;
    arg = ~arg;
  }
  while (arg) {
    hash ^= Number(arg & MASK);
    arg >>= WORD;
  }
  return hash;
}

const SYMBOLS = {}; // NOTE: leaky
const OBJECTS = new WeakMap<object, number>();
let index = 0x11111111;

function symbolHash(arg: symbol): uint32 {
  return SYMBOLS[arg] || (SYMBOLS[arg] = index++);
}

function objectIdentityHash(arg: object): uint32 {
  return OBJECTS.get(arg) || (OBJECTS.set(arg, index), index++);
}

function objectNaturalHash(arg: object): uint32 {
  const hashCode = arg[Equaler.hashCode];
  return hashCode ? hashCode.call(arg) :
      OBJECTS.get(arg) || (OBJECTS.set(arg, index), index++);
}

// `typeof` can return any of the following:
//   * undefined  => n (14 = 0x0e)
//   * number     => u (21 = 0x15)
//   * string     => t (20 = 0x14)
//   * boolean    => o (15 = 0x0f)
//   * bigint     => i ( 9 = 0x09)
//   * symbol     => y (25 = 0x19)
//   * object     => b ( 2 = 0x02)
//   * function
// The 2nd char is a unique index.
const HASHERS: Array<(arg: any) => uint32> = [
  ,, nullHash,,,,,,, bigintHash,,,,,
  undefinedHash, booleanHash,,,,, stringHash, numberHash,,,, symbolHash];
const PROTOTYPE_HASHERS = new Map<object, (arg: any) => uint32>([
  [Boolean.prototype, booleanHash],
  [String.prototype, stringHash],
  [Number.prototype, numberHash],
  [Symbol.prototype, symbolHash]]);

function identityHash(arg: unknown) {
  return (arg ? (PROTOTYPE_HASHERS.get(Object.getPrototypeOf(arg)) || objectIdentityHash) : HASHERS[(typeof arg).charCodeAt(1) & 7])(arg);    
}

function naturalHash(arg: unknown) {
  return (arg ? (PROTOTYPE_HASHERS.get(Object.getPrototypeOf(arg)) || objectNaturalHash) : HASHERS[(typeof arg).charCodeAt(1) & 7])(arg);    
}

interface Natural {
  [EQUALS]: (arg: unknown) => boolean;
  [HASH_CODE]: () => uint32;
}

export namespace Equaler {
  export const equals = EQUALS;
  export const hashCode = HASH_CODE;
  export const natural: Equaler = {
    equal: (left: unknown, right: unknown): boolean => {
      if (!left) return left === right || left !== left && right !== right;
      if (typeof left[EQUALS] === 'function') return (left as Natural)[EQUALS](right);
      return left === right;
    },
    hash: naturalHash,
    toString: () => 'Equaler.natural',
  };
  export const identity: Equaler = {
    equal: (left: unknown, right: unknown): boolean =>
        left === right || left !== left && right !== right,
    hash: identityHash,
    toString: () => 'Equaler.identity',
  };
  export function hash(...args: unknown[]): uint32 {
    let hash = 0;
    for (const arg of args) {
      hash = (31 * hash + naturalHash(arg)) >>> 0;
    }
    return hash;
  }
}

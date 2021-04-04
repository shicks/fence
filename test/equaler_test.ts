import {Equaler} from '../equaler';
import {EqualsTester} from '../equals-tester';

describe('Equaler.identity', () => {
  it('should work with simple types', () => {
    new EqualsTester(Equaler.identity)
      .addEqualityGroup(0, -0)
      .addEqualityGroup(1)
      .addEqualityGroup(-1)
      .addEqualityGroup(NaN, 0 / 0)
      .addEqualityGroup('')
      .addEqualityGroup('x')
      .addEqualityGroup(false)
      .addEqualityGroup(true)
      .addEqualityGroup(null)
      .addEqualityGroup(undefined)
      .addEqualityGroup(Symbol('x'))
      .addEqualityGroup(Symbol('x'))
      .addEqualityGroup({})
      .addEqualityGroup({})
      .testEqualsAndHashCode();
  });
});

describe('Equaler.natural', () => {
  it('should work with simple types', () => {
    class Point {
      constructor(readonly x: number, readonly y: number) {}
      [Equaler.equals](other: unknown): boolean {
        return other instanceof Point && other.x === this.x && other.y === this.y;
      }
      [Equaler.hashCode](): number {
        return Equaler.hash(this.x, this.y);
      }
    }
    new EqualsTester(Equaler.natural)
      .addEqualityGroup(0, -0)
      .addEqualityGroup(1)
      .addEqualityGroup(-1)
      .addEqualityGroup(NaN, 0 / 0)
      .addEqualityGroup('')
      .addEqualityGroup('x')
      .addEqualityGroup(false)
      .addEqualityGroup(true)
      .addEqualityGroup(null)
      .addEqualityGroup(undefined)
      .addEqualityGroup(Symbol('x'))
      .addEqualityGroup(Symbol('x'))
      .addEqualityGroup({})
      .addEqualityGroup({})
      .addEqualityGroup(new Point(2, 3), new Point(2, 3))
      .addEqualityGroup(new Point(2, 4))
      .addEqualityGroup(new Point(1, 3))
      .testEqualsAndHashCode();
  });
});


import { pathFinding } from '../src';

const { getChebyshevDistanceField: field } = pathFinding;

describe('八邻最近来源距离场', () => {
  test('来源为零、空来源为Infinity，行和调用间没有共享可写结果', () => {
    expect(field(3, 2, [[0, 0]])).toEqual([[0, 1, 2], [1, 1, 2]]);
    expect(field(1, 1, [[0, 0]])).toEqual([[0]]);
    const empty = field(2, 2, []);
    expect(empty).toEqual([[Infinity, Infinity], [Infinity, Infinity]]);
    empty[0][0] = 9;
    expect(empty[1][0]).toBe(Infinity);
    expect(field(2, 2, [])[0][0]).toBe(Infinity);
  });

  test('横纵窄图、多来源和四边角逐格符合独立距离公式，顺序及重复不影响结果', () => {
    for (const [width, height] of [[1, 7], [8, 1], [3, 5], [7, 4]]) {
      const grids = Array.from({ length: width * height }, (_, i) => [i % width, Math.floor(i / width)]);
      for (const source of grids) {
        for (const sources of [[source], [source, [width - 1, height - 1], [0, height - 1], [width - 1, 0]]]) {
          const expected = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) =>
            Math.min(...sources.map(([sx, sy]) => Math.max(Math.abs(x - sx), Math.abs(y - sy))))));
          expect(field(width, height, sources)).toEqual(expected);
          expect(field(width, height, [...sources].reverse().concat(sources))).toEqual(expected);
        }
      }
    }
  });

  test('冻结来源可以调用，结果变化不回写来源', () => {
    const sources = Object.freeze([Object.freeze([1, 2]), Object.freeze([3, 0])]);
    field(4, 3, sources)[2][1] = 7;
    expect(sources).toEqual([[1, 2], [3, 0]]);
  });

  test.each([
    ['3', 2, [], TypeError], [3.5, 2, [], TypeError], [2, NaN, [], TypeError],
    [Infinity, 2, [], TypeError], [Number.MAX_SAFE_INTEGER + 1, 2, [], TypeError],
    [0, 2, [], RangeError], [2, -1, [], RangeError], [2, 2, null, TypeError],
    [2, 2, {}, TypeError], [2, 2, [null], TypeError], [2, 2, [[0]], TypeError],
    [2, 2, [[0, 0, 0]], TypeError], [2, 2, [[0, '1']], TypeError],
    [2, 2, [[0.5, 0]], TypeError], [2, 2, [[, 0]], TypeError],
    [2, 2, [[-1, 0]], RangeError], [2, 2, [[2, 0]], RangeError], [2, 2, [[0, 2]], RangeError],
  ])('拒绝非法参数 (%p, %p, %p)', (width, height, sources, error) => {
    expect(() => field(width, height, sources)).toThrow(error);
  });
});

import aStarElevation, { getElevationAwareNeighbors } from '../src/elevation/a-star-elevation';
import ElevationMap from '../src/elevation/elevation-map';
import { getNeighbors as getRhombusNeighbors } from '../src/shapes/rhombus';

/* 构建菱形布局邻居获取器，限制在指定范围内 */
function makeRhombusNeighborsFn(range = 20) {
  return function getNeighbors(currXyNum) {
    const [cx, cy] = currXyNum;
    return getRhombusNeighbors([cx, cy]).filter(([x, y]) => {
      return Math.abs(x) <= range && Math.abs(y) <= range;
    });
  };
}

describe('getElevationAwareNeighbors - 海拔过滤', () => {
  test('海拔差为 0 时正常返回邻居', () => {
    const map = new ElevationMap([5, 5], 0);
    const baseFn = makeRhombusNeighborsFn(5);
    const neighbors = getElevationAwareNeighbors([0, 0], map, baseFn, {});
    expect(neighbors.length).toBeGreaterThan(0);
  });

  test('海拔差为 1 时邻居可通行但成本增加', () => {
    const map = new ElevationMap([5, 5], 0);
    map.set(0, 1, 1); // 邻居海拔高 1
    const baseFn = ([x, y]) => getRhombusNeighbors([x, y]).filter(([nx, ny]) => Math.abs(nx) <= 5 && Math.abs(ny) <= 5);
    const neighbors = getElevationAwareNeighbors([0, 0], map, baseFn, {
      maxElevationDiff: 1,
      slopeCostMultiplier: 2,
    });
    // 找到 [0, 1] 邻居
    const nei01 = neighbors.find(n => n[0] === 0 && n[1] === 1);
    expect(nei01).toBeDefined();
    // 斜坡成本应为 2（基础成本 1 × 倍数 2）
    expect(nei01[2]).toBe(2);
  });

  test('海拔差 > maxElevationDiff 时邻居被过滤', () => {
    const map = new ElevationMap([5, 5], 0);
    map.set(0, 1, 3); // 邻居海拔高 3
    const baseFn = ([x, y]) => getRhombusNeighbors([x, y]).filter(([nx, ny]) => Math.abs(nx) <= 5 && Math.abs(ny) <= 5);
    const neighbors = getElevationAwareNeighbors([0, 0], map, baseFn, {
      maxElevationDiff: 1,
    });
    // [0, 1] 不应在结果中
    const nei01 = neighbors.find(n => n[0] === 0 && n[1] === 1);
    expect(nei01).toBeUndefined();
  });

  test('不可通行海拔值列表中的邻居被过滤', () => {
    const map = new ElevationMap([5, 5], 0);
    map.set(0, 1, 5); // 邻居海拔 5
    const baseFn = ([x, y]) => getRhombusNeighbors([x, y]).filter(([nx, ny]) => Math.abs(nx) <= 5 && Math.abs(ny) <= 5);
    const neighbors = getElevationAwareNeighbors([0, 0], map, baseFn, {
      maxElevationDiff: 10,
      unwalkableElevations: [5],
    });
    const nei01 = neighbors.find(n => n[0] === 0 && n[1] === 1);
    expect(nei01).toBeUndefined();
  });
});

describe('aStarElevation - 基础寻路', () => {
  test('起止点相同时直接返回该点', () => {
    const map = new ElevationMap([10, 10], 0);
    const baseFn = makeRhombusNeighborsFn(10);
    const path = aStarElevation([0, 0], [0, 0], map, baseFn, {});
    expect(path).not.toBeNull();
    expect(path).toHaveLength(1);
  });

  test('平地寻路找到路径', () => {
    const map = new ElevationMap([10, 10], 0);
    const baseFn = makeRhombusNeighborsFn(10);
    const path = aStarElevation([0, 0], [2, 0], map, baseFn, {});
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(0);
    const last = path[path.length - 1];
    expect(last[0]).toBe(2);
    expect(last[1]).toBe(0);
  });
});

describe('aStarElevation - 海拔约束', () => {
  test('海拔差为 1 的斜坡可通行', () => {
    const map = new ElevationMap([10, 10], 0);
    map.set(1, 0, 1); // 中间有 1 级斜坡
    const baseFn = makeRhombusNeighborsFn(10);
    const path = aStarElevation([0, 0], [2, 0], map, baseFn, {
      maxElevationDiff: 1,
      slopeCostMultiplier: 2,
    });
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(0);
  });

  test('悬崖阻挡寻路返回 null 或迂回路径', () => {
    const map = new ElevationMap([10, 10], 0);
    // 在 [1, 0] 设置高海拔，形成悬崖
    map.set(1, 0, 5);
    const baseFn = makeRhombusNeighborsFn(10);
    const path = aStarElevation([0, 0], [2, 0], map, baseFn, {
      maxElevationDiff: 1,
    });
    // 路径不应经过 [1, 0]
    if (path !== null) {
      const keys = new Set(path.map(([x, y]) => `${x}_${y}`));
      expect(keys.has('1_0')).toBe(false);
    }
  });

  test('不可通行海拔值阻挡寻路', () => {
    const map = new ElevationMap([10, 10], 0);
    map.set(1, 0, 3); // 海拔 3 标记为不可通行
    const baseFn = makeRhombusNeighborsFn(10);
    const path = aStarElevation([0, 0], [2, 0], map, baseFn, {
      maxElevationDiff: 10,
      unwalkableElevations: [3],
    });
    if (path !== null) {
      const keys = new Set(path.map(([x, y]) => `${x}_${y}`));
      expect(keys.has('1_0')).toBe(false);
    }
  });
});

describe('aStarElevation - 路径属性', () => {
  test('路径中每个点包含 cost 信息', () => {
    const map = new ElevationMap([10, 10], 0);
    const baseFn = makeRhombusNeighborsFn(10);
    const path = aStarElevation([0, 0], [2, 0], map, baseFn, {});
    expect(path).not.toBeNull();
    path.forEach(point => {
      expect(point).toHaveLength(3);
      expect(typeof point[2]).toBe('number');
    });
  });

  test('斜坡路径 cost 高于平地路径', () => {
    const mapFlat = new ElevationMap([10, 10], 0);
    const mapSlope = new ElevationMap([10, 10], 0);
    mapSlope.set(1, 0, 1);
    const baseFn = makeRhombusNeighborsFn(10);
    const pathFlat = aStarElevation([0, 0], [2, 0], mapFlat, baseFn, {});
    const pathSlope = aStarElevation([0, 0], [2, 0], mapSlope, baseFn, {
      slopeCostMultiplier: 3,
    });
    expect(pathFlat).not.toBeNull();
    expect(pathSlope).not.toBeNull();
    // 斜坡路径总成本应高于平地路径
    const costFlat = pathFlat[pathFlat.length - 1][2];
    const costSlope = pathSlope[pathSlope.length - 1][2];
    expect(costSlope).toBeGreaterThan(costFlat);
  });
});
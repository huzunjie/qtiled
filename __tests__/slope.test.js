import {
  SLOPE_TYPES,
  SLOPE_DIRECTIONS,
  getSlopeType,
  detectSlopes,
  isWalkable,
  getSlopeCost,
} from '../src/elevation/slope';
import ElevationMap from '../src/elevation/elevation-map';

describe('slope - 常量定义', () => {
  test('SLOPE_TYPES 包含所有类型', () => {
    expect(SLOPE_TYPES.NONE).toBe(0);
    expect(SLOPE_TYPES.UP).toBe(1);
    expect(SLOPE_TYPES.DOWN).toBe(-1);
    expect(SLOPE_TYPES.EDGE).toBe(2);
    expect(SLOPE_TYPES.CLIFF).toBe(3);
  });

  test('SLOPE_DIRECTIONS 包含 8 个方向', () => {
    expect(Object.keys(SLOPE_DIRECTIONS)).toHaveLength(8);
  });
});

describe('getSlopeType - 平地', () => {
  test('所有邻居海拔相同时返回 NONE', () => {
    const map = new ElevationMap([3, 3], 0);
    const neighbors = [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1]];
    const result = getSlopeType(0, 0, map, neighbors);
    expect(result.type).toBe(SLOPE_TYPES.NONE);
    expect(result.diff).toBe(0);
  });
});

describe('getSlopeType - 上坡', () => {
  test('邻居海拔高于当前瓦片时返回 UP', () => {
    const map = new ElevationMap([3, 3], 0);
    map.set(1, 0, 1);
    const neighbors = [[1, 0]];
    const result = getSlopeType(0, 0, map, neighbors);
    expect(result.type).toBe(SLOPE_TYPES.UP);
    expect(result.diff).toBe(1);
  });
});

describe('getSlopeType - 下坡', () => {
  test('邻居海拔低于当前瓦片时返回 DOWN', () => {
    const map = new ElevationMap([3, 3], 0);
    map.set(0, 0, 1);
    const neighbors = [[1, 0]];
    const result = getSlopeType(0, 0, map, neighbors);
    expect(result.type).toBe(SLOPE_TYPES.DOWN);
    expect(result.diff).toBe(1);
  });
});

describe('getSlopeType - 边缘', () => {
  test('同时存在上坡和下坡时返回 EDGE', () => {
    const map = new ElevationMap([3, 3], 0);
    map.set(1, 0, 1);  // 上坡
    map.set(-1, 0, -1); // 下坡（越界，不参与计算）
    // 使用两个有效邻居：一个高、一个低
    const neighbors = [[1, 0], [0, 1]];
    map.set(0, 1, -1);
    const result = getSlopeType(0, 0, map, neighbors);
    expect(result.type).toBe(SLOPE_TYPES.EDGE);
  });
});

describe('getSlopeType - 悬崖', () => {
  test('海拔差 > 1 时返回 CLIFF', () => {
    const map = new ElevationMap([3, 3], 0);
    map.set(1, 0, 3);
    const neighbors = [[1, 0]];
    const result = getSlopeType(0, 0, map, neighbors);
    expect(result.type).toBe(SLOPE_TYPES.CLIFF);
    expect(result.diff).toBe(3);
  });
});

describe('detectSlopes - 自动检测', () => {
  test('检测地图中所有斜坡', () => {
    const map = new ElevationMap([3, 3], 0);
    map.set(1, 1, 1);
    // 简单邻居获取器
    const getNeighbors = ([x, y]) => [
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
      [x, y - 1],
    ];
    const slopes = detectSlopes(map, getNeighbors);
    // (1,1) 周围的邻居都是斜坡
    expect(slopes.size).toBeGreaterThan(0);
  });
});

describe('isWalkable - 通行性', () => {
  test('平地可通行', () => {
    const map = new ElevationMap([3, 3], 0);
    expect(isWalkable(0, 0, map, [])).toBe(true);
  });

  test('斜坡可通行', () => {
    const map = new ElevationMap([3, 3], 0);
    map.set(1, 0, 1);
    expect(isWalkable(0, 0, map, [[1, 0]])).toBe(true);
  });

  test('悬崖不可通行', () => {
    const map = new ElevationMap([3, 3], 0);
    map.set(1, 0, 3);
    expect(isWalkable(0, 0, map, [[1, 0]])).toBe(false);
  });
});

describe('getSlopeCost - 通行成本', () => {
  test('平地成本为 1', () => {
    const map = new ElevationMap([3, 3], 0);
    expect(getSlopeCost(0, 0, map, [])).toBe(1);
  });

  test('斜坡成本为倍数', () => {
    const map = new ElevationMap([3, 3], 0);
    map.set(1, 0, 1);
    expect(getSlopeCost(0, 0, map, [[1, 0]], 2)).toBe(2);
    expect(getSlopeCost(0, 0, map, [[1, 0]], 3)).toBe(3);
  });

  test('悬崖成本为 Infinity', () => {
    const map = new ElevationMap([3, 3], 0);
    map.set(1, 0, 3);
    expect(getSlopeCost(0, 0, map, [[1, 0]])).toBe(Infinity);
  });
});
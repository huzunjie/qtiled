import ElevationMap from '../src/elevation/elevation-map';

describe('ElevationMap - 基础功能', () => {
  test('默认构造创建空地图', () => {
    const map = new ElevationMap();
    expect(map.width).toBe(0);
    expect(map.height).toBe(0);
    expect(map.defaultElevation).toBe(0);
  });

  test('指定尺寸和默认海拔构造', () => {
    const map = new ElevationMap([5, 3], 1);
    expect(map.width).toBe(5);
    expect(map.height).toBe(3);
    expect(map.defaultElevation).toBe(1);
  });

  test('get 返回默认海拔值', () => {
    const map = new ElevationMap([5, 5], 0);
    expect(map.get(2, 3)).toBe(0);
  });

  test('set 和 get 正确存取', () => {
    const map = new ElevationMap([5, 5], 0);
    map.set(2, 3, 2);
    expect(map.get(2, 3)).toBe(2);
    // 未设置的瓦片仍返回默认值
    expect(map.get(0, 0)).toBe(0);
  });

  test('set 支持链式调用', () => {
    const map = new ElevationMap([5, 5], 0);
    map.set(0, 0, 1).set(1, 1, 2).set(2, 2, 3);
    expect(map.get(0, 0)).toBe(1);
    expect(map.get(1, 1)).toBe(2);
    expect(map.get(2, 2)).toBe(3);
  });

  test('setBatch 批量设置', () => {
    const map = new ElevationMap([5, 5], 0);
    map.setBatch([[0, 0, 1], [1, 1, 2], [2, 2, 3]]);
    expect(map.get(0, 0)).toBe(1);
    expect(map.get(1, 1)).toBe(2);
    expect(map.get(2, 2)).toBe(3);
  });
});

describe('ElevationMap - 边界判断', () => {
  test('inBounds 正确判断范围内坐标', () => {
    const map = new ElevationMap([5, 5], 0);
    expect(map.inBounds(0, 0)).toBe(true);
    expect(map.inBounds(4, 4)).toBe(true);
    expect(map.inBounds(5, 0)).toBe(false);
    expect(map.inBounds(0, 5)).toBe(false);
    expect(map.inBounds(-1, 0)).toBe(false);
  });
});

describe('ElevationMap - 海拔范围', () => {
  test('getMaxElevation 和 getMinElevation 返回正确值', () => {
    const map = new ElevationMap([5, 5], 0);
    map.set(0, 0, 3);
    map.set(1, 1, -2);
    map.set(2, 2, 1);
    expect(map.getMaxElevation()).toBe(3);
    expect(map.getMinElevation()).toBe(-2);
  });

  test('全默认海拔时 max 和 min 等于默认值', () => {
    const map = new ElevationMap([3, 3], 2);
    expect(map.getMaxElevation()).toBe(2);
    expect(map.getMinElevation()).toBe(2);
  });
});

describe('ElevationMap - 海拔差', () => {
  test('getDiffs 返回相邻瓦片海拔差', () => {
    const map = new ElevationMap([5, 5], 0);
    map.set(1, 0, 1);
    map.set(0, 1, -1);
    const diffs = map.getDiffs(0, 0, [[1, 0], [0, 1], [-1, 0], [0, -1]]);
    // [1, 0] 海拔 1，差值 1
    expect(diffs[0]).toEqual([1, 0, 1]);
    // [0, 1] 海拔 -1，差值 -1
    expect(diffs[1]).toEqual([0, 1, -1]);
    // [-1, 0] 越界，diff 为 null
    expect(diffs[2][2]).toBeNull();
  });
});

describe('ElevationMap - 平整区域验证', () => {
  test('validateFlatArea 平整区域返回 true', () => {
    const map = new ElevationMap([5, 5], 0);
    expect(map.validateFlatArea(0, 0, 3, 3)).toBe(true);
  });

  test('validateFlatArea 非平整区域返回 false', () => {
    const map = new ElevationMap([5, 5], 0);
    map.set(1, 1, 2);
    expect(map.validateFlatArea(0, 0, 3, 3)).toBe(false);
  });

  test('validateFlatArea 单瓦片始终为 true', () => {
    const map = new ElevationMap([5, 5], 0);
    map.set(2, 2, 5);
    expect(map.validateFlatArea(2, 2, 1, 1)).toBe(true);
  });
});

describe('ElevationMap - 海拔分组', () => {
  test('getElevationGroups 按海拔值分组', () => {
    const map = new ElevationMap([3, 2], 0);
    map.set(0, 0, 1);
    map.set(1, 0, 1);
    map.set(2, 0, 2);
    const groups = map.getElevationGroups();
    expect(groups['0']).toHaveLength(3);
    expect(groups['1']).toHaveLength(2);
    expect(groups['2']).toHaveLength(1);
  });
});

describe('ElevationMap - 序列化', () => {
  test('toArray 和 fromArray 正确转换', () => {
    const map = new ElevationMap([3, 2], 0);
    map.set(0, 0, 1);
    map.set(1, 1, 2);
    const arr = map.toArray();
    expect(arr).toEqual([[1, 0, 0], [0, 2, 0]]);

    const map2 = new ElevationMap();
    map2.fromArray(arr);
    expect(map2.width).toBe(3);
    expect(map2.height).toBe(2);
    expect(map2.get(0, 0)).toBe(1);
    expect(map2.get(1, 1)).toBe(2);
  });

  test('toJSON 和 fromJSON 正确转换', () => {
    const map = new ElevationMap([3, 2], 0);
    map.set(0, 0, 1);
    map.set(1, 1, 2);
    const json = map.toJSON();
    expect(json.width).toBe(3);
    expect(json.height).toBe(2);
    expect(json.defaultElevation).toBe(0);
    expect(json.data['0_0']).toBe(1);
    expect(json.data['1_1']).toBe(2);

    const map2 = new ElevationMap();
    map2.fromJSON(json);
    expect(map2.width).toBe(3);
    expect(map2.height).toBe(2);
    expect(map2.get(0, 0)).toBe(1);
    expect(map2.get(1, 1)).toBe(2);
    expect(map2.getMaxElevation()).toBe(2);
  });
});

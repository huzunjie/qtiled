import {
  getElevatedPosition,
  getElevatedIsometricPosition,
  getElevatedPositions,
  getElevatedIsometricPositions,
  getRenderOrder,
} from '../src/elevation/render';
import ElevationMap from '../src/elevation/elevation-map';

describe('getElevatedPosition - 错列布局', () => {
  test('海拔为 0 时返回基础坐标', () => {
    const map = new ElevationMap([5, 5], 0);
    const [x, y, xNum, yNum, elevation] = getElevatedPosition([0, 0], [80, 40], map, 10);
    expect(x).toBe(0);
    expect(y).toBe(0);
    expect(xNum).toBe(0);
    expect(yNum).toBe(0);
    expect(elevation).toBe(0);
  });

  test('海拔为正时 Y 轴上移', () => {
    const map = new ElevationMap([5, 5], 0);
    map.set(0, 0, 2);
    const [x, y] = getElevatedPosition([0, 0], [80, 40], map, 10);
    expect(y).toBe(-20); // -2 * 10
  });

  test('海拔为负时 Y 轴下移', () => {
    const map = new ElevationMap([5, 5], 0);
    map.set(0, 0, -1);
    const [x, y] = getElevatedPosition([0, 0], [80, 40], map, 10);
    expect(y).toBe(10); // -(-1) * 10
  });

  test('无海拔地图时使用默认海拔 0', () => {
    const [x, y] = getElevatedPosition([0, 0], [80, 40], null, 10);
    expect(y).toBe(0);
  });
});

describe('getElevatedIsometricPosition - 等距布局', () => {
  test('海拔为 0 时返回基础坐标', () => {
    const map = new ElevationMap([5, 5], 0);
    const [x, y, xNum, yNum, elevation] = getElevatedIsometricPosition([0, 0], [80, 40], map, 10);
    expect(x).toBe(0);
    expect(y).toBe(0);
    expect(elevation).toBe(0);
  });

  test('海拔为正时 Y 轴上移', () => {
    const map = new ElevationMap([5, 5], 0);
    map.set(1, 0, 3);
    const [x, y] = getElevatedIsometricPosition([1, 0], [80, 40], map, 10);
    // 等距布局 [1,0] 基础 Y 为 -20，海拔 3 偏移 -30，合计 -50
    expect(y).toBe(-50);
  });
});

describe('getElevatedPositions - 批量计算', () => {
  test('批量返回带海拔的坐标集合', () => {
    const map = new ElevationMap([3, 3], 0);
    map.set(0, 0, 1);
    map.set(1, 1, 2);
    const positions = getElevatedPositions([0, 2], [0, 2], [80, 40], map, 10);
    expect(positions.length).toBe(9);
    // 检查 (0, 0) 的海拔
    const pos00 = positions.find(p => p[2] === 0 && p[3] === 0);
    expect(pos00[4]).toBe(1);
    // 检查 (1, 1) 的海拔
    const pos11 = positions.find(p => p[2] === 1 && p[3] === 1);
    expect(pos11[4]).toBe(2);
  });
});

describe('getElevatedIsometricPositions - 批量计算', () => {
  test('批量返回带海拔的等距坐标集合', () => {
    const map = new ElevationMap([3, 3], 0);
    map.set(0, 0, 1);
    const positions = getElevatedIsometricPositions([0, 2], [0, 2], [80, 40], map, 10);
    expect(positions.length).toBe(9);
  });
});

describe('getRenderOrder - 渲染排序', () => {
  test('按海拔升序排列', () => {
    const map = new ElevationMap([3, 3], 0);
    map.set(0, 0, 2);
    map.set(1, 1, 1);
    const order = getRenderOrder(map);
    // 检查海拔升序
    for (let i = 1; i < order.length; i++) {
      expect(order[i][2]).toBeGreaterThanOrEqual(order[i - 1][2]);
    }
  });

  test('同海拔内保持渲染方向顺序', () => {
    const map = new ElevationMap([3, 3], 0);
    const order = getRenderOrder(map, 'RightDown');
    // RightDown: x 从小到大，y 从小到大
    expect(order[0][0]).toBe(0);
    expect(order[0][1]).toBe(0);
    expect(order[order.length - 1][0]).toBe(2);
    expect(order[order.length - 1][1]).toBe(2);
  });
});
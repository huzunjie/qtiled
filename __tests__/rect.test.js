import {
  vertexes,
  directions,
  corners,
  getVertexes,
  getPosition,
  getPositions,
  getInfoByPos,
  getNeighbors,
  getNeighborsByDistance,
} from '../src/shapes/rect';

describe('rect 顶点配置', () => {
  test('vertexes 包含 4 个顶点', () => {
    expect(vertexes).toHaveLength(4);
  });

  test('vertexes 各顶点坐标值在 [-0.5, 0.5] 范围内', () => {
    vertexes.forEach(([x, y]) => {
      expect(Math.abs(x)).toBe(0.5);
      expect(Math.abs(y)).toBe(0.5);
    });
  });
});

describe('rect directions / corners', () => {
  test('directions 包含 4 个方向', () => {
    expect(directions).toHaveLength(4);
  });

  test('corners 包含 4 个角方向', () => {
    expect(corners).toHaveLength(4);
  });

  test('directions 每项 cost 为 1', () => {
    directions.forEach(([, , cost]) => {
      expect(cost).toBe(1);
    });
  });

  test('corners 每项 cost 为 SQRT2', () => {
    corners.forEach(([, , cost]) => {
      expect(cost).toBeCloseTo(Math.SQRT2);
    });
  });
});

describe('getVertexes', () => {
  test('默认宽高时返回 4 个顶点', () => {
    expect(getVertexes()).toHaveLength(4);
  });

  test('宽 80、高 40 时顶点坐标正确缩放', () => {
    const verts = getVertexes([80, 40]);
    // 应为 [-40,-20], [40,-20], [40,20], [-40,20]
    expect(verts[0]).toEqual([-40, -20]);
    expect(verts[2]).toEqual([40, 20]);
  });
});

describe('getPosition', () => {
  test('原点 [0,0] 返回 [0, 0]', () => {
    const [x, y] = getPosition([0, 0], [80, 40], [0, 0]);
    expect(x).toBe(0);
    expect(y).toBe(0);
  });

  test('[1, 1] 下标返回 [80, 40]', () => {
    const [x, y] = getPosition([1, 1], [80, 40], [0, 0]);
    expect(x).toBe(80);
    expect(y).toBe(40);
  });

  test('带原点偏移时坐标正确', () => {
    const [x, y] = getPosition([0, 0], [80, 40], [10, 20]);
    expect(x).toBe(10);
    expect(y).toBe(20);
  });
});

describe('getPositions', () => {
  test('2x2 范围返回 4 个元素', () => {
    const result = getPositions([0, 1], [0, 1], [80, 40]);
    expect(result).toHaveLength(4);
  });

  test('每个元素包含 4 个值（x, y, xNum, yNum）', () => {
    const result = getPositions([0, 1], [0, 1], [80, 40]);
    result.forEach(item => {
      expect(item).toHaveLength(4);
    });
  });

  test('3x3 范围返回 9 个元素', () => {
    const result = getPositions([0, 2], [0, 2], [80, 40]);
    expect(result).toHaveLength(9);
  });

  test('RightDown 时第一个为 [0,0,0,0]', () => {
    const result = getPositions([0, 1], [0, 1], [80, 40], 'RightDown');
    const [x, y, xNum, yNum] = result[0];
    expect(xNum).toBe(0);
    expect(yNum).toBe(0);
    expect(x).toBe(0);
    expect(y).toBe(0);
  });
});

describe('getInfoByPos', () => {
  test('像素坐标 [0,0] 返回下标 [0, 0]', () => {
    const [xNum, yNum] = getInfoByPos([0, 0], [0, 0], [80, 40]);
    expect(xNum).toBe(0);
    expect(yNum).toBe(0);
  });

  test('像素坐标 [80, 40] 返回下标 [1, 1]', () => {
    const [xNum, yNum] = getInfoByPos([80, 40], [0, 0], [80, 40]);
    expect(xNum).toBe(1);
    expect(yNum).toBe(1);
  });

  test('返回值包含像素坐标（4 个元素）', () => {
    const result = getInfoByPos([40, 20], [0, 0], [80, 40]);
    expect(result).toHaveLength(4);
  });

  test('坐标反查与 getPosition 正向一致', () => {
    const xyNum = [2, 3];
    const tileSize = [80, 40];
    const [px, py] = getPosition(xyNum, tileSize, [0, 0]);
    const [xNum, yNum] = getInfoByPos([px, py], [0, 0], tileSize);
    expect(xNum).toBe(xyNum[0]);
    expect(yNum).toBe(xyNum[1]);
  });
});

describe('getNeighbors', () => {
  test('默认返回 8 个邻居（4边+4角）', () => {
    const neis = getNeighbors([0, 0]);
    expect(neis).toHaveLength(8);
  });

  test('邻居坐标相对于原点正确偏移', () => {
    const neis = getNeighbors([2, 3]);
    // 上方邻居：[2, 2]
    const up = neis.find(([, , , ang]) => ang === '↑');
    expect(up[0]).toBe(2);
    expect(up[1]).toBe(2);
  });

  test('传入自定义 neisConf 时只返回指定邻居', () => {
    const customConf = [[0, -1, 1, '↑'], [0, 1, 1, '↓']];
    const neis = getNeighbors([0, 0], customConf);
    expect(neis).toHaveLength(2);
  });
});

describe('getPositions - renderOrder 变体', () => {
  test("RightUp 时第一个元素 yNum 最大", () => {
    const result = getPositions([0, 1], [0, 1], [80, 40], 'RightUp');
    expect(result[0][2]).toBe(0); // xNum=0
    expect(result[0][3]).toBe(1); // yNum=1（最大，从大到小）
  });

  test("LeftDown 时第一个元素 xNum 最大", () => {
    const result = getPositions([0, 1], [0, 1], [80, 40], 'LeftDown');
    expect(result[0][2]).toBe(1); // xNum=1（最大，从大到小）
    expect(result[0][3]).toBe(0); // yNum=0
  });

  test("LeftUp 时第一个元素 xNum 和 yNum 均最大", () => {
    const result = getPositions([0, 1], [0, 1], [80, 40], 'LeftUp');
    expect(result[0][2]).toBe(1); // xNum=1
    expect(result[0][3]).toBe(1); // yNum=1
  });

  test('各 renderOrder 均返回相同数量的元素', () => {
    const orders = ['RightDown', 'RightUp', 'LeftDown', 'LeftUp'];
    orders.forEach(order => {
      const result = getPositions([0, 2], [0, 2], [80, 40], order);
      expect(result).toHaveLength(9);
    });
  });
});

describe('getNeighborsByDistance', () => {
  test('distance=1 时返回 9 个元素（含自身3x3网格）', () => {
    const result = getNeighborsByDistance([0, 0], 1);
    expect(result).toHaveLength(9);
  });

  test('distance=2 时返回 25 个元素（5x5网格）', () => {
    const result = getNeighborsByDistance([0, 0], 2);
    expect(result).toHaveLength(25);
  });

  test('自定义 iterator 函数正常工作', () => {
    const result = getNeighborsByDistance([0, 0], 1, (x, y) => ({ x, y }));
    expect(result[0]).toHaveProperty('x');
    expect(result[0]).toHaveProperty('y');
  });

  test('返回基于 originXyNum 的绝对坐标', () => {
    const result = getNeighborsByDistance([3, 4], 1, 'vertex');
    expect(result).toEqual([
      [2, 3],
      [2, 5],
      [4, 3],
      [4, 5],
    ]);
  });

  test('支持内置邻居类型筛选', () => {
    expect(getNeighborsByDistance([0, 0], 2, 'all')).toHaveLength(25);
    expect(getNeighborsByDistance([0, 0], 2, 'no_self')).toHaveLength(24);
    expect(getNeighborsByDistance([0, 0], 2, 'border')).toHaveLength(16);
    expect(getNeighborsByDistance([0, 0], 2, 'vertex')).toHaveLength(4);
    expect(getNeighborsByDistance([0, 0], 2, 'diamond')).toHaveLength(13);
  });

  test('未知邻居类型回退为 all', () => {
    expect(getNeighborsByDistance([0, 0], 1, 'unknown')).toHaveLength(9);
  });

  test('内置邻居类型支持 renderOrder', () => {
    const result = getNeighborsByDistance([1, 2], 1, 'vertex', 'LeftUp');
    expect(result).toEqual([
      [2, 3],
      [2, 1],
      [0, 3],
      [0, 1],
    ]);
  });

  test('传入 renderOrder 参数时正常工作', () => {
    const result = getNeighborsByDistance([0, 0], 1, undefined, 'RightDown');
    expect(result).toHaveLength(9);
  });
});

describe('默认参数覆盖 - rect 导出函数', () => {
  test('getPosition 无参调用使用全部默认值', () => {
    // 触发 xyNum/tileSize/originXY 默认参数分支
    const result = getPosition();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  test('getPositions 无参调用使用全部默认值', () => {
    // 触发 mainAxisRange/subAxisRange/tileSize/renderOrder 默认参数分支
    const result = getPositions();
    expect(Array.isArray(result)).toBe(true);
  });

  test('getInfoByPos 无参调用使用全部默认值', () => {
    // 触发 pos/originPos/tileSize 默认参数分支
    const result = getInfoByPos();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(4);
  });

  test('getNeighbors 不传 neisConf 时使用默认方向+角', () => {
    // 触发 neisConf 默认参数分支
    const result = getNeighbors([0, 0]);
    expect(result).toHaveLength(8); // 4 directions + 4 corners
  });

  test('getNeighborsByDistance 仅传 originXyNum 时使用默认 distance/iterator', () => {
    // 触发 distance/iterator 默认参数分支
    const result = getNeighborsByDistance([0, 0]);
    expect(result).toHaveLength(9);
  });

  test('getNeighborsByDistance 无参调用触发 originXyNum 默认值', () => {
    // 触发 L93 Branch 13: originXyNum = [0, 0] 默认参数分支
    const result = getNeighborsByDistance();
    expect(result).toHaveLength(9);
  });

  test('getNeighbors 无参调用触发 originXyNum 默认值', () => {
    // 触发 rect.js getNeighbors 的 originXyNum = [0, 0] 默认参数分支
    const result = getNeighbors();
    expect(result).toHaveLength(8); // 4 directions + 4 corners
    expect(result[0][0]).toBe(0);   // origin [0,0] + direction[0]
  });
});

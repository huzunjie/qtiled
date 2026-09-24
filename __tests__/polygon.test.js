import {
  HALF,
  FLAH,
  QUAR,
  RAUQ,
  TQUA,
  getVertexes,
  getBounds,
  twoDimForEach,
  isStaggerLine,
  getPosition,
  getPositions,
  getInfoByPos,
} from '../src/shapes/polygon';

describe('polygon 常量', () => {
  test('HALF = 0.5', () => {
    expect(HALF).toBe(0.5);
  });

  test('FLAH = -0.5', () => {
    expect(FLAH).toBe(-0.5);
  });

  test('QUAR = 0.25', () => {
    expect(QUAR).toBe(0.25);
  });

  test('RAUQ = -0.25', () => {
    expect(RAUQ).toBe(-0.25);
  });

  test('TQUA = 0.75', () => {
    expect(TQUA).toBe(0.75);
  });
});

describe('getVertexes', () => {
  const baseVertexes = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ];

  test('默认宽高 1 时顶点不变', () => {
    const result = getVertexes(baseVertexes, 1, 1);
    expect(result).toEqual(baseVertexes);
  });

  test('宽高 2 时顶点等比缩放', () => {
    const result = getVertexes(baseVertexes, 2, 2);
    expect(result).toEqual([[-1, -1], [1, -1], [1, 1], [-1, 1]]);
  });

  test('axis=x 时 x 与 y 互换', () => {
    const result = getVertexes(baseVertexes, 2, 4, 'x');
    // x => y*width, y => x*height
    expect(result[0]).toEqual([-0.5 * 2, -0.5 * 4]);
    expect(result[1]).toEqual([-0.5 * 2, 0.5 * 4]);
  });

  test('返回数组长度与输入一致', () => {
    const result = getVertexes(baseVertexes, 80, 40);
    expect(result).toHaveLength(baseVertexes.length);
  });
});

describe('getBounds', () => {
  test('默认或任一集合为空时没有包围盒', () => {
    expect(getBounds()).toBeNull();
    expect(getBounds([], [[0, 0]])).toBeNull();
    expect(getBounds([[0, 0]], [])).toBeNull();
  });

  test('省略顶点时计算位置范围，忽略网格下标，不修改输入', () => {
    const positions = Object.freeze([
      Object.freeze([-2.5, 4, 999, -999]),
      Object.freeze([3, -1.5, -999, 999]),
    ]);
    expect(getBounds(positions)).toEqual({ minX: -2.5, minY: -1.5, maxX: 3, maxY: 4, width: 5.5, height: 5.5 });
    expect(getBounds([[2, 3]])).toEqual({ minX: 2, minY: 3, maxX: 2, maxY: 3, width: 0, height: 0 });
  });

  test('单格范围包含完整顶点尺寸', () => {
    const vertexes = [[0, -15], [30, 0], [0, 15], [-30, 0]];
    expect(getBounds([[10, 20]], vertexes))
      .toEqual({ minX: -20, minY: 5, maxX: 40, maxY: 35, width: 60, height: 30 });
  });

  test('不对称顶点和负坐标按实际范围计算，不修改顶点', () => {
    const vertexes = Object.freeze([Object.freeze([-2, 1]), Object.freeze([5, -3]), Object.freeze([1, 7])]);
    const positions = [[-10, 4], [20, -6], [3, 8]];
    expect(getBounds(positions, vertexes))
      .toEqual({ minX: -12, minY: -9, maxX: 25, maxY: 15, width: 37, height: 24 });
    // 位置平移并倒序后，宽高不变，边界随原点平移。
    expect(getBounds(positions.map(([x, y]) => [x + 100, y - 50]).reverse(), vertexes))
      .toEqual({ minX: 88, minY: -59, maxX: 125, maxY: -35, width: 37, height: 24 });
  });
});

describe('isStaggerLine', () => {
  test("stagger='none' 时始终返回 false", () => {
    expect(isStaggerLine(0, 'none')).toBe(false);
    expect(isStaggerLine(1, 'none')).toBe(false);
    expect(isStaggerLine(2, 'none')).toBe(false);
  });

  test("stagger='odd' 时奇数行返回 true", () => {
    expect(isStaggerLine(1, 'odd')).toBe(true);
    expect(isStaggerLine(3, 'odd')).toBe(true);
    expect(isStaggerLine(-1, 'odd')).toBe(true);
  });

  test("stagger='odd' 时偶数行返回 false", () => {
    expect(isStaggerLine(0, 'odd')).toBe(false);
    expect(isStaggerLine(2, 'odd')).toBe(false);
  });

  test("stagger='even' 时偶数行返回 true", () => {
    expect(isStaggerLine(0, 'even')).toBe(true);
    expect(isStaggerLine(2, 'even')).toBe(true);
  });

  test("stagger='even' 时奇数行返回 false", () => {
    expect(isStaggerLine(1, 'even')).toBe(false);
    expect(isStaggerLine(3, 'even')).toBe(false);
  });
});

describe('twoDimForEach', () => {
  test('RightDown 遍历顺序：x 从小到大，y 从小到大', () => {
    const result = [];
    twoDimForEach([0, 1], [0, 1], 'RightDown', (x, y) => {
      result.push([x, y]);
      return [x, y];
    });
    expect(result).toEqual([[0, 0], [0, 1], [1, 0], [1, 1]]);
  });

  test('RightUp 遍历顺序：x 从小到大，y 从大到小', () => {
    const result = [];
    twoDimForEach([0, 1], [0, 1], 'RightUp', (x, y) => {
      result.push([x, y]);
      return [x, y];
    });
    expect(result).toEqual([[0, 1], [0, 0], [1, 1], [1, 0]]);
  });

  test('LeftDown 遍历顺序：x 从大到小，y 从小到大', () => {
    const result = [];
    twoDimForEach([0, 1], [0, 1], 'LeftDown', (x, y) => {
      result.push([x, y]);
      return [x, y];
    });
    expect(result).toEqual([[1, 0], [1, 1], [0, 0], [0, 1]]);
  });

  test('LeftUp 遍历顺序：x 从大到小，y 从大到小', () => {
    const result = [];
    twoDimForEach([0, 1], [0, 1], 'LeftUp', (x, y) => {
      result.push([x, y]);
      return [x, y];
    });
    expect(result).toEqual([[1, 1], [1, 0], [0, 1], [0, 0]]);
  });

  test('iterator 返回 null/undefined 时不加入结果集', () => {
    const result = twoDimForEach([0, 2], [0, 2], 'RightDown', (x, y) => {
      if (x === y) return null; // 对角线跳过
      return [x, y];
    });
    result.forEach(([x, y]) => expect(x).not.toBe(y));
  });

  test('单个格子遍历正确', () => {
    const result = twoDimForEach([0, 0], [0, 0], 'RightDown', (x, y) => [x, y]);
    expect(result).toEqual([[0, 0]]);
  });

  test('未知 renderOrder 默认为 RightDown', () => {
    const r1 = twoDimForEach([0, 1], [0, 1], 'RightDown', (x, y) => [x, y]);
    const r2 = twoDimForEach([0, 1], [0, 1], 'UNKNOWN', (x, y) => [x, y]);
    expect(r1).toEqual(r2);
  });
});

describe('getPosition', () => {
  test('lineRate=1, 不错列时坐标等于 xyNum * tileSize', () => {
    const result = getPosition(1, [2, 3], [80, 40], 'none', [0, 0]);
    expect(result[0]).toBeCloseTo(2 * 80);
    expect(result[1]).toBeCloseTo(3 * 40);
    expect(result[2]).toBe(2);
    expect(result[3]).toBe(3);
  });

  test('带原点偏移时坐标正确', () => {
    const result = getPosition(1, [0, 0], [80, 40], 'none', [10, 20]);
    expect(result[0]).toBeCloseTo(10);
    expect(result[1]).toBeCloseTo(20);
  });

  test("stagger='odd' 时奇数行 X 方向有半格偏移", () => {
    const [x0] = getPosition(1, [0, 0], [80, 40], 'odd', [0, 0]); // 偶数行，无偏移
    const [x1] = getPosition(1, [0, 1], [80, 40], 'odd', [0, 0]); // 奇数行，有半格偏移
    expect(x1 - x0).toBeCloseTo(40); // 偏移 width/2 = 40
  });

  test("stagger='even' 时偶数行有 X 偏移，奇数行无偏移", () => {
    // yNum=0 偶数，even 时偶数行错列 → 有偏移
    const [x0] = getPosition(1, [0, 0], [80, 40], 'even', [0, 0]);
    // yNum=1 奇数，even 时奇数行不错列 → 无偏移
    const [x1] = getPosition(1, [0, 1], [80, 40], 'even', [0, 0]);
    expect(x0 - x1).toBeCloseTo(40); // 偶数行多 40 的偏移
  });
});

describe('getPositions', () => {
  test('无错列时返回 (maxX-minX+1)*(maxY-minY+1) 个元素', () => {
    const result = getPositions(1, [0, 2], [0, 2], [80, 40], 'RightDown', 'none');
    expect(result).toHaveLength(9);
  });

  test('每个元素包含 x、y、xNum、yNum 四个值', () => {
    const result = getPositions(1, [0, 1], [0, 1], [80, 40], 'RightDown', 'none');
    result.forEach(item => {
      expect(item).toHaveLength(4);
    });
  });

  test('RightDown 时第一个元素对应 [0, 0]', () => {
    const result = getPositions(1, [0, 1], [0, 1], [80, 40], 'RightDown', 'none');
    expect(result[0][2]).toBe(0); // xNum
    expect(result[0][3]).toBe(0); // yNum
  });
});

describe('getInfoByPos', () => {
  test('原点坐标 [0,0] 应返回下标 [0,0]', () => {
    const [xNum, yNum] = getInfoByPos(1, [0, 0], [0, 0], [80, 40], 'none');
    expect(xNum).toBe(0);
    expect(yNum).toBe(0);
  });

  test('像素坐标 [80, 40] 对应下标 [1, 1]', () => {
    const [xNum, yNum] = getInfoByPos(1, [80, 40], [0, 0], [80, 40], 'none');
    expect(xNum).toBe(1);
    expect(yNum).toBe(1);
  });

  test('返回值包含像素坐标（4 个元素）', () => {
    const result = getInfoByPos(1, [0, 0], [0, 0], [80, 40], 'none');
    expect(result).toHaveLength(4);
  });

  test("stagger='even' 偶数行坐标反查正确", () => {
    // yNum=2 偶数行，even 时有偏移，应能正确反查
    const xyNum = [1, 2];
    const [px, py] = getPosition(1, xyNum, [80, 40], 'even', [0, 0]);
    const [xNum, yNum] = getInfoByPos(1, [px, py], [0, 0], [80, 40], 'even');
    expect(xNum).toBe(xyNum[0]);
    expect(yNum).toBe(xyNum[1]);
  });

  test("stagger='even' 奇数行坐标反查正确", () => {
    // yNum=1 奇数行，even 时无偏移
    const xyNum = [1, 1];
    const [px, py] = getPosition(1, xyNum, [80, 40], 'even', [0, 0]);
    const [xNum, yNum] = getInfoByPos(1, [px, py], [0, 0], [80, 40], 'even');
    expect(xNum).toBe(xyNum[0]);
    expect(yNum).toBe(xyNum[1]);
  });
});

describe('默认参数覆盖 - polygon 导出函数', () => {
  test('twoDimForEach 无参调用返回空数组', () => {
    // 触发 mainAxisRange/subAxisRange/renderOrder/iterator 全部默认参数分支
    const result = twoDimForEach();
    expect(result).toEqual([[0, 0]]);
  });

  test('twoDimForEach 仅传 mainAxisRange 时其余参数使用默认值', () => {
    const result = twoDimForEach([0, 1]);
    expect(result).toHaveLength(2); // [0,0], [1,0]
  });

  test('twoDimForEach 传无效 renderOrder 降级为 RightDown', () => {
    // 触发 forEachConfs[renderOrder] || forEachConfs.RightDown 的右侧分支
    const result = twoDimForEach([0, 1], [0, 1], 'InvalidOrder');
    expect(result).toHaveLength(4);
  });

  test('twoDimForEach iterator 返回 null 时结果被过滤', () => {
    // 触发 ret && retArr.push(ret) 的 falsy 分支
    const result = twoDimForEach([0, 1], [0, 1], 'RightDown', (x, y) => (x === 0 && y === 0 ? null : [x, y]));
    expect(result).toHaveLength(3); // 过滤掉 (0,0) 返回的 null
  });

  test('getPosition 无参调用使用全部默认值', () => {
    // 触发 lineRate/xyNum/tileSize/stagger/originXY 默认参数分支
    // getPolygonPosition 返回 [x, y, xNum, yNum] 4个元素
    const result = getPosition();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(4);
  });

  test('getPositions 无参调用使用全部默认值', () => {
    // 触发 lineRate/mainAxisRange/subAxisRange/tileSize/stagger/renderOrder 默认参数分支
    const result = getPositions();
    expect(Array.isArray(result)).toBe(true);
  });

  test('getInfoByPos 无参调用使用全部默认值', () => {
    // 触发 lineRate/pos/originPos/tileSize/stagger 默认参数分支
    const result = getInfoByPos();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(4);
  });

  test('getVertexes 仅传 baseVertexes 时 width/height/axis 使用默认值', () => {
    // 触发 polygon.js L17 的 width=1, height=1 默认参数分支
    const base = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
    const result = getVertexes(base); // 不传 width/height/axis，触发三个默认参数
    expect(result).toEqual(base); // 宽高默认为1，顶点不变
  });
});

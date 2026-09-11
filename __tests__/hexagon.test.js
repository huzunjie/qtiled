import {
  vertexes,
  TQUA,
  directionsNormal,
  directionsOffset,
  getVertexes,
  getPosition,
  getPositions,
  getInfoByPos,
  getNeighbors,
} from '../src/shapes/hexagon';

describe('hexagon 常量', () => {
  test('vertexes 包含 6 个顶点', () => {
    expect(vertexes).toHaveLength(6);
  });

  test('TQUA 约等于 0.75', () => {
    expect(TQUA).toBeCloseTo(0.75);
  });

  test('directionsNormal 包含 6 个方向', () => {
    expect(directionsNormal).toHaveLength(6);
  });

  test('directionsOffset 包含 6 个方向', () => {
    expect(directionsOffset).toHaveLength(6);
  });
});

describe('getVertexes', () => {
  test('默认参数返回 6 个顶点', () => {
    expect(getVertexes()).toHaveLength(6);
  });

  test('宽高缩放后顶点数量不变', () => {
    expect(getVertexes([80, 60])).toHaveLength(6);
  });

  test('axis=x 时也返回 6 个顶点', () => {
    expect(getVertexes([80, 60], 'x')).toHaveLength(6);
  });
});

describe('getPosition', () => {
  test('原点 [0,0] stagger=none 返回 [0, 0, 0, 0]', () => {
    const result = getPosition([0, 0], [80, 60], 'none', [0, 0]);
    expect(result[2]).toBe(0); // xNum
    expect(result[3]).toBe(0); // yNum
  });

  test('[1,0] 下标时 X 方向偏移一个宽度', () => {
    const [x0] = getPosition([0, 0], [80, 60], 'none', [0, 0]);
    const [x1] = getPosition([1, 0], [80, 60], 'none', [0, 0]);
    expect(x1 - x0).toBeCloseTo(80);
  });

  test("stagger='odd' 时奇数行有半格偏移", () => {
    const [x0] = getPosition([0, 0], [80, 60], 'odd', [0, 0]); // 偶数行
    const [x1] = getPosition([0, 1], [80, 60], 'odd', [0, 0]); // 奇数行
    expect(x1 - x0).toBeCloseTo(40); // 半格偏移
  });

  test('带原点偏移时坐标平移正确', () => {
    const [x0, y0] = getPosition([0, 0], [80, 60], 'none', [0, 0]);
    const [x1, y1] = getPosition([0, 0], [80, 60], 'none', [10, 20]);
    expect(x1 - x0).toBeCloseTo(10);
    expect(y1 - y0).toBeCloseTo(20);
  });
});

describe('getPositions', () => {
  test('2x2 范围返回 4 个元素', () => {
    const result = getPositions([0, 1], [0, 1], [80, 60]);
    expect(result).toHaveLength(4);
  });

  test('每个元素包含 4 个值', () => {
    const result = getPositions([0, 1], [0, 1], [80, 60]);
    result.forEach(item => {
      expect(item).toHaveLength(4);
    });
  });

  test('3x4 范围返回 12 个元素', () => {
    const result = getPositions([0, 2], [0, 3], [80, 60]);
    expect(result).toHaveLength(12);
  });
});

describe('getInfoByPos', () => {
  test('返回 4 个元素', () => {
    const result = getInfoByPos([0, 0], [0, 0], [80, 60]);
    expect(result).toHaveLength(4);
  });

  test('坐标反查与正向坐标一致', () => {
    const xyNum = [1, 2];
    const tileSize = [80, 60];
    // 先正向求坐标
    const [px, py] = getPosition(xyNum, tileSize, 'none', [0, 0]);
    // 再反向查找下标
    const [xNum, yNum] = getInfoByPos([px, py], [0, 0], tileSize, 'none');
    expect(xNum).toBe(xyNum[0]);
    expect(yNum).toBe(xyNum[1]);
  });
});

describe('getNeighbors', () => {
  test('返回 6 个邻居', () => {
    const neis = getNeighbors([0, 0]);
    expect(neis).toHaveLength(6);
  });

  test('每个邻居包含 [xNum, yNum, cost, angStr]', () => {
    const neis = getNeighbors([0, 0]);
    neis.forEach(nei => {
      expect(nei).toHaveLength(4);
      expect(typeof nei[2]).toBe('number'); // cost
      expect(typeof nei[3]).toBe('string'); // angStr
    });
  });

  test('偶数行（非错列行）使用 directionsNormal', () => {
    const neis = getNeighbors([0, 0], 'odd'); // yNum=0 为偶数行，使用 normal
    // 根据 directionsNormal: [-1,-1] 加上 [0,0] = [-1,-1]
    expect(neis.some(([x, y]) => x === -1 && y === -1)).toBe(true);
  });

  test('奇数行使用 directionsOffset', () => {
    const neis = getNeighbors([0, 1], 'odd'); // yNum=1 为奇数行，使用 offset
    // 根据 directionsOffset: [0,-1] 加上 [0,1] = [0,0]
    expect(neis.some(([x, y]) => x === 0 && y === 0)).toBe(true);
  });

  test('stagger=even 时偶数行使用 offset', () => {
    const neis = getNeighbors([0, 0], 'even'); // yNum=0 为偶数行，使用 offset
    expect(neis.some(([x, y]) => x === 1 && y === -1)).toBe(true);
  });

  test("stagger='none' 时始终使用 directionsNormal，偶数行奇数行结果仅差原点偏移", () => {
    const neis0 = getNeighbors([0, 0], 'none');
    const neis1 = getNeighbors([0, 1], 'none');
    expect(neis0).toHaveLength(6);
    expect(neis1).toHaveLength(6);
    // 偶数行的 directionsNormal[-1,-1] → [-1,-1]；奇数行 → [-1, 0]
    // 两者 xNum 差相同，yNum 差等于原点 yNum 差（1）
    neis0.forEach(([x0, y0], i) => {
      expect(neis1[i][0]).toBe(x0);        // xNum 差相同
      expect(neis1[i][1]).toBe(y0 + 1);    // yNum 差 = 原点差
    });
  });
});

describe('getPosition - stagger=even', () => {
  test("stagger='even' 时偶数行有半格偏移，奇数行无偏移", () => {
    const [x0] = getPosition([0, 0], [80, 60], 'even', [0, 0]); // 偶数行，even 时有偏移
    const [x1] = getPosition([0, 1], [80, 60], 'even', [0, 0]); // 奇数行，even 时无偏移
    expect(x0 - x1).toBeCloseTo(40); // 偶数行多 40 的偏移
  });
});

describe('默认参数覆盖 - hexagon 导出函数', () => {
  test('getVertexes 传空数组时内部解构使用默认值', () => {
    // hexagon getVertexes([width=1, height=1] = [1,1]) — 传 [] 触发解构内默认值
    const result = getVertexes([]);
    expect(result).toHaveLength(6);
  });

  test('getPosition 无参调用使用全部默认值', () => {
    // 触发 xyNum/tileSize/stagger/originXY 默认参数分支
    // getPolygonPosition 返回 [x, y, xNum, yNum] 4个元素
    const result = getPosition();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(4);
  });

  test('getPositions 无参调用使用全部默认值', () => {
    // 触发 mainAxisRange/subAxisRange/tileSize/renderOrder/stagger 默认参数分支
    const result = getPositions();
    expect(Array.isArray(result)).toBe(true);
  });

  test('getInfoByPos 无参调用使用全部默认值', () => {
    // 触发 pos/originPos/tileSize/stagger 默认参数分支
    const result = getInfoByPos();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(4);
  });

  test('getNeighbors 无参调用使用默认 originXyNum 和 stagger', () => {
    // 触发 originXyNum/stagger 默认参数分支
    const result = getNeighbors();
    expect(result).toHaveLength(6);
  });
});

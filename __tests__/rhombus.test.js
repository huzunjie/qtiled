import {
  directionsNormal,
  directionsOffset,
  cornersNormalOrOffset,
  directionsIsometric,
  cornersIsometric,
  getHalfSize,
  getVertexes,
  getPosition,
  getPositions,
  getIsometricPosition,
  getIsometricPosByHalfSize,
  getIsometricPositions,
  getInfoByPos,
  getIsometricInfoByPos,
  getNeighbors,
  getIsometricNeighbors,
  getNeighborsByDistance,
  getIsometricNeighborsByDistance,
} from '../src/shapes/rhombus';

describe('rhombus 方向配置', () => {
  test('directionsNormal 包含 4 个方向', () => {
    expect(directionsNormal).toHaveLength(4);
  });

  test('directionsOffset 包含 4 个方向', () => {
    expect(directionsOffset).toHaveLength(4);
  });

  test('cornersNormalOrOffset 包含 4 个角方向', () => {
    expect(cornersNormalOrOffset).toHaveLength(4);
  });

  test('directionsIsometric 包含 4 个方向', () => {
    expect(directionsIsometric).toHaveLength(4);
  });

  test('cornersIsometric 包含 4 个角', () => {
    expect(cornersIsometric).toHaveLength(4);
  });
});

describe('getHalfSize', () => {
  test('默认参数返回 [0.5, 0.5]', () => {
    expect(getHalfSize()).toEqual([0.5, 0.5]);
  });

  test('[80, 40] 返回 [40, 20]', () => {
    expect(getHalfSize([80, 40])).toEqual([40, 20]);
  });

  test('[100, 100] 返回 [50, 50]', () => {
    expect(getHalfSize([100, 100])).toEqual([50, 50]);
  });
});

describe('getVertexes', () => {
  test('默认参数返回 4 个顶点', () => {
    expect(getVertexes()).toHaveLength(4);
  });

  test('[80, 40] 时菱形顶点正确', () => {
    const verts = getVertexes([80, 40]);
    // 菱形：上[0,-20]，右[40,0]，下[0,20]，左[-40,0]
    expect(verts).toContainEqual([0, -20]);
    expect(verts).toContainEqual([40, 0]);
    expect(verts).toContainEqual([0, 20]);
    expect(verts).toContainEqual([-40, 0]);
  });
});

describe('getIsometricPosByHalfSize', () => {
  test('[0,0] 返回 [0, 0]', () => {
    expect(getIsometricPosByHalfSize(0, 0, 40, 20)).toEqual([0, 0]);
  });

  test('[1,0] 时 x=halfWidth, y=-halfHeight', () => {
    const [x, y] = getIsometricPosByHalfSize(1, 0, 40, 20);
    expect(x).toBeCloseTo(40);
    expect(y).toBeCloseTo(-20);
  });

  test('[0,1] 时 x=halfWidth, y=halfHeight', () => {
    const [x, y] = getIsometricPosByHalfSize(0, 1, 40, 20);
    expect(x).toBeCloseTo(40);
    expect(y).toBeCloseTo(20);
  });

  test('[1,1] 时 x=2*halfWidth, y=0', () => {
    const [x, y] = getIsometricPosByHalfSize(1, 1, 40, 20);
    expect(x).toBeCloseTo(80);
    expect(y).toBeCloseTo(0);
  });
});

describe('getIsometricPosition', () => {
  test('[0,0] 返回原点坐标', () => {
    const [x, y] = getIsometricPosition([0, 0], [80, 40], [0, 0]);
    expect(x).toBe(0);
    expect(y).toBe(0);
  });

  test('带原点偏移时坐标平移正确', () => {
    const [x0, y0] = getIsometricPosition([1, 0], [80, 40], [0, 0]);
    const [x1, y1] = getIsometricPosition([1, 0], [80, 40], [10, 5]);
    expect(x1 - x0).toBeCloseTo(10);
    expect(y1 - y0).toBeCloseTo(5);
  });
});

describe('getIsometricPositions', () => {
  test('2x2 范围返回 4 个元素', () => {
    const result = getIsometricPositions([0, 1], [0, 1], [80, 40]);
    expect(result).toHaveLength(4);
  });

  test('每个元素包含 4 个值 [x, y, xNum, yNum]', () => {
    const result = getIsometricPositions([0, 1], [0, 1], [80, 40]);
    result.forEach(item => {
      expect(item).toHaveLength(4);
    });
  });
});

describe('getPosition (stagger)', () => {
  test('原点 [0,0] stagger=none 返回 [0, 0, 0, 0]', () => {
    const [x, y, xNum, yNum] = getPosition([0, 0], [80, 40], 'none', [0, 0]);
    expect(x).toBe(0);
    expect(y).toBe(0);
    expect(xNum).toBe(0);
    expect(yNum).toBe(0);
  });

  test('[1,0] 下标 X 方向偏移一个宽度', () => {
    const [x0] = getPosition([0, 0], [80, 40], 'none', [0, 0]);
    const [x1] = getPosition([1, 0], [80, 40], 'none', [0, 0]);
    expect(x1 - x0).toBeCloseTo(80);
  });
});

describe('getPositions', () => {
  test('2x2 范围返回 4 个元素', () => {
    const result = getPositions([0, 1], [0, 1], [80, 40]);
    expect(result).toHaveLength(4);
  });
});

describe('getInfoByPos', () => {
  test('坐标反查与 getPosition 正向一致', () => {
    const xyNum = [2, 2];
    const tileSize = [80, 40];
    const [px, py] = getPosition(xyNum, tileSize, 'none', [0, 0]);
    const [xNum, yNum] = getInfoByPos([px, py], [0, 0], tileSize, 'none');
    expect(xNum).toBe(xyNum[0]);
    expect(yNum).toBe(xyNum[1]);
  });

  test('返回 4 个元素', () => {
    const result = getInfoByPos([0, 0], [0, 0], [80, 40]);
    expect(result).toHaveLength(4);
  });
});

describe('getIsometricInfoByPos', () => {
  test('[0,0] 像素坐标返回下标 [0, 0]', () => {
    const [xNum, yNum] = getIsometricInfoByPos([0, 0], [0, 0], [80, 40]);
    expect(xNum).toBe(0);
    expect(yNum).toBe(0);
  });

  test('等距坐标反查与正向一致', () => {
    const xyNum = [2, 3];
    const tileSize = [80, 40];
    const [px, py] = getIsometricPosition(xyNum, tileSize, [0, 0]);
    const [xNum, yNum] = getIsometricInfoByPos([px, py], [0, 0], tileSize);
    expect(xNum).toBe(xyNum[0]);
    expect(yNum).toBe(xyNum[1]);
  });

  test('返回 4 个元素', () => {
    const result = getIsometricInfoByPos([0, 0], [0, 0], [80, 40]);
    expect(result).toHaveLength(4);
  });
});

describe('getNeighbors (stagger)', () => {
  test('返回 8 个邻居（4边+4角）', () => {
    const neis = getNeighbors([0, 0]);
    expect(neis).toHaveLength(8);
  });

  test('每个邻居包含 4 个元素', () => {
    getNeighbors([1, 2]).forEach(nei => {
      expect(nei).toHaveLength(4);
    });
  });

  test('邻居坐标相对原点正确偏移', () => {
    const neis = getNeighbors([2, 2]); // 偶数行
    // cornersNormalOrOffset 中 [0,-2] 应存在 [2, 0]
    expect(neis.some(([x, y]) => x === 2 && y === 0)).toBe(true);
  });

  test("stagger='odd' 奇数行走 directionsOffset", () => {
    // yNum=1 为奇数行，使用 directionsOffset: [0,-1] + [0,1] = [0,0]
    const neis = getNeighbors([0, 1], 'odd');
    expect(neis).toHaveLength(8);
    expect(neis.some(([x, y]) => x === 0 && y === 0)).toBe(true);
  });

  test("stagger='even' 偶数行走 directionsOffset", () => {
    // yNum=0 为偶数行，even 时偶数行走 offset：[0,-1] + [0,0] = [0,-1]
    const neis = getNeighbors([0, 0], 'even');
    expect(neis).toHaveLength(8);
    // directionsOffset: [0,-1] → [0+0, -1+0] = [0,-1]
    expect(neis.some(([x, y]) => x === 0 && y === -1)).toBe(true);
  });

  test("stagger='none' 始终走 directionsNormal", () => {
    // stagger=none → isStaggerLine 始终返回 false → 使用 directionsNormal
    const neis0 = getNeighbors([0, 0], 'none');
    const neis1 = getNeighbors([0, 1], 'none');
    expect(neis0).toHaveLength(8);
    expect(neis1).toHaveLength(8);
    // directionsNormal: [-1,-1] → [0,0] 中应有 [-1,-1]
    expect(neis0.some(([x, y]) => x === -1 && y === -1)).toBe(true);
    // directionsNormal: [-1,-1] → [0,1] 中应有 [-1,0]
    expect(neis1.some(([x, y]) => x === -1 && y === 0)).toBe(true);
  });
});

describe('getIsometricNeighbors', () => {
  test('返回 8 个邻居（4方向+4角）', () => {
    const neis = getIsometricNeighbors([0, 0]);
    expect(neis).toHaveLength(8);
  });

  test('每个邻居包含 4 个元素', () => {
    getIsometricNeighbors([1, 1]).forEach(nei => {
      expect(nei).toHaveLength(4);
    });
  });
});

describe('getNeighborsByDistance', () => {
  test('错列布局 distance=1 返回 9 个绝对坐标', () => {
    const result = getNeighborsByDistance([1, 1], 1, 'all', 'even');
    expect(result).toHaveLength(9);
    expect(result).toContainEqual([1, 1]);
  });

  test('错列布局支持内置邻居类型', () => {
    expect(getNeighborsByDistance([0, 0], 2, 'no_self', 'odd')).toHaveLength(24);
    expect(getNeighborsByDistance([0, 0], 2, 'border', 'odd')).toHaveLength(16);
    expect(getNeighborsByDistance([0, 0], 2, 'vertex', 'odd')).toHaveLength(4);
    expect(getNeighborsByDistance([0, 0], 2, 'diamond', 'odd')).toHaveLength(13);
  });

  test('错列布局支持自定义 renderOrder', () => {
    const result = getNeighborsByDistance([1, 2], 1, 'vertex', 'even', 'LeftUp');
    expect(result).toEqual([
      [2, 2],
      [1, 0],
      [1, 4],
      [0, 2],
    ]);
  });
});

describe('getIsometricNeighborsByDistance', () => {
  test('等距布局返回基于 origin 的绝对坐标', () => {
    const result = getIsometricNeighborsByDistance([3, 4], 1, 'vertex');
    expect(result).toEqual([
      [2, 3],
      [2, 5],
      [4, 3],
      [4, 5],
    ]);
  });

  test('等距布局支持内置邻居类型和 renderOrder', () => {
    expect(getIsometricNeighborsByDistance([0, 0], 2, 'no_self')).toHaveLength(24);
    expect(getIsometricNeighborsByDistance([0, 0], 2, 'border', 'LeftUp')).toHaveLength(16);
  });
});

describe('getPosition - stagger 奇偶行偏移', () => {
  test("stagger='odd' 时奇数行 X 有半格偏移", () => {
    const [x0] = getPosition([0, 0], [80, 40], 'odd', [0, 0]); // 偶数行，无偏移
    const [x1] = getPosition([0, 1], [80, 40], 'odd', [0, 0]); // 奇数行，有半格偏移
    expect(x1 - x0).toBeCloseTo(40); // width/2 = 40
  });

  test("stagger='even' 时偶数行 X 有半格偏移", () => {
    const [x0] = getPosition([0, 0], [80, 40], 'even', [0, 0]); // 偶数行，even 时有偏移
    const [x1] = getPosition([0, 1], [80, 40], 'even', [0, 0]); // 奇数行，even 时无偏移
    expect(x0 - x1).toBeCloseTo(40); // 偶数行多 40 的偏移
  });
});

describe('默认参数覆盖 - rhombus 导出函数', () => {
  test('getHalfSize 无参调用使用全部默认值', () => {
    // 触发 [width=1, height=1] = [1,1] 整体默认值分支
    const result = getHalfSize();
    expect(result).toEqual([0.5, 0.5]);
  });

  test('getHalfSize 传空数组时内部解构使用默认值', () => {
    // 触发 width=1, height=1 解构内默认参数分支
    const result = getHalfSize([]);
    expect(result).toEqual([0.5, 0.5]);
  });

  test('getVertexes 传空数组时内部解构使用默认值', () => {
    // 触发 [width=1, height=1] = [1,1] 解构内默认值分支
    const result = getVertexes([]);
    expect(result).toHaveLength(4);
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

  test('getIsometricPosition 无参调用使用全部默认值', () => {
    // 触发 [xNum, yNum]=[] / tileSize / originXY 默认参数分支
    const result = getIsometricPosition();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  test('getIsometricPositions 无参调用使用全部默认值', () => {
    // 触发 mainAxisRange/subAxisRange/tileSize/renderOrder 默认参数分支
    const result = getIsometricPositions();
    expect(Array.isArray(result)).toBe(true);
  });

  test('getInfoByPos 无参调用使用全部默认值', () => {
    // 触发 pos/originPos/tileSize/stagger 默认参数分支
    const result = getInfoByPos();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(4);
  });

  test('getIsometricInfoByPos 无参调用使用全部默认值', () => {
    // 触发 pos/originPos/tileSize 默认参数分支
    const result = getIsometricInfoByPos();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(4);
  });

  test('getNeighbors 无参调用使用默认 originXyNum 和 stagger', () => {
    // 触发 originXyNum/stagger 默认参数分支
    // rhombus getNeighbors 返回 directions(4) + corners(4) = 8 个邻居
    const result = getNeighbors();
    expect(result).toHaveLength(8);
  });

  test('getIsometricNeighbors 无参调用使用默认 originXyNum', () => {
    // 触发 originXyNum 默认参数分支
    const result = getIsometricNeighbors();
    expect(result).toHaveLength(8);
  });
});

describe('菱形单格海拔坐标', () => {
  const tileSize = [80, 40];
  const origin = [137, 91];
  const layouts = [
    ['odd', (grid, elevation) => getPosition(grid, tileSize, 'odd', origin, elevation), pixel => getInfoByPos(pixel, origin, tileSize, 'odd'), grid => getNeighbors(grid, 'odd')],
    ['even', (grid, elevation) => getPosition(grid, tileSize, 'even', origin, elevation), pixel => getInfoByPos(pixel, origin, tileSize, 'even'), grid => getNeighbors(grid, 'even')],
    ['等距', (grid, elevation) => getIsometricPosition(grid, tileSize, origin, elevation), pixel => getIsometricInfoByPos(pixel, origin, tileSize), getIsometricNeighbors],
  ];
  layouts.forEach(([name, position, inverse, neighbors]) => {
    test(`${name}：海拔只改变绘制高度，保留输入与网格邻居`, () => {
      [[0, 0], [2, 3], [-2, -3]].forEach(coords => {
        const grid = Object.freeze(coords);
        const base = position(grid);
        const originalNeighbors = neighbors(grid);
        expect(position(grid, 0)).toEqual(base);
        expect(inverse(base).slice(0, 2)).toEqual(grid);
        [1, -1, 0.5].forEach(elevation => {
          expect(position(grid, elevation)).toEqual([base[0], base[1] - 16 * elevation, ...base.slice(2)]);
          expect(neighbors(grid)).toEqual(originalNeighbors);
        });
      });
    });
  });
  test('海拔像素距离不随瓦片尺寸缩放', () => {
    [[8, 4], [160, 80]].forEach(size => {
      const base = getPosition([1, 2], size);
      expect(getPosition([1, 2], size, 'odd', [0, 0], 1)).toEqual([base[0], base[1] - 16, ...base.slice(2)]);
      const iso = getIsometricPosition([1, 2], size);
      expect(getIsometricPosition([1, 2], size, [0, 0], -1)).toEqual([iso[0], iso[1] + 16]);
    });
  });
});

describe('错列反查菱形边角修正', () => {
  test('跨行边角返回实际覆盖该点的菱形', () => {
    expect(getInfoByPos([25, 5], [0, 0], [60, 30], 'odd').map(value => value + 0)).toEqual([0, 1, 30, 15]);
  });
  test.each(['odd', 'even'])('%s 覆盖正负行列、原点偏移及全部顶角内部', stagger => {
    const size = [60, 30];
    const origin = [137, -43];
    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) {
        const [cx, cy] = getPosition([x, y], size, stagger, origin);
        for (let dx = -29; dx <= 29; dx += 2) {
          for (let dy = -14; dy <= 14; dy += 2) {
            if (Math.abs(dx) / 30 + Math.abs(dy) / 15 >= 1) continue;
            expect(getInfoByPos([cx + dx, cy + dy], origin, size, stagger).map(value => value + 0)).toEqual([x, y, cx, cy]);
          }
        }
      }
    }
  });
  test.each(['odd', 'even'])('%s 共边和顶点返回包含该点的稳定候选', stagger => {
    [[30, 0], [0, 15], [-30, 0], [0, -15]].forEach(pixel => {
      const result = getInfoByPos(pixel, [0, 0], [60, 30], stagger);
      expect(Math.abs(pixel[0] - result[2]) / 30 + Math.abs(pixel[1] - result[3]) / 15).toBeLessThanOrEqual(1);
      expect(getInfoByPos(pixel, [0, 0], [60, 30], stagger)).toEqual(result);
    });
  });
});

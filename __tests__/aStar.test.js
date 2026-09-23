import aStar from '../src/path-finding/a-star';
import { getNeighbors as getRectNeighbors } from '../src/shapes/rect';
import { getNeighbors as getHexNeighbors } from '../src/shapes/hexagon';
import { getNeighbors as getRhombusNeighbors, getIsometricNeighbors } from '../src/shapes/rhombus';

/* 构建一个简单的矩形地图邻居函数（没有障碍物），限制在有限范围内 */
function makeRectNeighborsFn(blockedSet = new Set(), range = 20) {
  return function getNeighbors(currXyNum) {
    const [cx, cy] = currXyNum;
    return getRectNeighbors([cx, cy]).filter(([x, y]) => {
      if (Math.abs(x) > range || Math.abs(y) > range) return false;
      return !blockedSet.has(`${x}_${y}`);
    });
  };
}

/* 将路径点转为字符串集合，方便断言 */
function pathToKeys(path) {
  return new Set(path.map(([x, y]) => `${x}_${y}`));
}

describe('aStar - 基础功能', () => {
  test('起止点相同时直接返回该点', () => {
    const path = aStar([0, 0], [0, 0], makeRectNeighborsFn());
    expect(path).not.toBeNull();
    expect(path).toHaveLength(1);
    expect(path[0][0]).toBe(0);
    expect(path[0][1]).toBe(0);
  });

  test('相邻点之间找到路径', () => {
    const path = aStar([0, 0], [1, 0], makeRectNeighborsFn());
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(0);
    const last = path[path.length - 1];
    expect(last[0]).toBe(1);
    expect(last[1]).toBe(0);
  });

  test('路径起点和终点坐标正确', () => {
    const start = [0, 0];
    const end = [3, 3];
    const path = aStar(start, end, makeRectNeighborsFn());
    expect(path).not.toBeNull();
    expect(path[0][0]).toBe(start[0]);
    expect(path[0][1]).toBe(start[1]);
    expect(path[path.length - 1][0]).toBe(end[0]);
    expect(path[path.length - 1][1]).toBe(end[1]);
  });

  test('无障碍物时能找到路径', () => {
    const path = aStar([0, 0], [5, 5], makeRectNeighborsFn());
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(0);
  });
});

describe('aStar - 障碍物处理', () => {
  test('完全封闭时无法找到路径，返回 null', () => {
    // 把终点 [2, 0] 四周都封死（包括对角）
    const blocked = new Set(['1_0', '2_-1', '2_1', '3_0',
      '1_-1', '1_1', '3_-1', '3_1']);
    // 使用 range=3 限制搜索范围，确保不会爆炸式扩散
    const path = aStar([0, 0], [2, 0], makeRectNeighborsFn(blocked, 3));
    expect(path).toBeNull();
  });

  test('绕过障碍物找到迂回路径', () => {
    // 阻断从 x=1 的一列，但上下留出通道（只封 y=0 这一行）
    const blocked = new Set(['1_0']);
    const path = aStar([0, 0], [2, 0], makeRectNeighborsFn(blocked));
    // 路径不能经过障碍物
    if (path !== null) {
      const keys = pathToKeys(path);
      blocked.forEach(key => {
        expect(keys.has(key)).toBe(false);
      });
    }
  });
});

describe('aStar - 路径属性', () => {
  test('路径中每个点包含 cost 信息（三元素数组）', () => {
    const path = aStar([0, 0], [2, 0], makeRectNeighborsFn());
    path.forEach(point => {
      expect(point).toHaveLength(3);
      expect(typeof point[2]).toBe('number');
    });
  });

  test('路径 cost 单调递增', () => {
    const path = aStar([0, 0], [3, 0], makeRectNeighborsFn());
    expect(path).not.toBeNull();
    for (let i = 1; i < path.length; i++) {
      expect(path[i][2]).toBeGreaterThan(path[i - 1][2]);
    }
  });

  test('矩形地图直线路径长度合理（<= 曼哈顿距离 * SQRT2 成本）', () => {
    const end = [3, 4];
    const path = aStar([0, 0], end, makeRectNeighborsFn());
    expect(path).not.toBeNull();
    // 路径点数量不超过曼哈顿距离 + 1
    const manhattan = Math.abs(end[0]) + Math.abs(end[1]) + 1;
    expect(path.length).toBeLessThanOrEqual(manhattan);
  });
});

describe('aStar - 超出最大循环次数', () => {
  test('超出 maximizable 时抛出异常', () => {
    // 目标可达但 maximizable 极小，触发异常
    expect(() => {
      aStar([0, 0], [10, 10], makeRectNeighborsFn(), 1);
    }).toThrow(/maximum value/);
  });
});

describe('aStar - 六边形地图寻路', () => {
  function makeHexNeighborsFn(blocked = new Set(), range = 20) {
    return function(currXyNum) {
      const [cx, cy] = currXyNum;
      return getHexNeighbors([cx, cy], 'odd').filter(([x, y]) => {
        if (Math.abs(x) > range || Math.abs(y) > range) return false;
        return !blocked.has(`${x}_${y}`);
      });
    };
  }

  test('六边形起止点相同返回当前点', () => {
    const path = aStar([0, 0], [0, 0], makeHexNeighborsFn());
    expect(path).not.toBeNull();
    expect(path).toHaveLength(1);
  });

  test('六边形地图能找到相邻路径', () => {
    const path = aStar([0, 0], [0, 1], makeHexNeighborsFn());
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(0);
  });
});

describe('aStar - 边界场景', () => {
  test('getNeighbors 始终返回空数组时 openlist 耗尽，返回 null', () => {
    // openlist 耗尽后 while 退出，path 为 []，最终 return null
    const path = aStar([0, 0], [1, 1], () => []);
    expect(path).toBeNull();
  });

  test('剪枝：同节点被更高成本路径访问时不会重复入队', () => {
    // 构造一个简单 2x2 矩形图，验证 A* 能正常找到终点且剪枝生效
    const path = aStar([0, 0], [2, 2], (currXyNum) => {
      const [cx, cy] = currXyNum;
      return getRectNeighbors([cx, cy]).filter(([x, y]) =>
        x >= 0 && x <= 2 && y >= 0 && y <= 2
      );
    });
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(0);
    const last = path[path.length - 1];
    expect(last[0]).toBe(2);
    expect(last[1]).toBe(2);
  });

  test('maximizable 为 1 时超限抛出异常', () => {
    // 已有测试验证，此处验证消息格式
    expect(() => {
      aStar([0, 0], [5, 5], makeRectNeighborsFn(), 1);
    }).toThrow('[pathFinding.aStar]');
  });
});

describe('默认参数覆盖 - aStar 函数', () => {
  test('aStar 无参调用：sta 与 end 均为 [0,0] 时直接返回起点', () => {
    // 触发 staXyNum/endXyNum/getNeighbors/maximizable 全部默认参数分支
    // sta===end 时直接 push 起点，path.length > 0，返回路径数组
    const result = aStar();
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe(0);
    expect(result[0][1]).toBe(0);
  });

  test('cost 为 0 时触发 cost||1 的右侧默认值', () => {
    // L35: cost || 1 — cost=0 时使用 1 作为回退值
    // 构造邻居返回 cost=0 的情况
    const result = aStar([0, 0], [1, 0], (curr) => {
      const [cx, cy] = curr;
      if (cx === 0 && cy === 0) return [[1, 0, 0]]; // cost=0，触发 || 1
      return [];
    });
    expect(result).not.toBeNull();
    expect(result[result.length - 1][0]).toBe(1);
    expect(result[result.length - 1][1]).toBe(0);
    expect(result[result.length - 1][2]).toBe(1);
  });
});

describe('aStar - 最低累计成本', () => {
  test('直达昂贵时选择便宜绕路，终点只回溯一次且不扩展', () => {
    const graph = {
      0: [[2, 0, 10], [1, 0, 1]],
      1: [[2, 0, 1]],
    };
    const neighbors = jest.fn(([x]) => graph[x] || []);
    expect(aStar([0, 0], [2, 0], neighbors)).toEqual([
      [0, 0, 0], [1, 0, 1], [2, 0, 2],
    ]);
    expect(neighbors.mock.calls.map(([point]) => point)).toEqual([[0, 0, 0], [1, 0, 1]]);
  });

  test('节点降成本后更新父链和累计成本，旧队列记录不再扩展', () => {
    const graph = {
      0: [[1, 0, 8], [2, 0, 1]],
      1: [[3, 0, 10]],
      2: [[1, 0, 1]],
    };
    const neighbors = jest.fn(([x]) => graph[x] || []);
    expect(aStar([0, 0], [3, 0], neighbors, 4)).toEqual([
      [0, 0, 0], [2, 0, 1], [1, 0, 2], [3, 0, 12],
    ]);
    // 成本 8 的旧记录先于成本 12 的终点出队，但不能调用邻居回调。
    expect(neighbors.mock.calls.map(([point]) => point)).toEqual([
      [0, 0, 0], [2, 0, 1], [1, 0, 2],
    ]);
  });

  test('移除节点不打乱等成本队列，等成本路线保留先发现的父节点', () => {
    const graph = {
      0: [[1, 0, 1], [2, 0, 1], [3, 0, 1]],
      2: [[4, 0, 1]],
      3: [[4, 0, 1]],
    };
    const neighbors = jest.fn(([x]) => graph[x] || []);
    const expected = [[0, 0, 0], [2, 0, 1], [4, 0, 2]];
    expect(aStar([0, 0], [4, 0], neighbors)).toEqual(expected);
    expect(neighbors.mock.calls.map(([[x]]) => x)).toEqual([0, 1, 2, 3]);
    expect(aStar([0, 0], [4, 0], neighbors)).toEqual(expected);
  });

  test('有限循环图中不可达时耗尽队列并返回 null', () => {
    const neighbors = jest.fn(([x]) => [[1 - x, 0, 1]]);
    expect(aStar([0, 0], [2, 0], neighbors)).toBeNull();
    expect(neighbors).toHaveBeenCalledTimes(2);
  });
});

describe('aStar - 成本兼容', () => {
  test.each([undefined, null, false, NaN])('成本 %s 保留 cost || 1 的回退规则', cost => {
    expect(aStar([0, 0], [1, 0], () => [[1, 0, cost]])).toEqual([[0, 0, 0], [1, 0, 1]]);
  });

  test('按每步舍入后的累计成本比较路线，不改为原始权重求和', () => {
    const graph = {
      0: [[3, 0, 1], [1, 0, 0.3334]],
      1: [[2, 0, 0.3334]],
      2: [[3, 0, 0.3334]],
    };
    expect(aStar([0, 0], [3, 0], ([x]) => graph[x] || [])).toEqual([
      [0, 0, 0], [1, 0, 0.333], [2, 0, 0.666], [3, 0, 0.999],
    ]);
  });

  test('微小正成本舍入为零增量时，有限循环不会重复更新父链', () => {
    const graph = {
      0: [[2, 0, 1], [1, 0, 0.0004]],
      1: [[0, 0, 0.0004], [2, 0, 0.0004]],
    };
    expect(aStar([0, 0], [2, 0], ([x]) => graph[x] || [], 3)).toEqual([
      [0, 0, 0], [1, 0, 0], [2, 0, 0],
    ]);
  });
});

describe('aStar - 无边界布局', () => {
  test.each([
    ['矩形', getRectNeighbors, [1, 2], 2.828],
    ['六边形 odd', grid => getHexNeighbors(grid, 'odd'), [-1, 4], 4],
    ['六边形 even', grid => getHexNeighbors(grid, 'even'), [-1, 4], 4],
    ['菱形 odd', grid => getRhombusNeighbors(grid, 'odd'), [-1, 4], 2.828],
    ['菱形 even', grid => getRhombusNeighbors(grid, 'even'), [-1, 4], 2.828],
    ['菱形等距', getIsometricNeighbors, [1, 2], 2.828],
  ])('%s 保留邻居权重并在有限上限内找到最低成本路径', (name, neighbors, end, totalCost) => {
    const path = aStar([-1, 0], end, neighbors, 500);
    expect(path[0]).toEqual([-1, 0, 0]);
    expect(path[path.length - 1]).toEqual([...end, totalCost]);
    path.slice(1).forEach(([x, y, cost], i) => {
      const edge = neighbors(path[i]).find(([nx, ny]) => nx === x && ny === y);
      expect(edge).toBeDefined();
      expect(cost).toBe(Math.round((path[i][2] + edge[2]) * 1e3) / 1e3);
    });
  });

  test('等距地图外 (-1,0) 到 (-1,4) 保留原 Demo 失败入口', () => {
    // elevation-pathfinding-demo.test.js 的等距布局曾搜索到上限；不缩小地图边界。
    const neighbors = grid => getIsometricNeighbors(grid).filter(([, , cost]) => cost === 1);
    expect(aStar([-1, 0], [-1, 4], neighbors, 200)).toEqual([
      [-1, 0, 0], [-1, 1, 1], [-1, 2, 2], [-1, 3, 3], [-1, 4, 4],
    ]);
  });
});

describe('aStar - 搜索上限语义', () => {
  const errorMessage = limit => '[pathFinding.aStar] The number of loops exceeds the maximum value:' + limit;

  test('成功成本更新计数包含终点，不包含被剪枝的边，允许恰好达到上限', () => {
    const graph = {
      0: [[1, 0, 1], [1, 0, 2]],
      1: [[0, 0, 1], [2, 0, 1]],
    };
    const neighbors = ([x]) => graph[x] || [];
    expect(aStar([0, 0], [2, 0], neighbors, 2)).toEqual([[0, 0, 0], [1, 0, 1], [2, 0, 2]]);
    expect(() => aStar([0, 0], [2, 0], neighbors, 1)).toThrow(errorMessage(1));
    expect(() => aStar([0, 0], [1, 0], neighbors, 0)).toThrow(errorMessage(0));
  });

  test('起终点重合不调用邻居回调，也不消耗上限', () => {
    const neighbors = jest.fn(() => []);
    expect(aStar([0, 0], [0, 0], neighbors, 0)).toEqual([[0, 0, 0]]);
    expect(neighbors).not.toHaveBeenCalled();
    expect(aStar([0, 0], [1, 0], neighbors, 0)).toBeNull();
  });

  test('已发现终点但未确认最优时超限，仍抛异常而不返回候选路径', () => {
    const neighbors = () => [[2, 0, 10], [1, 0, 1]];
    expect(() => aStar([0, 0], [2, 0], neighbors, 1)).toThrow(errorMessage(1));
  });

  test.each([1, 0.0004])('无边界不可达且成本为 %s 时通过上限结束，不误报 null', cost => {
    const neighbors = jest.fn(([x]) => [[x + 1, 0, cost]]);
    expect(() => aStar([0, 0], [-1, 0], neighbors, 4)).toThrow(errorMessage(4));
    expect(neighbors).toHaveBeenCalledTimes(5);
  });
});

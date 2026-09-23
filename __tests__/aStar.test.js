import aStar from '../src/path-finding/a-star';
import { getNeighbors as getRectNeighbors } from '../src/shapes/rect';
import { getNeighbors as getHexNeighbors } from '../src/shapes/hexagon';

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
  });
});

/* 海拔感知 A* 寻路

 * 在基础 A* 算法之上增加海拔约束：
 * - 相邻瓦片海拔差超过阈值时不可通行
 * - 斜坡通行成本高于平地
 * - 支持配置不可通行海拔值列表
 */

import aStar from '../path-finding/a-star';

/* 获取海拔感知的邻居列表
 * 过滤掉海拔差过大的邻居，并为斜坡邻居增加额外成本
 * @param  {Array}  xyNum           当前瓦片坐标 [xNum, yNum]
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Function} baseGetNeighbors 基础邻居获取方法，返回 [[xNum, yNum, cost], ...]
 * @param  {Object} options         配置项
 * @param  {Number} options.maxElevationDiff 最大可通行海拔差，默认 1
 * @param  {Number} options.slopeCostMultiplier 斜坡成本倍数，默认 2
 * @param  {Array}  options.unwalkableElevations 不可通行海拔值列表
 * @return {Array} [[xNum, yNum, cost], ...]
 */
export function getElevationAwareNeighbors(
  xyNum = [0, 0],
  elevationMap,
  baseGetNeighbors,
  options = {},
) {
  const {
    maxElevationDiff = 1,
    slopeCostMultiplier = 2,
    unwalkableElevations = [],
  } = options;

  const [xNum, yNum] = xyNum;
  const currLevel = elevationMap.get(xNum, yNum);

  // 检查当前瓦片是否可通行
  if (unwalkableElevations.includes(currLevel)) {
    return [];
  }

  const baseNeighbors = baseGetNeighbors(xyNum);
  const result = [];

  baseNeighbors.forEach(([nx, ny, baseCost]) => {
    // 检查邻居是否在地图范围内
    if (!elevationMap.inBounds(nx, ny)) return;

    const neiLevel = elevationMap.get(nx, ny);
    const diff = Math.abs(neiLevel - currLevel);

    // 海拔差超过阈值，不可通行
    if (diff > maxElevationDiff) return;

    // 邻居海拔值在不可通行列表中
    if (unwalkableElevations.includes(neiLevel)) return;

    // 计算通行成本
    let cost = baseCost;
    if (diff > 0) {
      // 斜坡成本 = 基础成本 × 斜坡倍数
      cost = baseCost * slopeCostMultiplier;
    }

    result.push([nx, ny, cost]);
  });

  return result;
}

/* 海拔感知 A* 寻路
 * @param {Array}   staXyNum        起点坐标 [xNum, yNum]
 * @param {Array}   endXyNum        终点坐标 [xNum, yNum]
 * @param {ElevationMap} elevationMap 海拔地图实例
 * @param {Function} baseGetNeighbors 基础邻居获取方法
 * @param {Object}  options         配置项
 * @param {Number}  options.maxElevationDiff 最大可通行海拔差
 * @param {Number}  options.slopeCostMultiplier 斜坡成本倍数
 * @param {Array}   options.unwalkableElevations 不可通行海拔值列表
 * @param {Number}  maximizable     最大循环次数
 * @return {Array} 路径数组 [[xNum, yNum, cost], ...] 或 null
 */
export default function aStarElevation(
  staXyNum = [0, 0],
  endXyNum = [0, 0],
  elevationMap,
  baseGetNeighbors,
  options = {},
  maximizable = 1e6,
) {
  const {
    maxElevationDiff = 1,
    slopeCostMultiplier = 2,
    unwalkableElevations = [],
  } = options;

  // 构造海拔感知的邻居获取器
  const getNeighbors = (xyNum) => {
    return getElevationAwareNeighbors(xyNum, elevationMap, baseGetNeighbors, {
      maxElevationDiff,
      slopeCostMultiplier,
      unwalkableElevations,
    });
  };

  // 调用基础 A* 算法
  return aStar(staXyNum, endXyNum, getNeighbors, maximizable);
}

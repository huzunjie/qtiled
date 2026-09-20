/* 海拔感知 A* 寻路

 * 在基础 A* 算法之上增加海拔约束：
 * - 相邻瓦片海拔差超过阈值时不可通行
 * - 斜坡通行成本高于平地
 * - 支持配置不可通行海拔值列表
 */

import aStar from '../path-finding/a-star';

/* 获取海拔感知的邻居列表
 * 过滤掉海拔差过大的邻居，并为斜坡邻居增加额外成本
 * @param  {Array}  gridCoord       当前瓦片网格坐标 [gridX, gridY]
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Function} baseGetNeighbors 基础邻居获取方法，返回 [[gridX, gridY, cost], ...]
 * @param  {Object} options         配置项
 * @param  {Number} options.maxElevationDiff 最大可通行海拔差，默认 1
 * @param  {Number} options.slopeCostMultiplier 斜坡成本倍数，默认 2
 * @param  {Array}  options.unwalkableElevations 不可通行海拔值列表
 * @return {Array} [[gridX, gridY, cost], ...]
 */
export function getElevationAwareNeighbors(
  gridCoord = [0, 0],
  elevationMap,
  baseGetNeighbors,
  options = {},
) {
  const {
    maxElevationDiff = 1,
    slopeCostMultiplier = 2,
    unwalkableElevations = [],
  } = options;

  const [gridX, gridY] = gridCoord;
  const currentElevation = elevationMap.get(gridX, gridY);

  // 检查当前瓦片是否可通行
  if (unwalkableElevations.includes(currentElevation)) {
    return [];
  }

  const baseNeighbors = baseGetNeighbors(gridCoord);
  const result = [];

  baseNeighbors.forEach(([neighborGridX, neighborGridY, baseCost]) => {
    // 检查邻居是否在地图范围内
    if (!elevationMap.inBounds(neighborGridX, neighborGridY)) return;

    const neighborElevation = elevationMap.get(neighborGridX, neighborGridY);
    const elevationDiff = Math.abs(neighborElevation - currentElevation);

    // 海拔差超过阈值，不可通行
    if (elevationDiff > maxElevationDiff) return;

    // 邻居海拔值在不可通行列表中
    if (unwalkableElevations.includes(neighborElevation)) return;

    // 计算通行成本
    let cost = baseCost;
    if (elevationDiff > 0) {
      // 斜坡成本 = 基础成本 × 斜坡倍数
      cost = baseCost * slopeCostMultiplier;
    }

    result.push([neighborGridX, neighborGridY, cost]);
  });

  return result;
}

/* 海拔感知 A* 寻路
 * @param {Array}   startGrid       起点网格坐标 [gridX, gridY]
 * @param {Array}   endGrid         终点网格坐标 [gridX, gridY]
 * @param {ElevationMap} elevationMap 海拔地图实例
 * @param {Function} baseGetNeighbors 基础邻居获取方法
 * @param {Object}  options         配置项
 * @param {Number}  options.maxElevationDiff 最大可通行海拔差
 * @param {Number}  options.slopeCostMultiplier 斜坡成本倍数
 * @param {Array}   options.unwalkableElevations 不可通行海拔值列表
 * @param {Number}  maximizable     最大循环次数
 * @return {Array} 路径数组 [[gridX, gridY, cost], ...] 或 null
 */
export default function aStarElevation(
  startGrid = [0, 0],
  endGrid = [0, 0],
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
  const getNeighbors = (gridCoord) => {
    return getElevationAwareNeighbors(gridCoord, elevationMap, baseGetNeighbors, {
      maxElevationDiff,
      slopeCostMultiplier,
      unwalkableElevations,
    });
  };

  // 调用基础 A* 算法
  return aStar(startGrid, endGrid, getNeighbors, maximizable);
}

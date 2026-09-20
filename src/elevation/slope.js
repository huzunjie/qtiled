/* 斜坡系统 —— 海拔边界过渡区域检测与通行性判定

 * 斜坡不是独立瓦片类型，而是由相邻瓦片海拔差自动判定的过渡区域。
 * 当相邻瓦片海拔差为 1 时，当前瓦片处于斜坡过渡区。
 * 当海拔差 > 1 时，视为悬崖，不可通行。
 */

// 斜坡类型枚举
export const SLOPE_TYPES = {
  NONE: 0, // 平地，无斜坡
  UP: 1, // 上坡（邻居海拔高于当前瓦片）
  DOWN: -1, // 下坡（邻居海拔低于当前瓦片）
  EDGE: 2, // 边缘（部分邻居高、部分邻居低）
  CLIFF: 3, // 悬崖（海拔差 > 1，不可通行）
};

// 斜坡方向（与菱形邻居方向对应，8 个方向）
export const SLOPE_DIRECTIONS = {
  NW: '↖',
  NE: '↗',
  SE: '↘',
  SW: '↙',
  N: '↑',
  E: '→',
  S: '↓',
  W: '←',
};

/* 获取指定瓦片的斜坡类型
 * @param  {Number} xNum
 * @param  {Number} yNum
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Array}  neighbors 邻居坐标数组 [[xNum, yNum], ...]
 * @return {Object} { type, direction, diff } 斜坡类型、方向、最大海拔差
 */
export function getSlopeType(gridX, gridY, elevationMap, neighbors = []) {
  const currentElevation = elevationMap.get(gridX, gridY);
  let hasUp = false;
  let hasDown = false;
  let maxAbsDiff = 0;
  let direction = null;

  for (let i = 0; i < neighbors.length; i++) {
    const [neighborGridX, neighborGridY] = neighbors[i];
    if (!elevationMap.inBounds(neighborGridX, neighborGridY)) continue;
    const elevationDiff = elevationMap.get(neighborGridX, neighborGridY) - currentElevation;
    const absoluteElevationDiff = Math.abs(elevationDiff);
    if (absoluteElevationDiff > maxAbsDiff) {
      maxAbsDiff = absoluteElevationDiff;
      direction = elevationDiff > 0 ? SLOPE_DIRECTIONS.N : SLOPE_DIRECTIONS.S;
    }
    if (elevationDiff > 0) hasUp = true;
    if (elevationDiff < 0) hasDown = true;
  }

  // 悬崖：海拔差 > 1
  if (maxAbsDiff > 1) {
    return { type: SLOPE_TYPES.CLIFF, direction, diff: maxAbsDiff };
  }

  // 边缘：同时存在上坡和下坡
  if (hasUp && hasDown) {
    return { type: SLOPE_TYPES.EDGE, direction: null, diff: maxAbsDiff };
  }

  // 上坡
  if (hasUp) {
    return { type: SLOPE_TYPES.UP, direction, diff: maxAbsDiff };
  }

  // 下坡
  if (hasDown) {
    return { type: SLOPE_TYPES.DOWN, direction, diff: maxAbsDiff };
  }

  return { type: SLOPE_TYPES.NONE, direction: null, diff: 0 };
}

/* 自动检测海拔地图中所有瓦片的斜坡信息
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Function} getNeighborsFn 获取邻居坐标的方法，参数 (xNum, yNum)，返回 [[xNum, yNum], ...]
 * @return {Map} key 为 "xNum_yNum"，value 为 { type, direction, diff }
 */
export function detectSlopes(elevationMap, getNeighborsFn) {
  const slopes = new Map();
  for (let gridY = 0; gridY < elevationMap.height; gridY++) {
    for (let gridX = 0; gridX < elevationMap.width; gridX++) {
      const neighbors = getNeighborsFn([gridX, gridY]);
      const slopeInfo = getSlopeType(gridX, gridY, elevationMap, neighbors);
      if (slopeInfo.type !== SLOPE_TYPES.NONE) {
        slopes.set(`${gridX}_${gridY}`, slopeInfo);
      }
    }
  }
  return slopes;
}

/* 判断瓦片是否可通行
 * @param  {Number} xNum
 * @param  {Number} yNum
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Array}  neighbors 邻居坐标数组
 * @return {Boolean}
 */
export function isWalkable(gridX, gridY, elevationMap, neighbors = []) {
  const slopeInfo = getSlopeType(gridX, gridY, elevationMap, neighbors);
  return slopeInfo.type !== SLOPE_TYPES.CLIFF;
}

/* 获取斜坡通行成本倍数
 * @param  {Number} xNum
 * @param  {Number} yNum
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Array}  neighbors 邻居坐标数组
 * @param  {Number} slopeCostMultiplier 斜坡成本倍数，默认 2
 * @return {Number} 通行成本（1 表示平地，> 1 表示斜坡）
 */
export function getSlopeCost(gridX, gridY, elevationMap, neighbors = [], slopeCostMultiplier = 2) {
  const slopeInfo = getSlopeType(gridX, gridY, elevationMap, neighbors);
  if (slopeInfo.type === SLOPE_TYPES.CLIFF) return Infinity;
  if (slopeInfo.type === SLOPE_TYPES.NONE) return 1;
  return slopeCostMultiplier;
}

/* 计算斜坡瓦片的顶点坐标（用于渲染斜坡过渡面）
 * @param  {Number} xNum
 * @param  {Number} yNum
 * @param  {Array}  tileSize 单瓦片宽高值，如 [80, 40]
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Array}  neighbors 邻居坐标数组 [[xNum, yNum], ...]
 * @param  {Number} elevationHeight 单位海拔对应的像素高度
 * @return {Array} 顶点坐标集合 [[x, y, level], ...]
 */
export function getSlopeVertexes(gridX, gridY, tileSize, elevationMap, neighbors = [], elevationHeight = 10) {
  const currentElevation = elevationMap.get(gridX, gridY);
  const vertexes = [];

  // 当前瓦片的四个顶点
  neighbors.forEach(([neighborGridX, neighborGridY]) => {
    if (!elevationMap.inBounds(neighborGridX, neighborGridY)) return;
    const neighborElevation = elevationMap.get(neighborGridX, neighborGridY);
    const elevationDiff = neighborElevation - currentElevation;
    // 只在海拔差为 1 时生成斜坡顶点
    if (Math.abs(elevationDiff) === 1) {
      vertexes.push([neighborGridX, neighborGridY, neighborElevation]);
    }
  });

  return vertexes;
}

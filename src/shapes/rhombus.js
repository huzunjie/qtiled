/* 正菱形地图元件方法 */
// 点(x, y)在宽w高h的菱形内：| x * h | + | y * w | < h * w * 0.5

import {
  HALF,
  FLAH,
  twoDimForEach,
  neighborTypes,
  isStaggerLine,
  getPosition as getPolygonPosition,
  getVertexes as getPolygonVertexes,
  getPositions as getPolygonPositions,
  getInfoByPos as getPolygonInfoByPos,
} from './polygon';

// 单位海拔对应的绘制高度，待贴图阶段根据素材调整。
const ELEVATION_HEIGHT = 16;

function applyElevation([pixelX, pixelY, ...rest], elevation) {
  return [pixelX, pixelY - elevation * ELEVATION_HEIGHT, ...rest];
}

// 宽高为1的正菱形顶点集合
const vertexes = [
  [0, FLAH],
  [HALF, 0],
  [0, HALF],
  [FLAH, 0],
];

// 非错列元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本
export const directionsNormal = [
  [-1, -1, 1, '↖'],
  [0, -1, 1, '↗'],
  [0, 1, 1, '↘'],
  [-1, 1, 1, '↙'],
];

// 错列元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本
export const directionsOffset = [
  [0, -1, 1, '↖'],
  [1, -1, 1, '↗'],
  [1, 1, 1, '↘'],
  [0, 1, 1, '↙'],
];

const { SQRT2 } = Math;

export { neighborTypes };

// 错列或非错列元素的左上、右上、左下、右下，四个角邻居 [xNum, yNum] 差值及距离成本
// 没错，错列与非错列的角的邻居坐标系差值一样
export const cornersNormalOrOffset = [
  [0, -2, SQRT2, '↑'],
  [1, 0, SQRT2, '→'],
  [0, 2, SQRT2, '↓'],
  [-1, 0, SQRT2, '←'],
];

// 等距元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本
export const directionsIsometric = [
  [0, -1, 1, '↖'],
  [1, 0, 1, '↗'],
  [0, 1, 1, '↘'],
  [-1, 0, 1, '↙'],
];

// 等距元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本
export const cornersIsometric = [
  [1, -1, SQRT2, '↑'],
  [1, 1, SQRT2, '→'],
  [-1, 1, SQRT2, '↓'],
  [-1, -1, SQRT2, '←'],
];

/* 获取宽高的一半（菱形中心点在顶点坐标系中的值）
* @param  {Array}   size    如： [width{Number}, height{Number}]
* @return {Array}   [halfWidth, halfHeight]
*/
export function getHalfSize([width = 1, height = 1] = [1, 1]) {
  return [width * HALF, height * HALF];
}

/* 根据计划渲染的菱形宽高值，得到顶点坐标集合
* @param  {Array}   size    如： [width{Number}, height{Number}]
* @return {Array}   [[x, y], ...]
*/
export function getVertexes([width = 1, height = 1] = [1, 1]) {
  return getPolygonVertexes(vertexes, width, height);
};

/* 得到一个错列布局菱形地图瓦片的坐标位置
 * @param  {Array}   xyNum          目标元素XY索引值，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {Array}   originXY       原点像素坐标值，如：[0, 0]
 * @param  {Number}  elevation      海拔，默认 0；每单位向上偏移 16px，不改变网格关系
 * @return {Array}   [pixelX, pixelY, gridX, gridY]
 */
export function getPosition(gridCoord = [0, 0], tileSize = [8, 4], stagger = 'odd', originPixel = [0, 0], elevation = 0) {
  return applyElevation(getPolygonPosition(HALF, gridCoord, tileSize, stagger, originPixel), elevation);
}

/* 得到一组错列布局菱形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */
export function getPositions(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown', stagger = 'odd') {
  return getPolygonPositions(HALF, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
}

/* 按等距布局菱形单元横纵坐标值及单元格宽高得到渲染坐标值
 * elevation 默认 0；每单位向上偏移 16px，不改变网格关系。
 */
export function getIsometricPosition([gridX, gridY] = [], tileSize = [8, 4], originPixel = [0, 0], elevation = 0) {
  const [pixelX, pixelY] = getIsometricPosByHalfSize(gridX, gridY, ...getHalfSize(tileSize));
  return applyElevation([pixelX + originPixel[0], pixelY + originPixel[1]], elevation);
}

/* 按等距布局菱形单元横纵坐标值及单元格宽高的一半得到渲染坐标值 */
export function getIsometricPosByHalfSize(xNum, yNum, halfWidth, halfHeight) {
  return [(xNum + yNum) * halfWidth, (yNum - xNum) * halfHeight];
}

/* 得到一组等距正菱形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y]...]
 */
export function getIsometricPositions(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown') {
  const [halfWidth, halfHeight] = getHalfSize(tileSize);
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (xNum, yNum) => [
    ...getIsometricPosByHalfSize(xNum, yNum, halfWidth, halfHeight),
    xNum,
    yNum,
  ]);
}

/* 仅反查平面位置，不处理海拔位移或重叠顶面的点击命中。
 * 根据像素坐标精确定位 odd/even 错列菱形；none 保持近似定位。
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [xNum, yNum, x, y]
 */
export function getInfoByPos(pixelPos = [0, 0], originPixel = [0, 0], tileSize = [8, 4], stagger = 'odd') {
  const candidate = getPolygonInfoByPos(HALF, pixelPos, originPixel, tileSize, stagger);
  // none 不是交错铺满的菱形网格，保持原有近似定位行为。
  if (stagger !== 'odd' && stagger !== 'even') return candidate;
  const [, gridY, centerX, centerY] = candidate;
  const [tileWidth, tileHeight] = tileSize;
  const deltaY = pixelPos[1] - centerY;
  // 先检查候选菱形；共边时保留原候选，保证结果稳定。
  if (Math.abs(pixelPos[0] - centerX) / (tileWidth * HALF)
    + Math.abs(deltaY) / (tileHeight * HALF) <= 1) return candidate;
  // 候选矩形的上下角区属于相邻错列行；重新计算该行的列号即可。
  const targetGridY = gridY + (deltaY > 0 ? 1 : -1);
  const offsetX = isStaggerLine(targetGridY, stagger) ? HALF : 0;
  const targetGridX = Math.round((pixelPos[0] - originPixel[0]) / tileWidth - offsetX);
  const [pixelX, pixelY] = getPosition([targetGridX, targetGridY], tileSize, stagger, originPixel);
  return [targetGridX, targetGridY, pixelX, pixelY];
}

/* 仅反查平面位置，不处理海拔位移或重叠顶面的点击命中。
 * 通过大致的像素坐标值获取该位置等距布局tile元素的[Num, yNum]
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @return {Object}  {xNum, yNum, x, y}
 */
export function getIsometricInfoByPos(pixelPos = [0, 0], originPixel = [0, 0], tileSize = [8, 4]) {
  const [halfWidth, halfHeight] = getHalfSize(tileSize);
  const [originPixelX, originPixelY] = originPixel;
  const pixelStepsX = (pixelPos[0] - originPixelX) / halfWidth * HALF;
  const pixelStepsY = (pixelPos[1] - originPixelY) / halfHeight * HALF;
  const gridY = Math.round(pixelStepsY + pixelStepsX);
  const gridX = Math.round(pixelStepsX - pixelStepsY);
  const [pixelX, pixelY] = getIsometricPosByHalfSize(gridX, gridY, halfWidth, halfHeight);
  return [
    gridX,
    gridY,
    pixelX + originPixelX,
    pixelY + originPixelY,
  ];
}

/* 获得错列布局中指定tile下标周边紧邻的邻居们
 * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
 * @param  {String}    stagger         需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [[xNum, yNum]]
 */
export function getNeighbors(originGrid = [0, 0], stagger = 'odd') {
  const [originGridX, originGridY] = originGrid;
  const neisArr = [
    ...cornersNormalOrOffset,
    ...(isStaggerLine(originGridY, stagger) ? directionsOffset : directionsNormal),
  ];
  return neisArr.map(([offsetX, offsetY, cost, angStr]) => [offsetX + originGridX, offsetY + originGridY, cost, angStr]);
}

/* 获得等距布局中指定tile下标周边紧邻的邻居们
 * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
 * @return {Array}  [[xNum, yNum]]
 */
export function getIsometricNeighbors(originGrid = [0, 0]) {
  const [originGridX, originGridY] = originGrid;
  const neisArr = [ ...cornersIsometric, ...directionsIsometric ];
  return neisArr.map(([offsetX, offsetY, cost, angStr]) => [offsetX + originGridX, offsetY + originGridY, cost, angStr]);
}

/* 按距离获得错列布局菱形周边区域内的元素们
 * @param  {Array}          originXyNum  参考点元素下标，如：[0, 0]
 * @param  {Number}         distance     下标间隔量，目标元素的第几圈邻居，0 ~ N
 * @param  {String|Function} iterator    邻居类型或迭代函数，如：'border' 或 (x, y) => [x, y]
 * @param  {String}          stagger      需要错位排列的行：['odd', 'even', 'none']；默认为 'odd'
 * @param  {String}          renderOrder  渲染方向；默认为 'RightDown'
 * @return {Array} [[xNum, yNum]]，返回基于 originXyNum 的绝对下标
 */
export function getNeighborsByDistance(originXyNum = [0, 0], distance = 1, iterator = 'all', stagger = 'odd', renderOrder = 'RightDown') {
  const [originGridX, originGridY] = originXyNum;
  const neighborIterator = typeof iterator === 'string'
    ? neighborTypes[iterator] || neighborTypes.all
    : iterator;
  return twoDimForEach([-distance, distance], [-distance, distance], renderOrder, (offsetX, offsetY) => {
    const matchedOffset = neighborIterator(offsetX, offsetY, distance);
    if (!Array.isArray(matchedOffset)) return matchedOffset;
    const targetGridY = originGridY + matchedOffset[1] - matchedOffset[0];
    const originGridOffset = isStaggerLine(originGridY, stagger) ? HALF : 0;
    const targetGridOffset = isStaggerLine(targetGridY, stagger) ? HALF : 0;
    const targetGridX = originGridX + (matchedOffset[0] + matchedOffset[1]) * HALF + originGridOffset - targetGridOffset;
    return [Math.round(targetGridX), targetGridY];
  });
}

/* 按距离获得等距布局菱形周边区域内的元素们
 * @param  {Array}          originXyNum  参考点元素下标，如：[0, 0]
 * @param  {Number}         distance     下标间隔量，目标元素的第几圈邻居，0 ~ N
 * @param  {String|Function} iterator    邻居类型或迭代函数，如：'border' 或 (x, y) => [x, y]
 * @param  {String}          renderOrder  渲染方向；默认为 'RightDown'
 * @return {Array} [[xNum, yNum]]，返回基于 originXyNum 的绝对下标
 */
export function getIsometricNeighborsByDistance(originXyNum = [0, 0], distance = 1, iterator = 'all', renderOrder = 'RightDown') {
  const [originGridX, originGridY] = originXyNum;
  const neighborIterator = typeof iterator === 'string'
    ? neighborTypes[iterator] || neighborTypes.all
    : iterator;
  return twoDimForEach([-distance, distance], [-distance, distance], renderOrder, (offsetX, offsetY) => {
    const matchedOffset = neighborIterator(offsetX, offsetY, distance);
    return Array.isArray(matchedOffset)
      ? [matchedOffset[0] + originGridX, matchedOffset[1] + originGridY]
      : matchedOffset;
  });
}

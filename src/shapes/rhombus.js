/* 正菱形地图元件方法 */
// 点(x, y)在宽w高h的菱形内：| x * h | + | y * w | < h * w * 0.5

import {
  HALF,
  FLAH,
  twoDimForEach,
  isStaggerLine,
  getPosition as getPolygonPosition,
  getVertexes as getPolygonVertexes,
  getPositions as getPolygonPositions,
  getInfoByPos as getPolygonInfoByPos,
} from './polygon';

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

// 错列或非错列元素的左上、右上、左下、右下，四个角邻居 [xNum, yNum] 差值及距离成本
// 没错，错列与非错列的角的邻居坐标系差值一样
export const cornersNormalOrOffset = [
  [0, -2, 1.414, '↑'],
  [1, 0, 1.414, '→'],
  [0, 2, 1.414, '↓'],
  [-1, 0, 1.414, '←'],
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
  [1, -1, 1.414, '↑'],
  [1, 1, 1.414, '→'],
  [-1, 1, 1.414, '↓'],
  [-1, -1, 1.414, '←'],
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
 * @return {Array}   [x, y]
 */
export function getPosition(xyNum = [0, 0], tileSize = [8, 4], stagger = 'odd', originXY = [0, 0]) {
  return getPolygonPosition(HALF, xyNum, tileSize, stagger, originXY);
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

/* 按等距布局菱形单元横纵坐标值及单元格宽高得到渲染坐标值 */
export function getIsometricPosition([xNum, yNum] = [], tileSize = [8, 4], originXY = [0, 0]) {
  const [x, y] = getIsometricPosByHalfSize(xNum, yNum, ...getHalfSize(tileSize));
  return [x + originXY[0], y + originXY[1]];
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

/* 通过大致的像素坐标值获取该位置错列布局tile元素的[Num, yNum, x, y]
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [xNum, yNum, x, y]
 */
export function getInfoByPos(pos = [0, 0], originPos = [0, 0], tileSize = [8, 4], stagger = 'odd') {
  return getPolygonInfoByPos(HALF, pos, originPos, tileSize, stagger);
}

/* 通过大致的像素坐标值获取该位置等距布局tile元素的[Num, yNum]
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @return {Object}  {xNum, yNum, x, y}
 */
export function getIsometricInfoByPos(pos = [0, 0], originPos = [0, 0], tileSize = [8, 4]) {
  const [halfWidth, halfHeight] = getHalfSize(tileSize);
  const [originX, originY] = originPos;
  const xSteps = (pos[0] - originX) / halfWidth * HALF;
  const ySteps = (pos[1] - originY) / halfHeight * HALF;
  const yNum = Math.round(ySteps + xSteps);
  const xNum = Math.round(xSteps - ySteps);
  const [x, y] = getIsometricPosByHalfSize(xNum, yNum, halfWidth, halfHeight);
  return [
    xNum,
    yNum,
    x + originX,
    y + originY,
  ];
}

/* 获得错列布局中指定tile下标周边紧邻的邻居们
 * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
 * @param  {String}    stagger         需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [[xNum, yNum]]
 */
export function getNeighbors(originXyNum = [0, 0], stagger = 'odd') {
  const [originXNum, originYNum] = originXyNum;
  const neisArr = [
    ...cornersNormalOrOffset,
    ...(isStaggerLine(originYNum, stagger) ? directionsOffset : directionsNormal),
  ];
  return neisArr.map(([xNum, yNum, cost, angStr]) => [xNum + originXNum, yNum + originYNum, cost, angStr]);
}

/* 获得等距布局中指定tile下标周边紧邻的邻居们
 * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
 * @return {Array}  [[xNum, yNum]]
 */
export function getIsometricNeighbors(originXyNum = [0, 0]) {
  const [originXNum, originYNum] = originXyNum;
  const neisArr = [ ...cornersIsometric, ...directionsIsometric ];
  return neisArr.map(([xNum, yNum, cost, angStr]) => [xNum + originXNum, yNum + originYNum, cost, angStr]);
}

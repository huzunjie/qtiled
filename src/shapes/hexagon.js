/* 正六边形地图元件方法 */

import {
  HALF,
  FLAH,
  QUAR,
  RAUQ,
  TQUA as TQUA_VAL,
  isStaggerLine,
  getVertexes as getPolygonVertexes,
  getPosition as getPolygonPosition,
  getPositions as getPolygonPositions,
  getInfoByPos as getPolygonInfoByPos,
} from './polygon';

// 宽高为1的六边形顶点集合（上下为尖）
export const vertexes = [
  [0, FLAH],
  [HALF, RAUQ],
  [HALF, QUAR],
  [0, HALF],
  [FLAH, QUAR],
  [FLAH, RAUQ],
];

export const TQUA = TQUA_VAL;

/* 左上、右上、右下、左下、左边、右边，6个边邻居 [xNum, yNum, cost, angle] 差值及距离成本及渲染角度 */
export const directionsNormal = [
  [-1, -1, 1, '↖'],
  [0, -1, 1, '↗'],
  [0, 1, 1, '↘'],
  [-1, 1, 1, '↙'],
  [-1, 0, 1, '←'],
  [1, 0, 1, '→'],
];

/* 错列行邻居下标差值 */
export const directionsOffset = [
  [0, -1, 1, '↖'],
  [1, -1, 1, '↗'],
  [1, 1, 1, '↘'],
  [0, 1, 1, '↙'],
  [-1, 0, 1, '←'],
  [1, 0, 1, '→'],
];

/* 根据计划渲染的六边形宽高值得到顶点坐标集
* @param  {Array}   size    如： [width{Number}, height{Number}]
* @param  {String}  axis     主轴方向 'x' || 'y'；默认为 'y'，上下是尖
* @return {Array}   [[x, y], ...]
*/
export function getVertexes([width = 1, height = 1] = [1, 1], axis = 'y') {
  return getPolygonVertexes(vertexes, width, height, axis);
};

/* 得到一个错列布局六边形地图瓦片的坐标位置
 * @param  {Array}   xyNum          目标元素XY索引值，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {Array}   originXY       原点像素坐标值，如：[0, 0]
 * @return {Array}   [x, y]
 */
export function getPosition(xyNum = [0, 0], tileSize = [8, 4], stagger = 'odd', originXY = [0, 0]) {
  return getPolygonPosition(TQUA, xyNum, tileSize, stagger, originXY);
}

/* 得到一组错列布局六边形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}   [[x, y], ...]
 */
export function getPositions(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown', stagger = 'odd') {
  return getPolygonPositions(TQUA, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
}

/* 通过大致的像素坐标值获取该位置tile元素的[Num, yNum]
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [xNum, yNum, x, y]
 */
export function getInfoByPos(pos = [0, 0], originPos = [0, 0], tileSize = [8, 4], stagger = 'odd') {
  return getPolygonInfoByPos(TQUA, pos, originPos, tileSize, stagger);
}

/* 获得指定tile下标周边紧邻的邻居们
 * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
 * @param  {String}    stagger         需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [[xNum, yNum]]
 */
export function getNeighbors(originXyNum = [0, 0], stagger = 'odd') {
  const [originXNum, originYNum] = originXyNum;
  const directions = isStaggerLine(originYNum, stagger) ? directionsOffset : directionsNormal;
  return directions.map(([xNum, yNum]) => [xNum + originXNum, yNum + originYNum]);
}

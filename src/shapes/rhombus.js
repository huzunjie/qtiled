/* 正菱形地图元件方法 */

import { HALF, FLAH, getPolygonVertexes, getPolygonPositions, getPolygonInfoByPos, twoDimForEach } from './polygon';

// 宽高为1的正菱形顶点集合
const rhombusVertexes = [
  [0, FLAH],
  [HALF, 0],
  [0, HALF],
  [FLAH, 0],
];

/* 根据计划渲染的菱形宽高值，得到顶点坐标集合
* @param  {Number}  width    宽度
* @param  {Number}  height   高度
* @return {Array}   [[x, y], ...]
*/
export function getRhombusVertexes(width = 1, height = 1) {
  return getPolygonVertexes(rhombusVertexes, width, height);
};

/* 得到一组错列布局菱形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */
export function getRhombusPositions(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown', stagger = 'odd') {
  return getPolygonPositions(HALF, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
}

/* 按等距布局菱形单元横纵坐标值及单元格宽高得到渲染坐标值 */
export function getIsometricXY(xNum, yNum, halfWidth, halfHeight) {
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
export function getIsometricRhombusPositions(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown') {
  const halfWidth = tileSize[0] / 2;
  const halfHeight = tileSize[1] / 2;
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (xNum, yNum) => [
    ...getIsometricXY(xNum, yNum, halfWidth, halfHeight),
    xNum,
    yNum,
  ]);
}

/* 通过大致的像素坐标值获取该位置错列布局tile元素的[Num, yNum, x, y]
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Object}  {xNum, yNum, x, y}
 */
export function getRhombusInfoByPos(pos = [0, 0], originPos = [0, 0], tileSize = [8, 4], stagger = 'odd') {
  return getPolygonInfoByPos(HALF, pos, originPos, tileSize, stagger);
}

/* 通过大致的像素坐标值获取该位置等距布局tile元素的[Num, yNum]
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @return {Object}  {xNum, yNum, x, y}
 */
export function getIsometricRhombusInfoByPos(pos = [0, 0], originPos = [0, 0], tileSize = [8, 4]) {
  const halfHeight = tileSize[1] * HALF;
  const halfWidth = tileSize[0] * HALF;
  const [originX, originY] = originPos;
  const xSteps = (pos[0] - originX) / halfWidth * HALF;
  const ySteps = (pos[1] - originY) / halfHeight * HALF;
  const yNum = Math.round(ySteps + xSteps);
  const xNum = Math.round(xSteps - ySteps);
  const [x, y] = getIsometricXY(xNum, yNum, halfWidth, halfHeight);
  return [
    xNum,
    yNum,
    x + originX,
    y + originY,
  ];
}

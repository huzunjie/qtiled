/* 正矩形地图元件方法 */

import {
  HALF,
  FLAH,
  twoDimForEach,
  getVertexes as getPolygonVertexes,
  getPositions as getPolygonPositions,
  getInfoByPos as getPolygonInfoByPos,
} from './polygon';

// 宽高为1的正矩形顶点集合
export const vertexes = [
  [FLAH, FLAH],
  [HALF, FLAH],
  [HALF, HALF],
  [FLAH, HALF],
];

/* 上、右、下、左，四个边邻居 [xNum, yNum, cost] 差值及距离成本 */
export const directions = [
  [0, -1, 1, '↑'],
  [1, 0, 1, '→'],
  [0, 1, 1, '↓'],
  [-1, 0, 1, '←'],
];

/* 左上、右上、左下、右下，四个角邻居 [xNum, yNum] 差值及距离成本 */
export const corners = [
  [-1, -1, 1.414, '↖'],
  [1, -1, 1.414, '↗'],
  [1, 1, 1.414, '↙'],
  [-1, 1, 1.414, '↘'],
];

/* 根据计划渲染后的正矩形宽高值，得到顶点坐标集合
* @param  {Array}   size    如： [width{Number}, height{Number}]
* @return {Array}   [[x, y], ...]
*/
export function getVertexes([width, height] = [1, 1]) {
  return getPolygonVertexes(vertexes, width, height);
};

/* 得到一个矩形地图瓦片的坐标偏移位置
 * @param  {Array}   xyNum          xy轴序号，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {Array}   originXY       原点像素坐标值，如：[80, 40]
 * @return {Array}   [x, y]
 */
export function getPosition(xyNum = [0, 0], tileSize = [8, 4], originXY = [0, 0]) {
  return [originXY[0] + xyNum[0] * tileSize[0], originXY[1] + xyNum[1] * tileSize[1]];
}

/* 得到一组矩形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */
export function getPositions(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown') {
  return getPolygonPositions(1, mainAxisRange, subAxisRange, tileSize, 'none', renderOrder);
}

/* 获得与pos坐标有交集的tile元素的{xNum, yNum, x, y}
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @return {Array}  [xNum, yNum, x, y]
 */
export function getInfoByPos(pos = [0, 0], originPos = [0, 0], tileSize = [8, 4]) {
  return getPolygonInfoByPos(1, pos, originPos, tileSize, 'none');
}

/* 获得指定tile下标周边的邻居元素们
 * @param  {Array}     xyNum           XY轴序号，如：[0, 0]
 * @param  {Number}    distance        下标间隔量，目标元素的第几圈邻居，0 ~ N
 * @param  {Function}  iterator        迭代函数，如：(x, y) => [x, y]
 * @param  {String}    renderOrder     渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}  [[xNum, yNum]]
 */
export function getNeighbors(xyNum = [0, 0], distance = 1, iterator = (x, y) => [x, y], renderOrder) {
  return twoDimForEach([-distance, distance], [-distance, distance], renderOrder, iterator);
}

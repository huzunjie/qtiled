/* 正六边形地图元件方法 */

import { HALF, FLAH, QUAR, RAUQ, TQUA, getPolygonVertexes, getPolygonPositions } from './polygon';

// 宽高为1的六边形顶点集合（上下为尖）
const hexagonVertexes = [
  [0, FLAH],
  [HALF, RAUQ],
  [HALF, QUAR],
  [0, HALF],
  [FLAH, QUAR],
  [FLAH, RAUQ],
];

/* 根据计划渲染的六边形宽高值得到顶点坐标集
* @param  {Number}  width    宽度
* @param  {Number}  height   高度
* @param  {String}  axis     主轴方向 'x' || 'y'；默认为 'y'，上下是尖
* @return {Array}   [[x, y], ...]
*/
export function getHexagonVertexes(width = 1, height = 1, axis = 'y') {
  return getPolygonVertexes(hexagonVertexes, width, height, axis);
};

/* 得到一组错列布局六边形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}   [[x, y], ...]
 */
export function getHexagonPositions(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown', stagger = 'odd') {
  return getPolygonPositions(TQUA, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
}

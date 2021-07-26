/* 正菱形地图元件方法 */

import { HALF, FLAH, getPolygonVertexes, getPolygonPositions, twoDimForEach } from './polygon';

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
export function getRhombusVertexes (width = 1, height = 1) {
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
export function getRhombusPositions (mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown', stagger = 'odd') {
  return getPolygonPositions(HALF, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
}

/* 得到一组等距正菱形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y]...]
 */
export function getIsometricRhombusPositions (mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown') {
  const halfWidth = tileSize[0] / 2;
  const halfHeight = tileSize[1] / 2;
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (m, s) => [
    (m + s) * halfWidth,
    (s - m) * halfHeight,
    m,
    s
  ]);
}

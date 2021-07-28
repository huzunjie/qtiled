/* 正矩形地图元件方法 */

import { HALF, FLAH, getPolygonVertexes, getPolygonPositions } from './polygon';

// 宽高为1的正矩形顶点集合
const rectVertexes = [
  [FLAH, FLAH],
  [HALF, FLAH],
  [HALF, HALF],
  [FLAH, HALF],
];

/* 根据计划渲染后的正矩形宽高值，得到顶点坐标集合
* @param  {Number}  width    宽度
* @param  {Number}  height   高度
* @return {Array}   [[x, y], ...]
*/
export function getRectVertexes(width = 1, height = 1) {
  return getPolygonVertexes(rectVertexes, width, height);
};

/* 得到一组矩形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */
export function getRectPositions(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown') {
  return getPolygonPositions(1, mainAxisRange, subAxisRange, tileSize, 'none', renderOrder);
}

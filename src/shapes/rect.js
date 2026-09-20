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

/* 上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本 */
export const directions = [
  [0, -1, 1, '↑'],
  [1, 0, 1, '→'],
  [0, 1, 1, '↓'],
  [-1, 0, 1, '←'],
];

const { SQRT2 } = Math;

/* 左上、右上、左下、右下，四个角邻居 [xNum, yNum, cost, angStr] 差值及距离成本 */
export const corners = [
  [-1, -1, SQRT2, '↖'],
  [1, -1, SQRT2, '↗'],
  [1, 1, SQRT2, '↘'],
  [-1, 1, SQRT2, '↙'],
];

/* 按距离筛选邻居的类型配置 */
export const neighborTypes = {
  all: (x, y) => [x, y],
  no_self: (x, y) => x === 0 && y === 0 ? false : [x, y],
  border: (x, y, distance) => Math.abs(x) === distance || Math.abs(y) === distance ? [x, y] : false,
  vertex: (x, y, distance) => Math.abs(x) === distance && Math.abs(y) === distance ? [x, y] : false,
  // 筛选中心点处于外轮廓四条边中心点连线（菱形）区域之内的瓦片
  diamond: (x, y, distance) => Math.abs(x) + Math.abs(y) <= distance ? [x, y] : false,
};

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
 * @param  {Array}     originXyNum    XY轴序号，如：[0, 0]
 * @return {Array}  [[xNum, yNum]]
 */
export function getNeighbors(originXyNum = [0, 0], neisConf = [...directions, ...corners]) {
  const [originXNum, originYNum] = originXyNum;
  return neisConf.map(([xNum, yNum, cost, angStr]) => [xNum + originXNum, yNum + originYNum, cost, angStr]);
}

/* 按距离获得指定tile下标周边区域内的元素们
 * @param  {Array}     originXyNum     XY轴序号，如：[0, 0]
 * @param  {Number}    distance        下标间隔量，目标元素的第几圈邻居，0 ~ N
 * @param  {String|Function} iterator   邻居类型或迭代函数，如：'border' 或 (x, y) => [x, y]
 * @param  {String}    renderOrder     渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}  [[xNum, yNum]]，返回值为基于 originXyNum 的绝对下标
 */
export function getNeighborsByDistance(originXyNum = [0, 0], distance = 1, iterator = (x, y) => [x, y], renderOrder) {
  const [originXNum, originYNum] = originXyNum;
  const neighborIterator = typeof iterator === 'string'
    ? neighborTypes[iterator] || neighborTypes.all
    : iterator;
  return twoDimForEach([-distance, distance], [-distance, distance], renderOrder, (x, y) => {
    const ret = neighborIterator(x, y, distance);
    return Array.isArray(ret)
      ? [ret[0] + originXNum, ret[1] + originYNum]
      : ret;
  });
}

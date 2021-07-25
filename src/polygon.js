/* 多边形相关配置及方法 */

// 基础配置参数
const HALF = 0.5;
const FLAH = -HALF;
const QUAR = 0.25; // 四分之一
const RAUQ = -QUAR;
const TQUA = 1 - QUAR; // 正六边形两行重合部分高度

// 正方形顶点集合
export const squarePoints = [
  [FLAH, FLAH],
  [HALF, FLAH],
  [HALF, HALF],
  [FLAH, HALF],
];

/* 根据计划渲染后的正方形宽高值，得到顶点坐标集合
* @param  {Number}  width    宽度
* @param  {Number}  height   高度
* @return {Array}   [[x, y], ...]
*/
export function getSquarePoints (width = 1, height = 1) {
  return getPolygonPoints(squarePoints, width, height);
};

/* 得到一组矩形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */
export function getSquarePositions (mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown') {
  return getTilesPositions(1, mainAxisRange, subAxisRange, tileSize, 'none', renderOrder);
}

// 正菱形顶点集合
export const rhombusPoints = [
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
export function getRhombusPoints (width = 1, height = 1) {
  return getPolygonPoints(rhombusPoints, width, height);
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
  return getTilesPositions(HALF, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
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

// 正六边形顶点集合（上下为尖）
export const hexagonPoints = [
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
export function getHexagonPoints (width = 1, height = 1, axis = 'y') {
  return getPolygonPoints(hexagonPoints, width, height, axis);
};

/* 得到一组错列布局六边形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */
export function getHexagonPositions (mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown', stagger = 'odd') {
  return getTilesPositions(TQUA, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
}

/* 得到一个多边形折线顶点坐标集合
 * @param  {Array}     basePoints    多边形顶点配置，如上文的: rhombusPoints
 * @param  {Number}    width         渲染时的宽度值
 * @param  {Number}    height        渲染时的高度值
 * @param  {String}    axis          主轴方向 'x' || 'y'；默认为 'y'，上下是尖
 * @return {Array}     [x, y]
 */
function getPolygonPoints (basePoints, width = 1, height = 1, axis = 'y') {
  let fun = ([x, y]) => [x * width, y * height];
  // 如果是要将多边形图案横过来的，旋转90度（六边形会比较大的不同）
  if (axis === 'x') {
    fun = ([x, y]) => [y * width, x * height];
  }
  return basePoints.map(fun);
};

function _for (min, max, iterator) {
  for (let i = min; i <= max; i++) iterator(i);
}
const forEachConfs = {
  RightDown (minX = 0, maxX = 0, minY = 0, maxY = 0, iterator) {
    _for(minX, maxX, (x) => _for(minY, maxY, (y) => iterator(x, y)));
  },
  RightUp (minX = 0, maxX = 0, minY = 0, maxY = 0, iterator) {
    _for(minX, maxX, (x) => _for(-maxY, -minY, (y) => iterator(x, y)));
  },
  LeftDown (minX = 0, maxX = 0, minY = 0, maxY = 0, iterator) {
    _for(-maxX, -minX, (x) => _for(minY, maxY, (y) => iterator(x, y)));
  },
  LeftUp (minX = 0, maxX = 0, minY = 0, maxY = 0, iterator) {
    _for(-maxX, -minX, (x) => _for(-maxY, -minY, (y) => iterator(x, y)));
  }
};

/* 按renderOrder循环遍历主副轴二维数组
 * @param  {Array}     mainAxisRange  主轴总行数
 * @param  {Array}     subAxisRange   副轴总行数
 * @param  {String}    renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @param  {Function}  iterator    迭代函数，如：(x, y) => [x, y]
 * @return {Array}    [x, y]
 */
export function twoDimForEach (mainAxisRange = [0, 0], subAxisRange = [0, 0], renderOrder = 'RightDown', iterator = (x, y) => [x, y]) {
  const forEachFun = forEachConfs[renderOrder] || forEachConfs.RightDown;
  const retArr = [];
  forEachFun(
    ...mainAxisRange,
    ...subAxisRange,
    (x, y) => retArr.push(iterator(x, y))
  );
  return retArr;
}

// 根据偏移行设定，计算偏移量的方法集
const staggerConfs = {
  none: (m) => m,
  def: (m, s, rem, minS) => Math.round(s - minS) % 2 === rem ? m + HALF : m,
};
/* 得到一组错列布局正多边形地图Tile的坐标偏移位置集合
 * @param  {Number}  offsetRate     偏移量比率
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */
function getTilesPositions (offsetRate = 1, mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], stagger = 'odd', renderOrder = 'RightDown') {
  const [width, _height] = tileSize;
  // 多边形在主轴方向必须向上位移，才能保证挫列后网格对齐，所以这里要乘以 offsetRate
  const height = _height * offsetRate;
  const rem = Number(stagger === 'odd');
  // 多边形错列布局副轴上需要偏移来达成错列布局
  const staggerFun = staggerConfs[stagger] || staggerConfs.def;
  const minS = subAxisRange[0];
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (m, s) => [
    staggerFun(m, s, rem, minS) * width,
    s * height,
    m,
    s
  ]);
}



/**
 * qtiled v0.2.7
 * (c) 2008-2026 huzunjie
 * Released under MIT
 */

/* 椭圆形 */
const PI = Math.PI; // π；180度对应的弧度值

const PI_DBL = PI * 2; // 2 倍的 π；360度对应的弧度值

const PI_HALF = PI / 2; // 一半的 π；90度对应的弧度值

const PI_OPF = PI + PI_HALF; // 1.5 倍的π One point five；270度对应弧度值

const PI_OA = PI / 180; // One Angle 1角度换算为弧度值

/* 角度转弧度
* @param {Number}  angle    角度值 0 ~ 360+N
* @return {Number} 弧度值
*/

function angle2Radian(angle = 0) {
  return angle * PI_OA;
}
/* 弧度转角度
* @param {Number}  radian    弧度值 0 ~ PI*N
* @return {Number} 角度值
*/

function radian2Angle(radian = 0) {
  return radian / PI_OA;
}
/* 根据椭圆的原点、X轴半径、Y轴半径、弧度，求得圆周上的点坐标
* @param  {Number}  x0        圆心X点坐标值
* @param  {Number}  y0        圆心Y点坐标值
* @param  {Number}  radiusX   X轴半径值
* @param  {Number}  radiusY   Y轴半径值
* @param  {Number}  radian    弧度值
* @return {Array}   [x, y]
*/

function getPoint(x0, y0, radiusX, radiusY, radian) {
  radian %= PI_DBL;
  if (radian < 0) radian += PI_DBL;
  const k = Math.tan(radian);

  if (Math.abs(k) > 1e5) {
    return [x0, y0 + (radian < PI ? radiusY : -radiusY)];
  } // 第一或第四象限取正、其他象限取负


  const d = radian <= PI_HALF || radian > PI_OPF ? 1 : -1;
  const v = 1 / radiusX ** 2 + k ** 2 / radiusY ** 2;
  const x = d * Math.sqrt(1 / v) + x0;
  return [x, k * x + y0 - k * x0];
}
/* 根据椭圆的原点、X轴半径、Y轴半径、角度，求得圆周上的点坐标
* @param  {Number}  x0        圆心X点坐标值
* @param  {Number}  y0        圆心Y点坐标值
* @param  {Number}  radiusX   X轴半径值
* @param  {Number}  radiusY   Y轴半径值
* @param  {Number}  angle     角度值
* @return {Array}   [x, y]
*/

function getPointByAngle(x0, y0, radiusX, radiusY, angle) {
  return getPoint(x0, y0, radiusX, radiusY, angle2Radian(angle));
}
/* 根据椭圆的X轴半径、Y轴半径、圆周等分数量、等分点序号、起始弧度，求得圆周上的点坐标
* @param  {Number}  radiusX   X轴半径值
* @param  {Number}  radiusY   Y轴半径值
* @param  {Number}  count     圆周等分数量
* @param  {Number}  num       圆周等分点序号
* @param  {Number}  radian    起始弧度
* @return {Array}   [x, y]
*/

function getEquidistantPoint(radiusX, radiusY, count, num, radian = 0) {
  radian += PI_DBL * num / count;
  return [radiusX * Math.cos(radian), radiusY * Math.sin(radian)];
}

var ellipseFuns = /*#__PURE__*/Object.freeze({
  __proto__: null,
  PI: PI,
  PI_DBL: PI_DBL,
  PI_HALF: PI_HALF,
  PI_OPF: PI_OPF,
  PI_OA: PI_OA,
  angle2Radian: angle2Radian,
  radian2Angle: radian2Angle,
  getPoint: getPoint,
  getPointByAngle: getPointByAngle,
  getEquidistantPoint: getEquidistantPoint
});

/* 二维多边形相关配置及基础方法 */

/* 基础配置参数（个别参数调整涉及算法变化，所以放全局配置，以示特殊）*/
const HALF = 0.5;
const FLAH = -HALF;
const QUAR = 0.25; // 四分之一

const RAUQ = -QUAR;
const TQUA$1 = 1 - QUAR; // 正六边形两行重合部分高度

/* 按距离筛选邻居的类型配置 */

const neighborTypes = {
  all: (x, y) => [x, y],
  no_self: (x, y) => x === 0 && y === 0 ? false : [x, y],
  border: (x, y, distance) => Math.abs(x) === distance || Math.abs(y) === distance ? [x, y] : false,
  vertex: (x, y, distance) => Math.abs(x) === distance && Math.abs(y) === distance ? [x, y] : false,
  // 筛选中心点处于外轮廓四条边中心点连线（菱形）区域之内的瓦片
  diamond: (x, y, distance) => Math.abs(x) + Math.abs(y) <= distance ? [x, y] : false
};
/* 得到一个多边形折线顶点坐标集合
 * @param  {Array}     baseVertexes    多边形顶点配置，如上文的: rectVertexes
 * @param  {Number}    width         渲染时的宽度值
 * @param  {Number}    height        渲染时的高度值
 * @param  {String}    axis          主轴方向 'x' || 'y'；默认为 'y'，上下是尖
 * @return {Array}     [x, y]
 */

function getVertexes$3(baseVertexes, width = 1, height = 1, axis = 'y') {
  let fun = ([x, y]) => [x * width, y * height]; // 如果是要将多边形图案横过来的，旋转90度（六边形会比较大的不同）


  if (axis === 'x') {
    fun = ([x, y]) => [y * width, x * height];
  }

  return baseVertexes.map(fun);
}

function _for(min, max, cbk) {
  for (let i = min; i <= max; i++) cbk(i);
}

function for_(min, max, cbk) {
  for (let i = max; i >= min; i--) cbk(i);
}

const forEachConfs = {
  RightDown(minX = 0, maxX = 0, minY = 0, maxY = 0, cbk) {
    _for(minX, maxX, x => _for(minY, maxY, y => cbk(x, y)));
  },

  RightUp(minX = 0, maxX = 0, minY = 0, maxY = 0, cbk) {
    _for(minX, maxX, x => for_(minY, maxY, y => cbk(x, y)));
  },

  LeftDown(minX = 0, maxX = 0, minY = 0, maxY = 0, cbk) {
    for_(minX, maxX, x => _for(minY, maxY, y => cbk(x, y)));
  },

  LeftUp(minX = 0, maxX = 0, minY = 0, maxY = 0, cbk) {
    for_(minX, maxX, x => for_(minY, maxY, y => cbk(x, y)));
  }

};
/* 按renderOrder循环遍历主副轴二维数组
 * @param  {Array}     mainAxisRange  主轴总行数
 * @param  {Array}     subAxisRange   副轴总行数
 * @param  {String}    renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @param  {Function}  iterator       迭代函数，如：(x, y) => [x, y]
 * @return {Array}    [x, y]
 */

function twoDimForEach(mainAxisRange = [0, 0], subAxisRange = [0, 0], renderOrder = 'RightDown', iterator = (x, y) => [x, y]) {
  const forEachFun = forEachConfs[renderOrder] || forEachConfs.RightDown;
  const retArr = [];
  forEachFun(...mainAxisRange, ...subAxisRange, (x, y) => {
    const ret = iterator(x, y);
    ret && retArr.push(ret);
  });
  return retArr;
} // 某行是否需要按全局错列配置错位排列

function isStaggerLine(lineNum, stagger) {
  return stagger !== 'none' && Math.abs(Math.round(lineNum) % 2) === Number(stagger === 'odd');
}
/* 得到一个错列布局正多边形地图Tile的坐标值
 * @param  {Number}  lineRate       偏移量比率
 * @param  {Array}   xyNum          目标元素XY索引值，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {Array}   originXY       原点像素坐标值，如：[0, 0]
 * @return {Array}   [x, y, xNum, yNum]
 */

function getPosition$3(lineRate = 1, xyNum = [0, 0], tileSize = [8, 4], stagger = 'none', originXY = [0, 0]) {
  const [width, height] = tileSize;
  const [xNum, yNum] = xyNum;
  return [// X轴按Y轴奇偶性补充错列偏移量
  originXY[0] + (xNum + (isStaggerLine(yNum, stagger) ? HALF : 0)) * width, // 多边形在主轴方向必须向上位移，才能保证挫列后网格对齐，所以这里要乘以 lineRate
  originXY[1] + yNum * height * lineRate, xNum, yNum];
}
/* 得到一组错列布局正多边形地图Tile的坐标偏移位置集合
 * @param  {Number}  lineRate       主轴偏移量比率
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y, xNum, yNum], ...]
 */

function getPositions$3(lineRate = 1, mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], stagger = 'odd', renderOrder = 'RightDown') {
  const [width, _height] = tileSize; // 多边形在主轴方向必须向上位移，才能保证挫列后网格对齐，所以这里要乘以 lineRate

  const height = _height * lineRate;
  const needOffset = stagger !== 'none';
  const isOddNum = Number(stagger === 'odd'); // 多边形错列布局副轴上需要偏移来达成错列布局

  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (mainAxisNum, subAxisNum) => {
    let lineRate = mainAxisNum;

    if (needOffset && Math.abs(Math.round(subAxisNum) % 2) === isOddNum) {
      lineRate += HALF; // 补充错列偏移量
    }

    return [lineRate * width, subAxisNum * height, mainAxisNum, subAxisNum];
  });
}
/* 通过大致的像素坐标值获取该位置tile元素的[xNum, yNum, x, y]
 * @param  {Number}  lineRate       主轴偏移量比率（错列行之间的Y主轴坐标差值与其在主轴行高的比值）
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Object}  {xNum, yNum, x, y}
 */

function getInfoByPos$3(lineRate = 1, pos = [0, 0], originPos = [0, 0], tileSize = [8, 4], stagger = 'odd') {
  const [originX, originY] = originPos;
  const [width, height] = tileSize;
  const lineHeight = height * lineRate; // 行高

  const dotX = pos[0] - originX;
  const dotY = pos[1] - originY; // 多边形错列布局需要补充偏移量

  let xNumOffset = 0;
  const yNum = Math.round(dotY / lineHeight);

  if (stagger !== 'none' && Math.abs(yNum % 2) === Number(stagger === 'odd')) {
    xNumOffset = HALF;
  }

  const xNum = Math.round(dotX / width - xNumOffset);
  const centerX = (xNum + xNumOffset) * width;
  const centerY = yNum * lineHeight;
  const tileX = centerX + originX;
  const tileY = centerY + originY;
  return [xNum, yNum, tileX, tileY];
}

var polygonFuns = /*#__PURE__*/Object.freeze({
  __proto__: null,
  HALF: HALF,
  FLAH: FLAH,
  QUAR: QUAR,
  RAUQ: RAUQ,
  TQUA: TQUA$1,
  neighborTypes: neighborTypes,
  getVertexes: getVertexes$3,
  twoDimForEach: twoDimForEach,
  isStaggerLine: isStaggerLine,
  getPosition: getPosition$3,
  getPositions: getPositions$3,
  getInfoByPos: getInfoByPos$3
});

/* 正矩形地图元件方法 */

const vertexes$2 = [[FLAH, FLAH], [HALF, FLAH], [HALF, HALF], [FLAH, HALF]];
/* 上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本 */

const directions = [[0, -1, 1, '↑'], [1, 0, 1, '→'], [0, 1, 1, '↓'], [-1, 0, 1, '←']];
const {
  SQRT2: SQRT2$1
} = Math;
/* 左上、右上、左下、右下，四个角邻居 [xNum, yNum, cost, angStr] 差值及距离成本 */

const corners = [[-1, -1, SQRT2$1, '↖'], [1, -1, SQRT2$1, '↗'], [1, 1, SQRT2$1, '↘'], [-1, 1, SQRT2$1, '↙']];
/* 根据计划渲染后的正矩形宽高值，得到顶点坐标集合
* @param  {Array}   size    如： [width{Number}, height{Number}]
* @return {Array}   [[x, y], ...]
*/

function getVertexes$2([width, height] = [1, 1]) {
  return getVertexes$3(vertexes$2, width, height);
}
/* 得到一个矩形地图瓦片的坐标偏移位置
 * @param  {Array}   xyNum          xy轴序号，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {Array}   originXY       原点像素坐标值，如：[80, 40]
 * @return {Array}   [x, y]
 */

function getPosition$2(xyNum = [0, 0], tileSize = [8, 4], originXY = [0, 0]) {
  return [originXY[0] + xyNum[0] * tileSize[0], originXY[1] + xyNum[1] * tileSize[1]];
}
/* 得到一组矩形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */

function getPositions$2(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown') {
  return getPositions$3(1, mainAxisRange, subAxisRange, tileSize, 'none', renderOrder);
}
/* 获得与pos坐标有交集的tile元素的{xNum, yNum, x, y}
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @return {Array}  [xNum, yNum, x, y]
 */

function getInfoByPos$2(pos = [0, 0], originPos = [0, 0], tileSize = [8, 4]) {
  return getInfoByPos$3(1, pos, originPos, tileSize, 'none');
}
/* 获得指定tile下标周边的邻居元素们
 * @param  {Array}     originXyNum    XY轴序号，如：[0, 0]
 * @return {Array}  [[xNum, yNum]]
 */

function getNeighbors$2(originXyNum = [0, 0], neisConf = [...directions, ...corners]) {
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

function getNeighborsByDistance$1(originXyNum = [0, 0], distance = 1, iterator = (x, y) => [x, y], renderOrder) {
  const [originXNum, originYNum] = originXyNum;
  const neighborIterator = typeof iterator === 'string' ? neighborTypes[iterator] || neighborTypes.all : iterator;
  return twoDimForEach([-distance, distance], [-distance, distance], renderOrder, (x, y) => {
    const ret = neighborIterator(x, y, distance);
    return Array.isArray(ret) ? [ret[0] + originXNum, ret[1] + originYNum] : ret;
  });
}

var rectFuns = /*#__PURE__*/Object.freeze({
  __proto__: null,
  vertexes: vertexes$2,
  directions: directions,
  corners: corners,
  neighborTypes: neighborTypes,
  getVertexes: getVertexes$2,
  getPosition: getPosition$2,
  getPositions: getPositions$2,
  getInfoByPos: getInfoByPos$2,
  getNeighbors: getNeighbors$2,
  getNeighborsByDistance: getNeighborsByDistance$1
});

/* 正六边形地图元件方法 */

const vertexes$1 = [[0, FLAH], [HALF, RAUQ], [HALF, QUAR], [0, HALF], [FLAH, QUAR], [FLAH, RAUQ]];
const TQUA = TQUA$1;
/* 左上、右上、右下、左下、左边、右边，6个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本及渲染角度 */

const directionsNormal$1 = [[-1, -1, 1, '↖'], [0, -1, 1, '↗'], [0, 1, 1, '↘'], [-1, 1, 1, '↙'], [-1, 0, 1, '←'], [1, 0, 1, '→']];
/* 错列行邻居下标差值 [xNum, yNum, cost, angStr] */

const directionsOffset$1 = [[0, -1, 1, '↖'], [1, -1, 1, '↗'], [1, 1, 1, '↘'], [0, 1, 1, '↙'], [-1, 0, 1, '←'], [1, 0, 1, '→']];
/* 根据计划渲染的六边形宽高值得到顶点坐标集
* @param  {Array}   size    如： [width{Number}, height{Number}]
* @param  {String}  axis     主轴方向 'x' || 'y'；默认为 'y'，上下是尖
* @return {Array}   [[x, y], ...]
*/

function getVertexes$1([width = 1, height = 1] = [1, 1], axis = 'y') {
  return getVertexes$3(vertexes$1, width, height, axis);
}
/* 得到一个错列布局六边形地图瓦片的坐标位置
 * @param  {Array}   xyNum          目标元素XY索引值，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {Array}   originXY       原点像素坐标值，如：[0, 0]
 * @return {Array}   [x, y]
 */

function getPosition$1(xyNum = [0, 0], tileSize = [8, 4], stagger = 'odd', originXY = [0, 0]) {
  return getPosition$3(TQUA, xyNum, tileSize, stagger, originXY);
}
/* 得到一组错列布局六边形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}   [[x, y], ...]
 */

function getPositions$1(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown', stagger = 'odd') {
  return getPositions$3(TQUA, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
}
/* 通过大致的像素坐标值获取该位置tile元素的[Num, yNum]
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [xNum, yNum, x, y]
 */

function getInfoByPos$1(pos = [0, 0], originPos = [0, 0], tileSize = [8, 4], stagger = 'odd') {
  return getInfoByPos$3(TQUA, pos, originPos, tileSize, stagger);
}
/* 获得指定tile下标周边紧邻的邻居们
 * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
 * @param  {String}    stagger         需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [[xNum, yNum]]
 */

function getNeighbors$1(originXyNum = [0, 0], stagger = 'odd') {
  const [originXNum, originYNum] = originXyNum;
  const directions = isStaggerLine(originYNum, stagger) ? directionsOffset$1 : directionsNormal$1;
  return directions.map(([xNum, yNum, cost, angStr]) => [xNum + originXNum, yNum + originYNum, cost, angStr]);
}

var hexagonFuns = /*#__PURE__*/Object.freeze({
  __proto__: null,
  vertexes: vertexes$1,
  TQUA: TQUA,
  directionsNormal: directionsNormal$1,
  directionsOffset: directionsOffset$1,
  getVertexes: getVertexes$1,
  getPosition: getPosition$1,
  getPositions: getPositions$1,
  getInfoByPos: getInfoByPos$1,
  getNeighbors: getNeighbors$1
});

/* 正菱形地图元件方法 */

const vertexes = [[0, FLAH], [HALF, 0], [0, HALF], [FLAH, 0]]; // 非错列元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本

const directionsNormal = [[-1, -1, 1, '↖'], [0, -1, 1, '↗'], [0, 1, 1, '↘'], [-1, 1, 1, '↙']]; // 错列元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本

const directionsOffset = [[0, -1, 1, '↖'], [1, -1, 1, '↗'], [1, 1, 1, '↘'], [0, 1, 1, '↙']];
const {
  SQRT2
} = Math;
// 没错，错列与非错列的角的邻居坐标系差值一样

const cornersNormalOrOffset = [[0, -2, SQRT2, '↑'], [1, 0, SQRT2, '→'], [0, 2, SQRT2, '↓'], [-1, 0, SQRT2, '←']]; // 等距元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本

const directionsIsometric = [[0, -1, 1, '↖'], [1, 0, 1, '↗'], [0, 1, 1, '↘'], [-1, 0, 1, '↙']]; // 等距元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本

const cornersIsometric = [[1, -1, SQRT2, '↑'], [1, 1, SQRT2, '→'], [-1, 1, SQRT2, '↓'], [-1, -1, SQRT2, '←']];
/* 获取宽高的一半（菱形中心点在顶点坐标系中的值）
* @param  {Array}   size    如： [width{Number}, height{Number}]
* @return {Array}   [halfWidth, halfHeight]
*/

function getHalfSize([width = 1, height = 1] = [1, 1]) {
  return [width * HALF, height * HALF];
}
/* 根据计划渲染的菱形宽高值，得到顶点坐标集合
* @param  {Array}   size    如： [width{Number}, height{Number}]
* @return {Array}   [[x, y], ...]
*/

function getVertexes([width = 1, height = 1] = [1, 1]) {
  return getVertexes$3(vertexes, width, height);
}
/* 得到一个错列布局菱形地图瓦片的坐标位置
 * @param  {Array}   xyNum          目标元素XY索引值，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {Array}   originXY       原点像素坐标值，如：[0, 0]
 * @return {Array}   [x, y]
 */

function getPosition(xyNum = [0, 0], tileSize = [8, 4], stagger = 'odd', originXY = [0, 0]) {
  return getPosition$3(HALF, xyNum, tileSize, stagger, originXY);
}
/* 得到一组错列布局菱形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */

function getPositions(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown', stagger = 'odd') {
  return getPositions$3(HALF, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
}
/* 按等距布局菱形单元横纵坐标值及单元格宽高得到渲染坐标值 */

function getIsometricPosition([xNum, yNum] = [], tileSize = [8, 4], originXY = [0, 0]) {
  const [x, y] = getIsometricPosByHalfSize(xNum, yNum, ...getHalfSize(tileSize));
  return [x + originXY[0], y + originXY[1]];
}
/* 按等距布局菱形单元横纵坐标值及单元格宽高的一半得到渲染坐标值 */

function getIsometricPosByHalfSize(xNum, yNum, halfWidth, halfHeight) {
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

function getIsometricPositions(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], renderOrder = 'RightDown') {
  const [halfWidth, halfHeight] = getHalfSize(tileSize);
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (xNum, yNum) => [...getIsometricPosByHalfSize(xNum, yNum, halfWidth, halfHeight), xNum, yNum]);
}
/* 通过大致的像素坐标值获取该位置错列布局tile元素的[Num, yNum, x, y]
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [xNum, yNum, x, y]
 */

function getInfoByPos(pos = [0, 0], originPos = [0, 0], tileSize = [8, 4], stagger = 'odd') {
  return getInfoByPos$3(HALF, pos, originPos, tileSize, stagger);
}
/* 通过大致的像素坐标值获取该位置等距布局tile元素的[Num, yNum]
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @return {Object}  {xNum, yNum, x, y}
 */

function getIsometricInfoByPos(pos = [0, 0], originPos = [0, 0], tileSize = [8, 4]) {
  const [halfWidth, halfHeight] = getHalfSize(tileSize);
  const [originX, originY] = originPos;
  const xSteps = (pos[0] - originX) / halfWidth * HALF;
  const ySteps = (pos[1] - originY) / halfHeight * HALF;
  const yNum = Math.round(ySteps + xSteps);
  const xNum = Math.round(xSteps - ySteps);
  const [x, y] = getIsometricPosByHalfSize(xNum, yNum, halfWidth, halfHeight);
  return [xNum, yNum, x + originX, y + originY];
}
/* 获得错列布局中指定tile下标周边紧邻的邻居们
 * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
 * @param  {String}    stagger         需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [[xNum, yNum]]
 */

function getNeighbors(originXyNum = [0, 0], stagger = 'odd') {
  const [originXNum, originYNum] = originXyNum;
  const neisArr = [...cornersNormalOrOffset, ...(isStaggerLine(originYNum, stagger) ? directionsOffset : directionsNormal)];
  return neisArr.map(([xNum, yNum, cost, angStr]) => [xNum + originXNum, yNum + originYNum, cost, angStr]);
}
/* 获得等距布局中指定tile下标周边紧邻的邻居们
 * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
 * @return {Array}  [[xNum, yNum]]
 */

function getIsometricNeighbors(originXyNum = [0, 0]) {
  const [originXNum, originYNum] = originXyNum;
  const neisArr = [...cornersIsometric, ...directionsIsometric];
  return neisArr.map(([xNum, yNum, cost, angStr]) => [xNum + originXNum, yNum + originYNum, cost, angStr]);
}
/* 按距离获得错列布局菱形周边区域内的元素们
 * @param  {Array}          originXyNum  参考点元素下标，如：[0, 0]
 * @param  {Number}         distance     下标间隔量，目标元素的第几圈邻居，0 ~ N
 * @param  {String|Function} iterator    邻居类型或迭代函数，如：'border' 或 (x, y) => [x, y]
 * @param  {String}          stagger      需要错位排列的行：['odd', 'even', 'none']；默认为 'odd'
 * @param  {String}          renderOrder  渲染方向；默认为 'RightDown'
 * @return {Array} [[xNum, yNum]]，返回基于 originXyNum 的绝对下标
 */

function getNeighborsByDistance(originXyNum = [0, 0], distance = 1, iterator = 'all', stagger = 'odd', renderOrder = 'RightDown') {
  const [originXNum, originYNum] = originXyNum;
  const neighborIterator = typeof iterator === 'string' ? neighborTypes[iterator] || neighborTypes.all : iterator;
  return twoDimForEach([-distance, distance], [-distance, distance], renderOrder, (x, y) => {
    const ret = neighborIterator(x, y, distance);
    if (!Array.isArray(ret)) return ret;
    const yNum = originYNum + ret[1] - ret[0];
    const originOffset = isStaggerLine(originYNum, stagger) ? HALF : 0;
    const targetOffset = isStaggerLine(yNum, stagger) ? HALF : 0;
    const xNum = originXNum + (ret[0] + ret[1]) * HALF + originOffset - targetOffset;
    return [Math.round(xNum), yNum];
  });
}
/* 按距离获得等距布局菱形周边区域内的元素们
 * @param  {Array}          originXyNum  参考点元素下标，如：[0, 0]
 * @param  {Number}         distance     下标间隔量，目标元素的第几圈邻居，0 ~ N
 * @param  {String|Function} iterator    邻居类型或迭代函数，如：'border' 或 (x, y) => [x, y]
 * @param  {String}          renderOrder  渲染方向；默认为 'RightDown'
 * @return {Array} [[xNum, yNum]]，返回基于 originXyNum 的绝对下标
 */

function getIsometricNeighborsByDistance(originXyNum = [0, 0], distance = 1, iterator = 'all', renderOrder = 'RightDown') {
  const [originXNum, originYNum] = originXyNum;
  const neighborIterator = typeof iterator === 'string' ? neighborTypes[iterator] || neighborTypes.all : iterator;
  return twoDimForEach([-distance, distance], [-distance, distance], renderOrder, (x, y) => {
    const ret = neighborIterator(x, y, distance);
    return Array.isArray(ret) ? [ret[0] + originXNum, ret[1] + originYNum] : ret;
  });
}

var rhombusFuns = /*#__PURE__*/Object.freeze({
  __proto__: null,
  directionsNormal: directionsNormal,
  directionsOffset: directionsOffset,
  neighborTypes: neighborTypes,
  cornersNormalOrOffset: cornersNormalOrOffset,
  directionsIsometric: directionsIsometric,
  cornersIsometric: cornersIsometric,
  getHalfSize: getHalfSize,
  getVertexes: getVertexes,
  getPosition: getPosition,
  getPositions: getPositions,
  getIsometricPosition: getIsometricPosition,
  getIsometricPosByHalfSize: getIsometricPosByHalfSize,
  getIsometricPositions: getIsometricPositions,
  getInfoByPos: getInfoByPos,
  getIsometricInfoByPos: getIsometricInfoByPos,
  getNeighbors: getNeighbors,
  getIsometricNeighbors: getIsometricNeighbors,
  getNeighborsByDistance: getNeighborsByDistance,
  getIsometricNeighborsByDistance: getIsometricNeighborsByDistance
});

const ellipse = ellipseFuns;
const rect = rectFuns;
const hexagon = hexagonFuns;
const rhombus = rhombusFuns;
const polygon = polygonFuns;

var shapesObj = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ellipse: ellipse,
  rect: rect,
  hexagon: hexagon,
  rhombus: rhombus,
  polygon: polygon
});

/* A*寻径
* @param {Array}                 staXyNum              数据坐标值，如：[xNum, yNum]
* @param {Array}                 endXyNum              数据坐标值，如：[xNum, yNum]
* @param {Function}              getNeighbors          需要外部传入获取邻居坐标的方法（等距、错列、正矩形方案不同）
*                                                      参数示例：(currXyNum = [xNum, yNum])
*                                                      需要返回邻居坐标值、权重的tile二维数组：[[xNum1, yNum1, cost1], [xNum2, yNum2, cost2], ...]
* @param {Number}                maximizable           最大可循环次数（默认为1e6，用于防止死循环）
* @return {Array} 匹配的路径集合或空数组
*/
function aStar$1(staXyNum = [0, 0], endXyNum = [0, 0], getNeighbors = currPointXyNum => [], maximizable = 1e6) {
  const path = [];
  const [staXNum, staYNum] = staXyNum;
  const [endXNum, endYNum] = endXyNum;
  const staPoint = [staXNum, staYNum, 0];
  let n = 0; // 起止点相同直接返回当前点

  if (staXNum === endXNum && staYNum === endYNum) {
    path.push(staPoint);
  } else {
    const parents = {};
    const costs = {
      [xyNum2Str$1(staXyNum)]: 0
    };
    const openlist = [staPoint];

    while (openlist.length) {
      const currPoint = openlist.pop();
      const currCost = costs[xyNum2Str$1(currPoint)]; // 从邻居中查找可以更低成本通过的节点

      getNeighbors(currPoint).some(([xNum, yNum, cost]) => {
        const neiXYStr = xyNum2Str$1([xNum, yNum]);
        const oldCost = costs[neiXYStr];
        const neiCost = Math.round((currCost + (cost || 1)) * 1e3) / 1e3; // 当前点通行成本还不如已经确定的成本低，那么舍弃路径方案

        if (oldCost !== undefined && neiCost >= oldCost) return;
        costs[neiXYStr] = neiCost;
        parents[neiXYStr] = currPoint; // 循环次数达到上限，抛出异常终止查找

        n++;
        if (n > maximizable) throw new Error('[pathFinding.aStar] The number of loops exceeds the maximum value:' + maximizable);
        const neiPoint = [xNum, yNum, neiCost]; // 到达终点生成路径

        if (xNum === endXNum && yNum === endYNum) {
          path.push(neiPoint); // 回查链表得到完整路径数组

          let prevXyNum = endXyNum;

          while (prevXyNum = parents[xyNum2Str$1(prevXyNum)]) {
            path.unshift(prevXyNum);
          }

          openlist.length = 0;
          return false;
        } else {
          // 没到达终点，将当前点放入开放点列表，继续查找
          openlist.unshift(neiPoint);
        }
      });
    }
  }

  return path.length ? path : null;
}

function xyNum2Str$1([xNum, yNum]) {
  return `${xNum}_${yNum}`;
}

const aStar = aStar$1;

var pathFindingObj = /*#__PURE__*/Object.freeze({
  __proto__: null,
  aStar: aStar
});

/* 海拔地图数据管理

 * 用于管理菱形布局中每个瓦片的海拔值，支持稀疏存储和动态扩展。
 * 海拔值为整数（0 表示平地，正值表示高地，负值表示低地）。
 *
 * 示例：
 *   const map = new ElevationMap([10, 10], 0);
 *   map.set(2, 3, 2);
 *   map.get(2, 3); // 2
 */

/* 将坐标转换为字符串 key */
function xyNum2Str([xNum, yNum]) {
  return `${xNum}_${yNum}`;
}
/* 海拔地图数据类 */


class ElevationMap {
  /* 构造海拔地图
   * @param {Array}  [width, height]  地图尺寸，如 [10, 10]
   * @param {Number} defaultElevation 默认海拔值，默认为 0
   */
  constructor([width = 0, height = 0] = [0, 0], defaultElevation = 0) {
    this.width = width;
    this.height = height;
    this.defaultElevation = defaultElevation;
    this._data = new Map();
    this._max = defaultElevation;
    this._min = defaultElevation;
  }
  /* 判断坐标是否在地图范围内
   * @param  {Number} xNum
   * @param  {Number} yNum
   * @return {Boolean}
   */


  inBounds(xNum, yNum) {
    return xNum >= 0 && xNum < this.width && yNum >= 0 && yNum < this.height;
  }
  /* 获取指定瓦片的海拔值
   * @param  {Number} xNum
   * @param  {Number} yNum
   * @return {Number} 海拔值
   */


  get(xNum, yNum) {
    return this._data.get(xyNum2Str([xNum, yNum])) ?? this.defaultElevation;
  }
  /* 设置指定瓦片的海拔值
   * @param  {Number} xNum
   * @param  {Number} yNum
   * @param  {Number} level 海拔值
   * @return {ElevationMap} this（支持链式调用）
   */


  set(xNum, yNum, level) {
    const key = xyNum2Str([xNum, yNum]);

    this._data.set(key, level);

    if (level > this._max) this._max = level;
    if (level < this._min) this._min = level;
    return this;
  }
  /* 批量设置海拔值
   * @param  {Array} entries 坐标与海拔值数组，如 [[x, y, level], ...]
   * @return {ElevationMap} this
   */


  setBatch(entries = []) {
    entries.forEach(([x, y, level]) => this.set(x, y, level));
    return this;
  }
  /* 获取地图最高海拔值
   * @return {Number}
   */


  getMaxElevation() {
    return this._max;
  }
  /* 获取地图最低海拔值
   * @return {Number}
   */


  getMinElevation() {
    return this._min;
  }
  /* 获取指定瓦片与相邻瓦片的海拔差集合
   * @param  {Number} xNum
   * @param  {Number} yNum
   * @param  {Array}  neighbors 邻居坐标数组 [[xNum, yNum], ...]，如不传则返回空数组
   * @return {Array} [[xNum, yNum, diff], ...]
   */


  getDiffs(xNum, yNum, neighbors = []) {
    const currLevel = this.get(xNum, yNum);
    return neighbors.map(([nx, ny]) => {
      if (!this.inBounds(nx, ny)) return [nx, ny, null];
      return [nx, ny, this.get(nx, ny) - currLevel];
    });
  }
  /* 验证指定区域是否为平整区域（所有瓦片海拔值相同）
   * @param  {Number} xNum   起始 X 坐标
   * @param  {Number} yNum   起始 Y 坐标
   * @param  {Number} areaWidth  区域宽度
   * @param  {Number} areaHeight 区域高度
   * @return {Boolean}
   */


  validateFlatArea(xNum, yNum, areaWidth = 1, areaHeight = 1) {
    const baseLevel = this.get(xNum, yNum);

    for (let y = yNum; y < yNum + areaHeight; y++) {
      for (let x = xNum; x < xNum + areaWidth; x++) {
        if (this.get(x, y) !== baseLevel) return false;
      }
    }

    return true;
  }
  /* 按海拔值分组瓦片坐标
   * @return {Object} { level: [[xNum, yNum], ...], ... }
   */


  getElevationGroups() {
    const groups = {}; // 先收集默认海拔的瓦片（地图范围内未单独设置的）

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const level = this.get(x, y);
        const key = String(level);
        if (!groups[key]) groups[key] = [];
        groups[key].push([x, y]);
      }
    }

    return groups;
  }
  /* 导出为二维数组（行优先）
   * @return {Array} [[level, ...], ...]
   */


  toArray() {
    const result = [];

    for (let y = 0; y < this.height; y++) {
      const row = [];

      for (let x = 0; x < this.width; x++) {
        row.push(this.get(x, y));
      }

      result.push(row);
    }

    return result;
  }
  /* 从二维数组导入海拔数据
   * @param  {Array} data 二维海拔数组 [[level, ...], ...]
   * @return {ElevationMap} this
   */


  fromArray(data = []) {
    this.width = data[0] ? data[0].length : 0;
    this.height = data.length;

    this._data.clear();

    this._max = this.defaultElevation;
    this._min = this.defaultElevation;

    for (let y = 0; y < data.length; y++) {
      for (let x = 0; x < data[y].length; x++) {
        this.set(x, y, data[y][x]);
      }
    }

    return this;
  }
  /* 导出为 JSON 可序列化对象
   * @return {Object} { width, height, defaultElevation, data: { key: level, ... } }
   */


  toJSON() {
    const data = {};

    this._data.forEach((level, key) => {
      data[key] = level;
    });

    return {
      width: this.width,
      height: this.height,
      defaultElevation: this.defaultElevation,
      data
    };
  }
  /* 从 JSON 对象恢复海拔地图
   * @param  {Object} json 序列化对象
   * @return {ElevationMap} this
   */


  fromJSON(json = {}) {
    this.width = json.width || 0;
    this.height = json.height || 0;
    this.defaultElevation = json.defaultElevation ?? 0;

    this._data.clear();

    this._max = this.defaultElevation;
    this._min = this.defaultElevation;
    const entries = json.data || {};
    Object.keys(entries).forEach(key => {
      const level = entries[key];

      this._data.set(key, level);

      if (level > this._max) this._max = level;
      if (level < this._min) this._min = level;
    });
    return this;
  }

}

/* 斜坡系统 —— 海拔边界过渡区域检测与通行性判定

 * 斜坡不是独立瓦片类型，而是由相邻瓦片海拔差自动判定的过渡区域。
 * 当相邻瓦片海拔差为 1 时，当前瓦片处于斜坡过渡区。
 * 当海拔差 > 1 时，视为悬崖，不可通行。
 */
// 斜坡类型枚举
const SLOPE_TYPES = {
  NONE: 0,
  // 平地，无斜坡
  UP: 1,
  // 上坡（邻居海拔高于当前瓦片）
  DOWN: -1,
  // 下坡（邻居海拔低于当前瓦片）
  EDGE: 2,
  // 边缘（部分邻居高、部分邻居低）
  CLIFF: 3 // 悬崖（海拔差 > 1，不可通行）

}; // 斜坡方向（与菱形邻居方向对应，8 个方向）

const SLOPE_DIRECTIONS = {
  NW: '↖',
  NE: '↗',
  SE: '↘',
  SW: '↙',
  N: '↑',
  E: '→',
  S: '↓',
  W: '←'
};
/* 获取指定瓦片的斜坡类型
 * @param  {Number} xNum
 * @param  {Number} yNum
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Array}  neighbors 邻居坐标数组 [[xNum, yNum], ...]
 * @return {Object} { type, direction, diff } 斜坡类型、方向、最大海拔差
 */

function getSlopeType(xNum, yNum, elevationMap, neighbors = []) {
  const currLevel = elevationMap.get(xNum, yNum);
  let hasUp = false;
  let hasDown = false;
  let maxAbsDiff = 0;
  let direction = null;

  for (let i = 0; i < neighbors.length; i++) {
    const [nx, ny] = neighbors[i];
    if (!elevationMap.inBounds(nx, ny)) continue;
    const diff = elevationMap.get(nx, ny) - currLevel;
    const absDiff = Math.abs(diff);

    if (absDiff > maxAbsDiff) {
      maxAbsDiff = absDiff;
      direction = diff > 0 ? SLOPE_DIRECTIONS.N : SLOPE_DIRECTIONS.S;
    }

    if (diff > 0) hasUp = true;
    if (diff < 0) hasDown = true;
  } // 悬崖：海拔差 > 1


  if (maxAbsDiff > 1) {
    return {
      type: SLOPE_TYPES.CLIFF,
      direction,
      diff: maxAbsDiff
    };
  } // 边缘：同时存在上坡和下坡


  if (hasUp && hasDown) {
    return {
      type: SLOPE_TYPES.EDGE,
      direction: null,
      diff: maxAbsDiff
    };
  } // 上坡


  if (hasUp) {
    return {
      type: SLOPE_TYPES.UP,
      direction,
      diff: maxAbsDiff
    };
  } // 下坡


  if (hasDown) {
    return {
      type: SLOPE_TYPES.DOWN,
      direction,
      diff: maxAbsDiff
    };
  }

  return {
    type: SLOPE_TYPES.NONE,
    direction: null,
    diff: 0
  };
}
/* 自动检测海拔地图中所有瓦片的斜坡信息
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Function} getNeighborsFn 获取邻居坐标的方法，参数 (xNum, yNum)，返回 [[xNum, yNum], ...]
 * @return {Map} key 为 "xNum_yNum"，value 为 { type, direction, diff }
 */

function detectSlopes(elevationMap, getNeighborsFn) {
  const slopes = new Map();

  for (let y = 0; y < elevationMap.height; y++) {
    for (let x = 0; x < elevationMap.width; x++) {
      const neighbors = getNeighborsFn([x, y]);
      const slopeInfo = getSlopeType(x, y, elevationMap, neighbors);

      if (slopeInfo.type !== SLOPE_TYPES.NONE) {
        slopes.set(`${x}_${y}`, slopeInfo);
      }
    }
  }

  return slopes;
}
/* 判断瓦片是否可通行
 * @param  {Number} xNum
 * @param  {Number} yNum
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Array}  neighbors 邻居坐标数组
 * @return {Boolean}
 */

function isWalkable(xNum, yNum, elevationMap, neighbors = []) {
  const slopeInfo = getSlopeType(xNum, yNum, elevationMap, neighbors);
  return slopeInfo.type !== SLOPE_TYPES.CLIFF;
}
/* 获取斜坡通行成本倍数
 * @param  {Number} xNum
 * @param  {Number} yNum
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Array}  neighbors 邻居坐标数组
 * @param  {Number} slopeCostMultiplier 斜坡成本倍数，默认 2
 * @return {Number} 通行成本（1 表示平地，> 1 表示斜坡）
 */

function getSlopeCost(xNum, yNum, elevationMap, neighbors = [], slopeCostMultiplier = 2) {
  const slopeInfo = getSlopeType(xNum, yNum, elevationMap, neighbors);
  if (slopeInfo.type === SLOPE_TYPES.CLIFF) return Infinity;
  if (slopeInfo.type === SLOPE_TYPES.NONE) return 1;
  return slopeCostMultiplier;
}
/* 计算斜坡瓦片的顶点坐标（用于渲染斜坡过渡面）
 * @param  {Number} xNum
 * @param  {Number} yNum
 * @param  {Array}  tileSize 单瓦片宽高值，如 [80, 40]
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Array}  neighbors 邻居坐标数组 [[xNum, yNum], ...]
 * @param  {Number} elevationHeight 单位海拔对应的像素高度
 * @return {Array} 顶点坐标集合 [[x, y, level], ...]
 */

function getSlopeVertexes(xNum, yNum, tileSize, elevationMap, neighbors = [], elevationHeight = 10) {
  const currLevel = elevationMap.get(xNum, yNum);
  const vertexes = []; // 当前瓦片的四个顶点

  neighbors.forEach(([nx, ny]) => {
    if (!elevationMap.inBounds(nx, ny)) return;
    const neiLevel = elevationMap.get(nx, ny);
    const diff = neiLevel - currLevel; // 只在海拔差为 1 时生成斜坡顶点

    if (Math.abs(diff) === 1) {
      vertexes.push([nx, ny, neiLevel]);
    }
  });
  return vertexes;
}

/* 海拔渲染坐标计算

 * 在菱形布局基础坐标之上叠加海拔偏移，支持错列布局和等距布局两种模式。
 * 海拔越高，瓦片在 Y 轴方向上移（屏幕上方），形成立体层次感。
 */
/* 获取带海拔偏移的错列布局瓦片渲染坐标
 * @param  {Array}  xyNum           目标元素 XY 索引值，如 [0, 0]
 * @param  {Array}  tileSize        单瓦片图宽高值，如 [80, 40]
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Number} elevationHeight  单位海拔对应的像素高度，默认 10
 * @param  {String} stagger          错列模式 ['odd', 'even', 'none']
 * @param  {Array}  originXY         原点像素坐标值
 * @return {Array} [x, y, xNum, yNum, elevation]
 */

function getElevatedPosition(xyNum = [0, 0], tileSize = [8, 4], elevationMap, elevationHeight = 10, stagger = 'odd', originXY = [0, 0]) {
  const [xNum, yNum] = xyNum;
  const [baseX, baseY] = getPosition(xyNum, tileSize, stagger, originXY);
  const elevation = elevationMap ? elevationMap.get(xNum, yNum) : 0;
  const offsetY = -elevation * elevationHeight;
  return [baseX, baseY + offsetY, xNum, yNum, elevation];
}
/* 获取带海拔偏移的等距布局瓦片渲染坐标
 * @param  {Array}  xyNum           目标元素 XY 索引值，如 [0, 0]
 * @param  {Array}  tileSize        单瓦片图宽高值，如 [80, 40]
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Number} elevationHeight  单位海拔对应的像素高度，默认 10
 * @param  {Array}  originXY         原点像素坐标值
 * @return {Array} [x, y, xNum, yNum, elevation]
 */

function getElevatedIsometricPosition(xyNum = [0, 0], tileSize = [8, 4], elevationMap, elevationHeight = 10, originXY = [0, 0]) {
  const [xNum, yNum] = xyNum;
  const [baseX, baseY] = getIsometricPosition(xyNum, tileSize, originXY);
  const elevation = elevationMap ? elevationMap.get(xNum, yNum) : 0;
  const offsetY = -elevation * elevationHeight;
  return [baseX, baseY + offsetY, xNum, yNum, elevation];
}
/* 批量获取带海拔偏移的错列布局瓦片渲染坐标
 * @param  {Array}  mainAxisRange   主轴行序号区间，如 [0, 9]
 * @param  {Array}  subAxisRange    副轴行序号区间，如 [0, 9]
 * @param  {Array}  tileSize        单瓦片图宽高值
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Number} elevationHeight  单位海拔对应的像素高度
 * @param  {String} stagger          错列模式
 * @param  {String} renderOrder      渲染方向
 * @return {Array} [[x, y, xNum, yNum, elevation], ...]
 */

function getElevatedPositions(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], elevationMap, elevationHeight = 10, stagger = 'odd', renderOrder = 'RightDown') {
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (xNum, yNum) => {
    return getElevatedPosition([xNum, yNum], tileSize, elevationMap, elevationHeight, stagger);
  });
}
/* 批量获取带海拔偏移的等距布局瓦片渲染坐标
 * @param  {Array}  mainAxisRange   主轴行序号区间
 * @param  {Array}  subAxisRange    副轴行序号区间
 * @param  {Array}  tileSize        单瓦片图宽高值
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Number} elevationHeight  单位海拔对应的像素高度
 * @param  {String} renderOrder      渲染方向
 * @return {Array} [[x, y, xNum, yNum, elevation], ...]
 */

function getElevatedIsometricPositions(mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], elevationMap, elevationHeight = 10, renderOrder = 'RightDown') {
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (xNum, yNum) => {
    return getElevatedIsometricPosition([xNum, yNum], tileSize, elevationMap, elevationHeight);
  });
}
/* 按海拔和位置生成渲染顺序
 * 确保高海拔瓦片后渲染（遮挡低海拔），同海拔内按 renderDirection 排序
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {String} renderDirection 渲染方向 ['RightDown','RightUp','LeftDown','LeftUp']
 * @return {Array} [[xNum, yNum, elevation], ...] 按渲染顺序排列
 */

function getRenderOrder(elevationMap, renderDirection = 'RightDown') {
  const {
    width,
    height
  } = elevationMap;
  const positions = twoDimForEach([0, width - 1], [0, height - 1], renderDirection, (xNum, yNum) => {
    return [xNum, yNum, elevationMap.get(xNum, yNum)];
  }); // 同海拔内保持原渲染方向顺序，高海拔排后面
  // 使用稳定排序：先按 elevation 升序，同海拔保持原序

  return positions.sort((a, b) => a[2] - b[2]);
}

/* 海拔感知 A* 寻路

 * 在基础 A* 算法之上增加海拔约束：
 * - 相邻瓦片海拔差超过阈值时不可通行
 * - 斜坡通行成本高于平地
 * - 支持配置不可通行海拔值列表
 */
/* 获取海拔感知的邻居列表
 * 过滤掉海拔差过大的邻居，并为斜坡邻居增加额外成本
 * @param  {Array}  xyNum           当前瓦片坐标 [xNum, yNum]
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Function} baseGetNeighbors 基础邻居获取方法，返回 [[xNum, yNum, cost], ...]
 * @param  {Object} options         配置项
 * @param  {Number} options.maxElevationDiff 最大可通行海拔差，默认 1
 * @param  {Number} options.slopeCostMultiplier 斜坡成本倍数，默认 2
 * @param  {Array}  options.unwalkableElevations 不可通行海拔值列表
 * @return {Array} [[xNum, yNum, cost], ...]
 */

function getElevationAwareNeighbors(xyNum = [0, 0], elevationMap, baseGetNeighbors, options = {}) {
  const {
    maxElevationDiff = 1,
    slopeCostMultiplier = 2,
    unwalkableElevations = []
  } = options;
  const [xNum, yNum] = xyNum;
  const currLevel = elevationMap.get(xNum, yNum); // 检查当前瓦片是否可通行

  if (unwalkableElevations.includes(currLevel)) {
    return [];
  }

  const baseNeighbors = baseGetNeighbors(xyNum);
  const result = [];
  baseNeighbors.forEach(([nx, ny, baseCost]) => {
    // 检查邻居是否在地图范围内
    if (!elevationMap.inBounds(nx, ny)) return;
    const neiLevel = elevationMap.get(nx, ny);
    const diff = Math.abs(neiLevel - currLevel); // 海拔差超过阈值，不可通行

    if (diff > maxElevationDiff) return; // 邻居海拔值在不可通行列表中

    if (unwalkableElevations.includes(neiLevel)) return; // 计算通行成本

    let cost = baseCost;

    if (diff > 0) {
      // 斜坡成本 = 基础成本 × 斜坡倍数
      cost = baseCost * slopeCostMultiplier;
    }

    result.push([nx, ny, cost]);
  });
  return result;
}
/* 海拔感知 A* 寻路
 * @param {Array}   staXyNum        起点坐标 [xNum, yNum]
 * @param {Array}   endXyNum        终点坐标 [xNum, yNum]
 * @param {ElevationMap} elevationMap 海拔地图实例
 * @param {Function} baseGetNeighbors 基础邻居获取方法
 * @param {Object}  options         配置项
 * @param {Number}  options.maxElevationDiff 最大可通行海拔差
 * @param {Number}  options.slopeCostMultiplier 斜坡成本倍数
 * @param {Array}   options.unwalkableElevations 不可通行海拔值列表
 * @param {Number}  maximizable     最大循环次数
 * @return {Array} 路径数组 [[xNum, yNum, cost], ...] 或 null
 */

function aStarElevation(staXyNum = [0, 0], endXyNum = [0, 0], elevationMap, baseGetNeighbors, options = {}, maximizable = 1e6) {
  const {
    maxElevationDiff = 1,
    slopeCostMultiplier = 2,
    unwalkableElevations = []
  } = options; // 构造海拔感知的邻居获取器

  const getNeighbors = xyNum => {
    return getElevationAwareNeighbors(xyNum, elevationMap, baseGetNeighbors, {
      maxElevationDiff,
      slopeCostMultiplier,
      unwalkableElevations
    });
  }; // 调用基础 A* 算法


  return aStar$1(staXyNum, endXyNum, getNeighbors, maximizable);
}

/* 海拔管理模块入口 */

var elevationObj = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ElevationMap: ElevationMap,
  SLOPE_TYPES: SLOPE_TYPES,
  SLOPE_DIRECTIONS: SLOPE_DIRECTIONS,
  getSlopeType: getSlopeType,
  detectSlopes: detectSlopes,
  isWalkable: isWalkable,
  getSlopeCost: getSlopeCost,
  getSlopeVertexes: getSlopeVertexes,
  getElevatedPosition: getElevatedPosition,
  getElevatedIsometricPosition: getElevatedIsometricPosition,
  getElevatedPositions: getElevatedPositions,
  getElevatedIsometricPositions: getElevatedIsometricPositions,
  getRenderOrder: getRenderOrder,
  aStarElevation: aStarElevation,
  getElevationAwareNeighbors: getElevationAwareNeighbors
});

// 基础图形方法
const shapes = shapesObj; // 寻路方法
const pathFinding = pathFindingObj; // 海拔管理方法
const elevation = elevationObj;

export { elevation, pathFinding, shapes };

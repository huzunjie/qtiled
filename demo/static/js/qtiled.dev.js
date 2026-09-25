
/**
 * qtiled v0.2.7
 * (c) 2008-2026 huzunjie
 * Released under MIT
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.qtiled = {}));
}(this, (function (exports) { 'use strict';

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

  function getPoint(centerX, centerY, radiusX, radiusY, radian) {
    radian %= PI_DBL;
    if (radian < 0) radian += PI_DBL;
    const k = Math.tan(radian);

    if (Math.abs(k) > 1e5) {
      return [centerX, centerY + (radian < PI ? radiusY : -radiusY)];
    } // 第一或第四象限取正、其他象限取负


    const d = radian <= PI_HALF || radian > PI_OPF ? 1 : -1;
    const v = 1 / radiusX ** 2 + k ** 2 / radiusY ** 2;
    const x = d * Math.sqrt(1 / v) + centerX;
    return [x, k * x + centerY - k * centerX];
  }
  /* 根据椭圆的原点、X轴半径、Y轴半径、角度，求得圆周上的点坐标
  * @param  {Number}  x0        圆心X点坐标值
  * @param  {Number}  y0        圆心Y点坐标值
  * @param  {Number}  radiusX   X轴半径值
  * @param  {Number}  radiusY   Y轴半径值
  * @param  {Number}  angle     角度值
  * @return {Array}   [x, y]
  */

  function getPointByAngle(centerX, centerY, radiusX, radiusY, angle) {
    return getPoint(centerX, centerY, radiusX, radiusY, angle2Radian(angle));
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
    all: (offsetX, offsetY) => [offsetX, offsetY],
    no_self: (offsetX, offsetY) => offsetX === 0 && offsetY === 0 ? false : [offsetX, offsetY],
    border: (offsetX, offsetY, distance) => Math.abs(offsetX) === distance || Math.abs(offsetY) === distance ? [offsetX, offsetY] : false,
    vertex: (offsetX, offsetY, distance) => Math.abs(offsetX) === distance && Math.abs(offsetY) === distance ? [offsetX, offsetY] : false,
    // 筛选中心点处于外轮廓四条边中心点连线（菱形）区域之内的瓦片
    diamond: (offsetX, offsetY, distance) => Math.abs(offsetX) + Math.abs(offsetY) <= distance ? [offsetX, offsetY] : false
  };
  /** 旋转选区并将包围盒中心格锚定到逻辑原点，供各布局的 getNeighborsByOffsets 使用。
   * @param {Array<Array<number>>} offsets 原始选区的逻辑坐标对，有限整数，默认 []；允许未居中，不接受像素坐标或错列行列差。
   * @param {number} quarterTurns 相对原始选区的旋转次数，有限整数，默认 0；每次顺时针 90°，负数逆时针，按 4 取模。
   * @returns {Array<Array<number>>} 相对焦点的整数偏移，保留顺序，不修改输入；空集合返回 []。
   * 顺时针按逻辑 X 向右、Y 向下定义，一次旋转为 [-y, x]；随后将中心格锚定到原点。
   * 奇数尺寸居中；偶数尺寸按方向选择中心格：
   * 0° 中心取整为 [floor, floor]，90° 为 [floor, ceil]，180° 为 [ceil, ceil]，270° 为 [ceil, floor]。
   * 对居中的 3×2 选区，焦点依次在上排、左列、下排、右列的中间；焦点不一定属于不规则选区。
   * 即使旋转次数为 0 也会重新居中；4 次恢复的是 0 次的锚定结果，不保留输入的整体平移。
   * 每次传入同一份原始选区和累计方向，不要把上次返回值作为下一次输入。
   * 本方法不接收世界坐标、不筛选边界或海拔；调用方将返回值映射到固定的 originGrid。
   */

  function rotateSelectionOffsets(offsets = [], quarterTurns = 0) {
    if (!offsets.length) return [];
    const turns = (quarterTurns % 4 + 4) % 4;
    const {
      minX,
      minY,
      maxX,
      maxY
    } = getBounds(offsets);
    const centerX = (minX + maxX) * HALF;
    const centerY = (minY + maxY) * HALF; // 90°/270° 交换坐标轴，方向决定各轴符号；包围盒中心使用同一变换。

    const swapAxes = turns % 2;
    const signX = turns === 1 || turns === 2 ? -1 : 1;
    const signY = turns >= 2 ? -1 : 1;
    const roundX = turns < 2 ? Math.floor : Math.ceil;
    const roundY = turns === 0 || turns === 3 ? Math.floor : Math.ceil;
    const anchorX = roundX(signX * (swapAxes ? centerY : centerX));
    const anchorY = roundY(signY * (swapAxes ? centerX : centerY)); // 原点旋转与中心旋转只差整体平移，锚定时抵消；直接输出最终偏移，避免中间数组。

    return offsets.map(offset => [signX * offset[swapAxes ? 1 : 0] - anchorX || 0, signY * offset[swapAxes ? 0 : 1] - anchorY || 0]);
  }
  /* 得到一个多边形折线顶点坐标集合
   * @param  {Array}     baseVertexes    多边形顶点配置，如上文的: rectVertexes
   * @param  {Number}    width         渲染时的宽度值
   * @param  {Number}    height        渲染时的高度值
   * @param  {String}    axis          主轴方向 'x' || 'y'；默认为 'y'，上下是尖
   * @return {Array}     [x, y]
   */

  function getVertexes$3(baseVertexes, width = 1, height = 1, axis = 'y') {
    let fun = ([vertexX, vertexY]) => [vertexX * width, vertexY * height]; // 如果是要将多边形图案横过来的，旋转90度（六边形会比较大的不同）


    if (axis === 'x') {
      fun = ([vertexX, vertexY]) => [vertexY * width, vertexX * height];
    }

    return baseVertexes.map(fun);
  }
  /* 计算一组共用顶点的多边形在平移后的轴对齐包围盒，不包含描边或文字。
   * @param {Array} positions 位置集合，每项为 [pixelX, pixelY, ...]，忽略附带的网格下标
   * @param {Array} vertexes 相对每个位置的共用顶点，默认 [[0, 0]]，仅计算位置范围
   * @return {Object|null} { minX, minY, maxX, maxY, width, height }；任一集合为空时返回 null
   * 输入为有限数值坐标，不修改输入；分别遍历位置和顶点，复杂度为 O(N + V)。
   */

  function getBounds(positions = [], vertexes = [[0, 0]]) {
    if (!positions.length || !vertexes.length) return null;
    const [positionBounds, vertexBounds] = [positions, vertexes].map(points => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const [x, y] of points) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      return {
        minX,
        minY,
        maxX,
        maxY
      };
    });
    const minX = positionBounds.minX + vertexBounds.minX;
    const minY = positionBounds.minY + vertexBounds.minY;
    const maxX = positionBounds.maxX + vertexBounds.maxX;
    const maxY = positionBounds.maxY + vertexBounds.maxY;
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
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

  function getPosition$3(lineRate = 1, gridCoord = [0, 0], tileSize = [8, 4], stagger = 'none', originXY = [0, 0]) {
    const [tileWidth, tileHeight] = tileSize;
    const [gridX, gridY] = gridCoord;
    return [// X轴按Y轴奇偶性补充错列偏移量
    originXY[0] + (gridX + (isStaggerLine(gridY, stagger) ? HALF : 0)) * tileWidth, // 多边形在主轴方向必须向上位移，才能保证挫列后网格对齐，所以这里要乘以 lineRate
    originXY[1] + gridY * tileHeight * lineRate, gridX, gridY];
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
    const [tileWidth, rawTileHeight] = tileSize; // 多边形在主轴方向必须向上位移，才能保证挫列后网格对齐，所以这里要乘以 lineRate

    const tileHeight = rawTileHeight * lineRate;
    const needOffset = stagger !== 'none';
    const isOddNum = Number(stagger === 'odd'); // 多边形错列布局副轴上需要偏移来达成错列布局

    return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (gridX, gridY) => {
      let offsetGridX = gridX;

      if (needOffset && Math.abs(Math.round(gridY) % 2) === isOddNum) {
        offsetGridX += HALF; // 补充错列偏移量
      }

      return [offsetGridX * tileWidth, gridY * tileHeight, gridX, gridY];
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
    const [tileWidth, tileHeight] = tileSize;
    const gridRowHeight = tileHeight * lineRate; // 行高

    const relativePixelX = pos[0] - originX;
    const relativePixelY = pos[1] - originY; // 多边形错列布局需要补充偏移量

    let gridXOffset = 0;
    const gridY = Math.round(relativePixelY / gridRowHeight);

    if (stagger !== 'none' && Math.abs(gridY % 2) === Number(stagger === 'odd')) {
      gridXOffset = HALF;
    }

    const gridX = Math.round(relativePixelX / tileWidth - gridXOffset);
    const centerPixelX = (gridX + gridXOffset) * tileWidth;
    const centerPixelY = gridY * gridRowHeight;
    const tilePixelX = centerPixelX + originX;
    const tilePixelY = centerPixelY + originY;
    return [gridX, gridY, tilePixelX, tilePixelY];
  }

  var polygonFuns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    HALF: HALF,
    FLAH: FLAH,
    QUAR: QUAR,
    RAUQ: RAUQ,
    TQUA: TQUA$1,
    neighborTypes: neighborTypes,
    rotateSelectionOffsets: rotateSelectionOffsets,
    getVertexes: getVertexes$3,
    getBounds: getBounds,
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
  /** 将逻辑偏移平移为正矩形网格坐标。
   * @param {Array<number>} originGrid 焦点的绝对网格坐标 [gridX, gridY]，默认 [0, 0]。
   * @param {Array<Array<number>>} offsets 相对焦点的整数偏移 [[offsetX, offsetY], ...]，默认 []。
   * @returns {Array<Array<number>>} 绝对网格坐标，保留顺序、不修改输入；空偏移返回 []。
   * 输入坐标为有限整数；不去重、不筛选边界或海拔，不接收像素坐标。
   */

  function getNeighborsByOffsets$1([gridX, gridY] = [0, 0], offsets = []) {
    return offsets.map(([offsetX, offsetY]) => [gridX + offsetX, gridY + offsetY]);
  }
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

  function getPosition$2(gridCoord = [0, 0], tileSize = [8, 4], originXY = [0, 0]) {
    const [gridX, gridY] = gridCoord;
    const [tileWidth, tileHeight] = tileSize;
    return [originXY[0] + gridX * tileWidth, originXY[1] + gridY * tileHeight];
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

  function getInfoByPos$2(pixelPos = [0, 0], originPixel = [0, 0], tileSize = [8, 4]) {
    return getInfoByPos$3(1, pixelPos, originPixel, tileSize, 'none');
  }
  /* 获得指定tile下标周边的邻居元素们
   * @param  {Array}     originXyNum    XY轴序号，如：[0, 0]
   * @return {Array}  [[xNum, yNum]]
   */

  function getNeighbors$2(originGrid = [0, 0], neighborConfig = [...directions, ...corners]) {
    const [originGridX, originGridY] = originGrid;
    return neighborConfig.map(([offsetX, offsetY, cost, angStr]) => [offsetX + originGridX, offsetY + originGridY, cost, angStr]);
  }
  /* 按距离获得指定tile下标周边区域内的元素们
   * @param  {Array}     originXyNum     XY轴序号，如：[0, 0]
   * @param  {Number}    distance        下标间隔量，目标元素的第几圈邻居，0 ~ N
   * @param  {String|Function} iterator   邻居类型或迭代函数，如：'border' 或 (x, y) => [x, y]
   * @param  {String}    renderOrder     渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
   * @return {Array}  [[xNum, yNum]]，返回值为基于 originXyNum 的绝对下标
   */

  function getNeighborsByDistance$1(originGrid = [0, 0], distance = 1, iterator = (x, y) => [x, y], renderOrder) {
    const [originGridX, originGridY] = originGrid;
    const neighborIterator = typeof iterator === 'string' ? neighborTypes[iterator] || neighborTypes.all : iterator;
    return twoDimForEach([-distance, distance], [-distance, distance], renderOrder, (offsetX, offsetY) => {
      const matchedOffset = neighborIterator(offsetX, offsetY, distance);
      return Array.isArray(matchedOffset) ? [matchedOffset[0] + originGridX, matchedOffset[1] + originGridY] : matchedOffset;
    });
  }

  var rectFuns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    vertexes: vertexes$2,
    directions: directions,
    corners: corners,
    neighborTypes: neighborTypes,
    getNeighborsByOffsets: getNeighborsByOffsets$1,
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

  function getPosition$1(gridCoord = [0, 0], tileSize = [8, 4], stagger = 'odd', originPixel = [0, 0]) {
    return getPosition$3(TQUA, gridCoord, tileSize, stagger, originPixel);
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

  function getInfoByPos$1(pixelPos = [0, 0], originPixel = [0, 0], tileSize = [8, 4], stagger = 'odd') {
    return getInfoByPos$3(TQUA, pixelPos, originPixel, tileSize, stagger);
  }
  /* 获得指定tile下标周边紧邻的邻居们
   * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
   * @param  {String}    stagger         需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
   * @return {Array}  [[xNum, yNum]]
   */

  function getNeighbors$1(originGrid = [0, 0], stagger = 'odd') {
    const [originGridX, originGridY] = originGrid;
    const directions = isStaggerLine(originGridY, stagger) ? directionsOffset$1 : directionsNormal$1;
    return directions.map(([offsetX, offsetY, cost, angStr]) => [offsetX + originGridX, offsetY + originGridY, cost, angStr]);
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

  const ELEVATION_HEIGHT = 16;

  function applyElevation([pixelX, pixelY, ...rest], elevation) {
    return [pixelX, pixelY - elevation * ELEVATION_HEIGHT, ...rest];
  } // 宽高为1的正菱形顶点集合


  const vertexes = [[0, FLAH], [HALF, 0], [0, HALF], [FLAH, 0]]; // 非错列元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本

  const directionsNormal = [[-1, -1, 1, '↖'], [0, -1, 1, '↗'], [0, 1, 1, '↘'], [-1, 1, 1, '↙']]; // 错列元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本

  const directionsOffset = [[0, -1, 1, '↖'], [1, -1, 1, '↗'], [1, 1, 1, '↘'], [0, 1, 1, '↙']];
  const {
    SQRT2
  } = Math;

  function getNeighborByOffset([originGridX, originGridY], [offsetX, offsetY], stagger) {
    const targetGridY = originGridY + offsetY - offsetX;
    const originGridOffset = isStaggerLine(originGridY, stagger) ? HALF : 0;
    const targetGridOffset = isStaggerLine(targetGridY, stagger) ? HALF : 0;
    const targetGridX = originGridX + (offsetX + offsetY) * HALF + originGridOffset - targetGridOffset;
    return [Math.round(targetGridX), targetGridY];
  }
  /** 将逻辑偏移映射为错列菱形网格坐标。
   * @param {Array<number>} originGrid 焦点的绝对错列下标 [gridX, gridY]，默认 [0, 0]。
   * @param {Array<Array<number>>} offsets 距离邻居回调坐标系中的整数逻辑偏移，默认 []；不是错列下标差或像素偏移。
   * @param {string} stagger 错列行规则，默认 'odd'；'even' 表示偶数行错开，'none' 沿用现有距离邻居的非错列换算。
   * @returns {Array<Array<number>>} 绝对错列下标，保留顺序、不修改输入；空偏移返回 []。
   * 输入坐标为有限整数；不去重、不筛选边界或海拔。
   */


  function getNeighborsByOffsets(originGrid = [0, 0], offsets = [], stagger = 'odd') {
    return offsets.map(offset => getNeighborByOffset(originGrid, offset, stagger));
  }
  /** 将逻辑偏移平移为等距菱形网格坐标。
   * @param {Array<number>} originGrid 焦点的绝对等距下标 [gridX, gridY]，默认 [0, 0]。
   * @param {Array<Array<number>>} offsets 相对焦点的整数逻辑偏移 [[offsetX, offsetY], ...]，默认 []。
   * @returns {Array<Array<number>>} 绝对等距下标，保留顺序、不修改输入；空偏移返回 []。
   * 输入坐标为有限整数；不去重、不筛选边界或海拔，不接收像素坐标。
   */

  function getIsometricNeighborsByOffsets([gridX, gridY] = [0, 0], offsets = []) {
    return offsets.map(([offsetX, offsetY]) => [gridX + offsetX, gridY + offsetY]);
  } // 错列或非错列元素的左上、右上、左下、右下，四个角邻居 [xNum, yNum] 差值及距离成本
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
   * @param  {Number}  elevation      海拔，默认 0；每单位向上偏移 16px，不改变网格关系
   * @return {Array}   [pixelX, pixelY, gridX, gridY]
   */

  function getPosition(gridCoord = [0, 0], tileSize = [8, 4], stagger = 'odd', originPixel = [0, 0], elevation = 0) {
    return applyElevation(getPosition$3(HALF, gridCoord, tileSize, stagger, originPixel), elevation);
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
  /* 按等距布局菱形单元横纵坐标值及单元格宽高得到渲染坐标值
   * elevation 默认 0；每单位向上偏移 16px，不改变网格关系。
   */

  function getIsometricPosition([gridX, gridY] = [], tileSize = [8, 4], originPixel = [0, 0], elevation = 0) {
    const [pixelX, pixelY] = getIsometricPosByHalfSize(gridX, gridY, ...getHalfSize(tileSize));
    return applyElevation([pixelX + originPixel[0], pixelY + originPixel[1]], elevation);
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
  /* 仅反查平面位置，不处理海拔位移或重叠顶面的点击命中。
   * 根据像素坐标精确定位 odd/even 错列菱形；none 保持近似定位。
   * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
   * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
   * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
   * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
   * @return {Array}  [xNum, yNum, x, y]
   */

  function getInfoByPos(pixelPos = [0, 0], originPixel = [0, 0], tileSize = [8, 4], stagger = 'odd') {
    const candidate = getInfoByPos$3(HALF, pixelPos, originPixel, tileSize, stagger); // none 不是交错铺满的菱形网格，保持原有近似定位行为。

    if (stagger !== 'odd' && stagger !== 'even') return candidate;
    const [, gridY, centerX, centerY] = candidate;
    const [tileWidth, tileHeight] = tileSize;
    const deltaY = pixelPos[1] - centerY; // 先检查候选菱形；共边时保留原候选，保证结果稳定。

    if (Math.abs(pixelPos[0] - centerX) / (tileWidth * HALF) + Math.abs(deltaY) / (tileHeight * HALF) <= 1) return candidate; // 候选矩形的上下角区属于相邻错列行；重新计算该行的列号即可。

    const targetGridY = gridY + (deltaY > 0 ? 1 : -1);
    const offsetX = isStaggerLine(targetGridY, stagger) ? HALF : 0;
    const targetGridX = Math.round((pixelPos[0] - originPixel[0]) / tileWidth - offsetX);
    const [pixelX, pixelY] = getPosition([targetGridX, targetGridY], tileSize, stagger, originPixel);
    return [targetGridX, targetGridY, pixelX, pixelY];
  }
  /* 仅反查平面位置，不处理海拔位移或重叠顶面的点击命中。
   * 通过大致的像素坐标值获取该位置等距布局tile元素的[Num, yNum]
   * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
   * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
   * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
   * @return {Object}  {xNum, yNum, x, y}
   */

  function getIsometricInfoByPos(pixelPos = [0, 0], originPixel = [0, 0], tileSize = [8, 4]) {
    const [halfWidth, halfHeight] = getHalfSize(tileSize);
    const [originPixelX, originPixelY] = originPixel;
    const pixelStepsX = (pixelPos[0] - originPixelX) / halfWidth * HALF;
    const pixelStepsY = (pixelPos[1] - originPixelY) / halfHeight * HALF;
    const gridY = Math.round(pixelStepsY + pixelStepsX);
    const gridX = Math.round(pixelStepsX - pixelStepsY);
    const [pixelX, pixelY] = getIsometricPosByHalfSize(gridX, gridY, halfWidth, halfHeight);
    return [gridX, gridY, pixelX + originPixelX, pixelY + originPixelY];
  }
  /* 按海拔从高到低反查菱形顶面，复用对应布局的平面反查。
   * @param {Array} pixelPos 查询的像素坐标
   * @param {Array} elevationLayers 已去重、按降序排列的实际海拔值，可包含负数和小数
   * @param {Function} getElevation 按 [gridX, gridY] 查询海拔；不存在或不可选的格子返回 undefined
   * @param {Function} getFlatInfoByPos 已绑定原点、尺寸与布局的平面反查方法
   * @return {Array} [gridX, gridY, pixelX, pixelY, elevation]；未命中时返回海拔 0 平面参考，elevation 为 null
   * 每层只反查一个候选，共边归属沿用平面反查；不遍历邻居或管理地图数据。
   * 建议海拔层包含 0，以复用其反查结果；否则未命中时额外反查一次平面参考。
   */

  function getInfoByPosWithElevation(pixelPos = [0, 0], elevationLayers = [0], getElevation = () => undefined, getFlatInfoByPos = getInfoByPos) {
    let flatInfo;

    for (const elevation of elevationLayers) {
      const offsetY = -elevation * ELEVATION_HEIGHT;
      const [gridX, gridY, pixelX, pixelY] = getFlatInfoByPos([pixelPos[0], pixelPos[1] - offsetY]);

      if (getElevation([gridX, gridY]) === elevation) {
        return [gridX, gridY, pixelX, pixelY + offsetY, elevation];
      }

      if (elevation === 0) flatInfo = [gridX, gridY, pixelX, pixelY, null];
    }

    return flatInfo || [...getFlatInfoByPos(pixelPos), null];
  }
  /* 获得错列布局中指定tile下标周边紧邻的邻居们
   * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
   * @param  {String}    stagger         需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
   * @return {Array}  [[xNum, yNum]]
   */

  function getNeighbors(originGrid = [0, 0], stagger = 'odd') {
    const [originGridX, originGridY] = originGrid;
    const neisArr = [...cornersNormalOrOffset, ...(isStaggerLine(originGridY, stagger) ? directionsOffset : directionsNormal)];
    return neisArr.map(([offsetX, offsetY, cost, angStr]) => [offsetX + originGridX, offsetY + originGridY, cost, angStr]);
  }
  /* 获得等距布局中指定tile下标周边紧邻的邻居们
   * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
   * @return {Array}  [[xNum, yNum]]
   */

  function getIsometricNeighbors(originGrid = [0, 0]) {
    const [originGridX, originGridY] = originGrid;
    const neisArr = [...cornersIsometric, ...directionsIsometric];
    return neisArr.map(([offsetX, offsetY, cost, angStr]) => [offsetX + originGridX, offsetY + originGridY, cost, angStr]);
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
    const neighborIterator = typeof iterator === 'string' ? neighborTypes[iterator] || neighborTypes.all : iterator;
    return twoDimForEach([-distance, distance], [-distance, distance], renderOrder, (offsetX, offsetY) => {
      const matchedOffset = neighborIterator(offsetX, offsetY, distance);
      if (!Array.isArray(matchedOffset)) return matchedOffset;
      return getNeighborByOffset(originXyNum, matchedOffset, stagger);
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
    const [originGridX, originGridY] = originXyNum;
    const neighborIterator = typeof iterator === 'string' ? neighborTypes[iterator] || neighborTypes.all : iterator;
    return twoDimForEach([-distance, distance], [-distance, distance], renderOrder, (offsetX, offsetY) => {
      const matchedOffset = neighborIterator(offsetX, offsetY, distance);
      return Array.isArray(matchedOffset) ? [matchedOffset[0] + originGridX, matchedOffset[1] + originGridY] : matchedOffset;
    });
  }

  var rhombusFuns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    directionsNormal: directionsNormal,
    directionsOffset: directionsOffset,
    neighborTypes: neighborTypes,
    getNeighborsByOffsets: getNeighborsByOffsets,
    getIsometricNeighborsByOffsets: getIsometricNeighborsByOffsets,
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
    getInfoByPosWithElevation: getInfoByPosWithElevation,
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

  /* A*寻径（启发值为 0，按 Dijkstra 策略搜索）
  * @param {Array}                 startGrid              起点网格坐标，如：[gridX, gridY]
  * @param {Array}                 endGrid                终点网格坐标，如：[gridX, gridY]
  * @param {Function}              getNeighbors          需要外部传入获取邻居坐标的方法（等距、错列、正矩形方案不同）
  *                                                      参数示例：(currentGrid = [gridX, gridY])
  *                                                      需要返回邻居坐标值、权重的 tile 二维数组：[[gridX1, gridY1, cost1], [gridX2, gridY2, cost2], ...]
  *                                                      搜索期间邻接关系和权重固定，cost || 1 后为有限正数，累计运算不溢出
  *                                                      每步累计成本保留三位小数，最优路径按此成本比较
  * @param {Number}                maximizable           最大成本更新次数（默认为1e6，用于防止死循环）
  * @return {Array|null} 匹配的路径集合或 null
  */
  function aStar$1(startGrid = [0, 0], endGrid = [0, 0], getNeighbors = currentGrid => [], maximizable = 1e6) {
    const path = [];
    const [startGridX, startGridY] = startGrid;
    const [endGridX, endGridY] = endGrid;
    const startPoint = [startGridX, startGridY, 0];
    let n = 0; // 起止点相同直接返回当前点

    if (startGridX === endGridX && startGridY === endGridY) {
      path.push(startPoint);
    } else {
      const parents = {};
      const costs = {
        [gridCoordToKey(startGrid)]: 0
      };
      const openlist = [startPoint];

      while (openlist.length) {
        // 优先取累计成本最低的点，等成本时保持入队顺序
        let minIndex = 0;

        for (let i = 1; i < openlist.length; i++) {
          if (openlist[i][2] < openlist[minIndex][2]) minIndex = i;
        }

        const [currPoint] = openlist.splice(minIndex, 1);
        const [currGridX, currGridY, currCost] = currPoint; // 同一节点可能以更低成本重新入队，跳过旧记录

        if (currCost !== costs[gridCoordToKey(currPoint)]) continue; // 终点以最低成本出队后生成路径

        if (currGridX === endGridX && currGridY === endGridY) {
          // 回查链表得到完整路径数组，父节点均为已确认最低成本的点
          let previousGrid = currPoint;

          while (previousGrid) {
            path.push(previousGrid);
            previousGrid = parents[gridCoordToKey(previousGrid)];
          }

          return path.reverse();
        } // 从邻居中查找可以更低成本通过的节点


        getNeighbors(currPoint).forEach(([gridX, gridY, cost]) => {
          const neighborKey = gridCoordToKey([gridX, gridY]);
          const oldCost = costs[neighborKey];
          const neiCost = Math.round((currCost + (cost || 1)) * 1e3) / 1e3; // 当前点通行成本还不如已经确定的成本低，那么舍弃路径方案

          if (oldCost !== undefined && neiCost >= oldCost) return;
          costs[neighborKey] = neiCost;
          parents[neighborKey] = currPoint; // 成本更新次数超过上限，抛出异常终止查找

          n++;
          if (n > maximizable) throw new Error('[pathFinding.aStar] The number of loops exceeds the maximum value:' + maximizable);
          const neiPoint = [gridX, gridY, neiCost]; // 将成本更新后的节点放入开放点列表，等待确认最低成本

          openlist.push(neiPoint);
        });
      }
    }

    return path.length ? path : null;
  }

  function gridCoordToKey([gridX, gridY]) {
    return `${gridX}_${gridY}`;
  }

  const aStar = aStar$1;

  var pathFindingObj = /*#__PURE__*/Object.freeze({
    __proto__: null,
    aStar: aStar
  });

  // 基础图形方法
  const shapes = shapesObj; // 寻路方法
  const pathFinding = pathFindingObj;

  exports.pathFinding = pathFinding;
  exports.shapes = shapes;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=qtiled.dev.js.map

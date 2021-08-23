
/**
 * qtiled v0.2.2
 * (c) 2008-2021 huzunjie
 * Released under MIT
 */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/* 椭圆形 */
var PI = Math.PI; // π；180度对应的弧度值

var PI_DBL = PI * 2; // 2 倍的 π；360度对应的弧度值

var PI_HALF = PI / 2; // 一半的 π；90度对应的弧度值

var PI_OPF = PI + PI_HALF; // 1.5 倍的π One point five；270度对应弧度值

var PI_OA = PI / 180; // One Angle 1角度换算为弧度值

/* 角度转弧度
* @param {Number}  angle    角度值 0 ~ 360+N
* @return {Number} 弧度值
*/

function angle2Radian() {
  var angle = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  return angle * PI_OA;
}
/* 弧度转角度
* @param {Number}  radian    弧度值 0 ~ PI*N
* @return {Number} 角度值
*/

function radian2Angle() {
  var radian = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
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
  var k = Math.tan(radian);

  if (Math.abs(k) > 1e5) {
    return [x0, y0 + (radian < PI ? radiusY : -radiusY)];
  } // 第一或第四象限取正、其他象限取负


  var d = radian <= PI_HALF || radian > PI_OPF ? 1 : -1;
  var v = 1 / Math.pow(radiusX, 2) + Math.pow(k, 2) / Math.pow(radiusY, 2);
  var x = d * Math.sqrt(1 / v) + x0;
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

function getIsometryPoint(radiusX, radiusY, count, num) {
  var radian = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
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
  getIsometryPoint: getIsometryPoint
});

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArrayLimit(arr, i) {
  var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

  if (_i == null) return;
  var _arr = [];
  var _n = true;
  var _d = false;

  var _s, _e;

  try {
    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) {
    arr2[i] = arr[i];
  }

  return arr2;
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}

function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}

/* 二维多边形相关配置及基础方法 */

/* 基础配置参数（个别参数调整涉及算法变化，所以放全局配置，以示特殊）*/
var HALF = 0.5;
var FLAH = -HALF;
var QUAR = 0.25; // 四分之一

var RAUQ = -QUAR;
var TQUA$1 = 1 - QUAR; // 正六边形两行重合部分高度

/* 得到一个多边形折线顶点坐标集合
 * @param  {Array}     baseVertexes    多边形顶点配置，如上文的: rectVertexes
 * @param  {Number}    width         渲染时的宽度值
 * @param  {Number}    height        渲染时的高度值
 * @param  {String}    axis          主轴方向 'x' || 'y'；默认为 'y'，上下是尖
 * @return {Array}     [x, y]
 */

function getVertexes$3(baseVertexes) {
  var width = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var height = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
  var axis = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'y';

  var fun = function fun(_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        x = _ref2[0],
        y = _ref2[1];

    return [x * width, y * height];
  }; // 如果是要将多边形图案横过来的，旋转90度（六边形会比较大的不同）


  if (axis === 'x') {
    fun = function fun(_ref3) {
      var _ref4 = _slicedToArray(_ref3, 2),
          x = _ref4[0],
          y = _ref4[1];

      return [y * width, x * height];
    };
  }

  return baseVertexes.map(fun);
}

function _for(min, max, cbk) {
  for (var i = min; i <= max; i++) {
    cbk(i);
  }
}

function for_(min, max, cbk) {
  for (var i = max; i >= min; i--) {
    cbk(i);
  }
}

var forEachConfs = {
  RightDown: function RightDown() {
    var minX = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var maxX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var minY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var maxY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    var cbk = arguments.length > 4 ? arguments[4] : undefined;

    _for(minX, maxX, function (x) {
      return _for(minY, maxY, function (y) {
        return cbk(x, y);
      });
    });
  },
  RightUp: function RightUp() {
    var minX = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var maxX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var minY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var maxY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    var cbk = arguments.length > 4 ? arguments[4] : undefined;

    _for(minX, maxX, function (x) {
      return for_(minY, maxY, function (y) {
        return cbk(x, y);
      });
    });
  },
  LeftDown: function LeftDown() {
    var minX = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var maxX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var minY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var maxY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    var cbk = arguments.length > 4 ? arguments[4] : undefined;
    for_(minX, maxX, function (x) {
      return _for(minY, maxY, function (y) {
        return cbk(x, y);
      });
    });
  },
  LeftUp: function LeftUp() {
    var minX = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var maxX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var minY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var maxY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    var cbk = arguments.length > 4 ? arguments[4] : undefined;
    for_(minX, maxX, function (x) {
      return for_(minY, maxY, function (y) {
        return cbk(x, y);
      });
    });
  }
};
/* 按renderOrder循环遍历主副轴二维数组
 * @param  {Array}     mainAxisRange  主轴总行数
 * @param  {Array}     subAxisRange   副轴总行数
 * @param  {String}    renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @param  {Function}  iterator       迭代函数，如：(x, y) => [x, y]
 * @return {Array}    [x, y]
 */

function twoDimForEach() {
  var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var renderOrder = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'RightDown';
  var iterator = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (x, y) {
    return [x, y];
  };
  var forEachFun = forEachConfs[renderOrder] || forEachConfs.RightDown;
  var retArr = [];
  forEachFun.apply(void 0, _toConsumableArray(mainAxisRange).concat(_toConsumableArray(subAxisRange), [function (x, y) {
    var ret = iterator(x, y);
    ret && retArr.push(ret);
  }]));
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

function getPosition$2() {
  var lineRate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  var xyNum = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
  var stagger = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'none';
  var originXY = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : [0, 0];

  var _tileSize = _slicedToArray(tileSize, 2),
      width = _tileSize[0],
      height = _tileSize[1];

  var _xyNum = _slicedToArray(xyNum, 2),
      xNum = _xyNum[0],
      yNum = _xyNum[1];

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

function getPositions$3() {
  var lineRate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  var mainAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var subAxisRange = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];
  var tileSize = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [8, 4];
  var stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';
  var renderOrder = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 'RightDown';

  var _tileSize2 = _slicedToArray(tileSize, 2),
      width = _tileSize2[0],
      _height = _tileSize2[1]; // 多边形在主轴方向必须向上位移，才能保证挫列后网格对齐，所以这里要乘以 lineRate


  var height = _height * lineRate;
  var needOffset = stagger !== 'none';
  var isOddNum = Number(stagger === 'odd'); // 多边形错列布局副轴上需要偏移来达成错列布局

  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, function (mainAxisNum, subAxisNum) {
    var lineRate = mainAxisNum;

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

function getInfoByPos$3() {
  var lineRate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  var pos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var originPos = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];
  var tileSize = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [8, 4];
  var stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';

  var _originPos = _slicedToArray(originPos, 2),
      originX = _originPos[0],
      originY = _originPos[1];

  var _tileSize3 = _slicedToArray(tileSize, 2),
      width = _tileSize3[0],
      height = _tileSize3[1];

  var lineHeight = height * lineRate; // 行高

  var dotX = pos[0] - originX;
  var dotY = pos[1] - originY; // 多边形错列布局需要补充偏移量

  var xNumOffset = 0;
  var yNum = Math.round(dotY / lineHeight);

  if (stagger !== 'none' && Math.abs(yNum % 2) === Number(stagger === 'odd')) {
    xNumOffset = HALF;
  }

  var xNum = Math.round(dotX / width - xNumOffset);
  var centerX = (xNum + xNumOffset) * width;
  var centerY = yNum * lineHeight;
  var tileX = centerX + originX;
  var tileY = centerY + originY;
  return [xNum, yNum, tileX, tileY];
}

var polygonFuns = /*#__PURE__*/Object.freeze({
  __proto__: null,
  HALF: HALF,
  FLAH: FLAH,
  QUAR: QUAR,
  RAUQ: RAUQ,
  TQUA: TQUA$1,
  getVertexes: getVertexes$3,
  twoDimForEach: twoDimForEach,
  isStaggerLine: isStaggerLine,
  getPosition: getPosition$2,
  getPositions: getPositions$3,
  getInfoByPos: getInfoByPos$3
});

var vertexes$2 = [[FLAH, FLAH], [HALF, FLAH], [HALF, HALF], [FLAH, HALF]];
/* 上、右、下、左，四个边邻居 [xNum, yNum, cost] 差值及距离成本 */

var directions = [[0, -1, 1, '↑'], [1, 0, 1, '→'], [0, 1, 1, '↓'], [-1, 0, 1, '←']];
/* 左上、右上、左下、右下，四个角邻居 [xNum, yNum] 差值及距离成本 */

var corners = [[-1, -1, 1.414, '↖'], [1, -1, 1.414, '↗'], [1, 1, 1.414, '↘'], [-1, 1, 1.414, '↙']];
/* 根据计划渲染后的正矩形宽高值，得到顶点坐标集合
* @param  {Array}   size    如： [width{Number}, height{Number}]
* @return {Array}   [[x, y], ...]
*/

function getVertexes$2() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [1, 1],
      _ref2 = _slicedToArray(_ref, 2),
      width = _ref2[0],
      height = _ref2[1];

  return getVertexes$3(vertexes$2, width, height);
}
/* 得到一个矩形地图瓦片的坐标偏移位置
 * @param  {Array}   xyNum          xy轴序号，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {Array}   originXY       原点像素坐标值，如：[80, 40]
 * @return {Array}   [x, y]
 */

function getPosition$1() {
  var xyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var tileSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [8, 4];
  var originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];
  return [originXY[0] + xyNum[0] * tileSize[0], originXY[1] + xyNum[1] * tileSize[1]];
}
/* 得到一组矩形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */

function getPositions$2() {
  var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
  var renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';
  return getPositions$3(1, mainAxisRange, subAxisRange, tileSize, 'none', renderOrder);
}
/* 获得与pos坐标有交集的tile元素的{xNum, yNum, x, y}
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @return {Array}  [xNum, yNum, x, y]
 */

function getInfoByPos$2() {
  var pos = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var originPos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
  return getInfoByPos$3(1, pos, originPos, tileSize, 'none');
}
/* 获得指定tile下标周边的邻居元素们
 * @param  {Array}     originXyNum    XY轴序号，如：[0, 0]
 * @return {Array}  [[xNum, yNum]]
 */

function getNeighbors$1() {
  var originXyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var neisConf = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [].concat(directions, corners);

  var _originXyNum = _slicedToArray(originXyNum, 2),
      originXNum = _originXyNum[0],
      originYNum = _originXyNum[1];

  return neisConf.map(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 4),
        xNum = _ref4[0],
        yNum = _ref4[1],
        cost = _ref4[2],
        angStr = _ref4[3];

    return [xNum + originXNum, yNum + originYNum, cost, angStr];
  });
}
/* 按距离获得指定tile下标周边区域内的元素们
 * @param  {Array}     originXyNum     XY轴序号，如：[0, 0]
 * @param  {Number}    distance        下标间隔量，目标元素的第几圈邻居，0 ~ N
 * @param  {Function}  iterator        迭代函数，如：(x, y) => [x, y]
 * @param  {String}    renderOrder     渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}  [[xNum, yNum]]
 */

function getNeighborsByDistance() {
  var distance = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var iterator = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (x, y) {
    return [x, y];
  };
  var renderOrder = arguments.length > 3 ? arguments[3] : undefined;
  return twoDimForEach([-distance, distance], [-distance, distance], renderOrder, iterator);
}

var rectFuns = /*#__PURE__*/Object.freeze({
  __proto__: null,
  vertexes: vertexes$2,
  directions: directions,
  corners: corners,
  getVertexes: getVertexes$2,
  getPosition: getPosition$1,
  getPositions: getPositions$2,
  getInfoByPos: getInfoByPos$2,
  getNeighbors: getNeighbors$1,
  getNeighborsByDistance: getNeighborsByDistance
});

var vertexes$1 = [[0, FLAH], [HALF, RAUQ], [HALF, QUAR], [0, HALF], [FLAH, QUAR], [FLAH, RAUQ]];
var TQUA = TQUA$1;
/* 左上、右上、右下、左下、左边、右边，6个边邻居 [xNum, yNum, cost, angle] 差值及距离成本及渲染角度 */

var directionsNormal = [[-1, -1, 1, '↖'], [0, -1, 1, '↗'], [0, 1, 1, '↘'], [-1, 1, 1, '↙'], [-1, 0, 1, '←'], [1, 0, 1, '→']];
/* 错列行邻居下标差值 */

var directionsOffset = [[0, -1, 1, '↖'], [1, -1, 1, '↗'], [1, 1, 1, '↘'], [0, 1, 1, '↙'], [-1, 0, 1, '←'], [1, 0, 1, '→']];
/* 根据计划渲染的六边形宽高值得到顶点坐标集
* @param  {Array}   size    如： [width{Number}, height{Number}]
* @param  {String}  axis     主轴方向 'x' || 'y'；默认为 'y'，上下是尖
* @return {Array}   [[x, y], ...]
*/

function getVertexes$1() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [1, 1],
      _ref2 = _slicedToArray(_ref, 2),
      _ref2$ = _ref2[0],
      width = _ref2$ === void 0 ? 1 : _ref2$,
      _ref2$2 = _ref2[1],
      height = _ref2$2 === void 0 ? 1 : _ref2$2;

  var axis = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'y';
  return getVertexes$3(vertexes$1, width, height, axis);
}
/* 得到一个错列布局六边形地图瓦片的坐标位置
 * @param  {Array}   xyNum          目标元素XY索引值，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {Array}   originXY       原点像素坐标值，如：[0, 0]
 * @return {Array}   [x, y]
 */

function getPosition() {
  var xyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var tileSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [8, 4];
  var stagger = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'odd';
  var originXY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [0, 0];
  return getPosition$2(TQUA, xyNum, tileSize, stagger, originXY);
}
/* 得到一组错列布局六边形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}   [[x, y], ...]
 */

function getPositions$1() {
  var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
  var renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';
  var stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';
  return getPositions$3(TQUA, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
}
/* 通过大致的像素坐标值获取该位置tile元素的[Num, yNum]
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [xNum, yNum, x, y]
 */

function getInfoByPos$1() {
  var pos = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var originPos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
  var stagger = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'odd';
  return getInfoByPos$3(TQUA, pos, originPos, tileSize, stagger);
}
/* 获得指定tile下标周边紧邻的邻居们
 * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
 * @param  {String}    stagger         需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [[xNum, yNum]]
 */

function getNeighbors() {
  var originXyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var stagger = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'odd';

  var _originXyNum = _slicedToArray(originXyNum, 2),
      originXNum = _originXyNum[0],
      originYNum = _originXyNum[1];

  var directions = isStaggerLine(originYNum, stagger) ? directionsOffset : directionsNormal;
  return directions.map(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 4),
        xNum = _ref4[0],
        yNum = _ref4[1],
        cost = _ref4[2],
        angStr = _ref4[3];

    return [xNum + originXNum, yNum + originYNum, cost, angStr];
  });
}

var hexagonFuns = /*#__PURE__*/Object.freeze({
  __proto__: null,
  vertexes: vertexes$1,
  TQUA: TQUA,
  directionsNormal: directionsNormal,
  directionsOffset: directionsOffset,
  getVertexes: getVertexes$1,
  getPosition: getPosition,
  getPositions: getPositions$1,
  getInfoByPos: getInfoByPos$1,
  getNeighbors: getNeighbors
});

var vertexes = [[0, FLAH], [HALF, 0], [0, HALF], [FLAH, 0]];
/*
// 左上、右上、右下、左下、左边、右边，6个边邻居 [xNum, yNum, cost, angle] 差值及距离成本及渲染角度
export const directionsNormal = [
  [-1, -1, 1, '↖'],
  [0, -1, 1, '↗'],
  [0, 1, 1, '↘'],
  [-1, 1, 1, '↙'],
  [-1, 0, 1, '←'],
  [1, 0, 1, '→'],
];

// 错列行邻居下标差值
export const directionsOffset = [
  [0, -1, 1, '↖'],
  [1, -1, 1, '↗'],
  [1, 1, 1, '↘'],
  [0, 1, 1, '↙'],
  [-1, 0, 1, '←'],
  [1, 0, 1, '→'],
];

Isometric
// 上、右、下、左，四个边邻居 [xNum, yNum, cost] 差值及距离成本
export const directions = [
  [0, -1, 1, '↑'],
  [1, 0, 1, '→'],
  [0, 1, 1, '↓'],
  [-1, 0, 1, '←'],
];

// 左上、右上、左下、右下，四个角邻居 [xNum, yNum] 差值及距离成本
export const corners = [
  [-1, -1, 1.414, '↖'],
  [1, -1, 1.414, '↗'],
  [1, 1, 1.414, '↘'],
  [-1, 1, 1.414, '↙'],
];*/

/* 获取宽高的一半（菱形中心点在顶点坐标系中的值）
* @param  {Array}   size    如： [width{Number}, height{Number}]
* @return {Array}   [halfWidth, halfHeight]
*/

function getHalfSize() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [1, 1],
      _ref2 = _slicedToArray(_ref, 2),
      _ref2$ = _ref2[0],
      width = _ref2$ === void 0 ? 1 : _ref2$,
      _ref2$2 = _ref2[1],
      height = _ref2$2 === void 0 ? 1 : _ref2$2;

  return [width * HALF, height * HALF];
}
/* 根据计划渲染的菱形宽高值，得到顶点坐标集合
* @param  {Array}   size    如： [width{Number}, height{Number}]
* @return {Array}   [[x, y], ...]
*/

function getVertexes() {
  var _ref3 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [1, 1],
      _ref4 = _slicedToArray(_ref3, 2),
      _ref4$ = _ref4[0],
      width = _ref4$ === void 0 ? 1 : _ref4$,
      _ref4$2 = _ref4[1],
      height = _ref4$2 === void 0 ? 1 : _ref4$2;

  return getVertexes$3(vertexes, width, height);
}
/* 得到一组错列布局菱形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */

function getPositions() {
  var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
  var renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';
  var stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';
  return getPositions$3(HALF, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
}
/* 按等距布局菱形单元横纵坐标值及单元格宽高得到渲染坐标值 */

function getIsometricPosition(xNum, yNum, halfWidth, halfHeight) {
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

function getIsometricPositions() {
  var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
  var renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';

  var _getHalfSize = getHalfSize(tileSize),
      _getHalfSize2 = _slicedToArray(_getHalfSize, 2),
      halfWidth = _getHalfSize2[0],
      halfHeight = _getHalfSize2[1];

  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, function (xNum, yNum) {
    return [].concat(_toConsumableArray(getIsometricPosition(xNum, yNum, halfWidth, halfHeight)), [xNum, yNum]);
  });
}
/* 通过大致的像素坐标值获取该位置错列布局tile元素的[Num, yNum, x, y]
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [xNum, yNum, x, y]
 */

function getInfoByPos() {
  var pos = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var originPos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
  var stagger = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'odd';
  return getInfoByPos$3(HALF, pos, originPos, tileSize, stagger);
}
/* 通过大致的像素坐标值获取该位置等距布局tile元素的[Num, yNum]
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @return {Object}  {xNum, yNum, x, y}
 */

function getIsometricInfoByPos() {
  var pos = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var originPos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];

  var _getHalfSize3 = getHalfSize(tileSize),
      _getHalfSize4 = _slicedToArray(_getHalfSize3, 2),
      halfWidth = _getHalfSize4[0],
      halfHeight = _getHalfSize4[1];

  var _originPos = _slicedToArray(originPos, 2),
      originX = _originPos[0],
      originY = _originPos[1];

  var xSteps = (pos[0] - originX) / halfWidth * HALF;
  var ySteps = (pos[1] - originY) / halfHeight * HALF;
  var yNum = Math.round(ySteps + xSteps);
  var xNum = Math.round(xSteps - ySteps);

  var _getIsometricPosition = getIsometricPosition(xNum, yNum, halfWidth, halfHeight),
      _getIsometricPosition2 = _slicedToArray(_getIsometricPosition, 2),
      x = _getIsometricPosition2[0],
      y = _getIsometricPosition2[1];

  return [xNum, yNum, x + originX, y + originY];
}
/* 获得指定tile下标周边紧邻的邻居们
 * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
 * @param  {String}    stagger         需要错位排列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Array}  [[xNum, yNum]]
 */

/*export function getNeighbors(originXyNum = [0, 0], stagger = 'odd') {
  const [originXNum, originYNum] = originXyNum;
  const directions = isStaggerLine(originYNum, stagger) ? directionsOffset : directionsNormal;
  return directions.map(([xNum, yNum, cost, angStr]) => [xNum + originXNum, yNum + originYNum, cost, angStr]);
}*/

var rhombusFuns = /*#__PURE__*/Object.freeze({
  __proto__: null,
  getHalfSize: getHalfSize,
  getVertexes: getVertexes,
  getPositions: getPositions,
  getIsometricPosition: getIsometricPosition,
  getIsometricPositions: getIsometricPositions,
  getInfoByPos: getInfoByPos,
  getIsometricInfoByPos: getIsometricInfoByPos
});

var ellipse = ellipseFuns;
var rect = rectFuns;
var hexagon = hexagonFuns;
var rhombus = rhombusFuns;
var polygon = polygonFuns;

var shapesObj = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ellipse: ellipse,
  rect: rect,
  hexagon: hexagon,
  rhombus: rhombus,
  polygon: polygon
});

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

/* A*寻径
* @param {Array}                 staXyNum              数据坐标值，如：[xNum, yNum]
* @param {Array}                 endXyNum              数据坐标值，如：[xNum, yNum]
* @param {Function}              getNeighbors          需要外部传入获取邻居坐标的方法（等距、错列、正矩形方案不同）
*                                                      参数示例：(currXyNum = [xNum, yNum])
*                                                      需要返回邻居坐标值、权重的tile二维数组：[[xNum1, yNum1, cost1], [xNum2, yNum2, cost2], ...]
* @param {Number}                maximizable           最大可循环次数（默认为1e6，用于防止死循环）
* @return {Array} 匹配的路径集合或空数组
*/
function aStar$1() {
  var staXyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var endXyNum = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  var getNeighbors = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (currPointXyNum) {
    return [];
  };
  var maximizable = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1e6;
  var path = [];

  var _staXyNum = _slicedToArray(staXyNum, 2),
      staXNum = _staXyNum[0],
      staYNum = _staXyNum[1];

  var _endXyNum = _slicedToArray(endXyNum, 2),
      endXNum = _endXyNum[0],
      endYNum = _endXyNum[1];

  var staPoint = [staXNum, staYNum, 0];
  var n = 0; // 起止点相同直接返回当前点

  if (staXNum === endXNum && staYNum === endYNum) {
    path.push(staPoint);
  } else {
    (function () {
      var parents = {};

      var costs = _defineProperty({}, xyNum2Str(staXyNum), 0);

      var openlist = [staPoint];

      var _loop = function _loop() {
        var currPoint = openlist.pop();
        var currCost = costs[xyNum2Str(currPoint)]; // 从邻居中查找可以更低成本通过的节点

        getNeighbors(currPoint).some(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 3),
              xNum = _ref2[0],
              yNum = _ref2[1],
              cost = _ref2[2];

          var neiXYStr = xyNum2Str([xNum, yNum]);
          var oldCost = costs[neiXYStr];
          var neiCost = Math.round((currCost + (cost || 1)) * 1e3) / 1e3; // 当前点通行成本还不如已经确定的成本低，那么舍弃路径方案

          if (oldCost !== undefined && neiCost >= oldCost) return;
          costs[neiXYStr] = neiCost;
          parents[neiXYStr] = currPoint; // 循环次数达到上限，抛出异常终止查找

          n++;
          if (n > maximizable) throw new Error('[pathFinding.aStar] The number of loops exceeds the maximum value:' + maximizable);
          var neiPoint = [xNum, yNum, neiCost]; // 到达终点生成路径

          if (xNum === endXNum && yNum === endYNum) {
            path.push(neiPoint); // 回查链表得到完整路径数组

            var prevXyNum = endXyNum;

            while (prevXyNum = parents[xyNum2Str(prevXyNum)]) {
              path.unshift(prevXyNum);
            }

            openlist.length = 0;
            return false;
          } else {
            // 没到达终点，将当前点放入开放点列表，继续查找
            openlist.unshift(neiPoint);
          }
        });
      };

      while (openlist.length) {
        _loop();
      }
    })();
  }

  return path.length ? path : null;
}

function xyNum2Str(_ref3) {
  var _ref4 = _slicedToArray(_ref3, 2),
      xNum = _ref4[0],
      yNum = _ref4[1];

  return "".concat(xNum, "_").concat(yNum);
}

var aStar = aStar$1;

var pathFindingObj = /*#__PURE__*/Object.freeze({
  __proto__: null,
  aStar: aStar
});

// 基础图形方法
var shapes = shapesObj; // 寻路方法
var pathFinding = pathFindingObj;

exports.pathFinding = pathFinding;
exports.shapes = shapes;

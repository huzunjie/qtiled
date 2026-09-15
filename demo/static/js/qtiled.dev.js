
/**
 * qtiled v0.2.7
 * (c) 2008-2026 huzunjie
 * Released under MIT
 */

(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.qtiled = {}));
}(this, (function (exports) { 'use strict';

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

  function getEquidistantPoint(radiusX, radiusY, count, num) {
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
    getEquidistantPoint: getEquidistantPoint
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

  function getPosition$3() {
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
    getPosition: getPosition$3,
    getPositions: getPositions$3,
    getInfoByPos: getInfoByPos$3
  });

  var vertexes$2 = [[FLAH, FLAH], [HALF, FLAH], [HALF, HALF], [FLAH, HALF]];
  /* 上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本 */

  var directions = [[0, -1, 1, '↑'], [1, 0, 1, '→'], [0, 1, 1, '↓'], [-1, 0, 1, '←']];
  var SQRT2$1 = Math.SQRT2;
  /* 左上、右上、左下、右下，四个角邻居 [xNum, yNum, cost, angStr] 差值及距离成本 */

  var corners = [[-1, -1, SQRT2$1, '↖'], [1, -1, SQRT2$1, '↗'], [1, 1, SQRT2$1, '↘'], [-1, 1, SQRT2$1, '↙']];
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

  function getPosition$2() {
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

  function getNeighbors$2() {
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
    getPosition: getPosition$2,
    getPositions: getPositions$2,
    getInfoByPos: getInfoByPos$2,
    getNeighbors: getNeighbors$2,
    getNeighborsByDistance: getNeighborsByDistance
  });

  var vertexes$1 = [[0, FLAH], [HALF, RAUQ], [HALF, QUAR], [0, HALF], [FLAH, QUAR], [FLAH, RAUQ]];
  var TQUA = TQUA$1;
  /* 左上、右上、右下、左下、左边、右边，6个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本及渲染角度 */

  var directionsNormal$1 = [[-1, -1, 1, '↖'], [0, -1, 1, '↗'], [0, 1, 1, '↘'], [-1, 1, 1, '↙'], [-1, 0, 1, '←'], [1, 0, 1, '→']];
  /* 错列行邻居下标差值 [xNum, yNum, cost, angStr] */

  var directionsOffset$1 = [[0, -1, 1, '↖'], [1, -1, 1, '↗'], [1, 1, 1, '↘'], [0, 1, 1, '↙'], [-1, 0, 1, '←'], [1, 0, 1, '→']];
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

  function getPosition$1() {
    var xyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var tileSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [8, 4];
    var stagger = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'odd';
    var originXY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [0, 0];
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

  function getNeighbors$1() {
    var originXyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var stagger = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'odd';

    var _originXyNum = _slicedToArray(originXyNum, 2),
        originXNum = _originXyNum[0],
        originYNum = _originXyNum[1];

    var directions = isStaggerLine(originYNum, stagger) ? directionsOffset$1 : directionsNormal$1;
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
    directionsNormal: directionsNormal$1,
    directionsOffset: directionsOffset$1,
    getVertexes: getVertexes$1,
    getPosition: getPosition$1,
    getPositions: getPositions$1,
    getInfoByPos: getInfoByPos$1,
    getNeighbors: getNeighbors$1
  });

  var vertexes = [[0, FLAH], [HALF, 0], [0, HALF], [FLAH, 0]]; // 非错列元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本

  var directionsNormal = [[-1, -1, 1, '↖'], [0, -1, 1, '↗'], [0, 1, 1, '↘'], [-1, 1, 1, '↙']]; // 错列元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本

  var directionsOffset = [[0, -1, 1, '↖'], [1, -1, 1, '↗'], [1, 1, 1, '↘'], [0, 1, 1, '↙']];
  var SQRT2 = Math.SQRT2; // 错列或非错列元素的左上、右上、左下、右下，四个角邻居 [xNum, yNum] 差值及距离成本
  // 没错，错列与非错列的角的邻居坐标系差值一样

  var cornersNormalOrOffset = [[0, -2, SQRT2, '↑'], [1, 0, SQRT2, '→'], [0, 2, SQRT2, '↓'], [-1, 0, SQRT2, '←']]; // 等距元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本

  var directionsIsometric = [[0, -1, 1, '↖'], [1, 0, 1, '↗'], [0, 1, 1, '↘'], [-1, 0, 1, '↙']]; // 等距元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本

  var cornersIsometric = [[1, -1, SQRT2, '↑'], [1, 1, SQRT2, '→'], [-1, 1, SQRT2, '↓'], [-1, -1, SQRT2, '←']];
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
  /* 得到一个错列布局菱形地图瓦片的坐标位置
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

  function getPositions() {
    var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
    var renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';
    var stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';
    return getPositions$3(HALF, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
  }
  /* 按等距布局菱形单元横纵坐标值及单元格宽高得到渲染坐标值 */

  function getIsometricPosition() {
    var _ref5 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [],
        _ref6 = _slicedToArray(_ref5, 2),
        xNum = _ref6[0],
        yNum = _ref6[1];

    var tileSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [8, 4];
    var originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];

    var _getIsometricPosByHal = getIsometricPosByHalfSize.apply(void 0, [xNum, yNum].concat(_toConsumableArray(getHalfSize(tileSize)))),
        _getIsometricPosByHal2 = _slicedToArray(_getIsometricPosByHal, 2),
        x = _getIsometricPosByHal2[0],
        y = _getIsometricPosByHal2[1];

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
      return [].concat(_toConsumableArray(getIsometricPosByHalfSize(xNum, yNum, halfWidth, halfHeight)), [xNum, yNum]);
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

    var _getIsometricPosByHal3 = getIsometricPosByHalfSize(xNum, yNum, halfWidth, halfHeight),
        _getIsometricPosByHal4 = _slicedToArray(_getIsometricPosByHal3, 2),
        x = _getIsometricPosByHal4[0],
        y = _getIsometricPosByHal4[1];

    return [xNum, yNum, x + originX, y + originY];
  }
  /* 获得错列布局中指定tile下标周边紧邻的邻居们
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

    var neisArr = [].concat(cornersNormalOrOffset, _toConsumableArray(isStaggerLine(originYNum, stagger) ? directionsOffset : directionsNormal));
    return neisArr.map(function (_ref7) {
      var _ref8 = _slicedToArray(_ref7, 4),
          xNum = _ref8[0],
          yNum = _ref8[1],
          cost = _ref8[2],
          angStr = _ref8[3];

      return [xNum + originXNum, yNum + originYNum, cost, angStr];
    });
  }
  /* 获得等距布局中指定tile下标周边紧邻的邻居们
   * @param  {Array}     originXyNum     参考点元素下标，如：[0, 0]
   * @return {Array}  [[xNum, yNum]]
   */

  function getIsometricNeighbors() {
    var originXyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];

    var _originXyNum2 = _slicedToArray(originXyNum, 2),
        originXNum = _originXyNum2[0],
        originYNum = _originXyNum2[1];

    var neisArr = [].concat(cornersIsometric, directionsIsometric);
    return neisArr.map(function (_ref9) {
      var _ref10 = _slicedToArray(_ref9, 4),
          xNum = _ref10[0],
          yNum = _ref10[1],
          cost = _ref10[2],
          angStr = _ref10[3];

      return [xNum + originXNum, yNum + originYNum, cost, angStr];
    });
  }

  var rhombusFuns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    directionsNormal: directionsNormal,
    directionsOffset: directionsOffset,
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
    getIsometricNeighbors: getIsometricNeighbors
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

        var costs = _defineProperty({}, xyNum2Str$1(staXyNum), 0);

        var openlist = [staPoint];

        var _loop = function _loop() {
          var currPoint = openlist.pop();
          var currCost = costs[xyNum2Str$1(currPoint)]; // 从邻居中查找可以更低成本通过的节点

          getNeighbors(currPoint).some(function (_ref) {
            var _ref2 = _slicedToArray(_ref, 3),
                xNum = _ref2[0],
                yNum = _ref2[1],
                cost = _ref2[2];

            var neiXYStr = xyNum2Str$1([xNum, yNum]);
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
        };

        while (openlist.length) {
          _loop();
        }
      })();
    }

    return path.length ? path : null;
  }

  function xyNum2Str$1(_ref3) {
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

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

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
  function xyNum2Str(_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        xNum = _ref2[0],
        yNum = _ref2[1];

    return "".concat(xNum, "_").concat(yNum);
  }
  /* 海拔地图数据类 */


  var ElevationMap = /*#__PURE__*/function () {
    /* 构造海拔地图
     * @param {Array}  [width, height]  地图尺寸，如 [10, 10]
     * @param {Number} defaultElevation 默认海拔值，默认为 0
     */
    function ElevationMap() {
      var _ref3 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0],
          _ref4 = _slicedToArray(_ref3, 2),
          _ref4$ = _ref4[0],
          width = _ref4$ === void 0 ? 0 : _ref4$,
          _ref4$2 = _ref4[1],
          height = _ref4$2 === void 0 ? 0 : _ref4$2;

      var defaultElevation = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      _classCallCheck(this, ElevationMap);

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


    _createClass(ElevationMap, [{
      key: "inBounds",
      value: function inBounds(xNum, yNum) {
        return xNum >= 0 && xNum < this.width && yNum >= 0 && yNum < this.height;
      }
      /* 获取指定瓦片的海拔值
       * @param  {Number} xNum
       * @param  {Number} yNum
       * @return {Number} 海拔值
       */

    }, {
      key: "get",
      value: function get(xNum, yNum) {
        var _this$_data$get;

        return (_this$_data$get = this._data.get(xyNum2Str([xNum, yNum]))) !== null && _this$_data$get !== void 0 ? _this$_data$get : this.defaultElevation;
      }
      /* 设置指定瓦片的海拔值
       * @param  {Number} xNum
       * @param  {Number} yNum
       * @param  {Number} level 海拔值
       * @return {ElevationMap} this（支持链式调用）
       */

    }, {
      key: "set",
      value: function set(xNum, yNum, level) {
        var key = xyNum2Str([xNum, yNum]);

        this._data.set(key, level);

        if (level > this._max) this._max = level;
        if (level < this._min) this._min = level;
        return this;
      }
      /* 批量设置海拔值
       * @param  {Array} entries 坐标与海拔值数组，如 [[x, y, level], ...]
       * @return {ElevationMap} this
       */

    }, {
      key: "setBatch",
      value: function setBatch() {
        var _this = this;

        var entries = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
        entries.forEach(function (_ref5) {
          var _ref6 = _slicedToArray(_ref5, 3),
              x = _ref6[0],
              y = _ref6[1],
              level = _ref6[2];

          return _this.set(x, y, level);
        });
        return this;
      }
      /* 获取地图最高海拔值
       * @return {Number}
       */

    }, {
      key: "getMaxElevation",
      value: function getMaxElevation() {
        return this._max;
      }
      /* 获取地图最低海拔值
       * @return {Number}
       */

    }, {
      key: "getMinElevation",
      value: function getMinElevation() {
        return this._min;
      }
      /* 获取指定瓦片与相邻瓦片的海拔差集合
       * @param  {Number} xNum
       * @param  {Number} yNum
       * @param  {Array}  neighbors 邻居坐标数组 [[xNum, yNum], ...]，如不传则返回空数组
       * @return {Array} [[xNum, yNum, diff], ...]
       */

    }, {
      key: "getDiffs",
      value: function getDiffs(xNum, yNum) {
        var _this2 = this;

        var neighbors = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
        var currLevel = this.get(xNum, yNum);
        return neighbors.map(function (_ref7) {
          var _ref8 = _slicedToArray(_ref7, 2),
              nx = _ref8[0],
              ny = _ref8[1];

          if (!_this2.inBounds(nx, ny)) return [nx, ny, null];
          return [nx, ny, _this2.get(nx, ny) - currLevel];
        });
      }
      /* 验证指定区域是否为平整区域（所有瓦片海拔值相同）
       * @param  {Number} xNum   起始 X 坐标
       * @param  {Number} yNum   起始 Y 坐标
       * @param  {Number} areaWidth  区域宽度
       * @param  {Number} areaHeight 区域高度
       * @return {Boolean}
       */

    }, {
      key: "validateFlatArea",
      value: function validateFlatArea(xNum, yNum) {
        var areaWidth = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
        var areaHeight = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;
        var baseLevel = this.get(xNum, yNum);

        for (var y = yNum; y < yNum + areaHeight; y++) {
          for (var x = xNum; x < xNum + areaWidth; x++) {
            if (this.get(x, y) !== baseLevel) return false;
          }
        }

        return true;
      }
      /* 按海拔值分组瓦片坐标
       * @return {Object} { level: [[xNum, yNum], ...], ... }
       */

    }, {
      key: "getElevationGroups",
      value: function getElevationGroups() {
        var groups = {}; // 先收集默认海拔的瓦片（地图范围内未单独设置的）

        for (var y = 0; y < this.height; y++) {
          for (var x = 0; x < this.width; x++) {
            var level = this.get(x, y);
            var key = String(level);
            if (!groups[key]) groups[key] = [];
            groups[key].push([x, y]);
          }
        }

        return groups;
      }
      /* 导出为二维数组（行优先）
       * @return {Array} [[level, ...], ...]
       */

    }, {
      key: "toArray",
      value: function toArray() {
        var result = [];

        for (var y = 0; y < this.height; y++) {
          var row = [];

          for (var x = 0; x < this.width; x++) {
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

    }, {
      key: "fromArray",
      value: function fromArray() {
        var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
        this.width = data[0] ? data[0].length : 0;
        this.height = data.length;

        this._data.clear();

        this._max = this.defaultElevation;
        this._min = this.defaultElevation;

        for (var y = 0; y < data.length; y++) {
          for (var x = 0; x < data[y].length; x++) {
            this.set(x, y, data[y][x]);
          }
        }

        return this;
      }
      /* 导出为 JSON 可序列化对象
       * @return {Object} { width, height, defaultElevation, data: { key: level, ... } }
       */

    }, {
      key: "toJSON",
      value: function toJSON() {
        var data = {};

        this._data.forEach(function (level, key) {
          data[key] = level;
        });

        return {
          width: this.width,
          height: this.height,
          defaultElevation: this.defaultElevation,
          data: data
        };
      }
      /* 从 JSON 对象恢复海拔地图
       * @param  {Object} json 序列化对象
       * @return {ElevationMap} this
       */

    }, {
      key: "fromJSON",
      value: function fromJSON() {
        var _json$defaultElevatio,
            _this3 = this;

        var json = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        this.width = json.width || 0;
        this.height = json.height || 0;
        this.defaultElevation = (_json$defaultElevatio = json.defaultElevation) !== null && _json$defaultElevatio !== void 0 ? _json$defaultElevatio : 0;

        this._data.clear();

        this._max = this.defaultElevation;
        this._min = this.defaultElevation;
        var entries = json.data || {};
        Object.keys(entries).forEach(function (key) {
          var level = entries[key];

          _this3._data.set(key, level);

          if (level > _this3._max) _this3._max = level;
          if (level < _this3._min) _this3._min = level;
        });
        return this;
      }
    }]);

    return ElevationMap;
  }();

  /* 斜坡系统 —— 海拔边界过渡区域检测与通行性判定

   * 斜坡不是独立瓦片类型，而是由相邻瓦片海拔差自动判定的过渡区域。
   * 当相邻瓦片海拔差为 1 时，当前瓦片处于斜坡过渡区。
   * 当海拔差 > 1 时，视为悬崖，不可通行。
   */
  // 斜坡类型枚举
  var SLOPE_TYPES = {
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

  var SLOPE_DIRECTIONS = {
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

  function getSlopeType(xNum, yNum, elevationMap) {
    var neighbors = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
    var currLevel = elevationMap.get(xNum, yNum);
    var hasUp = false;
    var hasDown = false;
    var maxAbsDiff = 0;
    var direction = null;

    for (var i = 0; i < neighbors.length; i++) {
      var _neighbors$i = _slicedToArray(neighbors[i], 2),
          nx = _neighbors$i[0],
          ny = _neighbors$i[1];

      if (!elevationMap.inBounds(nx, ny)) continue;
      var diff = elevationMap.get(nx, ny) - currLevel;
      var absDiff = Math.abs(diff);

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
        direction: direction,
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
        direction: direction,
        diff: maxAbsDiff
      };
    } // 下坡


    if (hasDown) {
      return {
        type: SLOPE_TYPES.DOWN,
        direction: direction,
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
    var slopes = new Map();

    for (var y = 0; y < elevationMap.height; y++) {
      for (var x = 0; x < elevationMap.width; x++) {
        var neighbors = getNeighborsFn([x, y]);
        var slopeInfo = getSlopeType(x, y, elevationMap, neighbors);

        if (slopeInfo.type !== SLOPE_TYPES.NONE) {
          slopes.set("".concat(x, "_").concat(y), slopeInfo);
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

  function isWalkable(xNum, yNum, elevationMap) {
    var neighbors = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
    var slopeInfo = getSlopeType(xNum, yNum, elevationMap, neighbors);
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

  function getSlopeCost(xNum, yNum, elevationMap) {
    var neighbors = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
    var slopeCostMultiplier = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 2;
    var slopeInfo = getSlopeType(xNum, yNum, elevationMap, neighbors);
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

  function getSlopeVertexes(xNum, yNum, tileSize, elevationMap) {
    var neighbors = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : [];
    var currLevel = elevationMap.get(xNum, yNum);
    var vertexes = []; // 当前瓦片的四个顶点

    neighbors.forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          nx = _ref2[0],
          ny = _ref2[1];

      if (!elevationMap.inBounds(nx, ny)) return;
      var neiLevel = elevationMap.get(nx, ny);
      var diff = neiLevel - currLevel; // 只在海拔差为 1 时生成斜坡顶点

      if (Math.abs(diff) === 1) {
        vertexes.push([nx, ny, neiLevel]);
      }
    });
    return vertexes;
  }

  /* 获取带海拔偏移的错列布局瓦片渲染坐标
   * @param  {Array}  xyNum           目标元素 XY 索引值，如 [0, 0]
   * @param  {Array}  tileSize        单瓦片图宽高值，如 [80, 40]
   * @param  {ElevationMap} elevationMap 海拔地图实例
   * @param  {Number} elevationHeight  单位海拔对应的像素高度，默认 10
   * @param  {String} stagger          错列模式 ['odd', 'even', 'none']
   * @param  {Array}  originXY         原点像素坐标值
   * @return {Array} [x, y, xNum, yNum, elevation]
   */

  function getElevatedPosition() {
    var xyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var tileSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [8, 4];
    var elevationMap = arguments.length > 2 ? arguments[2] : undefined;
    var elevationHeight = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 10;
    var stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';
    var originXY = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : [0, 0];

    var _xyNum = _slicedToArray(xyNum, 2),
        xNum = _xyNum[0],
        yNum = _xyNum[1];

    var _getRhombusPosition = getPosition(xyNum, tileSize, stagger, originXY),
        _getRhombusPosition2 = _slicedToArray(_getRhombusPosition, 2),
        baseX = _getRhombusPosition2[0],
        baseY = _getRhombusPosition2[1];

    var elevation = elevationMap ? elevationMap.get(xNum, yNum) : 0;
    var offsetY = -elevation * elevationHeight;
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

  function getElevatedIsometricPosition() {
    var xyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var tileSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [8, 4];
    var elevationMap = arguments.length > 2 ? arguments[2] : undefined;
    var elevationHeight = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 10;
    var originXY = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : [0, 0];

    var _xyNum2 = _slicedToArray(xyNum, 2),
        xNum = _xyNum2[0],
        yNum = _xyNum2[1];

    var _getRhombusIsometricP = getIsometricPosition(xyNum, tileSize, originXY),
        _getRhombusIsometricP2 = _slicedToArray(_getRhombusIsometricP, 2),
        baseX = _getRhombusIsometricP2[0],
        baseY = _getRhombusIsometricP2[1];

    var elevation = elevationMap ? elevationMap.get(xNum, yNum) : 0;
    var offsetY = -elevation * elevationHeight;
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

  function getElevatedPositions() {
    var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
    var elevationMap = arguments.length > 3 ? arguments[3] : undefined;
    var elevationHeight = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 10;
    var stagger = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 'odd';
    var renderOrder = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 'RightDown';
    return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, function (xNum, yNum) {
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

  function getElevatedIsometricPositions() {
    var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
    var elevationMap = arguments.length > 3 ? arguments[3] : undefined;
    var elevationHeight = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 10;
    var renderOrder = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 'RightDown';
    return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, function (xNum, yNum) {
      return getElevatedIsometricPosition([xNum, yNum], tileSize, elevationMap, elevationHeight);
    });
  }
  /* 按海拔和位置生成渲染顺序
   * 确保高海拔瓦片后渲染（遮挡低海拔），同海拔内按 renderDirection 排序
   * @param  {ElevationMap} elevationMap 海拔地图实例
   * @param  {String} renderDirection 渲染方向 ['RightDown','RightUp','LeftDown','LeftUp']
   * @return {Array} [[xNum, yNum, elevation], ...] 按渲染顺序排列
   */

  function getRenderOrder(elevationMap) {
    var renderDirection = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'RightDown';
    var width = elevationMap.width,
        height = elevationMap.height;
    var positions = twoDimForEach([0, width - 1], [0, height - 1], renderDirection, function (xNum, yNum) {
      return [xNum, yNum, elevationMap.get(xNum, yNum)];
    }); // 同海拔内保持原渲染方向顺序，高海拔排后面
    // 使用稳定排序：先按 elevation 升序，同海拔保持原序

    return positions.sort(function (a, b) {
      return a[2] - b[2];
    });
  }

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

  function getElevationAwareNeighbors() {
    var xyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var elevationMap = arguments.length > 1 ? arguments[1] : undefined;
    var baseGetNeighbors = arguments.length > 2 ? arguments[2] : undefined;
    var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    var _options$maxElevation = options.maxElevationDiff,
        maxElevationDiff = _options$maxElevation === void 0 ? 1 : _options$maxElevation,
        _options$slopeCostMul = options.slopeCostMultiplier,
        slopeCostMultiplier = _options$slopeCostMul === void 0 ? 2 : _options$slopeCostMul,
        _options$unwalkableEl = options.unwalkableElevations,
        unwalkableElevations = _options$unwalkableEl === void 0 ? [] : _options$unwalkableEl;

    var _xyNum = _slicedToArray(xyNum, 2),
        xNum = _xyNum[0],
        yNum = _xyNum[1];

    var currLevel = elevationMap.get(xNum, yNum); // 检查当前瓦片是否可通行

    if (unwalkableElevations.includes(currLevel)) {
      return [];
    }

    var baseNeighbors = baseGetNeighbors(xyNum);
    var result = [];
    baseNeighbors.forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 3),
          nx = _ref2[0],
          ny = _ref2[1],
          baseCost = _ref2[2];

      // 检查邻居是否在地图范围内
      if (!elevationMap.inBounds(nx, ny)) return;
      var neiLevel = elevationMap.get(nx, ny);
      var diff = Math.abs(neiLevel - currLevel); // 海拔差超过阈值，不可通行

      if (diff > maxElevationDiff) return; // 邻居海拔值在不可通行列表中

      if (unwalkableElevations.includes(neiLevel)) return; // 计算通行成本

      var cost = baseCost;

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

  function aStarElevation() {
    var staXyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var endXyNum = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var elevationMap = arguments.length > 2 ? arguments[2] : undefined;
    var baseGetNeighbors = arguments.length > 3 ? arguments[3] : undefined;
    var options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    var maximizable = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 1e6;
    var _options$maxElevation2 = options.maxElevationDiff,
        maxElevationDiff = _options$maxElevation2 === void 0 ? 1 : _options$maxElevation2,
        _options$slopeCostMul2 = options.slopeCostMultiplier,
        slopeCostMultiplier = _options$slopeCostMul2 === void 0 ? 2 : _options$slopeCostMul2,
        _options$unwalkableEl2 = options.unwalkableElevations,
        unwalkableElevations = _options$unwalkableEl2 === void 0 ? [] : _options$unwalkableEl2; // 构造海拔感知的邻居获取器

    var getNeighbors = function getNeighbors(xyNum) {
      return getElevationAwareNeighbors(xyNum, elevationMap, baseGetNeighbors, {
        maxElevationDiff: maxElevationDiff,
        slopeCostMultiplier: slopeCostMultiplier,
        unwalkableElevations: unwalkableElevations
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
  var shapes = shapesObj; // 寻路方法
  var pathFinding = pathFindingObj; // 海拔管理方法
  var elevation = elevationObj;

  exports.elevation = elevation;
  exports.pathFinding = pathFinding;
  exports.shapes = shapes;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=qtiled.dev.js.map
